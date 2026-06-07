const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { User, Referral, Notification } = require('../models');
const { sendMail, emailTemplates } = require('../utils/email');
const { auth } = require('../middleware/auth');

const generateTokens = (user) => {
  const access = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
  const refresh = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { access, refresh };
};

const generateReferralCode = () => 'PP' + Math.random().toString(36).slice(2, 7).toUpperCase();
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── REGISTER ──────────────────────────────────────────────────────────────────
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password, target_exams, referral_code } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const referralCodeNew = generateReferralCode();

    const user = await User.create({
      name, email, password_hash,
      target_exams: target_exams || ['jee'],
      referral_code: referralCodeNew,
      otp,
      otp_expires: new Date(Date.now() + 10 * 60 * 1000),
      tests_remaining: referral_code ? 7 : 5, // +2 bonus for referral
    });

    // Handle referral
    if (referral_code) {
      const referrer = await User.findOne({ where: { referral_code } });
      if (referrer) {
        await Referral.create({ referrer_id: referrer.id, referee_id: user.id, status: 'pending' });
        user.referred_by = referrer.id;
        await user.save();
      }
    }

    // Send welcome + OTP email — rollback user if email fails
    try {
      await sendMail({ to: email, ...emailTemplates.welcome(name, referralCodeNew) });
      await sendMail({ to: email, ...emailTemplates.otp(name, otp) });
    } catch (emailErr) {
      await user.destroy();
      return res.status(500).json({ error: 'Registration failed', detail: 'Could not send verification email. Please try again.' });
    }

    // Notification
    await Notification.create({ user_id: user.id, type: 'system', title: 'Welcome to ParikshaPro! 🎉', body: 'You have 5 free mock tests. Start your exam prep today!' });

    const { access, refresh } = generateTokens(user);
    await User.update({ refresh_token: refresh }, { where: { id: user.id } });

    res.status(201).json({
      message: 'Account created. Please verify your email.',
      user: { id: user.id, name, email, plan_type: user.plan_type, tests_remaining: user.tests_remaining, referral_code: referralCodeNew, is_verified: false },
      tokens: { access, refresh },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
});

// ── VERIFY OTP ────────────────────────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > user.otp_expires) return res.status(400).json({ error: 'OTP expired' });

    await user.update({ is_verified: true, otp: null, otp_expires: null });

    // Complete referral bonus
    if (user.referred_by) {
      const referral = await Referral.findOne({ where: { referee_id: user.id, status: 'pending' } });
      if (referral) {
        await referral.update({ status: 'completed', bonus_credited_at: new Date() });
        await User.increment('tests_remaining', { by: 1, where: { id: user.referred_by } });
        await Notification.create({ user_id: user.referred_by, type: 'referral_bonus', title: '🎁 Referral Bonus!', body: `${user.name} joined using your code. +1 free test added to your account!` });
      }
    }

    res.json({ message: 'Email verified successfully', is_verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RESEND OTP ────────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const otp = generateOTP();
    await user.update({ otp, otp_expires: new Date(Date.now() + 10 * 60 * 1000) });
    await sendMail({ to: email, ...emailTemplates.otp(user.name, otp) });
    res.json({ message: 'OTP sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Update streak
    const lastActive = new Date(user.last_active);
    const now = new Date();
    const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
    let streak = user.streak;
    if (diffDays === 1) streak += 1;
    else if (diffDays > 1) streak = 1;

    await user.update({ last_active: now, streak });

    const { access, refresh } = generateTokens(user);
    await user.update({ refresh_token: refresh });

    res.json({
      user: {
        id: user.id, name: user.name, email: user.email,
        plan_type: user.plan_type, plan_expiry: user.plan_expiry,
        tests_remaining: user.tests_remaining, contest_credits: user.contest_credits,
        referral_code: user.referral_code, is_verified: user.is_verified,
        role: user.role, streak, target_exams: user.target_exams,
        preferred_language: user.preferred_language, total_tests: user.total_tests,
        avatar_url: user.avatar_url,
      },
      tokens: { access, refresh },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(401).json({ error: 'No refresh token' });
    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || user.refresh_token !== refresh_token) return res.status(401).json({ error: 'Invalid refresh token' });
    const { access, refresh } = generateTokens(user);
    await user.update({ refresh_token: refresh });
    res.json({ tokens: { access, refresh } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
router.post('/logout', auth, async (req, res) => {
  await req.user.update({ refresh_token: null });
  res.json({ message: 'Logged out' });
});

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.json({ message: 'If email exists, reset link sent' });
    const token = uuidv4();
    await user.update({ reset_token: token, reset_token_expires: new Date(Date.now() + 3600000) });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: 'ParikshaPro — Reset Your Password',
      html: `<div style="font-family:sans-serif;padding:32px;background:#0a0a0f;color:#e8e8f0;border-radius:12px;"><h1 style="color:#f7b731;">ParikshaPro</h1><h2>Reset your password</h2><p>Click below to reset your password. Link valid for 1 hour.</p><a href="${resetUrl}" style="background:#f7b731;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Reset Password →</a></div>`
    });
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ where: { reset_token: token } });
    if (!user || new Date() > user.reset_token_expires) return res.status(400).json({ error: 'Invalid or expired reset token' });
    const password_hash = await bcrypt.hash(password, 12);
    await user.update({ password_hash, reset_token: null, reset_token_expires: null });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET ME ────────────────────────────────────────────────────────────────────
router.get('/me', auth, (req, res) => res.json({ user: req.user }));

module.exports = router;
