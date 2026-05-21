// ===================== transactions.js =====================
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, generateId } from './storage.js';

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Other'];
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Travel', 'Others'];

const CATEGORY_ICONS = {
  Salary: 'fa-briefcase', Freelance: 'fa-laptop-code', Business: 'fa-building',
  Investment: 'fa-chart-line', Other: 'fa-circle-plus', Food: 'fa-utensils',
  Transport: 'fa-car', Shopping: 'fa-bag-shopping', Bills: 'fa-file-invoice',
  Entertainment: 'fa-film', Health: 'fa-heart-pulse', Education: 'fa-graduation-cap',
  Travel: 'fa-plane', Others: 'fa-ellipsis',
};

export function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || 'fa-circle';
}

export function getCategoriesByType(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function formatCurrency(amount, currency) {
  const num = parseFloat(amount) || 0;
  if (currency === '₹') {
    // Indian format: ₹2,82,500 → use en-IN locale
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }
  // US format: $1,234,567.00
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function createTx(userId, data) {
  const tx = {
    id: generateId('tx'),
    type: data.type,
    title: data.title.trim(),
    amount: parseFloat(data.amount),
    category: data.category,
    date: data.date,
    notes: data.notes?.trim() || '',
  };
  addTransaction(userId, tx);
  return tx;
}

export function editTx(userId, data) {
  const tx = {
    id: data.id,
    type: data.type,
    title: data.title.trim(),
    amount: parseFloat(data.amount),
    category: data.category,
    date: data.date,
    notes: data.notes?.trim() || '',
  };
  updateTransaction(userId, tx);
  return tx;
}

export function removeTx(userId, txId) {
  deleteTransaction(userId, txId);
}

export function getUserTxs(userId) {
  return getTransactions(userId).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getTotals(txs) {
  let income = 0, expense = 0;
  txs.forEach(t => {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  });
  return { income, expense, balance: income - expense };
}


