// ===================== auth.js =====================
import { getUsers, saveUsers, generateId, saveTransactions } from './storage.js';
 
export const DEMO_DURATION_MS = 3 * 60 * 1000; // 5 minutes
export const DEMO_EMAIL       = 'demo@tracklix.app';
export const DEMO_EXPIRY_KEY  = 'demo_expires_at';
 
export function seedDemoData() {
  const users = getUsers();
  let demo = users.find(u => u.email === DEMO_EMAIL);
 
  if (!demo) {
    demo = {
      id: generateId('u'),
      name: 'Demo User',
      email: DEMO_EMAIL,
      password: btoa('demo1234'),
      currency: '₹',
      avatar: '',
      theme: 'light',
      budget: 50000,
    };
    users.push(demo);
    saveUsers(users);
  }
 
  // Store demo session expiry timestamp
  const expiresAt = Date.now() + DEMO_DURATION_MS;
  localStorage.setItem(DEMO_EXPIRY_KEY, String(expiresAt));
 
  // Seed realistic transactions
  const now = new Date();
 
  const incomes = [];
 
  const expenses = [];
 
  const txs = [];
 
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
 
  saveTransactions(demo.id, txs);
  return demo;
}
 
/** Returns ms remaining in the demo session, or 0 if expired / not a demo session */
export function getDemoTimeRemaining() {
  const expiresAt = Number(localStorage.getItem(DEMO_EXPIRY_KEY)) || 0;
  return Math.max(0, expiresAt - Date.now());
}
 
/** Returns true if the current user is the demo account */
export function isDemoSession(user) {
  return user?.email === DEMO_EMAIL;
}
 
/** Clears the demo expiry marker */
export function clearDemoExpiry() {
  localStorage.removeItem(DEMO_EXPIRY_KEY);
}