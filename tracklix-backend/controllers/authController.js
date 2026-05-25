// backend/controllers/authController.js
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { validationResult } from 'express-validator';
 
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id.toString());
  return res.status(statusCode).json({
    success: true,
    token,
    user: user.toPublicProfile(),
  });
};
 
const getValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return errors.array().map((e) => e.msg).join(', ');
  return null;
};
 
// POST /api/auth/register
export const register = async (req, res) => {
  const validationError = getValidationErrors(req);
  if (validationError) return res.status(400).json({ success: false, message: validationError });
 
  const { name, email, password, currency = '₹' } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    const user = await User.create({ name, email, password, currency, authProvider: 'local' });
    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};
 
// POST /api/auth/login
export const login = async (req, res) => {
  const validationError = getValidationErrors(req);
  if (validationError) return res.status(400).json({ success: false, message: validationError });
 
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ success: false, message: 'This account uses Google sign-in. Please use "Continue with Google".' });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};
 
// GET /api/auth/google/callback
// FIX: trailing slash strip + req.user null guard
export const googleCallback = (req, res) => {
  try {
    if (!req.user) {
      console.error('Google callback: req.user is undefined');
      const base = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
      return res.redirect(`${base}/index.html?error=google_no_user`);
    }
    const token = generateToken(req.user._id.toString());
    const base  = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
    res.redirect(`${base}/auth-callback.html?token=${token}`);
  } catch (err) {
    console.error('Google callback error:', err);
    const base = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
    res.redirect(`${base}/index.html?error=google_failed`);
  }
};
 
// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
 
// PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  const { name, email, currency, theme, avatar, budget, settings } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (name     !== undefined) user.name     = name.trim();
    if (currency !== undefined) user.currency = currency;
    if (theme    !== undefined) user.theme    = theme;
    if (avatar   !== undefined) user.avatar   = avatar;
    if (budget   !== undefined) user.budget   = budget;
    if (settings !== undefined) user.settings = { ...user.settings, ...settings };
    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email });
      if (emailTaken) return res.status(409).json({ success: false, message: 'Email already in use' });
      user.email = email.toLowerCase().trim();
    }
    const updated = await user.save();
    res.json({ success: true, user: updated.toPublicProfile() });
  } catch (err) {
    console.error('UpdateProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};
 
// PUT /api/auth/transactions
// FIX: Normalize every transaction — ensure `id` field always exists
export const updateTransactions = async (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ success: false, message: 'transactions must be an array' });
  }
  try {
    // Normalize: give every tx a stable string `id` field
    const normalized = transactions.map(tx => ({
      ...tx,
      id: tx.id
        || (tx._id ? tx._id.toString() : null)
        || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    }));
 
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { transactions: normalized },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    console.error('UpdateTransactions error:', err);
    res.status(500).json({ success: false, message: 'Server error updating transactions' });
  }
};
 
// DELETE /api/auth/reset
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