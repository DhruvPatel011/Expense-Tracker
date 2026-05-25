# Tracklix – Backend Setup Guide

## Project Structure

```
tracklix/
├── backend/                    ← Your Express.js backend
│   ├── server.js               ← Entry point
│   ├── .env.example            ← Copy to .env and fill in values
│   ├── package.json
│   ├── config/
│   │   └── db.js               ← MongoDB Atlas connection
│   ├── models/
│   │   ├── User.js             ← User schema (with embedded transactions)
│   │   └── OTP.js              ← OTP schema (auto-expires via TTL)
│   ├── routes/
│   │   ├── authRoutes.js       ← /api/auth/*
│   │   └── otpRoutes.js        ← /api/otp/*
│   ├── controllers/
│   │   ├── authController.js   ← Register, Login, Profile, Transactions
│   │   └── otpController.js    ← Send OTP, Verify OTP, Reset Password
│   ├── middleware/
│   │   └── authMiddleware.js   ← JWT protect middleware
│   └── utils/
│       ├── generateToken.js    ← JWT sign/verify
│       └── sendOTP.js          ← Nodemailer + Twilio OTP delivery
│
└── js/                         ← Your existing frontend JS (update these)
    ├── storage.js              ← ← REPLACE with backend/storage.js
    └── auth.js                 ← ← REPLACE with backend/auth.js
```

## Step 1 – Install Backend

```bash
cd backend
npm install
```

## Step 2 – Configure .env

```bash
cp .env.example .env
# Then edit .env with your actual values
```

### Required .env values:

| Variable | Where to get it |
|---|---|
| `MONGO_URI` | Already filled with your Atlas URI |
| `JWT_SECRET` | Any long random string (change in production!) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `EMAIL_USER` | Your Gmail address |
| `EMAIL_PASS` | Gmail App Password (NOT your account password) |

### Setting up Gmail App Password:
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to https://myaccount.google.com/apppasswords
4. Create an app password → copy it into `EMAIL_PASS`

### Setting up Google OAuth:
1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. APIs & Services → OAuth consent screen → configure
4. APIs & Services → Credentials → Create OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`
7. Copy Client ID and Secret to `.env`

## Step 3 – Replace Frontend Files

Replace these files in your `js/` folder:

| File | Source |
|---|---|
| `js/storage.js` | Copy content from `backend/storage.js` |
| `js/auth.js` | Copy content from `backend/auth.js` |

Replace these HTML files in your root folder:

| File | Source |
|---|---|
| `index.html` | Copy from `backend/index.html` |
| `register.html` | Copy from `backend/register.html` |
| `auth-callback.html` | Copy from `backend/auth-callback.html` |

## Step 4 – Start the Backend

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server runs at: **http://localhost:5000**

## Step 5 – Update Frontend API URL

In `js/storage.js`, update `API_BASE` if your backend runs on a different URL:

```js
const API_BASE = 'http://localhost:5000/api'; // ← change for production
```

## Step 6 – Serve Frontend

Open your frontend with VS Code Live Server or any static server.
Make sure it runs on `http://localhost:3000` or `http://127.0.0.1:5500`
(both are allowed in the CORS config).

---

## API Endpoints

### Auth Routes (`/api/auth/`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Create account |
| POST | `/login` | ❌ | Sign in, get JWT |
| GET | `/me` | ✅ | Get current user |
| PUT | `/profile` | ✅ | Update profile/settings |
| PUT | `/transactions` | ✅ | Sync all transactions |
| DELETE | `/reset` | ✅ | Clear all user data |
| GET | `/google` | ❌ | Start Google OAuth |
| GET | `/google/callback` | ❌ | Google OAuth redirect |

### OTP Routes (`/api/otp/`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/send` | ❌ | Send OTP to email |
| POST | `/verify` | ❌ | Verify OTP |
| POST | `/reset-password` | ❌ | Reset password with OTP |

---

## How Authentication Works

### Local Auth Flow:
```
Register → POST /api/auth/register → JWT token returned
Login    → POST /api/auth/login    → JWT token returned
Token    → Stored in localStorage (remember) or sessionStorage
API call → "Authorization: Bearer <token>" header sent
```

### Google OAuth Flow:
```
User clicks "Continue with Google"
→ GET /api/auth/google (redirects to Google)
→ User grants permission
→ GET /api/auth/google/callback (Google redirects back)
→ Server creates/updates user in MongoDB
→ Redirects to /auth-callback.html?token=<jwt>
→ Frontend stores token, fetches user, goes to dashboard
```

### Forgot Password Flow:
```
1. User enters email → POST /api/otp/send
2. OTP emailed (6-digit, 10-min expiry)
3. User enters OTP → POST /api/otp/verify
4. User sets new password → POST /api/otp/reset-password
```

---

## Security Features

- ✅ Passwords hashed with bcrypt (cost factor 12)
- ✅ JWT tokens expire after 7 days
- ✅ OTPs hashed before storage, auto-delete via MongoDB TTL
- ✅ 5-attempt lockout on OTP verification
- ✅ Rate limiting: 20 auth requests per 15 min per IP
- ✅ Helmet.js security headers
- ✅ CORS restricted to your frontend origin
- ✅ Input validation with express-validator
- ✅ Password never returned in API responses (select: false)

---

## Deploying to Production

### Backend (Railway / Render / Heroku):
1. Push `backend/` folder to GitHub
2. Connect to Railway/Render
3. Set all environment variables from `.env`
4. Change `NODE_ENV=production`
5. Update `GOOGLE_CALLBACK_URL` to your deployed backend URL
6. Update `FRONTEND_URL` to your deployed frontend URL

### Frontend:
1. Update `API_BASE` in `js/storage.js` to your backend URL
2. Update Google OAuth button href in `index.html` and `register.html`
3. Deploy to Netlify / Vercel / GitHub Pages

---

## Twilio SMS OTP (Optional)

1. Create account at https://www.twilio.com
2. Get Account SID, Auth Token, and a phone number
3. Fill in `TWILIO_*` values in `.env`
4. SMS OTP will automatically be sent alongside email OTP
   when a phone number is provided in the `/api/otp/send` request
