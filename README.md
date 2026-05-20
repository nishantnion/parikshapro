# 🎯 ParikshaPro — India's AI-Powered Exam Prep Platform

**parikshapro.in** | JEE • NEET • UPSC • IBPS • SSC • GATE • NDA • RRB

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- MySQL (MySQL Workbench recommended)
- Anthropic API Key (for AI features)

---

## 1. Database Setup (MySQL Workbench)

Open MySQL Workbench and run:
```sql
CREATE DATABASE parikshapro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 2. Backend Setup

```bash
cd backend

# Copy and fill environment variables
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=parikshapro
DB_USER=root
DB_PASSWORD=your_mysql_root_password   # ← Change this
JWT_SECRET=any_long_random_string_here
JWT_REFRESH_SECRET=another_random_string
ANTHROPIC_API_KEY=sk-ant-...           # ← Required for AI
RAZORPAY_KEY_ID=                       # Leave blank for mock mode
RAZORPAY_KEY_SECRET=                   # Leave blank for mock mode
FRONTEND_URL=http://localhost:3000
```

```bash
# Install dependencies
npm install

# Seed database (creates tables + admin user + sample contests)
npm run seed

# Start backend
npm run dev        # development (with nodemon)
# OR
npm start          # production
```

Backend runs on **http://localhost:5000**

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start frontend
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## 4. Login

After seeding, use these credentials:
- **Admin:** admin@parikshapro.in / Admin@123
- **Demo:** Register a new account at /register

---

## 🗂 Project Structure

```
parikshapro/
├── backend/
│   ├── config/
│   │   ├── database.js       # Sequelize + MySQL config
│   │   └── seed.js           # DB seeder
│   ├── middleware/
│   │   └── auth.js           # JWT middleware
│   ├── models/
│   │   └── index.js          # All 16 Sequelize models
│   ├── routes/
│   │   ├── auth.js           # Register, login, OTP, refresh
│   │   ├── exams.js          # Schedule, generate, submit
│   │   ├── payments.js       # Razorpay + mock payments
│   │   └── misc.js           # User, contests, forum, study, admin
│   ├── utils/
│   │   ├── ai.js             # Claude API integration
│   │   └── email.js          # Nodemailer templates
│   ├── server.js             # Express app + cron jobs
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/index.js       # Axios client + all API calls
    │   ├── hooks/useAuth.jsx  # Auth context
    │   ├── components/
    │   │   └── Sidebar.jsx    # Navigation sidebar
    │   ├── pages/
    │   │   ├── index.jsx      # All main pages
    │   │   ├── ExamRoom.jsx   # Full exam room with anti-cheat
    │   │   ├── Auth.jsx       # Login, Register, OTP
    │   │   └── admin/         # Admin dashboard
    │   ├── styles/global.css  # Dark theme design system
    │   └── App.jsx            # Router + protected routes
    └── vite.config.js
```

---

## 💡 Features

### Student App
- 🤖 **AI Exam Generation** — Claude generates unique papers every time
- 📊 **8 Exams** — JEE, NEET, UPSC, IBPS, SSC, GATE, NDA, RRB
- 🛡️ **Anti-Cheat** — Tab switch detection, right-click disable, copy block
- 📈 **Detailed Analytics** — Section-wise, topic-wise, vs national average
- 🤖 **AI Analysis** — Personalized study recommendations
- 📚 **AI Study Notes** — Generate notes on any topic instantly
- 🤖 **AI Tutor** — Chat with Claude for doubt-clearing
- 🏆 **Weekly Contests** — Live leaderboard, prizes, entry ₹11
- 💬 **Forum** — Ask questions, help others, earn badges
- 🔗 **Referrals** — Earn free tests for each referral

### Payments
- 💳 Razorpay integration (UPI, cards, net banking)
- 🧪 **Mock mode** — Works without Razorpay keys for testing
- 🧾 GST invoices generated automatically

### Plans
| Plan | Price | Tests | Validity |
|------|-------|-------|----------|
| Free | ₹0 | 5 | Forever |
| Starter | ₹9 | 5 | 30 days |
| Monthly | ₹49 | 20 | 1 month |
| Semester | ₹59 | 15 | 2 months |
| Annual | ₹299 | 100 | 1 year |
| Elite | ₹499 | Unlimited | 1 year |

### Admin Panel (/admin)
- 📊 Dashboard stats
- 👥 User management (edit plan, tests, role)
- 💳 Transaction history
- 📈 Analytics charts
- 🏆 Contest management
- 💬 Forum moderation
- 📣 Broadcast notifications

---

## 🚢 Deployment

### Backend (Railway / Render / VPS)

```bash
# Set environment variables in dashboard
NODE_ENV=production
PORT=5000
DB_HOST=your_db_host
DB_NAME=parikshapro
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_production_secret
ANTHROPIC_API_KEY=sk-ant-...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
FRONTEND_URL=https://parikshapro.in
EMAIL_USER=noreply@parikshapro.in
EMAIL_PASS=your_app_password
```

```bash
# Build command
npm install

# Start command  
npm start

# Run seed once after first deploy
npm run seed
```

### Frontend (Vercel / Netlify)

```bash
# Build command
npm install --legacy-peer-deps && npm run build

# Output directory
dist

# Environment variables
VITE_API_URL=https://api.parikshapro.in/api
VITE_RAZORPAY_KEY=rzp_live_...
```

### For full-stack on one server:
```bash
# Build frontend
cd frontend && npm run build

# Backend serves frontend in production (NODE_ENV=production)
# Express serves frontend/dist as static files
```

---

## ⚙️ Cron Jobs (Auto-running)

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Exam reminders | Every 5 min | Email + notify students before exam |
| Contest status | Every 1 min | Auto-open, go-live, complete contests |
| Plan expiry | Daily | Mark expired subscriptions |

---

## 📧 Email Setup (Optional)

For Gmail:
1. Enable 2FA on Gmail
2. Generate App Password: Google Account → Security → App Passwords
3. Set `EMAIL_USER` and `EMAIL_PASS` in .env

Emails are **gracefully skipped** if not configured.

---

## 🔑 API Reference

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify-email
POST   /api/auth/refresh
POST   /api/exams/schedule
POST   /api/exams/:id/start          ← triggers AI generation
POST   /api/exams/attempts/:id/submit
GET    /api/exams/attempts/:id/results
POST   /api/exams/attempts/:id/analyze  ← AI analysis
GET    /api/user/dashboard
POST   /api/payments/create-order
POST   /api/payments/verify
POST   /api/payments/mock-complete    ← testing without Razorpay
GET    /api/contests
POST   /api/study/ai-note            ← AI study notes
POST   /api/tutor/chat               ← AI tutor
GET    /api/admin/stats              ← admin only
```

---

## 🐛 Common Issues

**MySQL connection failed:**
- Check DB_PASSWORD in .env
- Make sure MySQL service is running
- Run `CREATE DATABASE parikshapro;` in MySQL Workbench

**AI not working:**
- Check ANTHROPIC_API_KEY is set correctly
- API key must start with `sk-ant-`

**Payment mock not working:**
- Leave RAZORPAY_KEY_ID blank in .env for auto-mock mode

**Frontend can't connect to backend:**
- Make sure backend is running on port 5000
- Vite proxy in vite.config.js handles /api → localhost:5000

---

Built with ❤️ for India's 2 crore+ exam aspirants
