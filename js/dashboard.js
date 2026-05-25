// ===================== dashboard.js =====================
import { formatDate, getTotals, getCategoryIcon, formatCurrency } from './transactions.js';
 
/* ---------- Counter Animation ---------- */
function animateCount(el, from, to, currency, isPercent = false) {
  const duration = 600;
  const start = performance.now();
 
  const step = (ts) => {
    const progress = Math.min((ts - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * ease;
 
    if (isPercent) {
      el.textContent = current.toFixed(1) + '%';
    } else {
      el.textContent = formatCurrency(current, currency);
    }
 
    if (progress < 1) requestAnimationFrame(step);
  };
 
  requestAnimationFrame(step);
}
 
/* ---------- Summary Cards ---------- */
export function updateSummaryCards(txs, currency) {
  const { income, expense, balance } = getTotals(txs);
 
  const savingsRate = income > 0
    ? ((income - expense) / income) * 100
    : 0;
 
  animateCount(document.getElementById('totalIncome'),  0, income,  currency);
  animateCount(document.getElementById('totalExpense'), 0, expense, currency);
  animateCount(document.getElementById('totalBalance'), 0, balance, currency);
 
  const srEl = document.getElementById('savingsRate');
  const duration = 600;
  const start = performance.now();
  const step = (ts) => {
    const p = Math.min((ts - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    srEl.textContent = (savingsRate * ease).toFixed(1) + '%';
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
 
/* ---------- Escape HTML ---------- */
function escHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
 
/* ---------- Transaction List ---------- */
// ROOT FIX: btn.dataset.id ko normalized id se set karo.
// tx.id || tx._id?.toString() — dono cases handle hote hain.
export function renderTxList(txs, containerId, currency, onEdit, onDelete, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
 
  const items = limit ? txs.slice(0, limit) : txs;
 
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No transactions found</h3>
        <p>Add your first transaction to get started tracking your finances.</p>
      </div>
    `;
    return;
  }
 
  container.innerHTML = items.map(tx => {
    // FIX: Always use a normalized ID for data-id attribute
    const txId = tx.id || (tx._id ? tx._id.toString() : '');
    return `
      <div class="tx-item" data-id="${txId}">
        <div class="tx-icon ${tx.type}">
          <i class="fa-solid ${getCategoryIcon(tx.category)}"></i>
        </div>
        <div class="tx-info">
          <div class="tx-title">${escHtml(tx.title)}</div>
          <div class="tx-meta">
            <span class="tx-date">${formatDate(tx.date)}</span>
            <span class="tx-badge ${tx.type}">${tx.type}</span>
            <span class="tx-category">${escHtml(tx.category)}</span>
          </div>
        </div>
        <div class="tx-amount ${tx.type}">
          ${tx.type === 'income' ? '+' : '-'}
          ${formatCurrency(tx.amount, currency)}
        </div>
        <div class="tx-actions">
          <button class="tx-btn edit" data-id="${txId}" title="Edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="tx-btn del" data-id="${txId}" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
 
  container.querySelectorAll('.tx-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => onEdit(btn.dataset.id));
  });
 
  container.querySelectorAll('.tx-btn.del').forEach(btn => {
    btn.addEventListener('click', () => onDelete(btn.dataset.id));
  });
}