const router = require('express').Router();
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const { User, Transaction, Subscription, Notification, ContestEnrollment } = require('../models');

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id') {
    return null; // Mock mode
  }
  const Razorpay = require('razorpay');
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

const PLANS = {
  starter:  { tests: 5,   validity_days: 30,   price: 9,   name: 'Starter Pack' },
  monthly:  { tests: 20,  validity_days: 30,   price: 49,  name: 'Monthly Pro' },
  semester: { tests: 15,  validity_days: 60,   price: 59,  name: 'Semester Pack' },
  annual:   { tests: 100, validity_days: 365,  price: 299, name: 'Annual Pro' },
  elite:    { tests: 9999,validity_days: 365,  price: 499, name: 'All India Elite' },
};

const GST_RATE = 0.18;

// ── CREATE ORDER ──────────────────────────────────────────────────────────────
router.post('/create-order', auth, async (req, res) => {
  try {
    const { type, plan_id, contest_id } = req.body;
    let amount, description, metadata = {};

    if (type === 'plan_purchase') {
      const plan = PLANS[plan_id];
      if (!plan) return res.status(400).json({ error: 'Invalid plan' });
      amount = plan.price;
      description = plan.name;
      metadata = { plan_id };
    } else if (type === 'contest_enrollment') {
      amount = 11;
      description = 'Contest Enrollment';
      metadata = { contest_id };
    } else {
      return res.status(400).json({ error: 'Invalid order type' });
    }

    const amountWithGST = Math.round(amount * (1 + GST_RATE));
    const invoiceNumber = `PP-${Date.now()}-${req.user.id.slice(0, 6).toUpperCase()}`;

    const razorpay = getRazorpay();

    // Mock mode (no Razorpay keys)
    if (!razorpay) {
      const mockOrderId = `order_mock_${Date.now()}`;
      const transaction = await Transaction.create({
        user_id: req.user.id,
        razorpay_order_id: mockOrderId,
        amount, amount_with_gst: amountWithGST,
        type, status: 'pending',
        metadata: { ...metadata, description },
        invoice_number: invoiceNumber,
      });
      return res.json({
        order_id: mockOrderId,
        amount: amountWithGST * 100,
        currency: 'INR',
        key_id: 'MOCK_MODE',
        transaction_id: transaction.id,
        mock_mode: true,
      });
    }

    const order = await razorpay.orders.create({
      amount: amountWithGST * 100,
      currency: 'INR',
      receipt: invoiceNumber,
      notes: { user_id: req.user.id, type, ...metadata },
    });

    const transaction = await Transaction.create({
      user_id: req.user.id,
      razorpay_order_id: order.id,
      amount, amount_with_gst: amountWithGST,
      type, status: 'pending',
      metadata: { ...metadata, description },
      invoice_number: invoiceNumber,
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      transaction_id: transaction.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VERIFY PAYMENT ────────────────────────────────────────────────────────────
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transaction_id, mock_payment } = req.body;

    const transaction = await Transaction.findOne({ where: { id: transaction_id, user_id: req.user.id } });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    // Verify signature (skip in mock mode)
    if (!mock_payment && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET !== 'your_razorpay_key_secret') {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
      if (expectedSig !== razorpay_signature) {
        await transaction.update({ status: 'failed' });
        return res.status(400).json({ error: 'Payment verification failed' });
      }
    }

    await transaction.update({ razorpay_payment_id: razorpay_payment_id || 'MOCK', status: 'success' });

    const user = await User.findByPk(req.user.id);
    const metadata = transaction.metadata || {};

    // Handle plan purchase
    if (transaction.type === 'plan_purchase') {
      const plan = PLANS[metadata.plan_id];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.validity_days);

      await Subscription.create({
        user_id: user.id, plan_type: metadata.plan_id,
        starts_at: new Date(), expires_at: expiresAt,
        tests_included: plan.tests, tests_used: 0,
        status: 'active', amount_paid: transaction.amount,
      });

      await user.update({
        plan_type: metadata.plan_id,
        plan_expiry: expiresAt,
        tests_remaining: user.tests_remaining + plan.tests,
      });

      await Notification.create({
        user_id: user.id, type: 'system',
        title: `✅ ${plan.name} Activated!`,
        body: `${plan.tests} tests added to your account. Valid till ${expiresAt.toLocaleDateString('en-IN')}`,
      });
    }

    // Handle contest enrollment
    if (transaction.type === 'contest_enrollment' && metadata.contest_id) {
      await ContestEnrollment.create({
        contest_id: metadata.contest_id,
        user_id: user.id,
        payment_id: razorpay_payment_id || 'MOCK',
      });
    }

    res.json({ success: true, message: 'Payment verified', invoice: transaction.invoice_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RAZORPAY WEBHOOK ──────────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET !== 'your_razorpay_webhook_secret') {
      const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');
      if (signature !== expectedSig) return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payment = req.body.payload?.payment?.entity;

    if (event === 'payment.failed' && payment) {
      await Transaction.update({ status: 'failed' }, { where: { razorpay_order_id: payment.order_id } });
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MOCK PAYMENT (for testing without Razorpay) ───────────────────────────────
router.post('/mock-complete', auth, async (req, res) => {
  try {
    const { transaction_id } = req.body;
    const result = await require('express').Router();
    // Reuse verify logic
    req.body.mock_payment = true;
    req.body.razorpay_payment_id = 'MOCK_' + Date.now();

    const transaction = await Transaction.findOne({ where: { id: transaction_id, user_id: req.user.id } });
    if (!transaction) return res.status(404).json({ error: 'Not found' });

    await transaction.update({ razorpay_payment_id: 'MOCK_' + Date.now(), status: 'success' });

    const user = await User.findByPk(req.user.id);
    const metadata = transaction.metadata || {};

    if (transaction.type === 'plan_purchase') {
      const plan = PLANS[metadata.plan_id];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.validity_days);
      await Subscription.create({ user_id: user.id, plan_type: metadata.plan_id, starts_at: new Date(), expires_at: expiresAt, tests_included: plan.tests, tests_used: 0, status: 'active', amount_paid: transaction.amount });
      await user.update({ plan_type: metadata.plan_id, plan_expiry: expiresAt, tests_remaining: user.tests_remaining + plan.tests });
      await Notification.create({ user_id: user.id, type: 'system', title: `✅ ${plan.name} Activated!`, body: `${plan.tests} tests added. Valid till ${expiresAt.toLocaleDateString('en-IN')}` });
    }

    if (transaction.type === 'contest_enrollment' && metadata.contest_id) {
      await ContestEnrollment.create({ contest_id: metadata.contest_id, user_id: user.id, payment_id: 'MOCK_' + Date.now() });
    }

    const updatedUser = await User.findByPk(user.id, { attributes: { exclude: ['password_hash', 'otp', 'refresh_token'] } });
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PAYMENT HISTORY ───────────────────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET INVOICE ───────────────────────────────────────────────────────────────
router.get('/invoice/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ where: { id: req.params.id, user_id: req.user.id, status: 'success' } });
    if (!transaction) return res.status(404).json({ error: 'Invoice not found' });
    const user = await User.findByPk(req.user.id);
    res.json({
      invoice: {
        number: transaction.invoice_number,
        date: transaction.created_at,
        user: { name: user.name, email: user.email },
        amount: transaction.amount,
        gst: transaction.amount_with_gst - transaction.amount,
        total: transaction.amount_with_gst,
        description: transaction.metadata?.description,
        payment_id: transaction.razorpay_payment_id,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET PLANS ─────────────────────────────────────────────────────────────────
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS, gst_rate: GST_RATE });
});

module.exports = router;
