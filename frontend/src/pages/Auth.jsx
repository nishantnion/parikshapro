import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { authAPI } from '../api';

const EXAMS = [
  { id: 'jee', icon: '⚙️', name: 'JEE' },
  { id: 'neet', icon: '⚕️', name: 'NEET' },
  { id: 'upsc', icon: '🏛️', name: 'UPSC' },
  { id: 'ibps', icon: '🏦', name: 'IBPS' },
  { id: 'ssc', icon: '📋', name: 'SSC' },
  { id: 'gate', icon: '💻', name: 'GATE' },
  { id: 'nda', icon: '⚔️', name: 'NDA' },
  { id: 'rrb', icon: '🚂', name: 'RRB' },
];

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! 👋');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  // Demo login
  const demoLogin = async () => {
    setLoading(true);
    try {
      await login('admin@parikshapro.in', 'Admin@123');
      toast.success('Logged in as Admin! 🛡️');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Demo login failed. Have you seeded the DB? Run: npm run seed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 44, color: 'var(--accent)', letterSpacing: 3 }}>PARIKSHA<span style={{ color: 'var(--text)' }}>PRO</span></div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>India's AI-Powered Exam Prep Platform</div>
        </div>

        <div className="card">
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, marginBottom: 24, letterSpacing: 1 }}>SIGN IN</div>

          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Your password" value={form.password} onChange={e => set('password', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <Link to="/forgot-password" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none' }}>Forgot password?</Link>
          </div>

          <button className="btn btn-primary btn-full btn-lg" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Signing in...' : '🚀 Sign In'}
          </button>

          <div style={{ position: 'relative', textAlign: 'center', margin: '20px 0' }}>
            <div className="divider" />
            <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 12px', color: 'var(--muted)', fontSize: 12 }}>OR</span>
          </div>

          <button className="btn btn-secondary btn-full" onClick={demoLogin} disabled={loading}>
            🎯 Demo Login (Admin)
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Register →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', target_exams: ['jee'], referral_code: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleExam = (id) => {
    setForm(f => ({
      ...f,
      target_exams: f.target_exams.includes(id)
        ? f.target_exams.filter(e => e !== id)
        : [...f.target_exams, id],
    }));
  };

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('Fill all required fields'); return; }
    if (form.password.length < 6) { toast.error('Password must be 6+ characters'); return; }
    if (form.target_exams.length === 0) { toast.error('Select at least one exam'); return; }
    setLoading(true);
    try {
      const data = await register(form);
      toast.success('Account created! 🎉');
      setStep(2); // OTP verification step
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  if (step === 2) return <OTPVerify email={form.email} onSuccess={() => navigate('/dashboard')} />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 44, color: 'var(--accent)', letterSpacing: 3 }}>PARIKSHA<span style={{ color: 'var(--text)' }}>PRO</span></div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Start your free exam prep today</div>
        </div>

        <div className="card">
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, marginBottom: 24, letterSpacing: 1 }}>CREATE ACCOUNT</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">Full Name *</label>
              <input className="input" placeholder="Rahul Kumar" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Email *</label>
              <input className="input" type="email" placeholder="rahul@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Password *</label>
              <input className="input" type="password" placeholder="Min 6 chars" value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Referral Code (optional)</label>
              <input className="input" placeholder="e.g. PP1234" value={form.referral_code} onChange={e => set('referral_code', e.target.value.toUpperCase())} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Target Exams * (select all that apply)</label>
            <div className="flex gap-8 wrap">
              {EXAMS.map(e => (
                <button key={e.id} className={`btn btn-sm ${form.target_exams.includes(e.id) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggleExam(e.id)} type="button">
                  {e.icon} {e.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(247,183,49,0.08)', border: '1px solid rgba(247,183,49,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            🎁 Free: 5 mock tests • AI study notes • Forum access • 1 contest credit
          </div>

          <button className="btn btn-primary btn-full btn-lg" onClick={handleRegister} disabled={loading}>
            {loading ? '⏳ Creating account...' : '🚀 Create Free Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign In →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── OTP VERIFICATION ──────────────────────────────────────────────────────────
export function OTPVerify({ email, onSuccess }) {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verify = async () => {
    if (otp.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      await authAPI.verifyEmail({ email, otp });
      toast.success('✅ Email verified!');
      if (onSuccess) onSuccess();
      else navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    }
    setLoading(false);
  };

  const resend = async () => {
    setResending(true);
    try {
      await authAPI.resendOTP({ email });
      toast.success('OTP resent to your email');
    } catch { toast.error('Failed to resend'); }
    setResending(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, marginBottom: 8 }}>VERIFY EMAIL</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
            We sent a 6-digit code to <strong style={{ color: 'var(--text)' }}>{email}</strong>
          </div>
          <input
            className="input"
            style={{ textAlign: 'center', fontSize: 28, letterSpacing: 8, fontFamily: "'JetBrains Mono'", fontWeight: 700, marginBottom: 20 }}
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && verify()}
            autoFocus
          />
          <button className="btn btn-primary btn-full btn-lg" onClick={verify} disabled={loading || otp.length !== 6}>
            {loading ? '⏳ Verifying...' : '✅ Verify Email'}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={resend} disabled={resending}>
            {resending ? 'Resending...' : 'Resend OTP'}
          </button>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
            OTP valid for 10 minutes. Check spam folder too.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      toast.success('Password reset link sent!');
    } catch { toast.error('Failed'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, marginBottom: 8 }}>FORGOT PASSWORD</div>
          {sent ? (
            <>
              <div style={{ color: 'var(--green)', fontSize: 15, margin: '16px 0' }}>✅ Reset link sent! Check your inbox.</div>
              <Link to="/login" className="btn btn-secondary">Back to Login</Link>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Enter your email to receive a reset link</div>
              <input className="input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 16 }} />
              <button className="btn btn-primary btn-full" onClick={send} disabled={loading || !email}>{loading ? '⏳ Sending...' : 'Send Reset Link'}</button>
              <div style={{ marginTop: 16 }}><Link to="/login" style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'none' }}>← Back to login</Link></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
