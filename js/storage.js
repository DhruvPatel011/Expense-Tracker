// js/storage.js
// Auto-detects backend URL:
//   Local dev  → http://localhost:5000/api
//   Production → Railway backend URL
 
// ── IMPORTANT ─────────────────────────────────────────────────
// After Railway deploy, paste your Railway URL below:
const RAILWAY_BACKEND_URL = 'https://tracklix-backend-production.up.railway.app';
// ─────────────────────────────────────────────────────────────
 
function getAPIBase() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return `${RAILWAY_BACKEND_URL}/api`;
}
 
function getBackendBase() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return RAILWAY_BACKEND_URL;
}
 
const API_BASE = getAPIBase();
 
// Export so index.html / register.html can build Google OAuth link
export const BACKEND_BASE = getBackendBase();
 
// ── TOKEN ─────────────────────────────────────────────────────
 
export function getToken() {
  return localStorage.getItem('tracklix_token') || sessionStorage.getItem('tracklix_token');
}
 
export function setToken(token, remember = true) {
  if (remember) localStorage.setItem('tracklix_token', token);
  else          sessionStorage.setItem('tracklix_token', token);
}
 
export function clearToken() {
  localStorage.removeItem('tracklix_token');
  sessionStorage.removeItem('tracklix_token');
}
 
// ── CACHED USER ───────────────────────────────────────────────
 
export function getCachedUser() {
  try { return JSON.parse(localStorage.getItem('tracklix_user')) || null; }
  catch { return null; }
}
 
export function setCachedUser(user) {
  if (!user) return;
  // Always normalise — ensure both `id` and `_id` are plain strings
  // app.js uses currentUser.id so this MUST exist
  const idStr = (user._id || user.id || '').toString();
  localStorage.setItem('tracklix_user', JSON.stringify({ ...user, _id: idStr, id: idStr }));
}
 
export function clearCachedUser() {
  localStorage.removeItem('tracklix_user');
}
 
// ── DEMO DETECTION ────────────────────────────────────────────
 
function isDemo(user) {
  const u = user || getCachedUser();
  return u?.email === 'demo@tracklix.app' || u?.authProvider === 'demo';
}
 
// ── API FETCH ─────────────────────────────────────────────────
 
async function apiFetch(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });
  } catch {
    const err = new Error('Server se connect nahi ho pa raha. Internet check karein ya baad mein try karein.');
    err.status = 0;
    err.isNetworkError = true;
    throw err;
  }
 
  let data;
  try { data = await res.json(); }
  catch {
    const err = new Error('Server se invalid response.');
    err.status = res.status;
    throw err;
  }
 
  if (!res.ok) {
    const err = new Error(data.message || 'Kuch galat hua.');
    err.status = res.status;
    throw err;
  }
  return data;
}
 
// ── AUTH API ──────────────────────────────────────────────────
 
export async function apiRegister({ name, email, password, currency }) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, currency }),
  });
  setToken(data.token, true);
  setCachedUser(data.user);
  return data.user;
}
 
export async function apiLogin({ email, password, remember = false }) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token, remember);
  setCachedUser(data.user);
  return data.user;
}
 
export async function apiGetMe() {
  const data = await apiFetch('/auth/me');
  setCachedUser(data.user);
  return data.user;
}
 
export async function apiUpdateProfile(updates) {
  const data = await apiFetch('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  setCachedUser(data.user);
  return data.user;
}
 
export async function apiUpdateTransactions(transactions) {
  const data = await apiFetch('/auth/transactions', {
    method: 'PUT',
    body: JSON.stringify({ transactions }),
  });
  setCachedUser(data.user);
  return data.user;
}
 
export async function apiResetData() {
  const data = await apiFetch('/auth/reset', { method: 'DELETE' });
  setCachedUser(data.user);
  return data.user;
}
 
// ── OTP API ───────────────────────────────────────────────────
 
export async function apiSendOTP(email, purpose = 'password_reset') {
  return apiFetch('/otp/send', {
    method: 'POST',
    body: JSON.stringify({ email, purpose }),
  });
}
 
export async function apiVerifyOTP(email, otp, purpose = 'password_reset') {
  return apiFetch('/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ email, otp, purpose }),
  });
}
 
export async function apiResetPassword(email, otp, newPassword) {
  return apiFetch('/otp/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  });
}
 
// ── SESSION ───────────────────────────────────────────────────
 
export function getCurrentUser() {
  return getCachedUser();
}
 
export function clearCurrentUser() {
  clearToken();
  clearCachedUser();
}
 
// ── TRANSACTIONS ──────────────────────────────────────────────
 
export function getTxKey(userId) {
  return `tracklix_tx_${userId}`;
}
 
export function getTransactions(userId) {
  const user = getCachedUser();
  if (!user) return [];
 
  // CRITICAL: compare as strings — MongoDB _id object != string
  const cachedId = String(user._id || user.id || '');
  const reqId    = String(userId || '');
 
  if (cachedId && reqId && cachedId === reqId) {
    if (Array.isArray(user.transactions) && user.transactions.length > 0) {
      return [...user.transactions];
    }
  }
 
  // Legacy fallback for old localStorage-only data
  try {
    const legacy = JSON.parse(localStorage.getItem(getTxKey(userId)));
    if (Array.isArray(legacy) && legacy.length > 0) return legacy;
  } catch { /* ignore */ }
 
  return [];
}
 
export function saveTransactions(userId, txs) {
  const user = getCachedUser();
  if (user) setCachedUser({ ...user, transactions: txs });
  if (isDemo(user)) return;
  apiUpdateTransactions(txs).catch(err =>
    console.warn('TX sync failed (non-fatal):', err.message)
  );
}
 
export function addTransaction(userId, tx) {
  const txs = getTransactions(userId);
  txs.push(tx);
  saveTransactions(userId, txs);
}
 
export function updateTransaction(userId, updated) {
  const txs = getTransactions(userId).map(t =>
    String(t.id || t._id) === String(updated.id || updated._id) ? updated : t
  );
  saveTransactions(userId, txs);
}
 
export function deleteTransaction(userId, txId) {
  const txs = getTransactions(userId).filter(t =>
    String(t.id || t._id) !== String(txId)
  );
  saveTransactions(userId, txs);
}
 
export function updateUser(updatedUser) {
  setCachedUser(updatedUser);
  if (isDemo(updatedUser)) return;
  const { name, email, currency, theme, avatar, budget, settings } = updatedUser;
  apiUpdateProfile({ name, email, currency, theme, avatar, budget, settings })
    .catch(err => console.warn('Profile sync failed (non-fatal):', err.message));
}
 
export function clearAllUserData(userId) {
  const user = getCachedUser();
  if (user) setCachedUser({ ...user, transactions: [], budget: 0, avatar: '' });
  localStorage.removeItem(getTxKey(userId));
  if (isDemo(user)) return;
  apiResetData().catch(err =>
    console.warn('Reset sync failed (non-fatal):', err.message)
  );
}
 
// ── MISC ──────────────────────────────────────────────────────
 
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
 
// Legacy stubs — keep so other modules don't break
export function getUsers()       { return []; }
export function saveUsers()      {}
export function getUserById()    { return getCachedUser(); }
export function setCurrentUser() {}