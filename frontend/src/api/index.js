import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE, timeout: 60000 });

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pp_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('pp_refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refresh });
        localStorage.setItem('pp_access_token', data.tokens.access);
        localStorage.setItem('pp_refresh_token', data.tokens.refresh);
        original.headers.Authorization = `Bearer ${data.tokens.access}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: d => api.post('/auth/register', d),
  login: d => api.post('/auth/login', d),
  verifyEmail: d => api.post('/auth/verify-email', d),
  resendOTP: d => api.post('/auth/resend-otp', d),
  logout: () => api.post('/auth/logout'),
  forgotPassword: d => api.post('/auth/forgot-password', d),
  resetPassword: d => api.post('/auth/reset-password', d),
  me: () => api.get('/auth/me'),
};

// User
export const userAPI = {
  profile: () => api.get('/user/profile'),
  updateProfile: d => api.put('/user/profile', d),
  dashboard: () => api.get('/user/dashboard'),
  referrals: () => api.get('/user/referrals'),
  notifications: () => api.get('/user/notifications'),
  markRead: id => api.put(`/user/notifications/${id}/read`),
  markAllRead: () => api.put('/user/notifications/all/read'),
  stats: () => api.get('/user/stats'),
};

// Exams
export const examAPI = {
  categories: () => api.get('/exams/categories'),
  schedule: d => api.post('/exams/schedule', d),
  scheduled: () => api.get('/exams/scheduled'),
  deleteScheduled: id => api.delete(`/exams/scheduled/${id}`),
  start: id => api.post(`/exams/${id}/start`),
  submit: (id, d) => api.post(`/exams/attempts/${id}/submit`, d),
  results: id => api.get(`/exams/attempts/${id}/results`),
  analyze: id => api.post(`/exams/attempts/${id}/analyze`),
  attempts: (params) => api.get('/exams/attempts', { params }),
};

// Payments
export const paymentAPI = {
  plans: () => api.get('/payments/plans'),
  createOrder: d => api.post('/payments/create-order', d),
  verify: d => api.post('/payments/verify', d),
  mockComplete: d => api.post('/payments/mock-complete', d),
  history: () => api.get('/payments/history'),
  invoice: id => api.get(`/payments/invoice/${id}`),
};

// Contests
export const contestAPI = {
  list: () => api.get('/contests'),
  get: id => api.get(`/contests/${id}`),
  leaderboard: id => api.get(`/contests/${id}/leaderboard`),
  history: () => api.get('/contests/my/history'),
};

// Forum
export const forumAPI = {
  posts: (params) => api.get('/forum/posts', { params }),
  post: id => api.get(`/forum/posts/${id}`),
  createPost: d => api.post('/forum/posts', d),
  reply: (id, d) => api.post(`/forum/posts/${id}/reply`, d),
  votePost: (id, vote) => api.post(`/forum/posts/${id}/vote`, { vote }),
  voteReply: id => api.post(`/forum/replies/${id}/vote`),
};

// Study
export const studyAPI = {
  notes: (params) => api.get('/study/notes', { params }),
  note: id => api.get(`/study/notes/${id}`),
  aiNote: d => api.post('/study/ai-note', d),
};

// Tutor
export const tutorAPI = {
  chat: messages => api.post('/tutor/chat', { messages }),
};

// Admin
export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  users: (params) => api.get('/admin/users', { params }),
  updateUser: (id, d) => api.put(`/admin/users/${id}`, d),
  transactions: (params) => api.get('/admin/transactions', { params }),
  createContest: d => api.post('/admin/contests', d),
  updateContest: (id, d) => api.put(`/admin/contests/${id}`, d),
  broadcast: d => api.post('/admin/notifications/broadcast', d),
  analytics: () => api.get('/admin/analytics'),
  forumPosts: () => api.get('/admin/forum/posts'),
  updateForumPost: (id, d) => api.put(`/admin/forum/posts/${id}`, d),
};

export default api;
