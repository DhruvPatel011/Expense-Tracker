// backend/routes/authRoutes.js
// All authentication routes with input validation middleware.

import express from 'express';
import passport from 'passport';
import { body } from 'express-validator';
import {
  register,
  login,
  googleCallback,
  getMe,
  updateProfile,
  updateTransactions,
  resetData,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Validation Rules ──────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 60 }).withMessage('Name cannot exceed 60 characters'),
  body('email')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('currency')
    .optional()
    .isIn(['₹', '$']).withMessage('Currency must be ₹ or $'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Local Auth Routes ─────────────────────────────────────────

// POST /api/auth/register
router.post('/register', registerValidation, register);

// POST /api/auth/login
router.post('/login', loginValidation, login);

// GET /api/auth/me  (protected)
router.get('/me', protect, getMe);

// PUT /api/auth/profile  (protected)
router.put('/profile', protect, updateProfile);

// PUT /api/auth/transactions  (protected)
router.put('/transactions', protect, updateTransactions);

// DELETE /api/auth/reset  (protected)
router.delete('/reset', protect, resetData);

// ── Google OAuth Routes ───────────────────────────────────────

// GET /api/auth/google — redirect to Google consent screen
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// GET /api/auth/google/callback — Google redirects back here
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/index.html?error=google_failed`,
    session: false,
  }),
  googleCallback
);

export default router;
