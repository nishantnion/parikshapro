import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userAPI } from '../api';

const NAV = [
  { label: 'Main', items: [
    { path: '/dashboard', icon: '⚡', label: 'Dashboard' },
    { path: '/schedule', icon: '🚀', label: 'New Test' },
    { path: '/my-tests', icon: '📋', label: 'My Tests' },
    { path: '/contests', icon: '🏆', label: 'Contests' },
  ]},
  { label: 'Learn', items: [
    { path: '/study', icon: '📚', label: 'Study Notes' },
    { path: '/ai-tutor', icon: '🤖', label: 'AI Tutor' },
    { path: '/forum', icon: '💬', label: 'Forum' },
  ]},
  { label: 'Account', items: [
    { path: '/notifications', icon: '🔔', label: 'Notifications', badge: true },
    { path: '/billing', icon: '💳', label: 'Billing' },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ]},
];

export default function Sidebar({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (user) {
      userAPI.notifications().then(({ data }) => {
        setUnread(data.notifications.filter(n => !n.is_read).length);
      }).catch(() => {});

      const interval = setInterval(() => {
        userAPI.notifications().then(({ data }) => {
          setUnread(data.notifications.filter(n => !n.is_read).length);
        }).catch(() => {});
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>
        Pariksha<span>Pro</span>
      </div>

      {/* User mini-card */}
      {user && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#000', flexShrink: 0 }}>
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div className="text-xs text-muted">{user.plan_type?.toUpperCase()} • {user.tests_remaining} tests</div>
          </div>
        </div>
      )}

      {/* Nav */}
      {NAV.map(section => (
        <div key={section.label}>
          <div className="nav-section">{section.label}</div>
          {section.items.map(item => (
            <button
              key={item.path}
              className={`nav-item ${pathname === item.path || pathname.startsWith(item.path + '/') ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && unread > 0 && (
                <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{unread}</span>
              )}
            </button>
          ))}
        </div>
      ))}

      {/* Admin link */}
      {user?.role && ['admin', 'superadmin'].includes(user.role) && (
        <>
          <div className="nav-section">Admin</div>
          <button className={`nav-item ${pathname.startsWith('/admin') ? 'active' : ''}`} onClick={() => navigate('/admin')}>
            <span>🛡️</span> Admin Panel
          </button>
        </>
      )}

      {/* Bottom actions */}
      <div className="sidebar-bottom">
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4 }} onClick={toggleTheme}>
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
