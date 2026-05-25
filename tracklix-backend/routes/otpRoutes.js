// backend/routes/otpRoutes.js
// Routes for OTP send, verify, and password reset.

import express from 'express';
import { body } from 'express-validator';
import { sendOTP, verifyOTP, resetPassword } from '../controllers/otpController.js';

const router = express.Router();

// ── Validation Rules ──────────────────────────────────────────

const sendOTPValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('purpose').optional().isIn(['password_reset', 'email_verify']),
];

const verifyOTPValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
];

const resetPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

// ── Routes ────────────────────────────────────────────────────

// POST /api/otp/send
router.post('/send', sendOTPValidation, sendOTP);

// POST /api/otp/verify
router.post('/verify', verifyOTPValidation, verifyOTP);

// POST /api/otp/reset-password
router.post('/reset-password', resetPasswordValidation, resetPassword);

export default router;
