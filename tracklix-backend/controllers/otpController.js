// backend/controllers/otpController.js
// Handles: Send OTP, Verify OTP, Reset Password

import crypto from 'crypto';
import OTP from '../models/OTP.js';
import User from '../models/User.js';
import { sendEmailOTP, sendSMSOTP } from '../utils/sendOTP.js';
import { validationResult } from 'express-validator';

// ── Helper: generate cryptographically secure 6-digit OTP ────
const generateOTPCode = () => {
  // crypto.randomInt is cryptographically secure
  return String(crypto.randomInt(100000, 999999));
};

// ── Helper: format validation errors ─────────────────────────
const getValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return errors.array().map((e) => e.msg).join(', ');
  return null;
};

// ────────────────────────────────────────────────────────────
// POST /api/otp/send
// Body: { email, purpose?, phone? }
// ────────────────────────────────────────────────────────────
export const sendOTP = async (req, res) => {
  const validationError = getValidationErrors(req);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const { email, purpose = 'password_reset', phone } = req.body;

  try {
    // Verify the user actually exists (for password_reset)
    const user = await User.findOne({ email });
    if (!user) {
      // Security: don't reveal whether email is registered
      return res.json({
        success: true,
        message: 'If that email is registered, you will receive an OTP shortly',
      });
    }

    // Delete any existing OTP for this email + purpose
    await OTP.deleteMany({ email, purpose });

    // Generate OTP
    const otpCode = generateOTPCode();

    // Store hashed OTP in DB
    await OTP.create({
      email,
      otp: otpCode,
      purpose,
    });

    // Send email OTP
    await sendEmailOTP(email, otpCode, purpose);

    // Optionally send SMS if phone is provided and Twilio is configured
    if (phone) {
      await sendSMSOTP(phone, otpCode).catch((err) =>
        console.warn('SMS OTP failed (non-fatal):', err.message)
      );
    }

    res.json({
      success: true,
      message: 'OTP sent successfully. Check your email.',
    });
  } catch (err) {
    console.error('SendOTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

// ────────────────────────────────────────────────────────────
// POST /api/otp/verify
// Body: { email, otp, purpose? }
// ────────────────────────────────────────────────────────────
export const verifyOTP = async (req, res) => {
  const validationError = getValidationErrors(req);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const { email, otp, purpose = 'password_reset' } = req.body;

  try {
    const otpRecord = await OTP.findOne({ email, purpose });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new one.',
      });
    }

    // Check if too many failed attempts
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.',
      });
    }

    const isValid = await otpRecord.verifyOTP(otp);

    if (!isValid) {
      // Increment attempt counter
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${5 - otpRecord.attempts} attempts remaining.`,
      });
    }

    // OTP is valid — delete it so it can't be reused
    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (err) {
    console.error('VerifyOTP error:', err);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
};

// ────────────────────────────────────────────────────────────
// POST /api/otp/reset-password
// Body: { email, otp, newPassword }
// Flow: verify OTP one more time for safety, then update password
// ────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  const validationError = getValidationErrors(req);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const { email, otp, newPassword } = req.body;

  try {
    // Check OTP once more (user may skip the /verify step)
    const otpRecord = await OTP.findOne({ email, purpose: 'password_reset' });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please restart the password reset process.',
      });
    }

    const isValid = await otpRecord.verifyOTP(otp);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update password — pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (err) {
    console.error('ResetPassword error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};
