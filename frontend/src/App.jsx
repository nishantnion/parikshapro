import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoadingProvider } from './hooks/useLoading';
import Sidebar from './components/Sidebar';
import { Dashboard, ScheduleExam, MyTests, Results, Contests, Study, Forum, AITutor, Profile, Billing, Notifications } from './pages/index';
import ExamRoom from './pages/ExamRoom';
import Admin from './pages/admin/index';
import { Login, Register, ForgotPassword } from './pages/Auth';
import './styles/global.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: 'var(--accent)', letterSpacing: 3 }}>PARIKSHAPRO</div>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user || !['admin', 'superadmin'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function ResultsPage() {
  const { id } = useParams();
  return <Results attemptId={id} />;
}

function AppLayout({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('pp_theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pp_theme', theme);
  }, [theme]);
  return (
    <div className="app-layout">
      <Sidebar theme={theme} toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
      <div className="main-content">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LoadingProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: "'DM Sans', sans-serif" }, duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/exam" element={<ProtectedRoute><ExamRoom /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><AppLayout><ScheduleExam /></AppLayout></ProtectedRoute>} />
          <Route path="/my-tests" element={<ProtectedRoute><AppLayout><MyTests /></AppLayout></ProtectedRoute>} />
          <Route path="/results/:id" element={<ProtectedRoute><AppLayout><ResultsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/contests" element={<ProtectedRoute><AppLayout><Contests /></AppLayout></ProtectedRoute>} />
          <Route path="/study" element={<ProtectedRoute><AppLayout><Study /></AppLayout></ProtectedRoute>} />
          <Route path="/forum" element={<ProtectedRoute><AppLayout><Forum /></AppLayout></ProtectedRoute>} />
          <Route path="/ai-tutor" element={<ProtectedRoute><AppLayout><AITutor /></AppLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><AppLayout><Billing /></AppLayout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/*" element={<ProtectedRoute><AdminRoute><AppLayout><Admin /></AppLayout></AdminRoute></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </LoadingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
