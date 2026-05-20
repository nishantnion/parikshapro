const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ── USER ─────────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: true },
  avatar_url: { type: DataTypes.STRING(500), defaultValue: null },
  preferred_language: { type: DataTypes.ENUM('en', 'hi'), defaultValue: 'en' },
  target_exams: { type: DataTypes.JSON, defaultValue: ['jee'] },
  plan_type: { type: DataTypes.ENUM('free', 'starter', 'monthly', 'semester', 'annual', 'elite'), defaultValue: 'free' },
  plan_expiry: { type: DataTypes.DATE, defaultValue: null },
  tests_remaining: { type: DataTypes.INTEGER, defaultValue: 5 },
  contest_credits: { type: DataTypes.INTEGER, defaultValue: 1 },
  referral_code: { type: DataTypes.STRING(20), unique: true },
  referred_by: { type: DataTypes.UUID, defaultValue: null },
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  otp: { type: DataTypes.STRING(10), defaultValue: null },
  otp_expires: { type: DataTypes.DATE, defaultValue: null },
  role: { type: DataTypes.ENUM('student', 'admin', 'superadmin'), defaultValue: 'student' },
  streak: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_active: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  total_tests: { type: DataTypes.INTEGER, defaultValue: 0 },
  google_id: { type: DataTypes.STRING(100), defaultValue: null },
  refresh_token: { type: DataTypes.TEXT, defaultValue: null },
  reset_token: { type: DataTypes.STRING(100), defaultValue: null },
  reset_token_expires: { type: DataTypes.DATE, defaultValue: null },
}, { tableName: 'users' });

// ── EXAM CATEGORY ─────────────────────────────────────────────────────────────
const ExamCategory = sequelize.define('ExamCategory', {
  id: { type: DataTypes.STRING(30), primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  name_hi: { type: DataTypes.STRING(100) },
  icon: { type: DataTypes.STRING(10) },
  color: { type: DataTypes.STRING(20) },
  subject: { type: DataTypes.STRING(50) },
  sections_config: { type: DataTypes.JSON },
  total_questions: { type: DataTypes.INTEGER },
  duration_minutes: { type: DataTypes.INTEGER },
  marking_scheme: { type: DataTypes.JSON },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'exam_categories' });

// ── SCHEDULED EXAM ────────────────────────────────────────────────────────────
const ScheduledExam = sequelize.define('ScheduledExam', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  exam_category_id: { type: DataTypes.STRING(30), allowNull: false },
  difficulty: { type: DataTypes.ENUM('Easy', 'Medium', 'Hard', 'AI-Based'), defaultValue: 'Medium' },
  num_questions: { type: DataTypes.INTEGER, defaultValue: 0 },
  language: { type: DataTypes.ENUM('en', 'hi'), defaultValue: 'en' },
  scheduled_at: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'generating', 'active', 'completed', 'expired'), defaultValue: 'pending' },
  generated_at: { type: DataTypes.DATE, defaultValue: null },
  expires_at: { type: DataTypes.DATE, defaultValue: null },
}, { tableName: 'scheduled_exams' });

// ── GENERATED EXAM ────────────────────────────────────────────────────────────
const GeneratedExam = sequelize.define('GeneratedExam', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  scheduled_exam_id: { type: DataTypes.UUID, allowNull: false },
  exam_data: { type: DataTypes.JSON, allowNull: false },
  total_marks: { type: DataTypes.INTEGER },
  total_questions: { type: DataTypes.INTEGER },
}, { tableName: 'generated_exams' });

// ── EXAM ATTEMPT ──────────────────────────────────────────────────────────────
const ExamAttempt = sequelize.define('ExamAttempt', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  generated_exam_id: { type: DataTypes.UUID, allowNull: false },
  exam_category_id: { type: DataTypes.STRING(30) },
  exam_name: { type: DataTypes.STRING(100) },
  difficulty: { type: DataTypes.STRING(20) },
  started_at: { type: DataTypes.DATE },
  submitted_at: { type: DataTypes.DATE },
  answers: { type: DataTypes.JSON },
  score: { type: DataTypes.FLOAT, defaultValue: 0 },
  max_score: { type: DataTypes.FLOAT },
  percentage: { type: DataTypes.FLOAT, defaultValue: 0 },
  total_questions: { type: DataTypes.INTEGER },
  answered_questions: { type: DataTypes.INTEGER, defaultValue: 0 },
  correct_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  wrong_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  skipped_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  time_taken_seconds: { type: DataTypes.INTEGER },
  status: { type: DataTypes.ENUM('in_progress', 'submitted', 'timed_out'), defaultValue: 'in_progress' },
  ai_analysis: { type: DataTypes.JSON, defaultValue: null },
  tab_switches: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'exam_attempts' });

// ── CONTEST ───────────────────────────────────────────────────────────────────
const Contest = sequelize.define('Contest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  exam_category_id: { type: DataTypes.STRING(30) },
  scheduled_at: { type: DataTypes.DATE },
  duration_minutes: { type: DataTypes.INTEGER, defaultValue: 60 },
  enrollment_fee: { type: DataTypes.INTEGER, defaultValue: 11 },
  status: { type: DataTypes.ENUM('upcoming', 'registration_open', 'live', 'completed', 'cancelled'), defaultValue: 'upcoming' },
  max_participants: { type: DataTypes.INTEGER, defaultValue: 10000 },
  generated_exam_id: { type: DataTypes.UUID, defaultValue: null },
  prize_description: { type: DataTypes.JSON },
  results_published: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'contests' });

// ── CONTEST ENROLLMENT ────────────────────────────────────────────────────────
const ContestEnrollment = sequelize.define('ContestEnrollment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  contest_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  payment_id: { type: DataTypes.STRING(100) },
  attempt_id: { type: DataTypes.UUID, defaultValue: null },
  rank: { type: DataTypes.INTEGER, defaultValue: null },
  score: { type: DataTypes.FLOAT, defaultValue: null },
}, { tableName: 'contest_enrollments' });

// ── SUBSCRIPTION ──────────────────────────────────────────────────────────────
const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  plan_type: { type: DataTypes.STRING(30) },
  razorpay_subscription_id: { type: DataTypes.STRING(100), defaultValue: null },
  starts_at: { type: DataTypes.DATE },
  expires_at: { type: DataTypes.DATE },
  tests_included: { type: DataTypes.INTEGER },
  tests_used: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'expired', 'cancelled'), defaultValue: 'active' },
  amount_paid: { type: DataTypes.FLOAT },
}, { tableName: 'subscriptions' });

// ── TRANSACTION ───────────────────────────────────────────────────────────────
const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  razorpay_order_id: { type: DataTypes.STRING(100) },
  razorpay_payment_id: { type: DataTypes.STRING(100) },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  amount_with_gst: { type: DataTypes.FLOAT },
  currency: { type: DataTypes.STRING(10), defaultValue: 'INR' },
  type: { type: DataTypes.ENUM('plan_purchase', 'contest_enrollment', 'test_pack'), defaultValue: 'plan_purchase' },
  status: { type: DataTypes.ENUM('pending', 'success', 'failed', 'refunded'), defaultValue: 'pending' },
  metadata: { type: DataTypes.JSON },
  invoice_number: { type: DataTypes.STRING(50) },
}, { tableName: 'transactions' });

// ── REFERRAL ──────────────────────────────────────────────────────────────────
const Referral = sequelize.define('Referral', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  referrer_id: { type: DataTypes.UUID, allowNull: false },
  referee_id: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'completed'), defaultValue: 'pending' },
  bonus_credited_at: { type: DataTypes.DATE, defaultValue: null },
}, { tableName: 'referrals' });

// ── STUDY NOTE ────────────────────────────────────────────────────────────────
const StudyNote = sequelize.define('StudyNote', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  exam_category_id: { type: DataTypes.STRING(30) },
  subject: { type: DataTypes.STRING(100) },
  topic: { type: DataTypes.STRING(200), allowNull: false },
  content: { type: DataTypes.JSON },
  language: { type: DataTypes.ENUM('en', 'hi', 'both'), defaultValue: 'en' },
  type: { type: DataTypes.ENUM('ai_generated', 'manual', 'pyq'), defaultValue: 'ai_generated' },
  is_public: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by: { type: DataTypes.UUID },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'study_notes' });

// ── FORUM POST ────────────────────────────────────────────────────────────────
const ForumPost = sequelize.define('ForumPost', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  exam_category_id: { type: DataTypes.STRING(30) },
  title: { type: DataTypes.STRING(300), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  upvotes: { type: DataTypes.INTEGER, defaultValue: 0 },
  downvotes: { type: DataTypes.INTEGER, defaultValue: 0 },
  reply_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_pinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.ENUM('active', 'removed', 'flagged'), defaultValue: 'active' },
  tags: { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'forum_posts' });

// ── FORUM REPLY ───────────────────────────────────────────────────────────────
const ForumReply = sequelize.define('ForumReply', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  post_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  upvotes: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.ENUM('active', 'removed'), defaultValue: 'active' },
}, { tableName: 'forum_replies' });

// ── NOTIFICATION ──────────────────────────────────────────────────────────────
const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('exam_reminder', 'result_ready', 'contest_result', 'plan_expiry', 'referral_bonus', 'badge_earned', 'system'), defaultValue: 'system' },
  title: { type: DataTypes.STRING(200) },
  body: { type: DataTypes.TEXT },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  metadata: { type: DataTypes.JSON, defaultValue: {} },
}, { tableName: 'notifications' });

// ── USER BADGE ────────────────────────────────────────────────────────────────
const UserBadge = sequelize.define('UserBadge', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  badge_type: { type: DataTypes.ENUM('topper', 'helper', 'consistent', 'ambassador', 'speedster', 'perfectionist'), allowNull: false },
}, { tableName: 'user_badges' });

// ── FORUM VOTE ────────────────────────────────────────────────────────────────
const ForumVote = sequelize.define('ForumVote', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  target_id: { type: DataTypes.UUID, allowNull: false },
  target_type: { type: DataTypes.ENUM('post', 'reply'), allowNull: false },
  vote: { type: DataTypes.ENUM('up', 'down'), allowNull: false },
}, { tableName: 'forum_votes' });

// ── ASSOCIATIONS ──────────────────────────────────────────────────────────────
User.hasMany(ScheduledExam, { foreignKey: 'user_id' });
ScheduledExam.belongsTo(User, { foreignKey: 'user_id' });
ScheduledExam.hasOne(GeneratedExam, { foreignKey: 'scheduled_exam_id' });
GeneratedExam.belongsTo(ScheduledExam, { foreignKey: 'scheduled_exam_id' });
User.hasMany(ExamAttempt, { foreignKey: 'user_id' });
ExamAttempt.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(ContestEnrollment, { foreignKey: 'user_id' });
Contest.hasMany(ContestEnrollment, { foreignKey: 'contest_id' });
ContestEnrollment.belongsTo(Contest, { foreignKey: 'contest_id' });
ContestEnrollment.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Transaction, { foreignKey: 'user_id' });
User.hasMany(Referral, { foreignKey: 'referrer_id', as: 'referrals_given' });
User.hasMany(Notification, { foreignKey: 'user_id' });
User.hasMany(ForumPost, { foreignKey: 'user_id' });
ForumPost.belongsTo(User, { foreignKey: 'user_id' });
ForumPost.hasMany(ForumReply, { foreignKey: 'post_id' });
ForumReply.belongsTo(ForumPost, { foreignKey: 'post_id' });
ForumReply.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(UserBadge, { foreignKey: 'user_id' });
User.hasMany(Subscription, { foreignKey: 'user_id' });

module.exports = {
  sequelize, User, ExamCategory, ScheduledExam, GeneratedExam,
  ExamAttempt, Contest, ContestEnrollment, Subscription, Transaction,
  Referral, StudyNote, ForumPost, ForumReply, Notification, UserBadge, ForumVote
};
