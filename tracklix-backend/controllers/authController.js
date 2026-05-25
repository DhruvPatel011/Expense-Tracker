// backend/controllers/authController.js
// Handles: Register, Login, Google OAuth callback, Get Me, Update Profile, 
//          Update Transactions, Update Budget, Reset Data, Logout

import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

// ── Helper: send token response ──────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id.toString());
  return res.status(statusCode).json({
    success: true,
    token,
    user: user.toPublicProfile(),
  });
};

// ── Helper: format validation errors ─────────────────────────
const getValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errors.array().map((e) => e.msg).join(', ');
  }
  return null;
};

// ────────────────────────────────────────────────────────────
// POST /api/auth/register
// ────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  const validationError = getValidationErrors(req);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const { name, email, password, currency = '₹' } = req.body;

  try {
    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Create user — password is hashed by pre-save hook in User.js
    const user = await User.create({
      name,
      email,
      password,
      currency,
      authProvider: 'local',
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// ────────────────────────────────────────────────────────────
// POST /api/auth/login
// ────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  const validationError = getValidationErrors(req);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const { email, password } = req.body;

  try {
    // Find user and explicitly include password field (it's select:false)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Google-only accounts cannot log in with password
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google sign-in. Please use "Continue with Google".',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// ────────────────────────────────────────────────────────────
// GET /api/auth/google/callback  (called by Passport)
// ────────────────────────────────────────────────────────────
export const googleCallback = (req, res) => {
  try {
    const token = generateToken(req.user._id.toString());
    // Redirect to the frontend auth-callback page with the token
    res.redirect(`${process.env.FRONTEND_URL}/auth-callback.html?token=${token}`);
  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/index.html?error=google_failed`);
  }
};

// ────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ────────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ────────────────────────────────────────────────────────────
// PUT /api/auth/profile  (protected)
// ────────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  const { name, email, currency, theme, avatar, budget, settings } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Only update fields that were sent
    if (name !== undefined) user.name = name.trim();
    if (currency !== undefined) user.currency = currency;
    if (theme !== undefined) user.theme = theme;
    if (avatar !== undefined) user.avatar = avatar;
    if (budget !== undefined) user.budget = budget;
    if (settings !== undefined) user.settings = { ...user.settings, ...settings };

    // Email change: check uniqueness
    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email });
      if (emailTaken) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
      user.email = email.toLowerCase().trim();
    }

    const updated = await user.save();
    res.json({ success: true, user: updated.toPublicProfile() });
  } catch (err) {
    console.error('UpdateProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// ────────────────────────────────────────────────────────────
// PUT /api/auth/transactions  (protected)
// Replace the user's full transaction array
// ────────────────────────────────────────────────────────────
export const updateTransactions = async (req, res) => {
  const { transactions } = req.body;

  if (!Array.isArray(transactions)) {
    return res.status(400).json({ success: false, message: 'transactions must be an array' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { transactions },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    console.error('UpdateTransactions error:', err);
    res.status(500).json({ success: false, message: 'Server error updating transactions' });
  }
};

// ────────────────────────────────────────────────────────────
// DELETE /api/auth/reset  (protected)
// Clears all transactions and resets budget/avatar
// ────────────────────────────────────────────────────────────
export const resetData = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { transactions: [], budget: 0, avatar: '' },
      { new: true }
    );
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    console.error('ResetData error:', err);
    res.status(500).json({ success: false, message: 'Server error resetting data' });
  }
};
