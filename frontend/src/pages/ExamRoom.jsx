import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { examAPI } from '../api';
import toast from 'react-hot-toast';

export default function ExamRoom() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { attemptId, examData, duration } = state || {};

  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState((duration || 60) * 60);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [antiCheatWarnings, setAntiCheatWarnings] = useState(0);
  const startTime = useRef(Date.now());
  const timerRef = useRef(null);

  // Anti-cheat: detect tab switches
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches(t => {
          const next = t + 1;
          if (next <= 3) toast.error(`⚠ Warning ${next}/3: Do not switch tabs!`, { duration: 4000 });
          if (next > 3) toast.error('🚨 Multiple violations detected! Your attempt is flagged.', { duration: 5000 });
          return next;
        });
        setAntiCheatWarnings(w => w + 1);
      }
    };

    const handleContextMenu = (e) => { e.preventDefault(); toast.error('Right-click disabled during exam'); };
    const handleCopy = (e) => { e.preventDefault(); };
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'p'].includes(e.key.toLowerCase())) { e.preventDefault(); }
      if (e.key === 'F12') { e.preventDefault(); }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
        if (t === 300) toast.error('⏰ 5 minutes remaining!');
        if (t === 60) toast.error('⏰ 1 minute remaining!');
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (!attemptId || !examData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <div style={{ fontSize: 48 }}>❌</div>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28 }}>NO EXAM DATA</div>
        <button className="btn btn-primary" onClick={() => navigate('/schedule')}>Go to Schedule</button>
      </div>
    );
  }

  const sections = examData.sections || [];
  const section = sections[currentSection];
  const questions = section?.questions || [];
  const question = questions[currentQ];
  const totalQ = sections.reduce((a, s) => a + s.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.keys(marked).filter(k => marked[k]).length;

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const timerClass = timeLeft <= 60 ? 'exam-timer danger' : timeLeft <= 300 ? 'exam-timer warn' : 'exam-timer';

  const getKey = (si, qi) => `${si}-${qi}`;
  const currentKey = getKey(currentSection, currentQ);

  const selectAnswer = (opt) => {
    setAnswers(a => ({ ...a, [currentKey]: opt }));
  };

  const clearAnswer = () => {
    setAnswers(a => { const n = { ...a }; delete n[currentKey]; return n; });
  };

  const toggleMark = () => {
    setMarked(m => ({ ...m, [currentKey]: !m[currentKey] }));
  };

  const goTo = (si, qi) => { setCurrentSection(si); setCurrentQ(qi); };

  const handleSubmit = async (auto = false) => {
    if (!auto && !showSubmitModal) { setShowSubmitModal(true); return; }
    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const timeTaken = Math.floor((Date.now() - startTime.current) / 1000);
      const res = await examAPI.submit(attemptId, { answers, tab_switches: tabSwitches, time_taken_seconds: timeTaken });
      toast.success('✅ Exam submitted!');
      navigate(`/results/${attemptId}`, { replace: true });
    } catch (err) {
      toast.error('Submission failed: ' + (err.response?.data?.error || err.message));
      setSubmitting(false);
    }
  };

  const getQStatus = (si, qi) => {
    const key = getKey(si, qi);
    if (marked[key]) return 'marked';
    if (answers[key]) return 'answered';
    return 'unanswered';
  };

  let flatIndex = 0;
  const flatMap = [];
  sections.forEach((s, si) => s.questions.forEach((q, qi) => flatMap.push({ si, qi, flat: flatIndex++ })));

  const goPrev = () => {
    if (currentQ > 0) setCurrentQ(q => q - 1);
    else if (currentSection > 0) { setCurrentSection(s => s - 1); setCurrentQ(sections[currentSection - 1].questions.length - 1); }
  };

  const goNext = () => {
    if (currentQ < questions.length - 1) setCurrentQ(q => q + 1);
    else if (currentSection < sections.length - 1) { setCurrentSection(s => s + 1); setCurrentQ(0); }
  };

  const flatCurrent = flatMap.find(f => f.si === currentSection && f.qi === currentQ)?.flat || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Header */}
      <div className="exam-header">
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: 'var(--accent)', letterSpacing: 1 }}>{examData.exam_title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{answeredCount}/{totalQ} answered</div>
          {tabSwitches > 0 && <span className="badge badge-red">⚠ {tabSwitches} violations</span>}
          <div className={timerClass}>{formatTime(timeLeft)}</div>
          <button className="btn btn-danger btn-sm" onClick={() => setShowSubmitModal(true)} disabled={submitting}>Submit Exam</button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="section-tabs">
        {sections.map((s, i) => {
          const sAnswered = s.questions.filter((_, qi) => answers[getKey(i, qi)]).length;
          return (
            <button key={i} className={`section-tab ${currentSection === i ? 'active' : ''}`} onClick={() => { setCurrentSection(i); setCurrentQ(0); }}>
              {s.name} ({sAnswered}/{s.questions.length})
            </button>
          );
        })}
      </div>

      {/* Main content + palette */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', flex: 1, overflow: 'hidden' }}>
        {/* Question area */}
        <div style={{ overflowY: 'auto', padding: 24 }}>
          <div className="flex-between mb-16">
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Question <strong style={{ color: 'var(--text)' }}>{flatCurrent + 1}</strong>/{totalQ} • <span className="text-accent">{question?.topic || section?.name}</span>
            </div>
            <div className="flex gap-8">
              <span className="badge badge-gold">+{question?.marks}</span>
              <span className="badge badge-red">{question?.negative || 0}</span>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20, fontSize: 16, lineHeight: 1.8 }}>
            {question?.question}
          </div>

          {(question?.options || []).map((opt, oi) => {
            const label = ['A', 'B', 'C', 'D'][oi];
            const selected = answers[currentKey] === label;
            return (
              <div key={oi} className={`option ${selected ? 'selected' : ''}`} onClick={() => selectAnswer(label)}>
                <div className="option-label">{label}</div>
                <div style={{ fontSize: 15, lineHeight: 1.6 }}>{opt.replace(/^[A-D]\)\s*/, '')}</div>
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex gap-8 mt-20 flex-between">
            <div className="flex gap-8">
              <button className="btn btn-secondary btn-sm" onClick={clearAnswer} disabled={!answers[currentKey]}>Clear</button>
              <button className="btn btn-sm" style={{ background: marked[currentKey] ? 'rgba(168,85,247,0.15)' : 'var(--surface2)', color: marked[currentKey] ? '#c084fc' : 'var(--muted)', border: `1px solid ${marked[currentKey] ? 'rgba(168,85,247,0.4)' : 'var(--border)'}` }} onClick={toggleMark}>
                {marked[currentKey] ? '🔖 Marked' : '🔖 Mark for Review'}
              </button>
            </div>
            <div className="flex gap-8">
              <button className="btn btn-secondary btn-sm" onClick={goPrev} disabled={flatCurrent === 0}>← Prev</button>
              <button className="btn btn-primary btn-sm" onClick={goNext} disabled={flatCurrent === totalQ - 1}>Next →</button>
            </div>
          </div>
        </div>

        {/* Question palette */}
        <div className="palette-panel">
          <div style={{ padding: '16px 12px' }}>
            <div className="bold text-sm mb-12">Question Palette</div>
            {/* Legend */}
            <div style={{ marginBottom: 12 }}>
              {[['var(--green)', 'Answered'], ['var(--purple)', 'Marked'], ['var(--surface2)', 'Not Visited']].map(([bg, label]) => (
                <div key={label} className="flex gap-6 mb-4 text-xs text-muted">
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, flexShrink: 0 }} /> {label}
                </div>
              ))}
            </div>
            {sections.map((s, si) => (
              <div key={si} style={{ marginBottom: 12 }}>
                <div className="text-xs text-muted mb-6" style={{ fontWeight: 600 }}>{s.name}</div>
                <div className="palette-grid">
                  {s.questions.map((q, qi) => {
                    const key = getKey(si, qi);
                    const status = getQStatus(si, qi);
                    const isCurrent = si === currentSection && qi === currentQ;
                    return (
                      <button key={qi} className={`palette-btn ${status === 'answered' ? 'answered' : status === 'marked' ? 'marked' : ''} ${isCurrent ? 'current' : ''}`} onClick={() => goTo(si, qi)} title={`Q${qi + 1}: ${q.topic || ''}`}>
                        {qi + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="divider" />
            <div className="grid-2" style={{ gap: 8, fontSize: 12 }}>
              <div style={{ background: 'var(--surface2)', padding: '6px 8px', borderRadius: 6, textAlign: 'center' }}><div style={{ fontWeight: 700, color: 'var(--green)' }}>{answeredCount}</div><div className="text-muted" style={{ fontSize: 10 }}>Answered</div></div>
              <div style={{ background: 'var(--surface2)', padding: '6px 8px', borderRadius: 6, textAlign: 'center' }}><div style={{ fontWeight: 700, color: 'var(--muted)' }}>{totalQ - answeredCount}</div><div className="text-muted" style={{ fontSize: 10 }}>Remaining</div></div>
            </div>
            <button className="btn btn-primary btn-sm btn-full mt-12" onClick={() => setShowSubmitModal(true)} disabled={submitting}>
              {submitting ? '⏳ Submitting...' : '📤 Submit Exam'}
            </button>
          </div>
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-title">Submit Exam?</div>
            <div style={{ marginBottom: 20, lineHeight: 1.7 }}>
              <div className="flex gap-16 mb-12">
                <div className="stat-card card-sm" style={{ flex: 1, textAlign: 'center' }}><div className="stat-label">Answered</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: 'var(--green)' }}>{answeredCount}</div></div>
                <div className="stat-card card-sm" style={{ flex: 1, textAlign: 'center' }}><div className="stat-label">Skipped</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: 'var(--muted)' }}>{totalQ - answeredCount}</div></div>
                <div className="stat-card card-sm" style={{ flex: 1, textAlign: 'center' }}><div className="stat-label">Marked</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: 'var(--purple)' }}>{markedCount}</div></div>
              </div>
              {totalQ - answeredCount > 0 && <div style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>⚠ You have {totalQ - answeredCount} unanswered questions. Once submitted, you cannot go back.</div>}
              {tabSwitches > 0 && <div style={{ marginTop: 10, background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8c00' }}>⚠ {tabSwitches} anti-cheat violation(s) recorded.</div>}
            </div>
            <div className="flex gap-10">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSubmit(false)} disabled={submitting}>
                {submitting ? '⏳ Submitting...' : '✅ Yes, Submit'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)} disabled={submitting}>Continue Exam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
