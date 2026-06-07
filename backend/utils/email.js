const nodemailer = require('nodemailer');

const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: emailPort,
  secure: emailPort === 465,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendMail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER) {
    console.log(`[EMAIL SKIPPED - no config] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
};

const emailTemplates = {
  otp: (name, otp) => ({
    subject: 'ParikshaPro — Verify Your Email',
    html: `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;background:#0a0a0f;color:#e8e8f0;border-radius:12px;">
      <h1 style="color:#f7b731;font-size:28px;margin-bottom:8px;">ParikshaPro</h1>
      <p style="color:#7070a0;margin-bottom:24px;">हर परीक्षा। हर बार। AI से तैयार।</p>
      <h2 style="margin-bottom:16px;">Verify your email, ${name}!</h2>
      <div style="background:#1a1a26;border:1px solid #2a2a3d;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
        <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#f7b731;">${otp}</div>
        <p style="color:#7070a0;margin-top:8px;font-size:13px;">Valid for 10 minutes</p>
      </div>
      <p style="color:#7070a0;font-size:13px;">If you didn't request this, ignore this email.</p>
    </div>`
  }),

  examReminder: (name, examName, scheduledAt) => ({
    subject: `⏰ Reminder: ${examName} starts in 30 minutes!`,
    html: `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;background:#0a0a0f;color:#e8e8f0;border-radius:12px;">
      <h1 style="color:#f7b731;">ParikshaPro</h1>
      <h2>Your exam starts soon, ${name}!</h2>
      <div style="background:#1a1a26;border:1px solid #f7b731;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="font-size:18px;font-weight:700;color:#f7b731;">${examName}</p>
        <p style="color:#7070a0;">Scheduled: ${new Date(scheduledAt).toLocaleString('en-IN')}</p>
      </div>
      <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#f7b731;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Go to Dashboard →</a>
    </div>`
  }),

  welcome: (name, referralCode) => ({
    subject: '🎉 Welcome to ParikshaPro — Your AI Exam Partner!',
    html: `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;background:#0a0a0f;color:#e8e8f0;border-radius:12px;">
      <h1 style="color:#f7b731;font-size:32px;">ParikshaPro</h1>
      <h2>Welcome aboard, ${name}! 🚀</h2>
      <p style="color:#7070a0;">You've joined India's #1 AI-powered exam preparation platform.</p>
      <div style="background:#1a1a26;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;">✅ 5 Free Mock Tests activated</p>
        <p style="margin:0 0 8px;">🤖 AI Exam Generation unlocked</p>
        <p style="margin:0 0 8px;">📚 Study Notes access granted</p>
        <p style="margin:0;">🏆 Weekly Contest access (1 free attempt)</p>
      </div>
      <p style="color:#7070a0;font-size:13px;">Your referral code: <strong style="color:#f7b731;">${referralCode}</strong> — Share and earn free tests!</p>
      <a href="${process.env.FRONTEND_URL}" style="background:#f7b731;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:16px;">Start Preparing →</a>
    </div>`
  }),

  results: (name, examName, score, percentage) => ({
    subject: `📊 Your ${examName} Results are Ready!`,
    html: `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;background:#0a0a0f;color:#e8e8f0;border-radius:12px;">
      <h1 style="color:#f7b731;">ParikshaPro</h1>
      <h2>${name}, your results are ready!</h2>
      <div style="background:#1a1a26;border-radius:8px;padding:24px;text-align:center;margin:20px 0;">
        <div style="font-size:56px;font-weight:800;color:${percentage >= 60 ? '#00d4aa' : percentage >= 40 ? '#f7b731' : '#ff4757'};">${percentage}%</div>
        <p style="color:#7070a0;">Score: ${score}</p>
      </div>
      <a href="${process.env.FRONTEND_URL}/results" style="background:#f7b731;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">View Detailed Analysis →</a>
    </div>`
  }),

  invoice: (name, invoice) => ({
    subject: `🧾 Payment Confirmed — Invoice ${invoice.number} | ParikshaPro`,
    html: `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#0a0a0f;color:#e8e8f0;border-radius:12px;">
      <h1 style="color:#f7b731;font-size:28px;margin-bottom:4px;">ParikshaPro</h1>
      <p style="color:#7070a0;margin-bottom:24px;font-size:13px;">हर परीक्षा। हर बार। AI से तैयार।</p>
      <h2 style="margin-bottom:4px;">Payment Confirmed! ✅</h2>
      <p style="color:#7070a0;margin-bottom:24px;">Hi ${name}, your payment was successful. Here's your invoice.</p>

      <div style="background:#1a1a26;border:1px solid #2a2a3d;border-radius:8px;padding:24px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="color:#7070a0;padding:6px 0;">Invoice No.</td><td style="text-align:right;font-weight:700;color:#f7b731;">${invoice.number}</td></tr>
          <tr><td style="color:#7070a0;padding:6px 0;">Date</td><td style="text-align:right;">${new Date(invoice.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td></tr>
          <tr><td style="color:#7070a0;padding:6px 0;">Plan</td><td style="text-align:right;">${invoice.description}</td></tr>
          <tr><td style="color:#7070a0;padding:6px 0;">Tests Added</td><td style="text-align:right;color:#00d4aa;font-weight:700;">${invoice.testsAdded}</td></tr>
          <tr><td style="color:#7070a0;padding:6px 0;">Valid Till</td><td style="text-align:right;">${invoice.validTill}</td></tr>
          <tr><td style="color:#7070a0;padding:6px 0;">Subtotal</td><td style="text-align:right;">₹${invoice.amount}</td></tr>
          <tr><td style="color:#7070a0;padding:6px 0;">GST (18%)</td><td style="text-align:right;">₹${invoice.gst}</td></tr>
          <tr style="border-top:1px solid #2a2a3d;">
            <td style="padding-top:12px;font-weight:700;font-size:16px;">Total Paid</td>
            <td style="text-align:right;font-weight:800;font-size:18px;color:#f7b731;padding-top:12px;">₹${invoice.total}</td>
          </tr>
        </table>
      </div>

      <div style="background:#1a1a26;border-radius:8px;padding:16px;margin-bottom:24px;font-size:13px;color:#7070a0;">
        <p style="margin:0 0 4px;">Payment ID: <span style="color:#e8e8f0;">${invoice.paymentId}</span></p>
      </div>

      ${invoice.razorpayInvoiceUrl ? `
      <div style="background:#1a1a26;border:1px solid #2a2a3d;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
        <p style="color:#7070a0;font-size:13px;margin:0 0 10px;">Download your official Razorpay invoice</p>
        <a href="${invoice.razorpayInvoiceUrl}" target="_blank" style="background:#2a2a3d;color:#f7b731;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">📄 View / Download Invoice</a>
      </div>` : ''}

      <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#f7b731;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Start Preparing →</a>
      <p style="color:#7070a0;font-size:12px;margin-top:24px;">Keep this email as your payment receipt. For support, reply to this email.</p>
    </div>`
  }),

  contestResult: (name, contestName, rank, prize) => ({
    subject: `🏆 ${contestName} — You ranked #${rank}!`,
    html: `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;background:#0a0a0f;color:#e8e8f0;border-radius:12px;">
      <h1 style="color:#f7b731;">ParikshaPro</h1>
      <h2>Contest Results, ${name}!</h2>
      <div style="background:#1a1a26;border:1px solid #f7b731;border-radius:8px;padding:24px;text-align:center;margin:20px 0;">
        <div style="font-size:48px;">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅'}</div>
        <div style="font-size:36px;font-weight:800;color:#f7b731;">Rank #${rank}</div>
        <p style="color:#7070a0;">${contestName}</p>
        ${prize ? `<p style="color:#00d4aa;font-weight:700;">🎁 Prize: ${prize}</p>` : ''}
      </div>
    </div>`
  }),
};

module.exports = { sendMail, emailTemplates };
