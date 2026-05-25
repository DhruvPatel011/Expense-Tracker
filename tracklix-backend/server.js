// backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
 
import connectDB from './config/db.js';
import User from './models/User.js';
import authRoutes from './routes/authRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
 
await connectDB();
 
const app  = express();
const PORT = process.env.PORT || 5000;
 
// ── Security ──────────────────────────────────────────────────
app.use(helmet());
 
// ── CORS ──────────────────────────────────────────────────────
// FIX: FRONTEND_URL trailing slash strip karo before comparison.
// Wildcard Netlify preview URLs bhi support karo.
const allowedOrigins = [
  (process.env.FRONTEND_URL || '').replace(/\/+$/, ''),
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
].filter(Boolean);
 
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    // Strip trailing slash from incoming origin before comparing
    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    console.warn('CORS blocked origin:', origin, '| Allowed:', allowedOrigins);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
 
// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
 
// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
 
// ── Rate Limiting ─────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));
 
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/otp',           authLimiter);
 
// ── Passport Google OAuth ─────────────────────────────────────
passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email        = profile.emails?.[0]?.value;
      const googleAvatar = profile.photos?.[0]?.value || '';
 
      let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
 
      if (user) {
        if (!user.googleId)              user.googleId      = profile.id;
        if (!user.avatar && googleAvatar) user.avatar       = googleAvatar;
        user.authProvider = 'google';
        await user.save();
      } else {
        user = await User.create({
          googleId:     profile.id,
          name:         profile.displayName || 'Google User',
          email,
          avatar:       googleAvatar,
          authProvider: 'google',
          currency:     '₹',
        });
      }
 
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));
 
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); }
  catch (err) { done(err, null); }
});
 
app.use(passport.initialize());
 
// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/otp',  otpRoutes);
 
app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'Tracklix API is running ✅', timestamp: new Date() })
);
 
// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});
 
// ── Global Error Handler ──────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
 
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
    });
  }
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(400).json({ success: false, message: messages });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});
 
// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Tracklix server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}\n`);
});