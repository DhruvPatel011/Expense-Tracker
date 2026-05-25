// backend/utils/sendOTP.js
// Handles OTP delivery via:
//   • Email — Nodemailer with Gmail SMTP
//   • SMS   — Twilio (optional, gracefully skipped if not configured)

import nodemailer from 'nodemailer';

// ── Email Transporter (Gmail SMTP) ────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (not your account password)
    },
  });
};

/**
 * Send OTP via email using Nodemailer.
 * @param {string} email - Recipient email
 * @param {string} otp   - 6-digit OTP code
 * @param {string} [purpose] - 'password_reset' | 'email_verify'
 */
export async function sendEmailOTP(email, otp, purpose = 'password_reset') {
  const transporter = createTransporter();

  const subject =
    purpose === 'password_reset'
      ? '🔐 Tracklix – Password Reset OTP'
      : '✉️ Tracklix – Email Verification OTP';

  const actionText =
    purpose === 'password_reset'
      ? 'reset your Tracklix password'
      : 'verify your Tracklix email address';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
        .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 36px 32px; text-align: center; }
        .logo { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
        .tagline { color: rgba(255,255,255,.75); font-size: 13px; margin-top: 4px; }
        .body { padding: 36px 32px; }
        .greeting { font-size: 17px; color: #1e293b; font-weight: 600; margin-bottom: 12px; }
        .text { font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 24px; }
        .otp-box { background: #f1f5f9; border: 2px dashed #4f46e5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .otp-label { font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; margin-bottom: 8px; }
        .otp-code { font-size: 42px; font-weight: 800; color: #4f46e5; letter-spacing: 12px; }
        .expiry { font-size: 12px; color: #ef4444; margin-top: 12px; font-weight: 600; }
        .warning { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #9a3412; margin-bottom: 24px; }
        .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Tracklix</div>
          <div class="tagline">Smart Expense Tracker</div>
        </div>
        <div class="body">
          <div class="greeting">Hi there 👋</div>
          <p class="text">
            We received a request to ${actionText}. Use the OTP below to complete the process.
          </p>
          <div class="otp-box">
            <div class="otp-label">Your One-Time Password</div>
            <div class="otp-code">${otp}</div>
            <div class="expiry">⏱ Expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes</div>
          </div>
          <div class="warning">
            🔒 Never share this OTP with anyone. Tracklix will never ask for it.
          </div>
          <p class="text">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} Tracklix. All rights reserved.<br/>
          This is an automated message — please do not reply.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `Tracklix <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });
}

/**
 * Send OTP via SMS using Twilio (optional).
 * Silently skips if Twilio credentials are not configured.
 * @param {string} phoneNumber - E.164 format, e.g. '+919876543210'
 * @param {string} otp
 */
export async function sendSMSOTP(phoneNumber, otp) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

  // Skip gracefully if Twilio is not configured
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('⚠️  Twilio not configured — SMS OTP skipped');
    return;
  }

  // Dynamic import so Twilio only loads when configured
  const twilio = (await import('twilio')).default;
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  await client.messages.create({
    body: `[Tracklix] Your OTP is: ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Do not share.`,
    from: TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
}
