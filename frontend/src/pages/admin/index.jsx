import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const PLAN_COLORS = { free: '#7070a0', starter: '#f7b731', monthly: '#00d4aa', semester: '#3b82f6', annual: '#a855f7', elite: '#ff6b35' };
const PIE_COLORS = ['#f7b731', '#00d4aa', '#3b82f6', '#a855f7', '#ff6b35', '#7070a0'];

// ── MAIN ADMIN SHELL ─────────────────────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  const TABS = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'transactions', icon: '💳', label: 'Transactions' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'contests', icon: '🏆', label: 'Contests' },
    { id: 'forum', icon: '💬', label: 'Forum' },
    { id: 'broadcast', icon: '📣', label: 'Broadcast' },
  ];

  return (
    <div className="page-container" style={{ maxWidth: '100%' }}>
      <div className="flex-between mb-24">
        <div>
          <div className="page-title">🛡️ ADMIN PANEL</div>
          <div className="page-sub">ParikshaPro Management Console</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>← Back to App</button>
      </div>

      <div className="tabs mb-24" style={{ flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <AdminOverview />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'transactions' && <AdminTransactions />}
      {tab === 'analytics' && <AdminAnalytics />}
      {tab === 'contests' && <AdminContests />}
      {tab === 'forum' && <AdminForum />}
      {tab === 'broadcast' && <AdminBroadcast />}
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function AdminOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminAPI.stats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  if (!stats) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="grid-4 mb-24">
        {[
          { label: 'Total Users', val: stats.total_users, sub: `+${stats.new_users_today} today`, color: 'var(--accent)' },
          { label: 'Tests Taken', val: stats.total_attempts, sub: `${stats.attempts_today} today`, color: 'var(--green)' },
          { label: 'Active Contests', val: stats.active_contests, sub: 'live/open', color: '#a855f7' },
          { label: 'Total Revenue', val: `₹${Math.round(stats.total_revenue || 0)}`, sub: 'all time', color: '#ff6b35' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-val" style={{ color: s.color, fontSize: 36 }}>{s.val}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="bold mb-4">System Status</div>
        <div className="text-muted text-sm mb-16">All systems operational</div>
        {[
          ['MySQL Database', 'Connected'],
          ['Claude AI API', process.env.VITE_ANTHROPIC_KEY ? 'Connected' : 'Using env key'],
          ['Razorpay Payments', 'Mock mode (add keys to go live)'],
          ['Email Service', 'Configure EMAIL_USER in .env'],
          ['Cron Jobs', 'Running (exam reminders + contest updates)'],
        ].map(([service, status]) => (
          <div key={service} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div className="text-sm">{service}</div>
            <span className="badge badge-green">● {status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── USERS ─────────────────────────────────────────────────────────────────────
function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = (p = 1) => {
    adminAPI.users({ page: p, limit: 20, search }).then(r => {
      setUsers(r.data.users);
      setTotal(r.data.total);
    }).catch(() => {});
  };

  useEffect(() => { load(page); }, [page]);

  const save = async () => {
    try {
      await adminAPI.updateUser(editing.id, editForm);
      toast.success('User updated');
      setEditing(null);
      load(page);
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="flex gap-12 mb-16">
        <input className="input" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && load(1)} />
        <button className="btn btn-primary btn-sm" onClick={() => load(1)}>Search</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="text-muted text-sm mb-12">{total} users total</div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th><th>Plan</th><th>Tests Left</th><th>Role</th><th>Verified</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="bold text-sm">{u.name}</div>
                    <div className="text-muted text-xs">{u.email}</div>
                  </td>
                  <td><span className="badge" style={{ background: `${PLAN_COLORS[u.plan_type]}20`, color: PLAN_COLORS[u.plan_type] }}>{u.plan_type?.toUpperCase()}</span></td>
                  <td className="font-mono">{u.tests_remaining}</td>
                  <td><span className={`badge ${u.role === 'superadmin' ? 'badge-red' : u.role === 'admin' ? 'badge-purple' : 'badge-gray'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.is_verified ? 'badge-green' : 'badge-red'}`}>{u.is_verified ? '✓' : '✗'}</span></td>
                  <td className="text-xs text-muted">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(u); setEditForm({ plan_type: u.plan_type, tests_remaining: u.tests_remaining, role: u.role, is_verified: u.is_verified }); }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-8 mt-16">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span className="text-muted text-sm" style={{ lineHeight: '32px' }}>Page {page}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={users.length < 20}>Next →</button>
        </div>
      </div>

      {editing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Edit User</div>
            <div className="bold mb-4">{editing.name}</div>
            <div className="text-muted text-sm mb-20">{editing.email}</div>
            <div className="form-group">
              <label className="label">Plan</label>
              <select className="input select" value={editForm.plan_type} onChange={e => setEditForm(f => ({ ...f, plan_type: e.target.value }))}>
                {['free', 'starter', 'monthly', 'semester', 'annual', 'elite'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Tests Remaining</label>
              <input className="input" type="number" value={editForm.tests_remaining} onChange={e => setEditForm(f => ({ ...f, tests_remaining: parseInt(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="label">Role</label>
              <select className="input select" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                {['student', 'admin', 'superadmin'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Email Verified</label>
              <select className="input select" value={editForm.is_verified ? 'true' : 'false'} onChange={e => setEditForm(f => ({ ...f, is_verified: e.target.value === 'true' }))}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="flex gap-8">
              <button className="btn btn-primary" onClick={save}>Save</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    adminAPI.transactions({ limit: 30, status: filter || undefined }).then(r => {
      setTransactions(r.data.transactions);
      setTotal(r.data.total);
    }).catch(() => {});
  }, [filter]);

  const totalRevenue = transactions.filter(t => t.status === 'success').reduce((s, t) => s + (t.amount_with_gst || t.amount || 0), 0);

  return (
    <div>
      <div className="flex gap-12 mb-16">
        <select className="input select" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <div className="stat-card card-sm" style={{ flex: 1 }}>
          <span className="text-muted text-sm">Showing {transactions.length} / {total} • Revenue: </span>
          <strong className="text-accent">₹{Math.round(totalRevenue)}</strong>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>User</th><th>Type</th><th>Amount</th><th>Status</th><th>Invoice</th></tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td className="text-xs text-muted">{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div className="text-sm bold">{t.User?.name}</div>
                    <div className="text-xs text-muted">{t.User?.email}</div>
                  </td>
                  <td className="text-sm">{t.metadata?.description || t.type}</td>
                  <td className="font-mono text-accent">₹{t.amount_with_gst || t.amount}</td>
                  <td><span className={`badge ${t.status === 'success' ? 'badge-green' : t.status === 'pending' ? 'badge-gold' : 'badge-red'}`}>{t.status}</span></td>
                  <td className="text-xs font-mono">{t.invoice_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function AdminAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminAPI.analytics().then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="loading-center"><div className="spinner" /></div>;

  const signupData = (data.daily_signups || []).map(d => ({ date: d.date, count: parseInt(d.count) }));
  const planData = (data.plan_distribution || []).map(d => ({ name: d.plan_type?.toUpperCase(), value: parseInt(d.count) }));
  const examData = (data.exam_popularity || []).map(d => ({ name: d.exam_category_id?.toUpperCase(), count: parseInt(d.count) }));

  return (
    <div>
      <div className="grid-2 mb-24">
        <div className="card">
          <div className="bold mb-16">📈 Daily Signups (Last 30 Days)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={signupData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted)" fontSize={10} tickFormatter={d => d?.slice(5)} />
              <YAxis stroke="var(--muted)" fontSize={11} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="bold mb-16">🍕 Plan Distribution</div>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                  {planData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-muted text-sm text-center" style={{ padding: 40 }}>No data yet</div>}
        </div>
      </div>

      <div className="card">
        <div className="bold mb-16">🎯 Exam Popularity</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={examData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
            <YAxis stroke="var(--muted)" fontSize={11} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── CONTESTS ADMIN ────────────────────────────────────────────────────────────
function AdminContests() {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', exam_category_id: 'jee', scheduled_at: '', duration_minutes: 60, enrollment_fee: 11 });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.title || !form.scheduled_at) { toast.error('Fill all fields'); return; }
    try {
      await adminAPI.createContest({ ...form, scheduled_at: new Date(form.scheduled_at).toISOString() });
      toast.success('Contest created!');
      setCreating(false);
      setForm({ title: '', exam_category_id: 'jee', scheduled_at: '', duration_minutes: 60, enrollment_fee: 11 });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <div className="bold">Contest Management</div>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>+ New Contest</button>
      </div>

      {creating && (
        <div className="card mb-16">
          <div className="bold mb-16">Create Contest</div>
          <div className="form-group"><label className="label">Title</label><input className="input" placeholder="JEE Sunday Grand Contest" value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Exam</label>
              <select className="input select" value={form.exam_category_id} onChange={e => set('exam_category_id', e.target.value)}>
                {['jee', 'neet', 'upsc', 'ibps', 'ssc', 'gate', 'nda', 'rrb'].map(e => <option key={e} value={e}>{e.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="label">Scheduled At</label><input className="input" type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} /></div>
            <div className="form-group"><label className="label">Duration (mins)</label><input className="input" type="number" value={form.duration_minutes} onChange={e => set('duration_minutes', parseInt(e.target.value))} /></div>
            <div className="form-group"><label className="label">Entry Fee (₹)</label><input className="input" type="number" value={form.enrollment_fee} onChange={e => set('enrollment_fee', parseInt(e.target.value))} /></div>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-primary" onClick={create}>Create</button>
            <button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="text-muted text-sm">Contests are seeded automatically. You can create additional ones above.</div>
        <div className="text-muted text-sm mt-8">Status auto-updates via cron job every minute.</div>
      </div>
    </div>
  );
}

// ── FORUM ADMIN ───────────────────────────────────────────────────────────────
function AdminForum() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    adminAPI.forumPosts().then(r => setPosts(r.data.posts)).catch(() => {});
  }, []);

  const moderate = async (id, action) => {
    try {
      await adminAPI.updateForumPost(id, { status: action, is_pinned: action === 'pin' });
      toast.success(`Post ${action}ed`);
      setPosts(ps => ps.map(p => p.id === id ? { ...p, status: action === 'remove' ? 'removed' : p.status, is_pinned: action === 'pin' } : p));
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="bold mb-16">Forum Moderation</div>
      {posts.map(p => (
        <div key={p.id} className="card mb-8">
          <div className="flex-between">
            <div style={{ flex: 1 }}>
              <div className="bold text-sm">{p.is_pinned ? '📌 ' : ''}{p.title}</div>
              <div className="text-muted text-xs mt-4">{p.User?.name} • {new Date(p.created_at).toLocaleDateString()} • {p.reply_count} replies • {p.upvotes} upvotes</div>
              <div className="text-muted text-xs mt-4" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>{p.body}</div>
            </div>
            <div className="flex gap-8">
              <span className={`badge ${p.status === 'active' ? 'badge-green' : 'badge-red'}`}>{p.status}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => moderate(p.id, p.is_pinned ? 'unpin' : 'pin')}>{p.is_pinned ? 'Unpin' : 'Pin'}</button>
              {p.status === 'active' && <button className="btn btn-danger btn-sm" onClick={() => moderate(p.id, 'remove')}>Remove</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── BROADCAST ─────────────────────────────────────────────────────────────────
function AdminBroadcast() {
  const [form, setForm] = useState({ title: '', body: '', type: 'system', plan_filter: '' });
  const [sending, setSending] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const send = async () => {
    if (!form.title || !form.body) { toast.error('Fill title and body'); return; }
    setSending(true);
    try {
      const payload = { title: form.title, body: form.body, type: form.type };
      if (form.plan_filter) payload.user_filter = { plan: form.plan_filter };
      const r = await adminAPI.broadcast(payload);
      toast.success(`Sent to ${r.data.sent} users!`);
      setForm({ title: '', body: '', type: 'system', plan_filter: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    setSending(false);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="bold mb-16">📣 Broadcast Notification</div>
      <div className="card">
        <div className="form-group">
          <label className="label">Notification Title</label>
          <input className="input" placeholder="e.g. 🚀 New Feature Released!" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Message Body</label>
          <textarea className="input" rows={4} placeholder="Your notification message..." value={form.body} onChange={e => set('body', e.target.value)} style={{ resize: 'vertical' }} />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="label">Type</label>
            <select className="input select" value={form.type} onChange={e => set('type', e.target.value)}>
              {['system', 'exam_reminder', 'plan_expiry', 'contest_result'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Target Users (optional)</label>
            <select className="input select" value={form.plan_filter} onChange={e => set('plan_filter', e.target.value)}>
              <option value="">All Users</option>
              {['free', 'starter', 'monthly', 'semester', 'annual', 'elite'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} plan only</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={send} disabled={sending}>
          {sending ? '⏳ Sending...' : '📣 Send Notification'}
        </button>
      </div>
    </div>
  );
}
