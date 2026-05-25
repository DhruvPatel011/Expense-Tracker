// backend/models/User.js
 
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
 
// FIX: _id: false + id field optional (not required) to prevent
// validation errors when transactions array is empty or during Google OAuth user creation.
const TransactionSchema = new mongoose.Schema(
  {
    id:       { type: String, default: () => `tx_${Date.now()}_${Math.random().toString(36).slice(2,7)}` },
    type:     { type: String, enum: ['income', 'expense'], required: true },
    title:    { type: String, required: true, trim: true },
    amount:   { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    date:     { type: String, required: true },
    notes:    { type: String, default: '' },
  },
  { _id: false }
);
 
const UserSchema = new mongoose.Schema(
  {
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
      select: false,
    },
    googleId:     { type: String, default: null },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    avatar:       { type: String, default: '' },
    currency:     { type: String, enum: ['₹', '$'], default: '₹' },
    theme:        { type: String, enum: ['light', 'dark'], default: 'light' },
    budget:       { type: Number, default: 0, min: 0 },
    transactions: { type: [TransactionSchema], default: [] },
    settings: {
      notifications: { type: Boolean, default: true },
    },
    isEmailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);
 
// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});
 
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};
 
UserSchema.methods.toPublicProfile = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  delete obj.__v;
  return obj;
};
 
const User = mongoose.model('User', UserSchema);
export default User;
 