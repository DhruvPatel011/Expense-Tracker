// ===================== storage.js =====================
// Hybrid storage: JWT token in localStorage, user data synced with backend API.
// Falls back gracefully to cached data when offline.
//
// API BASE URL — change this to your deployed backend URL in production.
const API_BASE = 'http://localhost:5000/api';
 
// ── Token Management ──────────────────────────────────────────
 
export function getToken() {
  return localStorage.getItem('tracklix_token') || sessionStorage.getItem('tracklix_token');
}
 
export function setToken(token, remember = true) {
  if (remember) localStorage.setItem('tracklix_token', token);
  else sessionStorage.setItem('tracklix_token', token);
}
 
export function clearToken() {
  localStorage.removeItem('tracklix_token');
  sessionStorage.removeItem('tracklix_token');
}
 
// ── Cached User (local mirror of MongoDB data) ────────────────
 
export function getCachedUser() {
  try { return JSON.parse(localStorage.getItem('tracklix_user')) || null; }
  catch { return null; }
}
 
export function setCachedUser(user) {
  localStorage.setItem('tracklix_user', JSON.stringify(user));
}
 
export function clearCachedUser() {
  localStorage.removeItem('tracklix_user');
}
 
// ── API Fetch Helper ──────────────────────────────────────────
 
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
 
  const data = await res.json();
 
  if (!res.ok) {
    const err = new Error(data.message || 'API error');
    err.status = res.status;
    throw err;
  }
 
  return data;
}
 
// ── Auth API calls ────────────────────────────────────────────
 
export async function apiRegister({ name, email, password, currency }) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, currency }),
  });
  setToken(data.token);
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
 
// ── OTP API calls ─────────────────────────────────────────────
 
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
 
// ── Session helpers (used by app.js) ─────────────────────────
 
export function getCurrentUser() {
  return getCachedUser();
}
 
export function clearCurrentUser() {
  clearToken();
  clearCachedUser();
}
 
// ── Transaction helpers (operate on cached user, sync to backend) ──
 
export function getTxKey(userId) { return `tracklix_tx_${userId}`; }
 
/**
 * Get transactions from cached user (they're embedded in user doc).
 * Falls back to legacy localStorage key for migration.
 */
export function getTransactions(userId) {
  const user = getCachedUser();
  if (user && user._id === userId && Array.isArray(user.transactions)) {
    return user.transactions;
  }
  // Legacy fallback (old localStorage format)
  try { return JSON.parse(localStorage.getItem(getTxKey(userId))) || []; }
  catch { return []; }
}
 
export function saveTransactions(userId, txs) {
  // Update local cache immediately for instant UI
  const user = getCachedUser();
  if (user) {
    const updated = { ...user, transactions: txs };
    setCachedUser(updated);
  }
  // Sync to backend (non-blocking)
  apiUpdateTransactions(txs).catch(err =>
    console.warn('Failed to sync transactions to backend:', err.message)
  );
}
 
export function addTransaction(userId, tx) {
  const txs = getTransactions(userId);
  txs.push(tx);
  saveTransactions(userId, txs);
}
 
export function updateTransaction(userId, updated) {
  const txs = getTransactions(userId).map(t => t.id === updated.id ? updated : t);
  saveTransactions(userId, txs);
}
 
export function deleteTransaction(userId, txId) {
  const txs = getTransactions(userId).filter(t => t.id !== txId);
  saveTransactions(userId, txs);
}
 
export function updateUser(updatedUser) {
  setCachedUser(updatedUser);
  // Sync profile fields to backend
  const { name, email, currency, theme, avatar, budget, settings } = updatedUser;
  apiUpdateProfile({ name, email, currency, theme, avatar, budget, settings })
    .catch(err => console.warn('Failed to sync profile to backend:', err.message));
}
 
// ── Misc helpers ──────────────────────────────────────────────
 
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
 
export function clearAllUserData(userId) {
  // Update local cache immediately
  const user = getCachedUser();
  if (user) {
    setCachedUser({ ...user, transactions: [], budget: 0, avatar: '' });
  }
  // Sync to backend
  apiResetData().catch(err =>
    console.warn('Reset data backend sync failed:', err.message)
  );
}
 
// ── Legacy stubs (keep for compatibility with non-migrated code) ──
 
export function getUsers() { return []; }
export function saveUsers() {}
export function getUserById() { return getCachedUser(); }
export function setCurrentUser(id, remember = false) {
  // Legacy — token is already stored by apiLogin/apiRegister
}