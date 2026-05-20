const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { User, ExamCategory, ScheduledExam, GeneratedExam, ExamAttempt, Notification } = require('../models');
const { generateExamPaper, analyzePerformance, getAIDifficulty } = require('../utils/ai');
const { sendMail, emailTemplates } = require('../utils/email');
const { Op } = require('sequelize');

const EXAM_CONFIGS = {
  jee: { name: 'JEE Main', sections: [{ name: 'Physics', count: 25 }, { name: 'Chemistry', count: 25 }, { name: 'Mathematics', count: 25 }], duration: 180, marking: { correct: 4, wrong: -1 } },
  neet: { name: 'NEET UG', sections: [{ name: 'Physics', count: 45 }, { name: 'Chemistry', count: 45 }, { name: 'Biology', count: 90 }], duration: 200, marking: { correct: 4, wrong: -1 } },
  upsc: { name: 'UPSC CSE Prelims', sections: [{ name: 'General Studies', count: 50 }, { name: 'CSAT', count: 30 }], duration: 120, marking: { correct: 2, wrong: -0.67 } },
  ibps: { name: 'IBPS PO', sections: [{ name: 'Reasoning', count: 35 }, { name: 'Quantitative Aptitude', count: 35 }, { name: 'English Language', count: 30 }], duration: 60, marking: { correct: 1, wrong: -0.25 } },
  ssc: { name: 'SSC CGL', sections: [{ name: 'General Intelligence', count: 25 }, { name: 'General Awareness', count: 25 }, { name: 'Quantitative Aptitude', count: 25 }, { name: 'English Comprehension', count: 25 }], duration: 60, marking: { correct: 2, wrong: -0.5 } },
  gate: { name: 'GATE CS', sections: [{ name: 'General Aptitude', count: 10 }, { name: 'Core CS', count: 55 }], duration: 180, marking: { correct: 1, wrong: -0.33 } },
  nda: { name: 'NDA', sections: [{ name: 'Mathematics', count: 120 }, { name: 'General Ability', count: 150 }], duration: 150, marking: { correct: 2.5, wrong: -0.83 } },
  rrb: { name: 'RRB NTPC', sections: [{ name: 'Mathematics', count: 30 }, { name: 'General Intelligence', count: 30 }, { name: 'General Awareness', count: 40 }], duration: 90, marking: { correct: 1, wrong: -0.33 } },
};

// ── GET CATEGORIES ────────────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  res.json({ categories: Object.entries(EXAM_CONFIGS).map(([id, cfg]) => ({ id, ...cfg })) });
});

// ── SCHEDULE EXAM ─────────────────────────────────────────────────────────────
router.post('/schedule', auth, async (req, res) => {
  try {
    const { exam_category_id, difficulty, num_questions, language, scheduled_at } = req.body;
    const user = req.user;

    if (user.tests_remaining <= 0) {
      return res.status(402).json({ error: 'No tests remaining. Please upgrade your plan.' });
    }

    const config = EXAM_CONFIGS[exam_category_id];
    if (!config) return res.status(400).json({ error: 'Invalid exam category' });

    const scheduledDate = new Date(scheduled_at || Date.now());
    const expiresAt = new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000); // 2hr grace

    const scheduled = await ScheduledExam.create({
      user_id: user.id,
      exam_category_id,
      difficulty: difficulty || 'Medium',
      num_questions: num_questions || config.sections.reduce((a, s) => a + s.count, 0),
      language: language || 'en',
      scheduled_at: scheduledDate,
      expires_at: expiresAt,
      status: new Date(scheduled_at) <= new Date() ? 'active' : 'pending',
    });

    // If scheduled in future, send reminder notification
    if (new Date(scheduled_at) > new Date()) {
      await Notification.create({
        user_id: user.id,
        type: 'exam_reminder',
        title: `📅 ${config.name} scheduled`,
        body: `Your ${config.name} mock test is scheduled for ${scheduledDate.toLocaleString('en-IN')}`,
        metadata: { scheduled_exam_id: scheduled.id },
      });
    }

    res.status(201).json({ scheduled_exam: scheduled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET SCHEDULED EXAMS ───────────────────────────────────────────────────────
router.get('/scheduled', auth, async (req, res) => {
  try {
    const exams = await ScheduledExam.findAll({
      where: { user_id: req.user.id, status: { [Op.in]: ['pending', 'active'] } },
      order: [['scheduled_at', 'ASC']],
    });
    res.json({ exams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE SCHEDULED EXAM ─────────────────────────────────────────────────────
router.delete('/scheduled/:id', auth, async (req, res) => {
  try {
    const exam = await ScheduledExam.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!exam) return res.status(404).json({ error: 'Not found' });
    await exam.destroy();
    res.json({ message: 'Scheduled exam cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GENERATE & START EXAM ─────────────────────────────────────────────────────
router.post('/:id/start', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user.tests_remaining <= 0) return res.status(402).json({ error: 'No tests remaining' });

    const scheduled = await ScheduledExam.findOne({ where: { id: req.params.id, user_id: user.id } });
    if (!scheduled) return res.status(404).json({ error: 'Scheduled exam not found' });
    if (scheduled.status === 'completed') return res.status(400).json({ error: 'Exam already completed' });
    if (scheduled.status === 'expired') return res.status(400).json({ error: 'Exam has expired' });

    // Check if already generated
    let generated = await GeneratedExam.findOne({ where: { scheduled_exam_id: scheduled.id } });

    if (!generated) {
      // Get AI difficulty if needed
      const config = EXAM_CONFIGS[scheduled.exam_category_id];
      let difficulty = scheduled.difficulty;
      if (difficulty === 'AI-Based') {
        const recentAttempts = await ExamAttempt.findAll({
          where: { user_id: user.id, exam_category_id: scheduled.exam_category_id },
          order: [['created_at', 'DESC']], limit: 5, attributes: ['percentage'],
        });
        difficulty = await getAIDifficulty(recentAttempts.map(a => a.percentage));
      }

      // Get weak topics for AI-based
      const allAttempts = await ExamAttempt.findAll({
        where: { user_id: user.id, exam_category_id: scheduled.exam_category_id },
        attributes: ['answers'], limit: 10,
      });
      const weakTopics = [];
      allAttempts.forEach(attempt => {
        (attempt.answers || []).filter(a => !a.isCorrect && a.answered).forEach(a => {
          if (a.topic && !weakTopics.includes(a.topic)) weakTopics.push(a.topic);
        });
      });

      // Adjust sections for mini/half tests
      const totalDesired = scheduled.num_questions;
      const totalDefault = config.sections.reduce((a, s) => a + s.count, 0);
      const ratio = totalDesired < totalDefault ? totalDesired / totalDefault : 1;
      const sections = config.sections.map(s => ({ ...s, count: Math.max(2, Math.round(s.count * ratio)) }));

      await scheduled.update({ status: 'generating' });

      const examData = await generateExamPaper({
        examName: config.name,
        sections,
        difficulty,
        markingScheme: config.marking,
        weakTopics: weakTopics.slice(0, 5),
        language: scheduled.language,
      });

      const totalQ = examData.sections.reduce((s, sec) => s + sec.questions.length, 0);
      const totalMarks = examData.total_marks;

      generated = await GeneratedExam.create({
        scheduled_exam_id: scheduled.id,
        exam_data: examData,
        total_marks: totalMarks,
        total_questions: totalQ,
      });

      await scheduled.update({ status: 'active', generated_at: new Date() });
    }

    // Deduct test
    await user.decrement('tests_remaining');
    await user.increment('total_tests');

    // Create attempt
    const attempt = await ExamAttempt.create({
      user_id: user.id,
      generated_exam_id: generated.id,
      exam_category_id: scheduled.exam_category_id,
      exam_name: generated.exam_data.exam_title,
      difficulty: scheduled.difficulty,
      started_at: new Date(),
      max_score: generated.total_marks,
      total_questions: generated.total_questions,
      status: 'in_progress',
    });

    res.json({
      attempt_id: attempt.id,
      exam_data: generated.exam_data,
      started_at: attempt.started_at,
      duration_minutes: generated.exam_data.duration_minutes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── SUBMIT EXAM ───────────────────────────────────────────────────────────────
router.post('/attempts/:id/submit', auth, async (req, res) => {
  try {
    const { answers, tab_switches, time_taken_seconds } = req.body;
    const attempt = await ExamAttempt.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.status === 'submitted') return res.status(400).json({ error: 'Already submitted' });

    const generated = await GeneratedExam.findByPk(attempt.generated_exam_id);
    const examData = generated.exam_data;

    // Calculate score
    let score = 0;
    let correct = 0, wrong = 0, skipped = 0;
    const processedAnswers = [];

    examData.sections.forEach((section, si) => {
      section.questions.forEach((q, qi) => {
        const key = `${si}-${qi}`;
        const userAnswer = answers[key];
        const isAnswered = !!userAnswer;
        const isCorrect = isAnswered && userAnswer === q.correct;

        if (isCorrect) { score += q.marks; correct++; }
        else if (isAnswered) { score += (q.negative || 0); wrong++; }
        else skipped++;

        processedAnswers.push({
          questionId: q.id, userAnswer, correctAnswer: q.correct,
          isCorrect, answered: isAnswered, topic: q.topic,
          section: section.name, marks: q.marks,
        });
      });
    });

    score = Math.max(0, score);
    const percentage = Math.round((score / attempt.max_score) * 100);

    await attempt.update({
      answers: processedAnswers,
      score, percentage,
      answered_questions: correct + wrong,
      correct_count: correct, wrong_count: wrong, skipped_count: skipped,
      submitted_at: new Date(),
      status: 'submitted',
      tab_switches: tab_switches || 0,
      time_taken_seconds: time_taken_seconds || 0,
    });

    // Mark scheduled exam as completed
    const scheduled = await ScheduledExam.findOne({ where: { id: { [Op.ne]: null } }, include: [{ model: GeneratedExam, where: { id: generated.id } }] });
    if (scheduled) await scheduled.update({ status: 'completed' });

    // Notification
    await Notification.create({
      user_id: req.user.id,
      type: 'result_ready',
      title: `📊 ${attempt.exam_name} Results Ready`,
      body: `You scored ${percentage}% (${score}/${attempt.max_score}). View your detailed analysis now!`,
      metadata: { attempt_id: attempt.id },
    });

    // Send result email
    const user = await User.findByPk(req.user.id);
    await sendMail({ to: user.email, ...emailTemplates.results(user.name, attempt.exam_name, score, percentage) });

    // Check badges
    await checkAndAwardBadges(req.user.id, percentage);

    res.json({
      attempt_id: attempt.id,
      score, max_score: attempt.max_score, percentage,
      correct, wrong, skipped,
      total_questions: attempt.total_questions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET ATTEMPT RESULTS ───────────────────────────────────────────────────────
router.get('/attempts/:id/results', auth, async (req, res) => {
  try {
    const attempt = await ExamAttempt.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!attempt) return res.status(404).json({ error: 'Not found' });

    const generated = await GeneratedExam.findByPk(attempt.generated_exam_id);

    // Get national average (simulated from all attempts for this exam)
    const allAttempts = await ExamAttempt.findAll({
      where: { exam_category_id: attempt.exam_category_id, status: 'submitted' },
      attributes: ['percentage'],
    });
    const nationalAvg = allAttempts.length
      ? Math.round(allAttempts.reduce((a, x) => a + x.percentage, 0) / allAttempts.length)
      : 55;

    const betterThan = allAttempts.length
      ? Math.round((allAttempts.filter(a => a.percentage < attempt.percentage).length / allAttempts.length) * 100)
      : 50;

    res.json({
      attempt: { ...attempt.toJSON(), exam_data: generated.exam_data },
      analytics: { national_avg: nationalAvg, better_than_percent: betterThan },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI ANALYSIS FOR ATTEMPT ───────────────────────────────────────────────────
router.post('/attempts/:id/analyze', auth, async (req, res) => {
  try {
    const attempt = await ExamAttempt.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!attempt) return res.status(404).json({ error: 'Not found' });

    const answers = attempt.answers || [];
    const weakTopics = [...new Set(answers.filter(a => !a.isCorrect && a.answered).map(a => a.topic))];
    const strongTopics = [...new Set(answers.filter(a => a.isCorrect).map(a => a.topic))];

    const analysis = await analyzePerformance({
      examName: attempt.exam_name,
      attempts: { correct: attempt.correct_count, wrong: attempt.wrong_count, skipped: attempt.skipped_count, total: attempt.total_questions },
      weakTopics, strongTopics,
    });

    await attempt.update({ ai_analysis: analysis });
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET ALL ATTEMPTS ──────────────────────────────────────────────────────────
router.get('/attempts', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, exam_id } = req.query;
    const where = { user_id: req.user.id, status: 'submitted' };
    if (exam_id) where.exam_category_id = exam_id;

    const attempts = await ExamAttempt.findAndCountAll({
      where, order: [['submitted_at', 'DESC']],
      limit: parseInt(limit), offset: (page - 1) * parseInt(limit),
      attributes: { exclude: ['answers', 'ai_analysis'] },
    });
    res.json({ attempts: attempts.rows, total: attempts.count, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HELPER: Award badges ──────────────────────────────────────────────────────
async function checkAndAwardBadges(userId, percentage) {
  const { UserBadge, ExamAttempt: EA } = require('../models');
  try {
    const attempts = await EA.findAll({ where: { user_id: userId, status: 'submitted' }, attributes: ['percentage'] });
    const badges = await UserBadge.findAll({ where: { user_id: userId }, attributes: ['badge_type'] });
    const existing = badges.map(b => b.badge_type);

    if (percentage >= 90 && !existing.includes('topper')) {
      await UserBadge.create({ user_id: userId, badge_type: 'topper' });
      await Notification.create({ user_id: userId, type: 'badge_earned', title: '🏆 Badge Earned: Topper!', body: 'You scored 90%+ in a mock test. You are a true topper!' });
    }
    if (attempts.length >= 10 && !existing.includes('consistent')) {
      await UserBadge.create({ user_id: userId, badge_type: 'consistent' });
      await Notification.create({ user_id: userId, type: 'badge_earned', title: '🎯 Badge Earned: Consistent!', body: 'You have completed 10+ mock tests. Keep it up!' });
    }
    if (percentage === 100 && !existing.includes('perfectionist')) {
      await UserBadge.create({ user_id: userId, badge_type: 'perfectionist' });
    }
  } catch (err) { console.error('Badge error:', err.message); }
}

module.exports = router;
