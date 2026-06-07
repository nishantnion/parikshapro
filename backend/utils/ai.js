const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
// Cache TTL: exam papers cached for 6 hours, study notes for 24 hours
const EXAM_CACHE_TTL_MS  = 6  * 60 * 60 * 1000;
const NOTE_CACHE_TTL_MS  = 24 * 60 * 60 * 1000;

const getGemini = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
};

const getClaude = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

// Parse JSON from AI response — strips markdown fences if present
const parseJSON = (text) => {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
};

// ── CACHE HELPERS ─────────────────────────────────────────────────────────────

const buildCacheKey = (parts) =>
  parts.map(p => String(p).toLowerCase().replace(/\s+/g, '_')).join(':');

const getCached = async (key) => {
  try {
    const { QuestionCache } = require('../models');
    const row = await QuestionCache.findOne({ where: { cache_key: key } });
    if (!row) return null;
    if (new Date(row.expires_at) < new Date()) {
      await row.destroy();
      return null;
    }
    await row.increment('hit_count');
    return row.exam_data;
  } catch {
    return null;
  }
};

const setCache = async (key, data, ttlMs) => {
  try {
    const { QuestionCache } = require('../models');
    const expires_at = new Date(Date.now() + ttlMs);
    await QuestionCache.upsert({ cache_key: key, exam_data: data, expires_at, hit_count: 0 });
  } catch {
    // cache write failure is non-fatal
  }
};

// ── GEMINI CALL ───────────────────────────────────────────────────────────────

const callGemini = async (prompt) => {
  const model = getGemini();
  if (!model) throw new Error('No Gemini key');
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// ── CLAUDE CALL ───────────────────────────────────────────────────────────────

const callClaude = async ({ system, userPrompt, maxTokens }) => {
  const client = getClaude();
  if (!client) throw new Error('No Claude key');
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  });
  return response.content[0].text;
};

// Try Gemini first, fall back to Claude if Gemini fails or is unavailable
const callAI = async ({ prompt, system, maxTokens }) => {
  try {
    return await callGemini(prompt);
  } catch (geminiErr) {
    console.warn('[AI] Gemini failed, falling back to Claude:', geminiErr.message);
    return await callClaude({ system, userPrompt: prompt, maxTokens });
  }
};

// ── GENERATE EXAM PAPER ───────────────────────────────────────────────────────

const generateExamPaper = async ({ examName, sections, difficulty, markingScheme, weakTopics = [], language = 'en' }) => {
  const totalQ = sections.reduce((a, s) => a + s.count, 0);

  // Cache key includes everything that determines question content
  // weak topics are excluded — they affect focus but not the structural cache key
  const cacheKey = buildCacheKey([
    'exam', examName, difficulty, language,
    sections.map(s => `${s.name}-${s.count}`).join('_'),
    markingScheme.correct, markingScheme.wrong,
  ]);

  const cached = await getCached(cacheKey);
  if (cached) {
    console.log('[AI Cache] HIT for exam:', cacheKey);
    return cached;
  }

  const system = 'You are an expert Indian competitive exam paper setter with 20 years of experience. Return ONLY valid JSON, no markdown, no explanation outside JSON.';

  const prompt = `Generate a complete ${examName} mock test with EXACTLY ${totalQ} questions.

Exam specifications:
- Sections: ${JSON.stringify(sections)}
- Difficulty: ${difficulty}
- Marking scheme: +${markingScheme.correct} correct, ${markingScheme.wrong} wrong
- Language: ${language === 'hi' ? 'Bilingual Hindi+English' : 'English only'}
${weakTopics.length ? `- Focus more on weak topics: ${weakTopics.join(', ')}` : ''}

Return this JSON structure exactly:
{
  "exam_title": "${examName} Mock Test",
  "total_marks": <number>,
  "duration_minutes": <number>,
  "sections": [
    {
      "name": "<section name>",
      "questions": [
        {
          "id": <number>,
          "type": "MCQ",
          "question": "<question in English>",
          "question_hi": "<question in Hindi, only if bilingual>",
          "options": ["A) <opt1>", "B) <opt2>", "C) <opt3>", "D) <opt4>"],
          "options_hi": ["A) <hindi1>", "B) <hindi2>", "C) <hindi3>", "D) <hindi4>"],
          "correct": "A",
          "marks": ${markingScheme.correct},
          "negative": ${markingScheme.wrong},
          "topic": "<specific topic>",
          "difficulty": "${difficulty}",
          "solution": "<detailed step-by-step solution>",
          "solution_hi": "<solution in Hindi>"
        }
      ]
    }
  ]
}

Generate realistic, exam-standard questions matching the actual ${examName} pattern.
Each section must have EXACTLY the number of questions specified.`;

  const text = await callAI({ prompt, system, maxTokens: 6000 });
  const data = parseJSON(text);

  await setCache(cacheKey, data, EXAM_CACHE_TTL_MS);
  return data;
};

// ── ANALYZE PERFORMANCE ───────────────────────────────────────────────────────

const analyzePerformance = async ({ examName, attempts, weakTopics, strongTopics }) => {
  const system = 'You are an expert coach for Indian competitive exams. Return ONLY valid JSON.';
  const prompt = `Analyze this student performance for ${examName}.
Correct: ${attempts.correct}/${attempts.total} (${Math.round(attempts.correct / attempts.total * 100)}%)
Wrong: ${attempts.wrong}, Skipped: ${attempts.skipped}
Weak topics: ${weakTopics.join(', ')}
Strong topics: ${strongTopics.join(', ')}

Return:
{
  "overall": "<2-3 sentence summary>",
  "grade": "<Excellent/Good/Average/Needs Work>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "recommendations": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "study_plan": "<3-4 sentence personalized plan>",
  "predicted_rank": "<estimated rank range>",
  "next_focus": "<single most important thing>"
}`;

  const text = await callAI({ prompt, system, maxTokens: 800 });
  return parseJSON(text);
};

// ── GENERATE STUDY NOTE ───────────────────────────────────────────────────────

const generateStudyNote = async ({ topic, examName, language = 'en' }) => {
  const cacheKey = buildCacheKey(['note', examName, topic, language]);
  const cached = await getCached(cacheKey);
  if (cached) {
    console.log('[AI Cache] HIT for note:', cacheKey);
    return cached;
  }

  const system = 'You are an expert study material creator for Indian competitive exams. Return ONLY valid JSON.';
  const prompt = `Create comprehensive study notes for "${topic}" for ${examName} preparation.
${language === 'hi' ? 'Include Hindi translations where applicable.' : ''}

Return:
{
  "title": "<topic title>",
  "subject": "<subject area>",
  "summary": "<3-4 line overview>",
  "key_concepts": [{"term": "<term>", "definition": "<definition>", "term_hi": "<hindi term>"}],
  "important_formulas": ["<formula 1>", "<formula 2>"],
  "exam_tips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "common_mistakes": ["<mistake 1>", "<mistake 2>"],
  "practice_questions": [{"q": "<question>", "a": "<answer>", "q_hi": "<hindi question>"}],
  "memory_tricks": ["<mnemonic 1>", "<mnemonic 2>"],
  "difficulty_level": "<Beginner/Intermediate/Advanced>",
  "estimated_weightage": "<X-Y% in ${examName}>"
}`;

  const text = await callAI({ prompt, system, maxTokens: 1500 });
  const data = parseJSON(text);

  await setCache(cacheKey, data, NOTE_CACHE_TTL_MS);
  return data;
};

// ── CHAT TUTOR ────────────────────────────────────────────────────────────────

const chatWithTutor = async ({ messages, examName, userContext }) => {
  const system = `You are an expert AI tutor for Indian competitive exams, specializing in ${examName}. Be concise (2-4 sentences unless complex explanation needed), encouraging, and use simple language. For math/science problems, show key steps. You can respond in Hindi if the student uses Hindi. Always relate answers to the actual exam pattern and syllabus.`;

  const history = messages.map((m, i) =>
    i === 0
      ? `Student context: ${JSON.stringify(userContext)}\n\n${m.content}`
      : m.content
  ).join('\n\n');

  const prompt = `${system}\n\nConversation:\n${history}`;
  const text = await callAI({ prompt, system, maxTokens: 600 });
  return text;
};

// ── DIFFICULTY FROM SCORES ────────────────────────────────────────────────────

const getAIDifficulty = async (recentScores) => {
  if (!recentScores.length) return 'Medium';
  const avg = recentScores.reduce((a, s) => a + s, 0) / recentScores.length;
  if (avg >= 75) return 'Hard';
  if (avg >= 50) return 'Medium';
  return 'Easy';
};

module.exports = { generateExamPaper, analyzePerformance, generateStudyNote, chatWithTutor, getAIDifficulty };
