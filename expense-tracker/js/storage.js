// ===================== storage.js =====================
// Generic localStorage helper functions

const KEYS = {
  USERS: 'finflow_users',
  CURRENT_USER: 'finflow_current',
  THEME: 'finflow_theme',
};

// ---- Users ----
export function getUsers() {
  try { return JSON.parse(localStorage.getItem(KEYS.USERS)) || []; }
  catch { return []; }
}

export function saveUsers(users) {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

export function getUserById(id) {
  return getUsers().find(u => u.id === id) || null;
}

export function updateUser(updatedUser) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === updatedUser.id);
  if (idx !== -1) { users[idx] = updatedUser; saveUsers(users); }
}

// ---- Session ----
export function getCurrentUser() {
  try {
    const id = localStorage.getItem(KEYS.CURRENT_USER) || sessionStorage.getItem(KEYS.CURRENT_USER);
    if (!id) return null;
    return getUserById(id);
  } catch { return null; }
}

export function setCurrentUser(id, remember = false) {
  if (remember) localStorage.setItem(KEYS.CURRENT_USER, id);
  else sessionStorage.setItem(KEYS.CURRENT_USER, id);
}

export function clearCurrentUser() {
  localStorage.removeItem(KEYS.CURRENT_USER);
  sessionStorage.removeItem(KEYS.CURRENT_USER);
}

// ---- Transactions ----
export function getTxKey(userId) { return `finflow_tx_${userId}`; }

export function getTransactions(userId) {
  try { return JSON.parse(localStorage.getItem(getTxKey(userId))) || []; }
  catch { return []; }
}

export function saveTransactions(userId, txs) {
  localStorage.setItem(getTxKey(userId), JSON.stringify(txs));
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

// ---- Misc ----
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function clearAllUserData(userId) {
  localStorage.removeItem(getTxKey(userId));
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx] = { ...users[idx], budget: 0, avatar: '' };
    saveUsers(users);
  }
}
