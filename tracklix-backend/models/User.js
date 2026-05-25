// backend/models/User.js
// Defines the User schema for MongoDB.
// Passwords are NEVER stored as plain text — bcrypt hashing is applied in a pre-save hook.

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const TransactionSchema = new mongoose.Schema(
  {
    type:     { type: String, enum: ['income', 'expense'], required: true },
    title:    { type: String, required: true, trim: true },
    amount:   { type: Number, required: true, min: 0 },   // Always stored in INR
    category: { type: String, required: true },
    date:     { type: String, required: true },           // 'YYYY-MM-DD'
    notes:    { type: String, default: '' },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    // ── Core Identity ──────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },

    // ── OAuth ──────────────────────────────────────────────────
    googleId: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },

    // ── Profile ────────────────────────────────────────────────
    avatar: {
      type: String,
      default: '', // base64 data-URI or empty string
    },
    currency: {
      type: String,
      enum: ['₹', '$'],
      default: '₹',
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },

    // ── Financial Data ─────────────────────────────────────────
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactions: {
      type: [TransactionSchema],
      default: [],
    },

    // ── Settings ───────────────────────────────────────────────
    settings: {
      notifications: { type: Boolean, default: true },
    },

    // ── Security ───────────────────────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt & updatedAt
  }
);

// ── Pre-save hook: Hash password before saving ─────────────────
UserSchema.pre('save', async function (next) {
  // Only hash if the password field was actually modified
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(12); // Cost factor 12 = good security/performance balance
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance method: Compare entered password with hashed password ──
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ── Virtual: Safe public profile (excludes sensitive fields) ───
UserSchema.methods.toPublicProfile = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', UserSchema);
export default User;
