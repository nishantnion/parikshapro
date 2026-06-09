require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// Raw body for Razorpay webhook
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many auth attempts' } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'AI rate limit exceeded' } });

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/study/ai-note', aiLimiter);
app.use('/api/tutor/chat', aiLimiter);

// ── ROUTES ────────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const paymentRoutes = require('./routes/payments');
const { userRouter, contestRouter, forumRouter, studyRouter, tutorRouter, adminRouter } = require('./routes/misc');

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRouter);
app.use('/api/contests', contestRouter);
app.use('/api/forum', forumRouter);
app.use('/api/study', studyRouter);
app.use('/api/tutor', tutorRouter);
app.use('/api/admin', adminRouter);

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date(), env: process.env.NODE_ENV }));

// ── SERVE FRONTEND IN PRODUCTION ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.use((req, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')));
}

// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── DATABASE CONNECT & START ──────────────────────────────────────────────────
const { sequelize } = require('./models');

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected');
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synced');

    // ── CRON JOBS ─────────────────────────────────────────────────────────────
    // Check scheduled exams every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        const { ScheduledExam, Notification, User } = require('./models');
        const now = new Date();
        const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000);

        // Send reminders for exams starting in 30 mins
        const upcoming = await ScheduledExam.findAll({
          where: {
            status: 'pending',
            scheduled_at: { [require('sequelize').Op.between]: [now, thirtyMinsFromNow] },
          },
        });

        for (const exam of upcoming) {
          const user = await User.findByPk(exam.user_id);
          if (user) {
            const EXAM_NAMES = { jee: 'JEE Main', neet: 'NEET UG', upsc: 'UPSC CSE', ibps: 'IBPS PO', ssc: 'SSC CGL', gate: 'GATE CS', nda: 'NDA', rrb: 'RRB NTPC' };
            await Notification.create({ user_id: user.id, type: 'exam_reminder', title: '⏰ Exam starting in 30 minutes!', body: `Your ${EXAM_NAMES[exam.exam_category_id] || 'mock test'} starts at ${new Date(exam.scheduled_at).toLocaleTimeString('en-IN')}` });
            const { sendMail, emailTemplates } = require('./utils/email');
            await sendMail({ to: user.email, ...emailTemplates.examReminder(user.name, EXAM_NAMES[exam.exam_category_id] || 'Mock Test', exam.scheduled_at) });
          }
        }

        // Mark overdue pending exams as active (past scheduled time)
        await ScheduledExam.update({ status: 'active' }, { where: { status: 'pending', scheduled_at: { [require('sequelize').Op.lte]: now } } });

        // Expire exams past grace window
        await ScheduledExam.update({ status: 'expired' }, { where: { status: 'active', expires_at: { [require('sequelize').Op.lt]: now } } });
      } catch (e) { console.error('Cron error:', e.message); }
    });

    // Purge expired question cache rows every hour
    cron.schedule('0 * * * *', async () => {
      try {
        const { QuestionCache } = require('./models');
        const deleted = await QuestionCache.destroy({ where: { expires_at: { [require('sequelize').Op.lt]: new Date() } } });
        if (deleted) console.log(`[Cache] Purged ${deleted} expired question cache rows`);
      } catch (e) {}
    });

    // Contest status updates every minute
    cron.schedule('* * * * *', async () => {
      try {
        const { Contest } = require('./models');
        const now = new Date();
        // Open registration 3 days before
        const threeDays = new Date(now.getTime() + 3 * 24 * 3600000);
        await Contest.update({ status: 'registration_open' }, { where: { status: 'upcoming', scheduled_at: { [require('sequelize').Op.lte]: threeDays } } });
        // Go live
        await Contest.update({ status: 'live' }, { where: { status: 'registration_open', scheduled_at: { [require('sequelize').Op.lte]: now } } });
        // Complete
        const completedCandidates = await Contest.findAll({ where: { status: 'live' } });
        for (const c of completedCandidates) {
          const endTime = new Date(c.scheduled_at.getTime() + c.duration_minutes * 60000);
          if (now > endTime) await c.update({ status: 'completed' });
        }
      } catch (e) {}
    });

    app.listen(PORT, () => {
      console.log(`\n🚀 ParikshaPro backend running on port ${PORT}`);
      console.log(`📡 Health: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Mode: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
};

startServer();
