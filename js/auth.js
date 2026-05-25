// ===================== auth.js =====================
// Authentication helpers. Demo session logic is preserved.
// All real auth (register/login) now goes through backend API via storage.js.
 
import { generateId, apiUpdateTransactions, getCachedUser, setCachedUser } from './storage.js';
 
export const DEMO_DURATION_MS = 3 * 60 * 1000; // 3 minutes
export const DEMO_EMAIL       = 'demo@tracklix.app';
export const DEMO_EXPIRY_KEY  = 'demo_expires_at';
 
/**
 * Seeds a temporary demo user entirely in memory (no backend call).
 * The demo user lives only in localStorage for the session duration.
 */
export function seedDemoData() {
  // Create a demo user object in cache
  const demoUser = {
    _id: 'demo_user_local',
    id: 'demo_user_local',          // alias used by some modules
    name: 'Demo User',
    email: DEMO_EMAIL,
    currency: '₹',
    avatar: '',
    theme: 'light',
    budget: 50000,
    transactions: _buildDemoTransactions(),
    authProvider: 'demo',
  };
 
  setCachedUser(demoUser);
 
  // Store demo session expiry timestamp
  const expiresAt = Date.now() + DEMO_DURATION_MS;
  localStorage.setItem(DEMO_EXPIRY_KEY, String(expiresAt));
 
  return demoUser;
}
 
function _buildDemoTransactions() {
  const now = new Date();
  const txs = [];
 
  const incomes = [];
 
  const expenses = [];
 
  incomes.forEach(i => {
    const d = new Date(now);
    d.setDate(d.getDate() - i.daysAgo);
    txs.push({
      id: generateId('tx'),
      type: 'income',
      title: i.title,
      amount: i.amount,
      category: i.category,
      date: d.toISOString().slice(0, 10),
      notes: i.notes,
    });
  });
 
  expenses.forEach(e => {
    const d = new Date(now);
    d.setDate(d.getDate() - e.daysAgo);
    txs.push({
      id: generateId('tx'),
      type: 'expense',
      title: e.title,
      amount: e.amount,
      category: e.category,
      date: d.toISOString().slice(0, 10),
      notes: e.notes,
    });
  });
 
  return txs;
}
 
/** Returns ms remaining in the demo session, or 0 if expired / not a demo session */
export function getDemoTimeRemaining() {
  const expiresAt = Number(localStorage.getItem(DEMO_EXPIRY_KEY)) || 0;
  return Math.max(0, expiresAt - Date.now());
}
 
/** Returns true if the current user is the demo account */
export function isDemoSession(user) {
  return user?.email === DEMO_EMAIL || user?.authProvider === 'demo';
}
 
/** Clears the demo expiry marker */
export function clearDemoExpiry() {
  localStorage.removeItem(DEMO_EXPIRY_KEY);
}