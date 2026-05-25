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
 
// ── Normalize transaction: always ensure `id` field exists ───
// ROOT FIX: Backend MongoDB documents have `_id`, frontend expects `id`.
// This function ensures BOTH exist and are consistent.
function normalizeTx(tx) {
  if (!tx) return tx;
  const id = tx.id || (tx._id ? tx._id.toString() : null);
  return { ...tx, id, _id: id };
}
 
function normalizeTxList(txs) {
  if (!Array.isArray(txs)) return [];
  return txs.map(normalizeTx);
}
 
// ── API Fetch Helper ──────────────────────────────────────────
// FIX: Network errors properly caught. 401 = auto logout.
 
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
  } catch (networkErr) {
    // Backend offline / unreachable / CORS preflight fail
    const err = new Error('Server is unreachable. Please check your connection or try again later.');
    err.status = 0;
    err.isNetworkError = true;
    throw err;
  }
 
  let data;
  try {
    data = await res.json();
  } catch {
    const err = new Error('Invalid response from server.');
    err.status = res.status;
    throw err;
  }
 
  if (!res.ok) {
    const err = new Error(data.message || 'API error');
    err.status = res.status;
 
    // FIX: Stale/invalid token → force logout, redirect to login
    if (res.status === 401) {
      clearToken();
      clearCachedUser();
      const publicPages = ['index.html', 'register.html'];
      const onPublicPage = publicPages.some(p => window.location.pathname.includes(p))
        || window.location.pathname === '/'
        || window.location.pathname.endsWith('/');
      if (!onPublicPage) {
        window.location.href = 'index.html?reason=session_expired';
      }
    }
 
    throw err;
  }
 
  return data;
}
 
// ── Normalize user from API response ─────────────────────────
// Ensures all transactions in the user object have proper `id` fields
function normalizeUser(user) {
  if (!user) return user;
  return {
    ...user,
    transactions: normalizeTxList(user.transactions || []),
  };
}
 
// ── Auth API calls ────────────────────────────────────────────
 
export async function apiRegister({ name, email, password, currency }) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, currency }),
  });
  setToken(data.token);
  const user = normalizeUser(data.user);
  setCachedUser(user);
  return user;
}
 
export async function apiLogin({ email, password, remember = false }) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token, remember);
  const user = normalizeUser(data.user);
  setCachedUser(user);
  return user;
}
 
export async function apiGetMe() {
  const data = await apiFetch('/auth/me');
  const user = normalizeUser(data.user);
  setCachedUser(user);
  return user;
}
 
export async function apiUpdateProfile(updates) {
  const data = await apiFetch('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  const user = normalizeUser(data.user);
  setCachedUser(user);
  return user;
}
 
export async function apiUpdateTransactions(transactions) {
  // Always normalize before sending to backend
  const normalized = normalizeTxList(transactions);
  const data = await apiFetch('/auth/transactions', {
    method: 'PUT',
    body: JSON.stringify({ transactions: normalized }),
  });
  const user = normalizeUser(data.user);
  setCachedUser(user);
  return user;
}
 
export async function apiResetData() {
  const data = await apiFetch('/auth/reset', { method: 'DELETE' });
  const user = normalizeUser(data.user);
  setCachedUser(user);
  return user;
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
 
// ── Session helpers ───────────────────────────────────────────
 
export function getCurrentUser() {
  return getCachedUser();
}
 
export function clearCurrentUser() {
  clearToken();
  clearCachedUser();
}
 
// ── Transaction helpers ───────────────────────────────────────
 
export function getTxKey(userId) { return `tracklix_tx_${userId}`; }
 
export function getTransactions(userId) {
  const user = getCachedUser();
  // FIX: Don't strict-match userId — if user is logged in, return their transactions
  if (user && Array.isArray(user.transactions)) {
    return normalizeTxList(user.transactions);
  }
  // Legacy fallback
  try { return normalizeTxList(JSON.parse(localStorage.getItem(getTxKey(userId))) || []); }
  catch { return []; }
}
 
// FIX: saveTransactions is now async — awaits backend, then stores confirmed data.
// On failure, rolls back cache to prevent stale/inconsistent state.
export async function saveTransactions(userId, txs) {
  const normalizedTxs = normalizeTxList(txs);
  const previousUser = getCachedUser();
 
  // Optimistic UI update
  if (previousUser) {
    setCachedUser({ ...previousUser, transactions: normalizedTxs });
  }
 
  try {
    const updatedUser = await apiUpdateTransactions(normalizedTxs);
    // Overwrite with server-confirmed data (normalized)
    setCachedUser(updatedUser);
    return updatedUser;
  } catch (err) {
    // Rollback on failure
    if (previousUser) {
      setCachedUser(previousUser);
    }
    console.error('Transaction sync failed:', err.message);
    throw err;
  }
}
 
// FIX: async — caller can await and show real success/error
export async function addTransaction(userId, tx) {
  const txs = getTransactions(userId);
  txs.push(normalizeTx(tx));
  return saveTransactions(userId, txs);
}
 
// FIX: ID matching uses normalizeTx — matches both id and _id
export async function updateTransaction(userId, updated) {
  const updatedId = updated.id || (updated._id ? updated._id.toString() : null);
  const txs = getTransactions(userId).map(t => {
    const tId = t.id || (t._id ? t._id.toString() : null);
    return tId === updatedId ? normalizeTx({ ...t, ...updated }) : t;
  });
  return saveTransactions(userId, txs);
}
 
// FIX: async + proper ID matching
export async function deleteTransaction(userId, txId) {
  const txs = getTransactions(userId).filter(t => {
    const tId = t.id || (t._id ? t._id.toString() : null);
    return tId !== txId;
  });
  return saveTransactions(userId, txs);
}
 
export function updateUser(updatedUser) {
  setCachedUser(updatedUser);
  const { name, email, currency, theme, avatar, budget, settings } = updatedUser;
  apiUpdateProfile({ name, email, currency, theme, avatar, budget, settings })
    .catch(err => console.warn('Failed to sync profile to backend:', err.message));
}
 
// ── Misc helpers ──────────────────────────────────────────────
 
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
 
export async function clearAllUserData(userId) {
  return apiResetData();
}
 
// ── Legacy stubs ──────────────────────────────────────────────
 
export function getUsers() { return []; }
export function saveUsers() {}
export function getUserById() { return getCachedUser(); }
export function setCurrentUser(id, remember = false) {}