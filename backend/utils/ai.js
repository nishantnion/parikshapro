const Anthropic = require('@anthropic-ai/sdk');

const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Generate full exam paper
const generateExamPaper = async ({ examName, sections, difficulty, markingScheme, weakTopics = [], language = 'en' }) => {
  const client = getClient();
  const totalQ = sections.reduce((a, s) => a + s.count, 0);

  const prompt = `You are an expert Indian competitive exam paper setter with 20 years of experience.
Generate a complete ${examName} mock test with EXACTLY ${totalQ} questions.

Exam specifications:
- Sections: ${JSON.stringify(sections)}
- Difficulty: ${difficulty}
- Marking scheme: +${markingScheme.correct} correct, ${markingScheme.wrong} wrong
- Language: ${language === 'hi' ? 'Bilingual Hindi+English' : 'English only'}
${weakTopics.length ? `- Focus more on weak topics: ${weakTopics.join(', ')}` : ''}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation outside JSON.

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
          "solution": "<detailed step-by-step solution in English>",
          "solution_hi": "<solution in Hindi>"
        }
      ]
    }
  ]
}

Generate realistic, exam-standard questions matching the actual ${examName} pattern.
Each section must have EXACTLY the number of questions specified.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
};

// AI performance analysis
const analyzePerformance = async ({ examName, attempts, weakTopics, strongTopics }) => {
  const client = getClient();
  const prompt = `Analyze this Indian competitive exam student's performance and give actionable feedback.

Exam: ${examName}
Correct: ${attempts.correct}/${attempts.total} (${Math.round(attempts.correct/attempts.total*100)}%)
Wrong: ${attempts.wrong}, Skipped: ${attempts.skipped}
Weak topics: ${weakTopics.join(', ')}
Strong topics: ${strongTopics.join(', ')}

Return ONLY valid JSON:
{
  "overall": "<2-3 sentence performance summary>",
  "grade": "<Excellent/Good/Average/Needs Work>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "recommendations": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"],
  "study_plan": "<3-4 sentence personalized study plan>",
  "predicted_rank": "<estimated rank range if this were the real exam>",
  "next_focus": "<single most important thing to work on>"
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
};

// Generate study note
const generateStudyNote = async ({ topic, examName, language = 'en' }) => {
  const client = getClient();
  const prompt = `Create comprehensive study notes for "${topic}" for ${examName} preparation.
${language === 'hi' ? 'Include Hindi translations where applicable.' : ''}

Return ONLY valid JSON:
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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
};

// AI chat tutor
const chatWithTutor = async ({ messages, examName, userContext }) => {
  const client = getClient();
  const systemPrompt = `You are an expert AI tutor for Indian competitive exams, specializing in ${examName}.
Student context: ${JSON.stringify(userContext)}
Be concise (2-4 sentences unless complex explanation needed), encouraging, and use simple language.
For math/science problems, show key steps. You can respond in Hindi if the student uses Hindi.
Always relate answers to the actual exam pattern and syllabus.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  return response.content[0].text;
};

// Determine AI-based difficulty from past performance
const getAIDifficulty = async (recentScores) => {
  if (!recentScores.length) return 'Medium';
  const avg = recentScores.reduce((a, s) => a + s, 0) / recentScores.length;
  if (avg >= 75) return 'Hard';
  if (avg >= 50) return 'Medium';
  return 'Easy';
};

module.exports = { generateExamPaper, analyzePerformance, generateStudyNote, chatWithTutor, getAIDifficulty };
