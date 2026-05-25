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
  const demoUser = {
    _id: 'demo_user_local',
    id: 'demo_user_local',
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
 
  const expiresAt = Date.now() + DEMO_DURATION_MS;
  localStorage.setItem(DEMO_EXPIRY_KEY, String(expiresAt));
 
  return demoUser;
}
 
function _buildDemoTransactions() {
  const now = new Date();
  const txs = [];
 
  const incomes = [
    { title: 'Monthly Salary',   amount: 85000, category: 'Salary',     daysAgo: 1,  notes: 'April salary'   },
    { title: 'Freelance Project',amount: 22000, category: 'Freelance',   daysAgo: 10, notes: 'UI design work' },
    { title: 'Stock Dividend',   amount: 4500,  category: 'Investment',  daysAgo: 18, notes: ''               },
  ];
 
  const expenses = [
    { title: 'Grocery Shopping',    amount: 3200, category: 'Food',          daysAgo: 2,  notes: 'BigBasket order' },
    { title: 'Netflix Subscription',amount: 649,  category: 'Entertainment', daysAgo: 4,  notes: ''               },
    { title: 'Electricity Bill',    amount: 2100, category: 'Bills',         daysAgo: 6,  notes: 'April bill'      },
    { title: 'Zomato Orders',       amount: 1850, category: 'Food',          daysAgo: 7,  notes: ''               },
    { title: 'Uber Rides',          amount: 980,  category: 'Transport',     daysAgo: 9,  notes: ''               },
    { title: 'Amazon Purchase',     amount: 3499, category: 'Shopping',      daysAgo: 12, notes: 'Headphones'      },
    { title: 'Gym Membership',      amount: 1500, category: 'Health',        daysAgo: 14, notes: ''               },
  ];
 
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