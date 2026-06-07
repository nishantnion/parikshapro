import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLoading } from '../hooks/useLoading';
import { examAPI, userAPI, contestAPI, studyAPI, tutorAPI, paymentAPI, forumAPI } from '../api';
import toast from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const EXAM_ICONS = { jee: '⚙️', jee_adv: '🔬', neet: '⚕️', upsc: '🏛️', ibps: '🏦', ssc: '📋', gate: '💻', nda: '⚔️', rrb: '🚂', cat: '📈', cuet: '🎓' };
const EXAM_LABELS = { jee: 'JEE Main', jee_adv: 'JEE Advanced', neet: 'NEET UG', upsc: 'UPSC CSE', ibps: 'IBPS PO', ssc: 'SSC CGL', gate: 'GATE CS', nda: 'NDA', rrb: 'RRB NTPC', cat: 'CAT', cuet: 'CUET UG' };
const PLAN_COLORS = { free: '#7070a0', starter: '#f7b731', monthly: '#00d4aa', semester: '#3b82f6', annual: '#a855f7', elite: '#ff6b35' };

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
export function Dashboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    userAPI.dashboard().then(r => setData(r.data)).catch(() => {});
    userAPI.stats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const trendData = stats?.attempts_trend?.slice(-10).map((a, i) => ({ name: `T${i + 1}`, score: a.percentage })) || [];

  return (
    <div className="page-container">
      <div className="flex-between mb-24">
        <div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 1 }}>
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </div>
          <div className="text-muted text-sm">
            {EXAM_ICONS[user?.target_exams?.[0]]} Target: {user?.target_exams?.join(', ')?.toUpperCase()} • {user?.plan_type?.toUpperCase()} Plan • 🔥 {user?.streak || 0} day streak
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/schedule')}>🚀 New Test</button>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-24">
        <div className="stat-card"><div className="stat-label">Tests Taken</div><div className="stat-val">{data?.user?.total_tests || 0}</div><div className="stat-sub">lifetime</div></div>
        <div className="stat-card"><div className="stat-label">Avg Score</div><div className="stat-val" style={{ color: (data?.avg_score || 0) >= 60 ? 'var(--green)' : (data?.avg_score || 0) >= 40 ? '#ff8c00' : 'var(--red)' }}>{data?.avg_score || 0}%</div><div className="stat-sub">accuracy</div></div>
        <div className="stat-card"><div className="stat-label">🔥 Streak</div><div className="stat-val" style={{ color: '#ff6b35' }}>{user?.streak || 0}</div><div className="stat-sub">days</div></div>
        <div className="stat-card"><div className="stat-label">Tests Left</div><div className="stat-val">{user?.tests_remaining || 0}</div><div className="stat-sub"><button className="btn btn-primary btn-sm mt-4" onClick={() => navigate('/billing')}>Buy More</button></div></div>
      </div>

      <div className="grid-2 mb-24">
        {/* Performance chart */}
        <div className="card">
          <div className="bold mb-16">📈 Performance Trend</div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} />
                <YAxis stroke="var(--muted)" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="loading-center" style={{ padding: 40, minHeight: 180 }}>
              <div style={{ fontSize: 32 }}>📊</div>
              <div className="text-muted text-sm">Take tests to see your trend</div>
            </div>
          )}
        </div>

        {/* Upcoming scheduled */}
        <div className="card">
          <div className="flex-between mb-16">
            <div className="bold">📅 Upcoming Tests</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/schedule')}>+ Schedule</button>
          </div>
          {(data?.scheduled_exams || []).length === 0 ? (
            <div className="text-center" style={{ padding: '24px 0' }}>
              <div style={{ fontSize: 32 }}>📅</div>
              <div className="text-muted mt-8">No scheduled tests</div>
              <button className="btn btn-secondary btn-sm mt-12" onClick={() => navigate('/schedule')}>Schedule Now</button>
            </div>
          ) : (data?.scheduled_exams || []).slice(0, 4).map(s => (
            <div key={s.id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="bold text-sm">{EXAM_ICONS[s.exam_category_id]} {s.exam_category_id?.toUpperCase()}</div>
                <div className="text-muted text-xs">{new Date(s.scheduled_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
              </div>
              <div className="flex gap-8">
                <span className="badge badge-gold">{s.difficulty}</span>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/exam/${s.id}`)}>Start</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent attempts */}
      <div className="card">
        <div className="flex-between mb-16">
          <div className="bold">📊 Recent Tests</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/my-tests')}>View All</button>
        </div>
        {(data?.recent_attempts || []).length === 0 ? (
          <div className="text-center" style={{ padding: 40 }}>
            <div style={{ fontSize: 48 }}>🎯</div>
            <div className="bold mt-12">No tests yet</div>
            <div className="text-muted mt-4">Take your first mock test!</div>
            <button className="btn btn-primary mt-16" onClick={() => navigate('/schedule')}>Start First Test →</button>
          </div>
        ) : (data?.recent_attempts || []).map(a => (
          <div key={a.id} className="flex gap-16" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 28 }}>{EXAM_ICONS[a.exam_category_id] || '📝'}</div>
            <div style={{ flex: 1 }}>
              <div className="bold text-sm">{a.exam_name}</div>
              <div className="text-muted text-xs mt-4">{new Date(a.submitted_at).toLocaleDateString('en-IN')} • {a.total_questions}Q • {a.difficulty}</div>
              <div className="flex gap-8 mt-4">
                <span className="badge badge-green">{a.correct_count} ✓</span>
                <span className="badge badge-red">{a.wrong_count} ✗</span>
              </div>
            </div>
            <div className="text-center">
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: a.percentage >= 60 ? 'var(--green)' : a.percentage >= 40 ? '#ff8c00' : 'var(--red)', lineHeight: 1 }}>{a.percentage}%</div>
              <div className="text-muted text-xs">{a.score}/{a.max_score}</div>
              <button className="btn btn-secondary btn-sm mt-4" onClick={() => navigate(`/results/${a.id}`)}>View →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SCHEDULE EXAM ──────────────────────────────────────────────────────────────
export function ScheduleExam() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState({ examId: 'jee', difficulty: 'Medium', numQ: 0, lang: 'en', scheduleNow: true, scheduledAt: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  useEffect(() => { examAPI.categories().then(r => setCategories(r.data.categories)); }, []);

  const exam = categories.find(e => e.id === config.examId);
  const totalQ = exam?.sections_config?.reduce((a, s) => a + s.count, 0) || 75;

  const handleStart = async () => {
    if ((user?.tests_remaining || 0) <= 0) { toast.error('No tests remaining. Please upgrade.'); return; }
    setLoading(true);
    try {
      const schedRes = await examAPI.schedule({
        exam_category_id: config.examId,
        difficulty: config.difficulty,
        num_questions: config.numQ || totalQ,
        language: config.lang,
        scheduled_at: new Date().toISOString(),
      });
      const scheduledId = schedRes.data.scheduled_exam.id;
      toast.success('🤖 Generating your exam with AI...');
      const startRes = await examAPI.start(scheduledId);
      await refreshUser();
      navigate('/exam', { state: { attemptId: startRes.data.attempt_id, examData: startRes.data.exam_data, duration: startRes.data.duration_minutes } });
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 403) toast.error('No tests remaining. Please buy a plan to continue.');
      else toast.error(msg || 'Failed to generate exam. Please try again.');
    }
    setLoading(false);
  };

  const handleSchedule = async () => {
    if (!config.scheduledAt) { toast.error('Pick a date and time'); return; }
    try {
      await examAPI.schedule({
        exam_category_id: config.examId,
        difficulty: config.difficulty,
        num_questions: config.numQ || totalQ,
        language: config.lang,
        scheduled_at: new Date(config.scheduledAt).toISOString(),
      });
      toast.success('📅 Exam scheduled! Reminder will be sent 30 mins before.');
      navigate('/dashboard');
    } catch (err) { toast.error(err.response?.data?.error || 'Could not schedule exam. Please try again.'); }
  };

  if (loading) return (
    <div className="loading-center" style={{ height: '100vh' }}>
      <div className="spinner" style={{ width: 60, height: 60 }} />
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: 'var(--accent)' }}>AI GENERATING YOUR EXAM</div>
      <div className="text-muted">Claude is creating unique questions for {exam?.name}...</div>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div className="mb-24"><div className="page-title">SCHEDULE EXAM</div><div className="page-sub">AI generates a unique paper every time • Never repeats</div></div>

      {/* Exam selector */}
      <div className="card mb-16">
        <div className="bold mb-16">📚 Choose Exam</div>
        <div className="grid-auto">
          {categories.map(e => (
            <div key={e.id} className={`card card-sm card-hover`} style={{ border: config.examId === e.id ? `2px solid ${e.color || 'var(--accent)'}` : '1px solid var(--border)', background: config.examId === e.id ? `${e.color}10` : 'var(--surface2)' }} onClick={() => set('examId', e.id)}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{e.icon}</div>
              <div className="bold text-sm">{e.name}</div>
              <div className="text-muted text-xs mt-4">{e.total_questions}Q • {e.duration_minutes}min</div>
            </div>
          ))}
        </div>
      </div>

      {/* Config */}
      <div className="card mb-16">
        <div className="bold mb-16">⚙️ Configure</div>
        <div className="grid-3">
          <div className="form-group">
            <label className="label">Difficulty</label>
            <select className="input select" value={config.difficulty} onChange={e => set('difficulty', e.target.value)}>
              {['Easy', 'Medium', 'Hard', 'AI-Based'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Questions</label>
            <select className="input select" value={config.numQ} onChange={e => set('numQ', parseInt(e.target.value))}>
              <option value={0}>Full Paper ({totalQ}Q)</option>
              <option value={15}>Mini (15Q)</option>
              <option value={30}>Half (30Q)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Language</label>
            <select className="input select" value={config.lang} onChange={e => set('lang', e.target.value)}>
              <option value="en">English</option>
              <option value="hi">Hindi + English</option>
            </select>
          </div>
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--muted)' }}>
          📋 {exam?.name} • {config.numQ || totalQ}Q • {exam?.duration_minutes}min • +{exam?.marking_scheme?.correct}/‑{Math.abs(exam?.marking_scheme?.wrong || 0)} marking
        </div>
      </div>

      {/* When */}
      <div className="card mb-16">
        <div className="bold mb-16">📅 When?</div>
        <div className="tabs">
          <button className={`tab ${config.scheduleNow ? 'active' : ''}`} onClick={() => set('scheduleNow', true)}>▶ Start Now</button>
          <button className={`tab ${!config.scheduleNow ? 'active' : ''}`} onClick={() => set('scheduleNow', false)}>📅 Schedule Later</button>
        </div>
        {!config.scheduleNow && (
          <div className="form-group">
            <label className="label">Pick Date & Time</label>
            <input className="input" type="datetime-local" value={config.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} min={new Date().toISOString().slice(0, 16)} />
          </div>
        )}
        <div className="flex gap-12">
          {config.scheduleNow ? (
            <button className="btn btn-primary btn-lg" onClick={handleStart} disabled={(user?.tests_remaining || 0) <= 0}>
              🚀 Generate & Start ({user?.tests_remaining || 0} tests left)
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSchedule}>📅 Schedule Exam</button>
          )}
          {(user?.tests_remaining || 0) <= 0 && (
            <button className="btn btn-secondary" onClick={() => navigate('/billing')}>Buy Tests →</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MY TESTS ──────────────────────────────────────────────────────────────────
export function MyTests() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    examAPI.attempts({ limit: 50 }).then(r => { setAttempts(r.data.attempts); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? attempts : attempts.filter(a => a.exam_category_id === filter);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="flex-between mb-24">
        <div><div className="page-title">MY TESTS</div><div className="page-sub">{attempts.length} tests taken</div></div>
        <select className="input select" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Exams</option>
          {[...new Set(attempts.map(a => a.exam_category_id))].map(id => <option key={id} value={id}>{id?.toUpperCase()}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center" style={{ padding: 60 }}>
          <div style={{ fontSize: 48 }}>📝</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, marginTop: 12 }}>NO TESTS YET</div>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/schedule')}>Take First Test →</button>
        </div>
      ) : filtered.map(a => (
        <div key={a.id} className="card mb-12 flex gap-16" style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 36 }}>{EXAM_ICONS[a.exam_category_id] || '📝'}</div>
          <div style={{ flex: 1 }}>
            <div className="bold">{a.exam_name}</div>
            <div className="text-muted text-xs mt-4">
              {new Date(a.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {a.total_questions}Q • {a.difficulty}
            </div>
            <div className="flex gap-8 mt-8">
              <span className="badge badge-green">{a.correct_count} correct</span>
              <span className="badge badge-red">{a.wrong_count} wrong</span>
              <span className="badge badge-gray">{a.skipped_count} skipped</span>
            </div>
          </div>
          <div className="text-center">
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 48, color: a.percentage >= 60 ? 'var(--green)' : a.percentage >= 40 ? '#ff8c00' : 'var(--red)', lineHeight: 1 }}>{a.percentage}%</div>
            <div className="text-muted text-xs">{a.score}/{a.max_score}</div>
            <button className="btn btn-secondary btn-sm mt-8" onClick={() => navigate(`/results/${a.id}`)}>View Results →</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── RESULTS ───────────────────────────────────────────────────────────────────
export function Results({ attemptId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [tab, setTab] = useState('overview');
  const [reviewLang, setReviewLang] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examAPI.results(attemptId).then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [attemptId]);

  const getAI = async () => {
    setLoadingAI(true);
    try {
      const r = await examAPI.analyze(attemptId);
      setAnalysis(r.data.analysis);
      toast.success('AI analysis ready!');
    } catch { toast.error('AI analysis failed. Please try again in a moment.'); }
    setLoadingAI(false);
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return <div className="page-container"><div className="text-muted">Results not found</div></div>;

  const { attempt, analytics } = data;
  const pct = attempt.percentage;
  const grade = pct >= 90 ? { label: 'Excellent 🏆', color: 'var(--green)' } : pct >= 70 ? { label: 'Good 👍', color: 'var(--accent)' } : pct >= 50 ? { label: 'Average 📈', color: '#ff8c00' } : { label: 'Needs Work 💪', color: 'var(--red)' };

  const sectionData = (attempt.exam_data?.sections || []).map(s => {
    const sAnswers = (attempt.answers || []).filter(a => a.section === s.name);
    const correct = sAnswers.filter(a => a.isCorrect).length;
    return { name: s.name, score: sAnswers.length ? Math.round(correct / sAnswers.length * 100) : 0, correct, total: sAnswers.length };
  });

  const weakTopics = [...new Set((attempt.answers || []).filter(a => !a.isCorrect && a.answered).map(a => a.topic))].filter(Boolean).slice(0, 6);
  const strongTopics = [...new Set((attempt.answers || []).filter(a => a.isCorrect).map(a => a.topic))].filter(Boolean).slice(0, 6);

  return (
    <div className="page-container">
      <div className="flex-between mb-24">
        <div><div className="page-title">📊 RESULTS</div><div className="page-sub">{attempt.exam_name} • {new Date(attempt.submitted_at).toLocaleString('en-IN')}</div></div>
        <button className="btn btn-secondary" onClick={() => navigate('/schedule')}>🔄 New Test</button>
      </div>

      {/* Score card */}
      <div className="card mb-24" style={{ background: 'linear-gradient(135deg, var(--surface) 0%, rgba(247,183,49,0.05) 100%)' }}>
        <div className="flex gap-24 wrap">
          <div className="text-center">
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 88, color: grade.color, lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: grade.color }}>{grade.label}</div>
            <div className="text-muted text-sm mt-4">vs national avg: {analytics.national_avg}%</div>
            <div className="text-muted text-xs">Better than {analytics.better_than_percent}% of students</div>
          </div>
          <div className="grid-3" style={{ flex: 1, alignContent: 'start' }}>
            <div className="stat-card card-sm"><div className="stat-label">Score</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: 'var(--accent)' }}>{Math.round(attempt.score)}/{attempt.max_score}</div></div>
            <div className="stat-card card-sm"><div className="stat-label">Correct</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: 'var(--green)' }}>{attempt.correct_count}</div></div>
            <div className="stat-card card-sm"><div className="stat-label">Wrong</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: 'var(--red)' }}>{attempt.wrong_count}</div></div>
            <div className="stat-card card-sm"><div className="stat-label">Skipped</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 28 }}>{attempt.skipped_count}</div></div>
            <div className="stat-card card-sm"><div className="stat-label">Accuracy</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 28 }}>{attempt.answered_questions ? Math.round(attempt.correct_count / attempt.answered_questions * 100) : 0}%</div></div>
            <div className="stat-card card-sm"><div className="stat-label">Time</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 28 }}>{Math.round((attempt.time_taken_seconds || 0) / 60)}m</div></div>
          </div>
        </div>
      </div>

      <div className="tabs">
        {['overview', 'section-wise', 'review', 'ai-analysis'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'ai-analysis' ? '🤖 AI Analysis' : t === 'section-wise' ? '📊 Sections' : t === 'review' ? '🔍 Review' : '📈 Overview'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div className="card mb-16">
            <div className="bold mb-16">Section Performance</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
                <YAxis stroke="var(--muted)" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {sectionData.map((s, i) => <Cell key={i} fill={s.score >= 60 ? 'var(--green)' : s.score >= 40 ? 'var(--accent)' : 'var(--red)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid-2">
            <div className="card">
              <div className="bold text-red mb-12">⚠ Weak Topics</div>
              {weakTopics.length === 0 ? <div className="text-muted text-sm">No weak topics! 🎉</div> : weakTopics.map(t => <div key={t} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 14, color: 'var(--red)' }}>⚠ {t}</div>)}
            </div>
            <div className="card">
              <div className="bold text-green mb-12">💪 Strong Topics</div>
              {strongTopics.map(t => <div key={t} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 14, color: 'var(--green)' }}>✓ {t}</div>)}
            </div>
          </div>
        </div>
      )}

      {tab === 'section-wise' && (
        <div>
          {sectionData.map(s => (
            <div key={s.name} className="card mb-12">
              <div className="flex-between mb-8">
                <div className="bold">{s.name}</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: s.score >= 60 ? 'var(--green)' : s.score >= 40 ? 'var(--accent)' : 'var(--red)' }}>{s.score}%</div>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${s.score}%`, background: s.score >= 60 ? 'var(--green)' : s.score >= 40 ? 'var(--accent)' : 'var(--red)' }} /></div>
              <div className="text-muted text-sm mt-8">{s.correct}/{s.total} correct</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'review' && (
        <div>
          <div className="flex gap-8 mb-16">
            <button className={`btn btn-sm ${reviewLang === 'en' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReviewLang('en')}>English</button>
            <button className={`btn btn-sm ${reviewLang === 'hi' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReviewLang('hi')}>हिंदी</button>
          </div>
          {(attempt.exam_data?.sections || []).flatMap((s, si) => s.questions.map((q, qi) => {
            const ans = (attempt.answers || []).find(a => a.questionId === q.id);
            return (
              <div key={`${si}-${qi}`} className="card mb-12" style={{ borderColor: ans?.isCorrect ? 'var(--green)' : ans?.answered ? 'var(--red)' : 'var(--border)' }}>
                <div className="flex-between mb-8">
                  <span className="text-xs text-muted font-mono">Q{si * 999 + qi + 1} | {q.topic} | {s.name}</span>
                  <span className={`badge ${ans?.isCorrect ? 'badge-green' : ans?.answered ? 'badge-red' : 'badge-gray'}`}>
                    {ans?.isCorrect ? '✓ Correct' : ans?.answered ? '✗ Wrong' : '— Skipped'}
                  </span>
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>{reviewLang === 'hi' && q.question_hi ? q.question_hi : q.question}</div>
                {(reviewLang === 'hi' && q.options_hi ? q.options_hi : q.options || []).map((opt, oi) => {
                  const label = ['A', 'B', 'C', 'D'][oi];
                  return (
                    <div key={oi} className={`option ${q.correct === label ? 'correct' : ans?.userAnswer === label ? 'wrong' : ''}`} style={{ cursor: 'default', marginBottom: 6, fontSize: 14 }}>
                      <div className="option-label" style={{ fontSize: 12 }}>{label}</div>
                      <div>{opt.replace(/^[A-D]\)\s*/, '')}</div>
                    </div>
                  );
                })}
                <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 16px', marginTop: 12, fontSize: 14 }}>
                  <div className="bold text-accent mb-4">💡 Solution</div>
                  <div className="text-muted">{reviewLang === 'hi' && q.solution_hi ? q.solution_hi : q.solution}</div>
                </div>
              </div>
            );
          }))}
        </div>
      )}

      {tab === 'ai-analysis' && (
        <div>
          {!analysis && !loadingAI && (
            <div className="card text-center" style={{ padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, marginBottom: 8 }}>GET AI ANALYSIS</div>
              <div className="text-muted mb-16">Claude will analyze your performance and give personalized study recommendations</div>
              <button className="btn btn-primary btn-lg" onClick={getAI}>🚀 Generate AI Analysis</button>
            </div>
          )}
          {loadingAI && <div className="loading-center"><div className="spinner" /><div className="text-muted">AI analyzing your performance...</div></div>}
          {analysis && (
            <div>
              <div className="card mb-16" style={{ borderColor: 'var(--accent)' }}>
                <div className="bold text-accent mb-8">📋 Overall</div>
                <div style={{ fontSize: 15, lineHeight: 1.7 }}>{analysis.overall}</div>
                {analysis.predicted_rank && <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(247,183,49,0.1)', borderRadius: 8, fontSize: 14 }}>🎯 Predicted Rank: <strong className="text-accent">{analysis.predicted_rank}</strong></div>}
              </div>
              <div className="grid-2 mb-16">
                <div className="card"><div className="bold text-green mb-12">💪 Strengths</div>{(analysis.strengths || []).map((s, i) => <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>✓ {s}</div>)}</div>
                <div className="card"><div className="bold text-red mb-12">⚠ Weaknesses</div>{(analysis.weaknesses || []).map((w, i) => <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>⚠ {w}</div>)}</div>
              </div>
              <div className="card mb-16"><div className="bold text-accent mb-12">📚 Recommendations</div>{(analysis.recommendations || []).map((r, i) => <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>{i + 1}. {r}</div>)}</div>
              <div className="card"><div className="bold mb-8">📅 Study Plan</div><div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--muted)' }}>{analysis.study_plan}</div></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── CONTESTS ──────────────────────────────────────────────────────────────────
export function Contests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    contestAPI.list().then(r => { setContests(r.data.contests); if (r.data.contests[0]) contestAPI.leaderboard(r.data.contests[0].id).then(lr => setLeaderboard(lr.data.leaderboard)).catch(() => {}); });
    if (user) contestAPI.history().then(r => setHistory(r.data.history)).catch(() => {});
  }, [user]);

  const handleEnroll = async (contest) => {
    if (contest.is_enrolled) return;
    try {
      const orderRes = await paymentAPI.createOrder({ type: 'contest_enrollment', contest_id: contest.id });
      if (orderRes.data.mock_mode) {
        await paymentAPI.mockComplete({ transaction_id: orderRes.data.transaction_id });
        toast.success(`✅ Enrolled in ${contest.title}!`);
        contestAPI.list().then(r => setContests(r.data.contests));
      } else {
        // Real Razorpay
        const options = {
          key: orderRes.data.key_id,
          amount: orderRes.data.amount,
          currency: 'INR',
          name: 'ParikshaPro',
          description: contest.title,
          order_id: orderRes.data.order_id,
          handler: async (response) => {
            await paymentAPI.verify({ ...response, transaction_id: orderRes.data.transaction_id });
            toast.success('✅ Enrolled!');
            contestAPI.list().then(r => setContests(r.data.contests));
          },
        };
        new window.Razorpay(options).open();
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Could not enroll. Please try again.'); }
  };

  return (
    <div className="page-container">
      <div className="mb-24"><div className="page-title">🏆 WEEKLY CONTESTS</div><div className="page-sub">Every Sunday • Live Leaderboard • Win Prizes</div></div>

      <div className="card mb-24" style={{ background: 'linear-gradient(135deg, #1a1208 0%, #0d1a14 100%)', borderColor: 'rgba(247,183,49,0.3)' }}>
        <div className="flex gap-24 wrap">
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: 'var(--accent)' }}>PARIKSHAPRO GRAND CONTEST</div>
            <div className="text-muted">Every Sunday 10:00 AM IST • All India Competition</div>
            <div className="flex gap-12 mt-16 wrap">
              {[['🥇 Top 3', '1 Month Pro'], ['🏅 Top 10', '5 Free Tests'], ['⏱ Live Rank', 'Every 60s']].map(([label, val]) => (
                <div key={label} style={{ background: 'rgba(247,183,49,0.08)', border: '1px solid rgba(247,183,49,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                  <strong style={{ display: 'block', color: 'var(--accent)' }}>{label}</strong>{val}
                </div>
              ))}
            </div>
          </div>
          <div className="text-center">
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 64, color: 'var(--accent)', lineHeight: 1 }}>₹11</div>
            <div className="text-muted text-sm">per entry</div>
          </div>
        </div>
      </div>

      <div className="tabs"><button className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>📅 Upcoming</button><button className={`tab ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>📊 Leaderboard</button><button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📋 My History</button></div>

      {tab === 'upcoming' && (
        <div>
          {contests.map(c => (
            <div key={c.id} className="card mb-12" style={{ borderColor: c.status === 'live' ? 'var(--red)' : c.status === 'registration_open' ? 'rgba(247,183,49,0.3)' : 'var(--border)' }}>
              <div className="flex-between">
                <div>
                  <div className="flex gap-8 mb-8">
                    <div className="bold">{c.title}</div>
                    {c.status === 'live' && <span className="badge badge-red">🔴 LIVE</span>}
                    {c.status === 'registration_open' && <span className="badge badge-gold">📝 OPEN</span>}
                    {c.status === 'upcoming' && <span className="badge badge-gray">⏳ Soon</span>}
                  </div>
                  <div className="text-muted text-sm">{new Date(c.scheduled_at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} • {new Date(c.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</div>
                  <div className="flex gap-8 mt-8">
                    <span className="badge badge-purple">{c.exam_category_id?.toUpperCase()}</span>
                    <span className="text-muted text-xs">{c.participant_count} enrolled</span>
                  </div>
                </div>
                <div className="text-center">
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: 'var(--accent)' }}>₹{c.enrollment_fee}</div>
                  {c.is_enrolled ? <span className="badge badge-green">✅ Enrolled</span> : (
                    <button className="btn btn-primary btn-sm" onClick={() => handleEnroll(c)} disabled={c.status === 'completed'}>
                      {c.status === 'completed' ? 'Ended' : `Enroll ₹${c.enrollment_fee}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="card">
          <div className="bold mb-16">Live Leaderboard — Latest Contest</div>
          {leaderboard.length === 0 ? <div className="text-muted text-center" style={{ padding: 32 }}>No results yet</div> : leaderboard.slice(0, 20).map((l, i) => (
            <div key={i} className="flex gap-12" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: i < 3 ? 'rgba(247,183,49,0.15)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: i < 3 ? 'var(--accent)' : 'var(--muted)', flexShrink: 0 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>
              <div style={{ flex: 1 }}><div className="bold text-sm">{l.name}</div></div>
              <div className="text-accent bold font-bebas" style={{ fontSize: 20 }}>{l.score}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {history.length === 0 ? <div className="card text-center" style={{ padding: 40 }}><div className="text-muted">No contest history yet</div></div> : history.map(h => (
            <div key={h.id} className="card mb-12 flex-between">
              <div><div className="bold text-sm">{h.Contest?.title}</div><div className="text-muted text-xs mt-4">{h.Contest?.scheduled_at ? new Date(h.Contest.scheduled_at).toLocaleDateString() : ''}</div></div>
              <div className="text-center">{h.rank ? <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: 'var(--accent)' }}>#{h.rank}</div> : <span className="badge badge-gray">Pending</span>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── STUDY NOTES ───────────────────────────────────────────────────────────────
export function Study() {
  const [topic, setTopic] = useState('');
  const [examId, setExamId] = useState('jee');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(null);
  const [savedNotes, setSavedNotes] = useState([]);

  const QUICK = { jee: ["Newton's Laws", "Organic Chemistry", "Integration", "Thermodynamics", "Electrostatics"], neet: ["Cell Division", "Human Digestive System", "Genetics", "Plant Physiology", "Biomolecules"], upsc: ["Indian Constitution", "Mughal Empire", "Climate of India", "Indian Economy", "Environment"], ibps: ["Time & Work", "Data Interpretation", "Blood Relations", "English Grammar", "Probability"], ssc: ["Reasoning Analogies", "SI & CI", "General Science", "History of India", "Grammar"], gate: ["Data Structures", "Algorithms", "Operating Systems", "Computer Networks", "DBMS"] };

  useEffect(() => { studyAPI.notes({ limit: 10 }).then(r => setSavedNotes(r.data.notes)).catch(() => {}); }, []);

  const generate = async () => {
    if (!topic.trim()) { toast.error('Enter a topic'); return; }
    setLoading(true);
    try {
      const r = await studyAPI.aiNote({ topic, exam_category_id: examId, language: 'en' });
      setNote(r.data.note);
      toast.success('📚 Notes generated!');
    } catch (err) { toast.error(err.response?.data?.error || 'Could not generate notes. Please try again.'); }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="mb-24"><div className="page-title">📚 AI STUDY NOTES</div><div className="page-sub">Instant AI-generated notes on any topic</div></div>

      <div className="card mb-16">
        <div className="bold mb-16">🤖 Generate Notes</div>
        <div className="grid-2 mb-16">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Exam</label>
            <select className="input select" value={examId} onChange={e => { setExamId(e.target.value); setTopic(''); }}>
              {Object.entries(EXAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Topic</label>
            <input className="input" placeholder="e.g. Newton's Laws" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} />
          </div>
        </div>
        <div className="flex gap-8 wrap mb-16">
          {(QUICK[examId] || []).map(t => <button key={t} className="btn btn-secondary btn-sm" onClick={() => setTopic(t)}>{t}</button>)}
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={loading || !topic}>
          {loading ? '⏳ Generating...' : '📖 Generate Notes'}
        </button>
      </div>

      {loading && <div className="loading-center"><div className="spinner" /><div className="text-muted">AI creating your notes...</div></div>}

      {note && !loading && (
        <div>
          <div className="card mb-16" style={{ borderColor: 'var(--accent)' }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: 'var(--accent)', marginBottom: 8 }}>{note.content?.title || note.topic}</div>
            <div className="text-muted" style={{ lineHeight: 1.7 }}>{note.content?.summary}</div>
          </div>
          {note.content?.key_concepts?.length > 0 && (
            <div className="card mb-16">
              <div className="bold mb-12">💡 Key Concepts</div>
              {note.content.key_concepts.map((c, i) => (
                <div key={i} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                  <div className="bold text-sm text-accent">{c.term}</div>
                  <div className="text-muted text-sm mt-4">{c.definition}</div>
                </div>
              ))}
            </div>
          )}
          {note.content?.important_formulas?.length > 0 && (
            <div className="card mb-16">
              <div className="bold mb-12">📐 Formulas</div>
              {note.content.important_formulas.map((f, i) => <div key={i} className="font-mono" style={{ background: 'var(--surface2)', padding: '8px 12px', borderRadius: 6, marginBottom: 6, fontSize: 14 }}>{f}</div>)}
            </div>
          )}
          <div className="grid-2">
            {note.content?.exam_tips?.length > 0 && <div className="card"><div className="bold mb-12">🎯 Exam Tips</div>{note.content.exam_tips.map((t, i) => <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>→ {t}</div>)}</div>}
            {note.content?.practice_questions?.length > 0 && <div className="card"><div className="bold mb-12">✍️ Practice</div>{note.content.practice_questions.map((q, i) => <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}><div className="bold text-sm">Q: {q.q}</div><div className="text-muted text-sm mt-4">A: {q.a}</div></div>)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── FORUM ─────────────────────────────────────────────────────────────────────
export function Forum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', exam_category_id: '', tags: '' });
  const [selected, setSelected] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadPosts(); }, [filter]);

  const loadPosts = () => {
    setLoading(true);
    const params = { limit: 30, sort: 'latest' };
    if (filter !== 'all') params.exam_id = filter;
    forumAPI.posts(params).then(r => { setPosts(r.data.posts); setLoading(false); }).catch(() => setLoading(false));
  };

  const submitPost = async () => {
    if (!form.title || !form.body) { toast.error('Title and body required'); return; }
    try {
      await forumAPI.createPost({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) });
      toast.success('Post created!');
      setCreating(false);
      setForm({ title: '', body: '', exam_category_id: '', tags: '' });
      loadPosts();
    } catch (err) { toast.error(err.response?.data?.error || 'Could not create post. Please try again.'); }
  };

  const submitReply = async (postId) => {
    if (!replyBody.trim()) return;
    try {
      await forumAPI.reply(postId, { body: replyBody });
      toast.success('Reply posted!');
      setReplyBody('');
      if (selected) forumAPI.post(selected.id).then(r => setSelected(r.data.post));
    } catch (err) { toast.error('Could not post reply. Please try again.'); }
  };

  const vote = async (postId, v) => {
    try {
      const r = await forumAPI.votePost(postId, v);
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, upvotes: r.data.upvotes, downvotes: r.data.downvotes } : p));
    } catch {}
  };

  if (selected) return (
    <div className="page-container">
      <button className="btn btn-secondary btn-sm mb-16" onClick={() => setSelected(null)}>← Back</button>
      <div className="card mb-16">
        <div className="flex-between mb-16">
          <div className="bold" style={{ fontSize: 18 }}>{selected.title}</div>
          {selected.exam_category_id && <span className="badge badge-purple">{selected.exam_category_id.toUpperCase()}</span>}
        </div>
        <div style={{ lineHeight: 1.7, marginBottom: 16 }}>{selected.body}</div>
        <div className="flex gap-8 text-muted text-xs">
          <span>👤 {selected.User?.name}</span>
          <span>🕐 {new Date(selected.created_at).toLocaleDateString()}</span>
          <span>💬 {selected.reply_count} replies</span>
        </div>
        <div className="flex gap-8 mt-12">
          <button className="btn btn-secondary btn-sm" onClick={() => vote(selected.id, 'up')}>👍 {selected.upvotes}</button>
          <button className="btn btn-secondary btn-sm" onClick={() => vote(selected.id, 'down')}>👎 {selected.downvotes}</button>
        </div>
      </div>
      {(selected.ForumReplies || []).map(r => (
        <div key={r.id} className="card mb-8 card-sm" style={{ marginLeft: 24 }}>
          <div style={{ lineHeight: 1.7, fontSize: 14 }}>{r.body}</div>
          <div className="text-muted text-xs mt-8">👤 {r.User?.name} • {new Date(r.created_at).toLocaleDateString()}</div>
        </div>
      ))}
      {user && (
        <div className="card mt-16">
          <div className="bold mb-12">💬 Add Reply</div>
          <textarea className="input" rows={3} placeholder="Your reply..." value={replyBody} onChange={e => setReplyBody(e.target.value)} style={{ resize: 'vertical' }} />
          <button className="btn btn-primary btn-sm mt-8" onClick={() => submitReply(selected.id)}>Post Reply</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="page-container">
      <div className="flex-between mb-24">
        <div><div className="page-title">💬 FORUM</div><div className="page-sub">Ask, discuss, and help fellow aspirants</div></div>
        {user && <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New Post</button>}
      </div>

      {creating && (
        <div className="card mb-16">
          <div className="bold mb-16">📝 New Post</div>
          <div className="form-group"><label className="label">Title</label><input className="input" placeholder="Your question or topic..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="form-group"><label className="label">Body</label><textarea className="input" rows={4} placeholder="Write your post..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} style={{ resize: 'vertical' }} /></div>
          <div className="grid-2">
            <div className="form-group"><label className="label">Exam (optional)</label><select className="input select" value={form.exam_category_id} onChange={e => setForm(f => ({ ...f, exam_category_id: e.target.value }))}><option value="">All Exams</option>{Object.entries(EXAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="form-group"><label className="label">Tags (comma-separated)</label><input className="input" placeholder="physics, mechanics, doubt" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div>
          </div>
          <div className="flex gap-8"><button className="btn btn-primary" onClick={submitPost}>Post</button><button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button></div>
        </div>
      )}

      <div className="flex gap-8 mb-16 wrap">
        {[['all', 'All'], ...Object.entries(EXAM_LABELS).map(([k, v]) => [k, v])].map(([val, label]) => (
          <button key={val} className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : posts.map(p => (
        <div key={p.id} className="card mb-12 card-hover" onClick={() => { setSelected(null); forumAPI.post(p.id).then(r => setSelected(r.data.post)); }}>
          <div className="flex-between mb-8">
            <div className="bold" style={{ fontSize: 15 }}>{p.is_pinned ? '📌 ' : ''}{p.title}</div>
            {p.exam_category_id && <span className="badge badge-purple">{p.exam_category_id.toUpperCase()}</span>}
          </div>
          <div className="text-muted text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.body}</div>
          <div className="flex gap-12 mt-12 text-muted text-xs">
            <span>👤 {p.User?.name}</span>
            <span>🕐 {new Date(p.created_at).toLocaleDateString()}</span>
            <span>💬 {p.reply_count}</span>
            <span>👍 {p.upvotes}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── AI TUTOR ──────────────────────────────────────────────────────────────────
export function AITutor() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{ role: 'assistant', content: `Namaste! 🙏 I'm your AI Tutor. Ask me anything about ${user?.target_exams?.[0]?.toUpperCase() || 'your exam'} — concepts, problems, strategy, doubt-clearing!` }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const QUICK = ["Explain Newton's third law", "How to solve quadratic equations?", "Difference between NDA and CDS?", "Tips for reading comprehension?", "Explain photosynthesis", "How to crack UPSC in 1 year?"];

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = [...messages.slice(-8), userMsg];
      const r = await tutorAPI.chat(history);
      setMessages(m => [...m, { role: 'assistant', content: r.data.reply }]);
    } catch { setMessages(m => [...m, { role: 'assistant', content: "Sorry, I'm having trouble. Please try again." }]); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
        <div><div className="bold">AI Tutor</div><div className="text-muted text-xs">Powered by Claude • Always online</div></div>
        <span className="badge badge-green" style={{ marginLeft: 'auto' }}>● Online</span>
      </div>

      {messages.length <= 1 && (
        <div style={{ padding: '12px 24px' }}>
          <div className="text-muted text-sm mb-8">Quick questions:</div>
          <div className="flex gap-8 wrap">{QUICK.map(q => <button key={q} className="btn btn-secondary btn-sm" onClick={() => setInput(q)}>{q}</button>)}</div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginRight: 8, alignSelf: 'flex-start' }}>🤖</div>}
            <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)', border: m.role === 'user' ? 'none' : '1px solid var(--border)', color: m.role === 'user' ? '#000' : 'var(--text)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
            <div style={{ display: 'flex', gap: 4, padding: '12px 16px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', animation: `bounce ${0.6 + i * 0.2}s ease infinite alternate` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Ask anything..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} />
        <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>Send ↵</button>
      </div>
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
export function Profile() {
  const { user, setUser, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', preferred_language: user?.preferred_language || 'en', target_exams: user?.target_exams || ['jee'] });
  const [badges, setBadges] = useState([]);
  const [referrals, setReferrals] = useState({ referrals: [], total: 0, completed: 0 });

  useEffect(() => {
    userAPI.profile().then(r => { setBadges(r.data.badges || []); }).catch(() => {});
    userAPI.referrals().then(r => setReferrals(r.data)).catch(() => {});
  }, []);

  const save = async () => {
    try {
      await userAPI.updateProfile(form);
      await refreshUser();
      toast.success('Profile updated!');
    } catch { toast.error('Could not save profile. Please try again.'); }
  };

  const BADGE_INFO = { topper: { icon: '🏆', label: 'Topper', desc: '90%+ score' }, consistent: { icon: '🎯', label: 'Consistent', desc: '10+ tests' }, helper: { icon: '🤝', label: 'Helper', desc: '5+ forum posts' }, ambassador: { icon: '👑', label: 'Ambassador', desc: '5+ referrals' }, perfectionist: { icon: '💯', label: 'Perfectionist', desc: '100% score' } };

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div className="mb-24"><div className="page-title">MY PROFILE</div></div>

      <div className="card mb-16">
        <div className="flex gap-16 mb-24">
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 28, color: '#000' }}>{user?.name?.[0]}</div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28 }}>{user?.name}</div>
            <div className="text-muted">{user?.email}</div>
            <div className="flex gap-8 mt-8">
              <span className="badge badge-gold">{user?.plan_type?.toUpperCase()}</span>
              <span className="badge badge-green">🔥 {user?.streak || 0} days</span>
              {user?.is_verified && <span className="badge badge-blue">✓ Verified</span>}
            </div>
          </div>
        </div>
        <div className="grid-3 mb-24">
          <div className="stat-card card-sm"><div className="stat-label">Tests Taken</div><div className="stat-val">{user?.total_tests || 0}</div></div>
          <div className="stat-card card-sm"><div className="stat-label">Tests Left</div><div className="stat-val">{user?.tests_remaining || 0}</div></div>
          <div className="stat-card card-sm"><div className="stat-label">Referrals</div><div className="stat-val">{referrals.completed}</div></div>
        </div>
        <div className="divider" />
        <div className="form-group"><label className="label">Full Name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div className="form-group"><label className="label">Preferred Language</label><select className="input select" value={form.preferred_language} onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}><option value="en">English</option><option value="hi">हिंदी</option></select></div>
        <button className="btn btn-primary" onClick={save}>Save Changes</button>
      </div>

      {badges.length > 0 && (
        <div className="card mb-16">
          <div className="bold mb-16">🏅 Your Badges</div>
          <div className="flex gap-12 wrap">
            {badges.map((b, i) => {
              const info = BADGE_INFO[b.badge_type] || {};
              return <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}><div style={{ fontSize: 24 }}>{info.icon}</div><div className="bold text-sm mt-4">{info.label}</div><div className="text-muted text-xs">{info.desc}</div></div>;
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="bold mb-16">🔗 Referral Program</div>
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div><div className="text-xs text-muted mb-4">Your Code</div><div className="font-mono bold text-accent" style={{ fontSize: 22 }}>{user?.referral_code}</div></div>
          <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(user?.referral_code || ''); toast.success('Copied!'); }}>Copy</button>
        </div>
        <div className="grid-2 mb-12">
          <div className="stat-card card-sm"><div className="stat-label">Total Referrals</div><div className="stat-val">{referrals.total}</div></div>
          <div className="stat-card card-sm"><div className="stat-label">Completed</div><div className="stat-val">{referrals.completed}</div></div>
        </div>
        <div className="text-muted text-sm">Share your code → you earn 1 free test • friend gets 2 free tests on signup</div>
      </div>
    </div>
  );
}

// ── BILLING ───────────────────────────────────────────────────────────────────
export function Billing() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { show: showLoader, hide: hideLoader } = useLoading();
  const [plans, setPlans] = useState({});
  const [gstRate, setGstRate] = useState(0.18);
  const [history, setHistory] = useState([]);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    paymentAPI.plans().then(r => { setPlans(r.data.plans); setGstRate(r.data.gst_rate || 0.18); });
    paymentAPI.history().then(r => setHistory(r.data.transactions)).catch(() => {});
  }, []);

  const withGst = (price) => Math.round(price * (1 + gstRate));

  const buy = async (planId, plan) => {
    setBuying(planId);
    showLoader('Creating your order...');
    try {
      const orderRes = await paymentAPI.createOrder({ type: 'plan_purchase', plan_id: planId });
      hideLoader();
      if (orderRes.data.mock_mode) {
        showLoader('Activating plan...');
        await paymentAPI.mockComplete({ transaction_id: orderRes.data.transaction_id });
        await refreshUser();
        hideLoader();
        toast.success(`✅ ${plan.name} activated! ${plan.tests} tests added.`);
        paymentAPI.history().then(r => setHistory(r.data.transactions)).catch(() => {});
      } else {
        if (!window.Razorpay) {
          toast.error('Payment gateway failed to load. Please refresh the page and try again.');
          setBuying(null);
          return;
        }
        const options = {
          key: orderRes.data.key_id, amount: orderRes.data.amount, currency: 'INR',
          name: 'ParikshaPro', description: plan.name, order_id: orderRes.data.order_id,
          handler: async (response) => {
            showLoader('Verifying payment...');
            try {
              await paymentAPI.verify({ ...response, transaction_id: orderRes.data.transaction_id });
              await refreshUser();
              paymentAPI.history().then(r => setHistory(r.data.transactions)).catch(() => {});
              toast.success(`✅ ${plan.name} activated! ${plan.tests} tests added to your account.`);
            } catch {
              toast.error('Payment received but activation failed. Please contact support.');
            } finally {
              hideLoader();
            }
          },
          modal: { ondismiss: () => { setBuying(null); toast('Payment cancelled.', { icon: 'ℹ️' }); } },
          prefill: { name: user?.name, email: user?.email },
          theme: { color: '#f7b731' },
        };
        new window.Razorpay(options).open();
        return; // don't clear buying until modal closes
      }
    } catch (err) {
      hideLoader();
      const msg = err.response?.data?.error;
      if (err.response?.status === 401) toast.error('Session expired. Please log in again.');
      else if (err.response?.status === 400) toast.error(msg || 'Invalid request. Please try again.');
      else toast.error(msg || 'Payment failed. Please try again.');
    }
    setBuying(null);
  };

  const PLAN_DISPLAY = [
    {
      id: 'starter', label: 'Starter Pack', basePrice: 9, validity: '30 days', popular: false,
      highlight: '5 Mock Tests',
      features: [
        '5 full-length mock tests',
        'Detailed score analysis',
        'Topic-wise breakdown',
        'Valid for 30 days',
        'All exam categories',
      ],
    },
    {
      id: 'monthly', label: 'Monthly Pro', basePrice: 49, validity: '1 month', popular: true,
      highlight: '20 Mock Tests',
      features: [
        '20 full-length mock tests',
        'AI-powered exam generation',
        'Detailed performance analytics',
        'Leaderboard & rank comparison',
        'Study notes access',
        'Valid for 1 month',
      ],
    },
    {
      id: 'semester', label: 'Semester Pack', basePrice: 59, validity: '2 months',
      highlight: '15 Mock Tests',
      features: [
        '15 full-length mock tests',
        'AI-powered exam generation',
        'Detailed performance analytics',
        'Study notes access',
        'Forum community access',
        'Valid for 2 months',
      ],
    },
    {
      id: 'annual', label: 'Annual Pro', basePrice: 299, validity: '1 year',
      highlight: '100 Mock Tests',
      features: [
        '100 full-length mock tests',
        'AI-powered exam generation',
        'Advanced analytics & insights',
        'All study materials',
        'Contest entries (5 free)',
        'Priority support',
        'Valid for 1 year',
      ],
    },
    {
      id: 'elite', label: 'All India Elite', basePrice: 499, validity: '1 year', elite: true,
      highlight: 'Unlimited Tests',
      features: [
        'Unlimited mock tests',
        'AI tutor (unlimited sessions)',
        'Live All India mock contests',
        'Full analytics dashboard',
        'All study materials & notes',
        'Unlimited contest entries',
        '1-on-1 doubt support',
        'Valid for 1 year',
      ],
    },
  ];

  const PLAN_RANK = { free: 0, starter: 1, monthly: 2, semester: 3, annual: 4, elite: 5 };
  const currentRank = PLAN_RANK[user?.plan_type] ?? 0;

  const getPlanAction = (p) => {
    const rank = PLAN_RANK[p.id] ?? 0;
    if (user?.plan_type === p.id) return 'current';
    if (rank < currentRank) return 'downgrade';
    return 'upgrade';
  };

  return (
    <div className="page-container">
      <div className="mb-24"><div className="page-title">BILLING & PLANS</div><div className="page-sub">GST included • Razorpay secure • All UPI/cards accepted</div></div>

      <div className="card mb-24" style={{ borderColor: PLAN_COLORS[user?.plan_type] || 'var(--accent)' }}>
        <div className="flex-between">
          <div>
            <div className="bold text-lg">Current Plan: <span style={{ color: PLAN_COLORS[user?.plan_type] || 'var(--accent)' }}>{user?.plan_type?.toUpperCase()}</span></div>
            <div className="text-muted text-sm mt-4">{user?.tests_remaining} tests remaining{user?.plan_expiry ? ` • Expires ${new Date(user.plan_expiry).toLocaleDateString('en-IN')}` : ''}</div>
          </div>
          <span className="badge badge-green">● Active</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 24 }}>
        {PLAN_DISPLAY.map(p => {
          const finalPrice = withGst(p.basePrice);
          const action = getPlanAction(p);
          const color = PLAN_COLORS[p.id] || 'var(--accent)';
          const isCurrent = action === 'current';
          return (
          <div key={p.id} className="card" style={{
            borderColor: isCurrent ? color : p.elite ? 'var(--accent3)' : 'var(--border)',
            position: 'relative',
            display: 'flex', flexDirection: 'column',
            background: isCurrent ? `${color}0d` : undefined,
          }}>
            {/* Badge */}
            {p.popular && currentRank === 0 && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#000', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>⭐ POPULAR</div>}
            {action === 'upgrade' && currentRank > 0 && PLAN_RANK[p.id] === currentRank + 1 && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#00d4aa', color: '#000', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>⬆ NEXT STEP</div>}
            {p.elite && action === 'upgrade' && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: PLAN_COLORS.elite, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>👑 BEST VALUE</div>}

            {/* Header */}
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 1, marginBottom: 2 }}>{p.label}</div>

            {/* Price */}
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 48, color, lineHeight: 1, margin: '8px 0 2px' }}>₹{p.basePrice}</div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>+ 18% GST = ₹{finalPrice}</div>

            {/* Highlight */}
            <div style={{ background: `${color}22`, color, fontWeight: 800, fontSize: 13, borderRadius: 6, padding: '5px 10px', marginBottom: 12, display: 'inline-block', alignSelf: 'flex-start' }}>
              {p.highlight} • {p.validity}
            </div>

            {/* Features */}
            <div style={{ flex: 1, marginBottom: 16 }}>
              {p.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)', marginBottom: 6 }}>
                  <span style={{ color, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            {isCurrent ? (
              <button className="btn btn-secondary btn-sm btn-full" disabled>✅ Current Plan</button>
            ) : action === 'downgrade' ? (
              <button className="btn btn-secondary btn-sm btn-full" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>Not Available</button>
            ) : (
              <button
                className="btn btn-primary btn-sm btn-full"
                style={{ background: color, color: p.elite ? '#fff' : '#000', fontWeight: 800, border: 'none' }}
                onClick={() => buy(p.id, plans[p.id] || {})}
                disabled={buying === p.id}
              >
                {buying === p.id ? '⏳ Processing...' : `Buy Now — ₹${finalPrice}`}
              </button>
            )}
          </div>
          );
        })}
      </div>

      <div className="card mb-24">
        <div className="bold mb-12">💳 Payment Methods</div>
        <div className="flex gap-8 wrap">
          {['UPI', 'GPay', 'PhonePe', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallets'].map(m => <span key={m} className="badge badge-blue">{m}</span>)}
        </div>
        <div className="text-muted text-sm mt-8">Powered by Razorpay • 100% Secure • GST Invoice provided</div>
      </div>

      {history.length > 0 && (
        <div className="card">
          <div className="bold mb-16">📋 Transaction History</div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead>
              <tbody>
                {history.map(t => (
                  <tr key={t.id}>
                    <td className="text-sm">{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="text-sm">{t.metadata?.description || t.type}</td>
                    <td className="text-sm text-accent">₹{t.amount_with_gst || t.amount}</td>
                    <td><span className={`badge ${t.status === 'success' ? 'badge-green' : t.status === 'pending' ? 'badge-gold' : 'badge-red'}`}>{t.status}</span></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => paymentAPI.invoice(t.id).then(r => toast.success(`Invoice: ${r.data.invoice.number}`))}>📄</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
export function Notifications() {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => { userAPI.notifications().then(r => setNotifs(r.data.notifications)); }, []);

  const markRead = async (id) => {
    await userAPI.markRead(id);
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAll = async () => {
    await userAPI.markAllRead();
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })));
  };

  const ICONS = { exam_reminder: '⏰', result_ready: '📊', contest_result: '🏆', plan_expiry: '⚠', referral_bonus: '🎁', badge_earned: '🏅', system: 'ℹ️' };

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div className="flex-between mb-24">
        <div><div className="page-title">🔔 NOTIFICATIONS</div><div className="page-sub">{notifs.filter(n => !n.is_read).length} unread</div></div>
        {notifs.some(n => !n.is_read) && <button className="btn btn-secondary btn-sm" onClick={markAll}>Mark all read</button>}
      </div>
      {notifs.length === 0 ? (
        <div className="card text-center" style={{ padding: 60 }}><div style={{ fontSize: 48 }}>🔔</div><div className="text-muted mt-12">No notifications yet</div></div>
      ) : notifs.map(n => (
        <div key={n.id} className="card mb-8" style={{ borderColor: !n.is_read ? 'var(--accent)' : 'var(--border)', opacity: n.is_read ? 0.7 : 1, cursor: !n.is_read ? 'pointer' : 'default' }} onClick={() => !n.is_read && markRead(n.id)}>
          <div className="flex gap-12">
            <span style={{ fontSize: 24, flexShrink: 0 }}>{ICONS[n.type] || 'ℹ️'}</span>
            <div style={{ flex: 1 }}>
              <div className="bold text-sm">{n.title}</div>
              <div className="text-muted text-sm mt-4">{n.body}</div>
              <div className="text-xs text-muted mt-8">{new Date(n.created_at).toLocaleString('en-IN')}</div>
            </div>
            {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />}
          </div>
        </div>
      ))}
    </div>
  );
}
