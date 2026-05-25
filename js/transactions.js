// ===================== transactions.js =====================
//
// STORAGE CONTRACT:
//   All `amount` values are ALWAYS stored in INR.
//   createTx / editTx accept the user's display currency and convert to INR before saving.
//   formatCurrency converts from INR to the display currency when rendering.
//
 
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  generateId
} from './storage.js';
 
import { USD_RATE } from './app.js';
 
/* ===================== CATEGORIES ===================== */
 
const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investment', 'Other'
];
 
const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment',
  'Health', 'Education', 'Travel', 'Others'
];
 
/* ===================== ICONS ===================== */
 
const CATEGORY_ICONS = {
  Salary: 'fa-briefcase',
  Freelance: 'fa-laptop-code',
  Business: 'fa-building',
  Investment: 'fa-chart-line',
  Other: 'fa-circle-plus',
  Food: 'fa-utensils',
  Transport: 'fa-car',
  Shopping: 'fa-bag-shopping',
  Bills: 'fa-file-invoice',
  Entertainment: 'fa-film',
  Health: 'fa-heart-pulse',
  Education: 'fa-graduation-cap',
  Travel: 'fa-plane',
  Others: 'fa-ellipsis',
};
 
export function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || 'fa-circle';
}
 
export function getCategoriesByType(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}
 
/* ===================== FORMAT CURRENCY ===================== */
 
export function formatCurrency(amount, currency = '₹') {
  let value = Number(amount) || 0;
  if (currency === '$') value = value / USD_RATE;
  return new Intl.NumberFormat(
    currency === '$' ? 'en-US' : 'en-IN',
    { style: 'currency', currency: currency === '$' ? 'USD' : 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }
  ).format(value);
}
 
/* ===================== FORMAT DATE ===================== */
 
export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
 
/* ===================== CREATE TX ===================== */
// FIX: async — awaits addTransaction (which awaits backend)
 
export async function createTx(userId, data, currency = '₹') {
  let amount = parseFloat(data.amount) || 0;
  if (currency === '$') amount = amount * USD_RATE;
 
  const tx = {
    id: generateId('tx'),
    type: data.type,
    title: data.title.trim(),
    amount,
    category: data.category,
    date: data.date,
    notes: data.notes?.trim() || '',
  };
 
  await addTransaction(userId, tx);
  return tx;
}
 
/* ===================== EDIT TX ===================== */
// FIX: async — awaits updateTransaction (which awaits backend)
// BUG WAS HERE: updateTransaction is async in storage.js but was not being awaited.
// This caused the optimistic cache update to get overwritten by stale backend data,
// making edited values appear to vanish (or revert to old values).
 
export async function editTx(userId, data, currency = '₹') {
  let amount = parseFloat(data.amount) || 0;
  if (currency === '$') amount = amount * USD_RATE;
 
  const tx = {
    id: data.id,
    type: data.type,
    title: data.title.trim(),
    amount,
    category: data.category,
    date: data.date,
    notes: data.notes?.trim() || '',
  };
 
  await updateTransaction(userId, tx);
  return tx;
}
 
/* ===================== DELETE TX ===================== */
// FIX: async — awaits deleteTransaction
 
export async function removeTx(userId, txId) {
  await deleteTransaction(userId, txId);
}
 
/* ===================== USER TXS ===================== */
 
export function getUserTxs(userId) {
  return getTransactions(userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
 
/* ===================== TOTALS ===================== */
 
export function getTotals(txs) {
  let income = 0, expense = 0;
  txs.forEach(t => {
    if (t.type === 'income') income += Number(t.amount) || 0;
    else if (t.type === 'expense') expense += Number(t.amount) || 0;
  });
  return { income, expense, balance: income - expense };
}