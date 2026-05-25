// backend/models/OTP.js
// Stores one-time passwords for email/SMS verification and password reset.
// Each OTP document auto-expires (TTL index) after OTP_EXPIRY_MINUTES.

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true, // Stored as bcrypt hash for security
  },
  purpose: {
    type: String,
    enum: ['password_reset', 'email_verify'],
    default: 'password_reset',
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5, // Lock after 5 failed attempts
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // MongoDB TTL index — document auto-deletes after OTP expires
    expires: (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60,
  },
});

// ── Pre-save hook: Hash the OTP before storing ─────────────────
OTPSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(this.otp, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance method: Verify entered OTP against stored hash ────
OTPSchema.methods.verifyOTP = async function (enteredOTP) {
  return bcrypt.compare(enteredOTP, this.otp);
};

const OTP = mongoose.model('OTP', OTPSchema);
export default OTP;
