const router = require('express').Router();
const { Op } = require('sequelize');
const { auth, adminAuth, optionalAuth } = require('../middleware/auth');
const {
  User, Contest, ContestEnrollment, ExamAttempt, GeneratedExam,
  ForumPost, ForumReply, ForumVote, StudyNote, Notification,
  UserBadge, Referral, Subscription
} = require('../models');
const { generateStudyNote, chatWithTutor } = require('../utils/ai');

// ════════════════════════════════════════════════════════════════════════════
// USER ROUTES
// ════════════════════════════════════════════════════════════════════════════
const userRouter = require('express').Router();

userRouter.get('/profile', auth, async (req, res) => {
  try {
    const user = req.user;
    const badges = await UserBadge.findAll({ where: { user_id: user.id } });
    const referrals = await Referral.findAll({ where: { referrer_id: user.id } });
    const subscription = await Subscription.findOne({ where: { user_id: user.id, status: 'active' }, order: [['created_at', 'DESC']] });
    res.json({ user, badges, referrals_count: referrals.length, subscription });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.put('/profile', auth, async (req, res) => {
  try {
    const { name, preferred_language, target_exams } = req.body;
    await req.user.update({ name, preferred_language, target_exams });
    res.json({ user: req.user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/dashboard', auth, async (req, res) => {
  try {
    const user = req.user;
    const attempts = await ExamAttempt.findAll({
      where: { user_id: user.id, status: 'submitted' },
      order: [['submitted_at', 'DESC']], limit: 10,
      attributes: ['id', 'exam_name', 'exam_category_id', 'percentage', 'score', 'max_score', 'submitted_at', 'correct_count', 'wrong_count', 'total_questions', 'difficulty'],
    });
    const { ScheduledExam } = require('../models');
    const scheduledExams = await ScheduledExam.findAll({
      where: { user_id: user.id, status: { [Op.in]: ['pending', 'active'] } },
      order: [['scheduled_at', 'ASC']], limit: 5,
    });
    const avgScore = attempts.length ? Math.round(attempts.reduce((a, t) => a + t.percentage, 0) / attempts.length) : 0;
    const notifications = await Notification.findAll({ where: { user_id: user.id, is_read: false }, limit: 5, order: [['created_at', 'DESC']] });
    res.json({ user, recent_attempts: attempts, scheduled_exams: scheduledExams, avg_score: avgScore, unread_notifications: notifications.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/referrals', auth, async (req, res) => {
  try {
    const referrals = await Referral.findAll({
      where: { referrer_id: req.user.id },
      include: [{ model: User, as: 'referee', foreignKey: 'referee_id', attributes: ['name', 'email', 'created_at'] }],
    });
    res.json({ referrals, total: referrals.length, completed: referrals.filter(r => r.status === 'completed').length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']], limit: 50,
    });
    res.json({ notifications });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    if (req.params.id === 'all') {
      await Notification.update({ is_read: true }, { where: { user_id: req.user.id } });
    } else {
      await Notification.update({ is_read: true }, { where: { id: req.params.id, user_id: req.user.id } });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/stats', auth, async (req, res) => {
  try {
    const attempts = await ExamAttempt.findAll({
      where: { user_id: req.user.id, status: 'submitted' },
      attributes: ['percentage', 'exam_category_id', 'submitted_at', 'correct_count', 'wrong_count', 'total_questions'],
      order: [['submitted_at', 'ASC']],
    });
    const byExam = {};
    attempts.forEach(a => {
      if (!byExam[a.exam_category_id]) byExam[a.exam_category_id] = [];
      byExam[a.exam_category_id].push(a.percentage);
    });
    res.json({ total_attempts: attempts.length, attempts_trend: attempts.map(a => ({ date: a.submitted_at, percentage: a.percentage, exam: a.exam_category_id })), by_exam: byExam });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// CONTEST ROUTES
// ════════════════════════════════════════════════════════════════════════════
const contestRouter = require('express').Router();

contestRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const contests = await Contest.findAll({
      where: { status: { [Op.in]: ['upcoming', 'registration_open', 'live', 'completed'] } },
      order: [['scheduled_at', 'ASC']], limit: 20,
    });
    const enriched = await Promise.all(contests.map(async c => {
      const count = await ContestEnrollment.count({ where: { contest_id: c.id } });
      let isEnrolled = false;
      if (req.user) isEnrolled = !!(await ContestEnrollment.findOne({ where: { contest_id: c.id, user_id: req.user.id } }));
      return { ...c.toJSON(), participant_count: count, is_enrolled: isEnrolled };
    }));
    res.json({ contests: enriched });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

contestRouter.get('/:id', optionalAuth, async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id);
    if (!contest) return res.status(404).json({ error: 'Not found' });
    const count = await ContestEnrollment.count({ where: { contest_id: contest.id } });
    let isEnrolled = false;
    if (req.user) isEnrolled = !!(await ContestEnrollment.findOne({ where: { contest_id: contest.id, user_id: req.user.id } }));
    res.json({ contest: { ...contest.toJSON(), participant_count: count, is_enrolled: isEnrolled } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

contestRouter.get('/:id/leaderboard', async (req, res) => {
  try {
    const enrollments = await ContestEnrollment.findAll({
      where: { contest_id: req.params.id, score: { [Op.ne]: null } },
      include: [{ model: User, attributes: ['name', 'avatar_url'] }],
      order: [['score', 'DESC']], limit: 100,
    });
    const leaderboard = enrollments.map((e, i) => ({
      rank: i + 1, name: e.User?.name, score: e.score, attempt_id: e.attempt_id,
    }));
    res.json({ leaderboard });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

contestRouter.get('/my/history', auth, async (req, res) => {
  try {
    const enrollments = await ContestEnrollment.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Contest, attributes: ['title', 'scheduled_at', 'exam_category_id'] }],
      order: [['created_at', 'DESC']],
    });
    res.json({ history: enrollments });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// FORUM ROUTES
// ════════════════════════════════════════════════════════════════════════════
const forumRouter = require('express').Router();

forumRouter.get('/posts', optionalAuth, async (req, res) => {
  try {
    const { exam_id, page = 1, limit = 20, sort = 'latest' } = req.query;
    const where = { status: 'active' };
    if (exam_id) where.exam_category_id = exam_id;
    const order = sort === 'popular' ? [['upvotes', 'DESC']] : [['is_pinned', 'DESC'], ['created_at', 'DESC']];
    const posts = await ForumPost.findAndCountAll({
      where, order, limit: parseInt(limit), offset: (page - 1) * parseInt(limit),
      include: [{ model: User, attributes: ['name', 'avatar_url'] }],
    });
    res.json({ posts: posts.rows, total: posts.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

forumRouter.post('/posts', auth, async (req, res) => {
  try {
    const { title, body, exam_category_id, tags } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
    const post = await ForumPost.create({ user_id: req.user.id, title, body, exam_category_id, tags: tags || [] });
    // Award helper badge after 5 posts
    const postCount = await ForumPost.count({ where: { user_id: req.user.id } });
    if (postCount >= 5) {
      const existing = await UserBadge.findOne({ where: { user_id: req.user.id, badge_type: 'helper' } });
      if (!existing) await UserBadge.create({ user_id: req.user.id, badge_type: 'helper' });
    }
    res.status(201).json({ post });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

forumRouter.get('/posts/:id', optionalAuth, async (req, res) => {
  try {
    const post = await ForumPost.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['name', 'avatar_url'] },
        { model: ForumReply, where: { status: 'active' }, required: false, include: [{ model: User, attributes: ['name', 'avatar_url'] }], order: [['upvotes', 'DESC']] },
      ],
    });
    if (!post) return res.status(404).json({ error: 'Not found' });
    res.json({ post });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

forumRouter.post('/posts/:id/reply', auth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: 'Body required' });
    const post = await ForumPost.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const reply = await ForumReply.create({ post_id: post.id, user_id: req.user.id, body });
    await post.increment('reply_count');
    // Notify post author
    if (post.user_id !== req.user.id) {
      await Notification.create({ user_id: post.user_id, type: 'system', title: '💬 New reply on your post', body: `${req.user.name} replied to "${post.title.slice(0, 50)}..."` });
    }
    res.status(201).json({ reply });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

forumRouter.post('/posts/:id/vote', auth, async (req, res) => {
  try {
    const { vote } = req.body; // 'up' or 'down'
    const post = await ForumPost.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    const existing = await ForumVote.findOne({ where: { user_id: req.user.id, target_id: post.id, target_type: 'post' } });
    if (existing) {
      if (existing.vote === vote) { await existing.destroy(); }
      else {
        await existing.update({ vote });
        await post.increment(vote === 'up' ? 'upvotes' : 'downvotes');
        await post.decrement(vote === 'up' ? 'downvotes' : 'upvotes');
      }
    } else {
      await ForumVote.create({ user_id: req.user.id, target_id: post.id, target_type: 'post', vote });
      await post.increment(vote === 'up' ? 'upvotes' : 'downvotes');
    }
    await post.reload();
    res.json({ upvotes: post.upvotes, downvotes: post.downvotes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

forumRouter.post('/replies/:id/vote', auth, async (req, res) => {
  try {
    const reply = await ForumReply.findByPk(req.params.id);
    if (!reply) return res.status(404).json({ error: 'Not found' });
    const existing = await ForumVote.findOne({ where: { user_id: req.user.id, target_id: reply.id, target_type: 'reply' } });
    if (existing) { await existing.destroy(); await reply.decrement('upvotes'); }
    else { await ForumVote.create({ user_id: req.user.id, target_id: reply.id, target_type: 'reply', vote: 'up' }); await reply.increment('upvotes'); }
    await reply.reload();
    res.json({ upvotes: reply.upvotes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// STUDY ROUTES
// ════════════════════════════════════════════════════════════════════════════
const studyRouter = require('express').Router();

studyRouter.get('/notes', optionalAuth, async (req, res) => {
  try {
    const { exam_id, subject, type, page = 1, limit = 20 } = req.query;
    const where = { is_public: true };
    if (exam_id) where.exam_category_id = exam_id;
    if (subject) where.subject = subject;
    if (type) where.type = type;
    const notes = await StudyNote.findAndCountAll({
      where, order: [['created_at', 'DESC']], limit: parseInt(limit), offset: (page - 1) * parseInt(limit),
      attributes: { exclude: ['content'] },
    });
    res.json({ notes: notes.rows, total: notes.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

studyRouter.get('/notes/:id', async (req, res) => {
  try {
    const note = await StudyNote.findByPk(req.params.id);
    if (!note) return res.status(404).json({ error: 'Not found' });
    await note.increment('views');
    res.json({ note });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

studyRouter.post('/ai-note', auth, async (req, res) => {
  try {
    const { topic, exam_category_id, language } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic required' });

    const EXAM_NAMES = { jee: 'JEE Main', neet: 'NEET UG', upsc: 'UPSC CSE', ibps: 'IBPS PO', ssc: 'SSC CGL', gate: 'GATE CS', nda: 'NDA', rrb: 'RRB NTPC' };
    const content = await generateStudyNote({ topic, examName: EXAM_NAMES[exam_category_id] || 'competitive exams', language: language || 'en' });

    const note = await StudyNote.create({
      exam_category_id, topic,
      subject: content.subject || 'General',
      content, language: language || 'en',
      type: 'ai_generated', is_public: false,
      created_by: req.user.id,
    });

    res.json({ note: { ...note.toJSON(), content } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// AI TUTOR CHAT
// ════════════════════════════════════════════════════════════════════════════
const tutorRouter = require('express').Router();

tutorRouter.post('/chat', auth, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages?.length) return res.status(400).json({ error: 'Messages required' });
    const EXAM_NAMES = { jee: 'JEE Main', neet: 'NEET UG', upsc: 'UPSC CSE', ibps: 'IBPS PO', ssc: 'SSC CGL', gate: 'GATE CS' };
    const examName = EXAM_NAMES[(req.user.target_exams || [])[0]] || 'competitive exams';
    const reply = await chatWithTutor({
      messages: messages.slice(-10),
      examName,
      userContext: { name: req.user.name, plan: req.user.plan_type, total_tests: req.user.total_tests },
    });
    res.json({ reply });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════════════════════════════════════════════════
const adminRouter = require('express').Router();

adminRouter.get('/stats', adminAuth, async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalUsers, newToday, totalAttempts, attemptsToday, activeContests, totalRevenue] = await Promise.all([
      User.count(),
      User.count({ where: { created_at: { [Op.gte]: today } } }),
      ExamAttempt.count({ where: { status: 'submitted' } }),
      ExamAttempt.count({ where: { status: 'submitted', submitted_at: { [Op.gte]: today } } }),
      Contest.count({ where: { status: { [Op.in]: ['live', 'registration_open'] } } }),
      Transaction.count({ where: { status: 'success' } }).then(async () => {
        const result = await require('../models').Transaction.findAll({ where: { status: 'success' }, attributes: ['amount_with_gst'] });
        return result.reduce((sum, t) => sum + (t.amount_with_gst || 0), 0);
      }),
    ]);
    res.json({ total_users: totalUsers, new_users_today: newToday, total_attempts: totalAttempts, attempts_today: attemptsToday, active_contests: activeContests, total_revenue: totalRevenue });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

adminRouter.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const where = {};
    if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }];
    const users = await User.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      limit: parseInt(limit), offset: (page - 1) * parseInt(limit),
      attributes: { exclude: ['password_hash', 'otp', 'refresh_token', 'reset_token'] },
    });
    res.json({ users: users.rows, total: users.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

adminRouter.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { plan_type, tests_remaining, role, is_verified } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await user.update({ plan_type, tests_remaining, role, is_verified });
    res.json({ user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

adminRouter.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { Transaction: Tx } = require('../models');
    const { page = 1, limit = 20, status } = req.query;
    const where = {};
    if (status) where.status = status;
    const transactions = await Tx.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      limit: parseInt(limit), offset: (page - 1) * parseInt(limit),
      include: [{ model: User, attributes: ['name', 'email'] }],
    });
    res.json({ transactions: transactions.rows, total: transactions.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

adminRouter.post('/contests', adminAuth, async (req, res) => {
  try {
    const { title, exam_category_id, scheduled_at, duration_minutes, enrollment_fee, prize_description } = req.body;
    const contest = await Contest.create({ title, exam_category_id, scheduled_at, duration_minutes: duration_minutes || 60, enrollment_fee: enrollment_fee || 11, prize_description, status: 'upcoming' });
    res.status(201).json({ contest });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

adminRouter.put('/contests/:id', adminAuth, async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id);
    if (!contest) return res.status(404).json({ error: 'Not found' });
    await contest.update(req.body);
    res.json({ contest });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

adminRouter.post('/notifications/broadcast', adminAuth, async (req, res) => {
  try {
    const { title, body, type = 'system', user_filter } = req.body;
    const where = {};
    if (user_filter?.plan) where.plan_type = user_filter.plan;
    const users = await User.findAll({ where, attributes: ['id'] });
    await Promise.all(users.map(u => Notification.create({ user_id: u.id, type, title, body })));
    res.json({ sent: users.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

adminRouter.get('/analytics', adminAuth, async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const last30 = new Date(); last30.setDate(last30.getDate() - 30);
    const dailySignups = await User.findAll({
      where: { created_at: { [Op.gte]: last30 } },
      attributes: [[sequelize.fn('DATE', sequelize.col('created_at')), 'date'], [sequelize.fn('COUNT', '*'), 'count']],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true,
    });
    const planDistribution = await User.findAll({
      attributes: ['plan_type', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['plan_type'], raw: true,
    });
    const examPopularity = await ExamAttempt.findAll({
      where: { status: 'submitted' },
      attributes: ['exam_category_id', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['exam_category_id'], raw: true,
    });
    res.json({ daily_signups: dailySignups, plan_distribution: planDistribution, exam_popularity: examPopularity });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

adminRouter.get('/forum/posts', adminAuth, async (req, res) => {
  try {
    const posts = await ForumPost.findAll({
      include: [{ model: User, attributes: ['name', 'email'] }],
      order: [['created_at', 'DESC']], limit: 50,
    });
    res.json({ posts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

adminRouter.put('/forum/posts/:id', adminAuth, async (req, res) => {
  try {
    const post = await ForumPost.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    await post.update(req.body);
    res.json({ post });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { userRouter, contestRouter, forumRouter, studyRouter, tutorRouter, adminRouter };
