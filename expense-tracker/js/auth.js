// ===================== auth.js =====================
import { getUsers, saveUsers, generateId, getTransactions, saveTransactions, setCurrentUser } from './storage.js';

export function seedDemoData() {
  const users = getUsers();
  let demo = users.find(u => u.email === 'demo@finflow.app');

  if (!demo) {
    demo = {
      id: generateId('u'),
      name: 'Username',
      email: 'demo@finflow.app',
      password: btoa('demo1234'),
      currency: '₹',
      avatar: '',
      theme: 'light',
      budget: 0,
    };
    users.push(demo);
    saveUsers(users);
  }

  // Clear and reseed transactions
  const now = new Date();
  const txs = [];

  // Income samples
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

  saveTransactions(demo.id, txs);
  return demo;
}
