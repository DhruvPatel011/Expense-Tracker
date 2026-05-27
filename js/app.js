// ===================== app.js =====================
// Main initialization – orchestrates all modules
 
import { getCurrentUser, clearCurrentUser, updateUser, clearAllUserData, getTransactions, saveTransactions } from './storage.js';
import { getUserTxs, createTx, editTx, removeTx, getCategoriesByType } from './transactions.js';
import { applyFilters } from './filters.js';
import { updateSummaryCards, renderTxList } from './dashboard.js';
import { renderAllCharts } from './charts.js';
import { updateBudgetUI } from './budget.js';
import { loadProfileForm, updateAvatarUIs, handleAvatarUpload } from './profile.js';
import { initTheme, toggleTheme } from './theme.js';
import { exportCSV, exportPDF } from './export.js';
import { isDemoSession, getDemoTimeRemaining, clearDemoExpiry } from './auth.js';
 
// ======================== INIT ========================
let currentUser = getCurrentUser();
if (!currentUser) { window.location.href = 'index.html'; throw new Error('Not logged in'); }
 
initTheme();
 
// ======================== DEMO TIMER ========================
(function initDemoTimer() {
  if (!isDemoSession(currentUser)) return;
 
  const banner = document.createElement('div');
  banner.id = 'demoBanner';
  banner.innerHTML = `
    <i class="fa-solid fa-flask-vial"></i>
    <span id="demoTimerText">Demo session: 3:00 remaining</span>
    <span class="demo-badge">DEMO</span>
  `;
  document.body.appendChild(banner);
 
  const style = document.createElement('style');
  style.textContent = `
    #demoBanner {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      display: flex; align-items: center; gap: 10px; padding: 10px 20px;
      background: #1e293b; color: #f1f5f9; border-radius: 99px;
      font-family: 'DM Sans', sans-serif; font-size: .85rem; font-weight: 600;
      box-shadow: 0 8px 32px rgba(0,0,0,.35); z-index: 9999; white-space: nowrap;
      border: 1px solid rgba(255,255,255,.08); transition: background .3s ease;
    }
    #demoBanner i { color: #06b6d4; font-size: .9rem; }
    #demoBanner.warning { background: #7c2d12; border-color: rgba(239,68,68,.3); }
    #demoBanner.warning i { color: #f97316; }
    .demo-badge {
      background: #4f46e5; color: white; font-size: .65rem; font-weight: 800;
      padding: 2px 8px; border-radius: 99px; letter-spacing: .08em;
    }
    #demoBanner.warning .demo-badge { background: #ef4444; }
    @keyframes demoExpire {
      0%, 100% { transform: translateX(-50%) scale(1); }
      50%       { transform: translateX(-50%) scale(1.04); }
    }
    #demoBanner.expiring { animation: demoExpire .6s ease infinite; }
  `;
  document.head.appendChild(style);
 
  function pad(n) { return String(n).padStart(2, '0'); }
 
  function tick() {
    const remaining = getDemoTimeRemaining();
    if (remaining <= 0) {
      clearDemoExpiry();
      clearCurrentUser();
      toast('Demo session ended. You have been signed out.', 'warning');
      setTimeout(() => { window.location.href = 'index.html'; }, 1800);
      return;
    }
    const totalSec = Math.ceil(remaining / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    document.getElementById('demoTimerText').textContent =
      `Demo session: ${pad(mins)}:${pad(secs)} remaining`;
    if (remaining <= 60000) {
      banner.classList.add('warning', 'expiring');
    } else if (remaining <= 120000) {
      banner.classList.add('warning');
      banner.classList.remove('expiring');
    }
    setTimeout(tick, 1000);
  }
  tick();
})();
 
// ======================== STATE ========================
let allTxs = [];
let filterState = { type: 'all', period: '', category: '', search: '', dateFrom: '', dateTo: '' };
let pendingDeleteId = null;
let editingTxId = null;
 
// ======================== HELPERS ========================
function toast(msg, type = 'success') {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => { t.style.animation = 'slideOut .3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3000);
}
 
function reloadUser() {
  currentUser = getCurrentUser();
}
 
function loadTxs() {
  allTxs = getUserTxs(currentUser._id || currentUser.id);
}
 
function getFilteredTxs() {
  return applyFilters(allTxs, filterState);
}
 
// ================= LIVE USD RATE =================
export let USD_RATE = 83.5;
 
export async function fetchUSDRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data?.rates?.INR) {
      USD_RATE = data.rates.INR;
      localStorage.setItem('usd_rate', USD_RATE);
    }
  } catch (err) {
    console.log('Currency API failed');
    USD_RATE = Number(localStorage.getItem('usd_rate')) || 83.5;
  }
}
 
// ======================== RENDER ========================
function refreshAll() {
  reloadUser();
  loadTxs();
  const filtered = getFilteredTxs();
  updateSummaryCards(allTxs, currentUser.currency);
 
  renderTxList(allTxs, 'recentTxList', currentUser.currency, openEditModal, openDeleteConfirm, 8);
  renderTxList(allTxs.filter(t => t.type === 'income'),  'incomeTxList',  currentUser.currency, openEditModal, openDeleteConfirm);
  renderTxList(allTxs.filter(t => t.type === 'expense'), 'expenseTxList', currentUser.currency, openEditModal, openDeleteConfirm);
  renderTxList(filtered, 'allTxList', currentUser.currency, openEditModal, openDeleteConfirm);
 
  renderAllCharts(allTxs, currentUser.currency);
  updateBudgetUI(allTxs, currentUser);
  loadProfileForm(currentUser);
  updateAvatarUIs(currentUser);
  document.getElementById('settingsCurrency').value = currentUser.currency;
}
 
// ======================== NAV ========================
const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.nav-item');
 
function navigateTo(sectionId) {
  sections.forEach(s => s.classList.remove('active'));
  navItems.forEach(n => n.classList.remove('active'));
  const target  = document.getElementById(`section-${sectionId}`);
  const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (target)  target.classList.add('active');
  if (navItem) navItem.classList.add('active');
  document.getElementById('pageTitle').textContent =
    sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  if (sectionId === 'analytics') { setTimeout(() => renderAllCharts(allTxs, currentUser.currency), 50); }
  closeSidebar();
}
 
navItems.forEach(item => {
  item.addEventListener('click', (e) => { e.preventDefault(); navigateTo(item.dataset.section); });
});
 
document.querySelectorAll('[data-section]').forEach(el => {
  if (el.tagName === 'BUTTON' && !el.classList.contains('nav-item')) {
    el.addEventListener('click', () => navigateTo(el.dataset.section));
  }
});
 
// ================= PROFILE OPEN ON AVATAR CLICK =================
function goToProfile() {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelector('[data-section="profile"]')?.classList.add('active');
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById('section-profile')?.classList.add('active');
  document.getElementById('pageTitle').textContent = 'Profile';
}
 
document.getElementById('headerAvatar')?.addEventListener('click', goToProfile);
document.getElementById('sidebarAvatar')?.addEventListener('click', goToProfile);
 
// ======================== SIDEBAR ========================
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
 
document.getElementById('hamburger').addEventListener('click', openSidebar);
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
 
// ======================== THEME ========================
function handleThemeToggle() {
  toggleTheme();
  setTimeout(() => renderAllCharts(allTxs, currentUser.currency), 100);
}
document.getElementById('themeToggleHeader').addEventListener('click', handleThemeToggle);
document.getElementById('themeToggle').addEventListener('change', handleThemeToggle);
 
// ======================== MODAL HELPERS ========================
function openModal(title = 'Add Transaction') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('txModal').classList.add('open');
}
 
function closeModal() {
  document.getElementById('txModal').classList.remove('open');
  document.getElementById('txForm').reset();
  document.getElementById('txId').value = '';
  editingTxId = null;
  setTxType('income');
}
 
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('txModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('txModal')) closeModal();
});
 
// Type toggle
function setTxType(type) {
  document.getElementById('txType').value = type;
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
  updateCategoryOptions(type);
}
 
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => setTxType(btn.dataset.type));
});
 
function updateCategoryOptions(type) {
  const cats = getCategoriesByType(type);
  const sel = document.getElementById('txCategory');
  sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}
 
function openAddModal(type = 'income') {
  editingTxId = null;
  document.getElementById('txId').value = '';
  openModal(type === 'income' ? 'Add Income' : 'Add Expense');
  setTxType(type);
  document.getElementById('txDate').value = new Date().toISOString().slice(0, 10);
}
 
// ======================== EDIT MODAL ========================
// ROOT FIX: allTxs mein t.id bhi check karo aur t._id bhi —
// backend _id return karta hai, frontend id dhundta tha → modal silent fail hota tha
function openEditModal(txId) {
  // Normalize: txId string ho sakta hai ya ObjectId — dono se match karo
  const tx = allTxs.find(t => {
    const tId = t.id || (t._id ? t._id.toString() : null);
    return tId === txId || tId === String(txId);
  });
 
  if (!tx) {
    console.warn('openEditModal: transaction not found for id:', txId, 'allTxs:', allTxs);
    toast('Could not find transaction. Please refresh.', 'error');
    return;
  }
 
  // Store the normalized id for form submit
  editingTxId = tx.id || (tx._id ? tx._id.toString() : null);
 
  openModal('Edit Transaction');
  setTxType(tx.type);
 
  document.getElementById('txId').value = editingTxId;
  document.getElementById('txTitle').value = tx.title;
 
  const displayAmount = currentUser.currency === '$'
    ? (tx.amount / USD_RATE).toFixed(2)
    : tx.amount;
  document.getElementById('txAmount').value = displayAmount;
 
  document.getElementById('txCategory').value = tx.category;
  document.getElementById('txDate').value = tx.date;
  document.getElementById('txNotes').value = tx.notes || '';
}
 
document.getElementById('addIncomeBtn').addEventListener('click', () => openAddModal('income'));
document.getElementById('addExpenseBtn').addEventListener('click', () => openAddModal('expense'));
document.getElementById('addTxBtn').addEventListener('click', () => openAddModal('income'));
 
// ======================== SAVE TRANSACTION ========================
document.getElementById('txForm').addEventListener('submit', async (e) => {
  e.preventDefault();
 
  const type     = document.getElementById('txType').value;
  const title    = document.getElementById('txTitle').value.trim();
  const amount   = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value;
  const date     = document.getElementById('txDate').value;
  const notes    = document.getElementById('txNotes').value;
 
  if (!title || !amount || amount <= 0 || !date) {
    toast('Please fill in all required fields.', 'error');
    return;
  }
 
  // Use editingTxId (normalized) — NOT the hidden input value which may be stale
  const data = { id: editingTxId, type, title, amount, category, date, notes };
 
  // Disable submit button to prevent double-click
  const submitBtn = document.querySelector('#txForm [type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
 
  try {
    if (editingTxId) {
      await editTx(currentUser._id || currentUser.id, data, currentUser.currency);
      toast('Transaction updated!');
    } else {
      await createTx(currentUser._id || currentUser.id, data, currentUser.currency);
      toast('Transaction added!');
    }
    closeModal();
    refreshAll();
  } catch (err) {
    console.error('Save transaction error:', err);
    toast(err.isNetworkError
      ? 'Cannot reach server. Check your connection.'
      : (err.message || 'Failed to save transaction.'), 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
 
// ======================== DELETE ========================
function openDeleteConfirm(txId) {
  pendingDeleteId = txId;
  document.getElementById('confirmModal').classList.add('open');
}
function closeDeleteConfirm() {
  pendingDeleteId = null;
  document.getElementById('confirmModal').classList.remove('open');
}
 
document.getElementById('closeConfirm').addEventListener('click', closeDeleteConfirm);
document.getElementById('cancelConfirm').addEventListener('click', closeDeleteConfirm);
document.getElementById('confirmDelete').addEventListener('click', async () => {
  if (pendingDeleteId) {
    try {
      await removeTx(currentUser._id || currentUser.id, pendingDeleteId);
      toast('Transaction deleted.', 'warning');
      refreshAll();
    } catch (err) {
      toast('Failed to delete. Please try again.', 'error');
    }
  }
  closeDeleteConfirm();
});
 
// ======================== FILTERS ========================
document.getElementById('searchInput').addEventListener('input', (e) => {
  filterState.search = e.target.value;
  applyAndRenderFiltered();
});
 
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const f = chip.dataset.filter;
    if (['income', 'expense'].includes(f)) { filterState.type = f; filterState.period = ''; }
    else if (f === 'all') { filterState.type = 'all'; filterState.period = ''; }
    else { filterState.period = f; filterState.type = 'all'; }
    applyAndRenderFiltered();
  });
});
 
document.getElementById('categoryFilter').addEventListener('change', (e) => {
  filterState.category = e.target.value;
  applyAndRenderFiltered();
});
 
document.getElementById('dateFrom').addEventListener('change', (e) => {
  filterState.dateFrom = e.target.value;
  applyAndRenderFiltered();
});
document.getElementById('dateTo').addEventListener('change', (e) => {
  filterState.dateTo = e.target.value;
  applyAndRenderFiltered();
});
 
document.getElementById('clearFiltersBtn').addEventListener('click', () => {
  filterState = { type: 'all', period: '', category: '', search: '', dateFrom: '', dateTo: '' };
  document.getElementById('searchInput').value = '';
  document.getElementById('categoryFilter').value = '';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  document.querySelectorAll('.chip').forEach(chip => {
    chip.classList.remove('active');
    if (chip.dataset.filter === 'all') chip.classList.add('active');
  });
  refreshAll();
  toast('Filters cleared.', 'success');
});
 
function applyAndRenderFiltered() {
  const filtered = getFilteredTxs();
  renderTxList(filtered, 'allTxList', currentUser.currency, openEditModal, openDeleteConfirm);
  updateSummaryCards(filtered, currentUser.currency);
}
 
// ======================== BUDGET ========================
document.getElementById('saveBudgetBtn').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('budgetInput').value);
  if (!val || val < 0) { toast('Enter a valid budget amount.', 'error'); return; }
  const budgetINR = currentUser.currency === '$' ? val * USD_RATE : val;
  const updated = { ...currentUser, budget: budgetINR };
  updateUser(updated);
  currentUser = updated;
  updateBudgetUI(allTxs, currentUser);
  toast('Budget saved!');
});
 
document.getElementById('clearBudgetBtn').addEventListener('click', () => {
  currentUser = { ...currentUser, budget: 0 };
  updateUser(currentUser);
  document.getElementById('budgetInput').value = '';
  refreshAll();
  toast('Budget cleared successfully.', 'success');
});
 
// ======================== PROFILE ========================
// app.js — AFTER (Fix 4: email is read-only, not editable)
document.getElementById('profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name     = document.getElementById('profileName').value.trim();
  const currency = document.getElementById('profileCurrency').value;
  if (!name) { toast('Name is required.', 'error'); return; }
  // email is read-only — keep existing value, do not overwrite
  const updated = { ...currentUser, name, currency };
  updateUser(updated);
  currentUser = updated;
  updateAvatarUIs(currentUser);
  toast('Profile updated!');
  refreshAll();
});
 
document.getElementById('avatarUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  handleAvatarUpload(file, currentUser, (updated) => {
    currentUser = updated;
    updateAvatarUIs(updated);
    toast('Avatar updated!');
  });
});
 
// ======================== SETTINGS ========================
document.getElementById('settingsCurrency').addEventListener('change', (e) => {
  const updated = { ...currentUser, currency: e.target.value };
  updateUser(updated);
  currentUser = updated;
  refreshAll();
  toast('Currency updated!');
});
 
document.getElementById('resetDataBtn').addEventListener('click', async () => {
  if (confirm('⚠️ This will permanently delete all your transactions and reset your budget. Are you sure?')) {
    try {
      // FIX: await backend reset BEFORE refreshAll — warna purana data dikhta hai
      await clearAllUserData(currentUser._id || currentUser.id);
      reloadUser();
      refreshAll();
      toast('All data has been reset.', 'warning');
    } catch (err) {
      toast('Failed to reset data. Please try again.', 'error');
    }
  }
});
 
// ======================== EXPORT ========================
document.getElementById('exportCsvBtn').addEventListener('click', () => {
  const filtered = getFilteredTxs();
  if (!filtered.length) { toast('No transactions to export.', 'error'); return; }
  exportCSV(filtered, currentUser.currency);
  toast('CSV exported!');
});
 
document.getElementById('exportPdfBtn').addEventListener('click', () => {
  if (!allTxs.length) { toast('No data to export.', 'error'); return; }
  exportPDF(allTxs, currentUser);
  toast('PDF report downloaded!');
});
 
// ======================== LOGOUT ========================
document.getElementById('logoutBtn').addEventListener('click', () => {
  clearCurrentUser();
  window.location.href = 'index.html';
});
 
// ======================== INITIAL RENDER ========================
(async () => {
  await fetchUSDRate();
  refreshAll();
  navigateTo('overview');
})();