// ===================== budget.js =====================
import { formatCurrency } from './transactions.js';
import { getThisMonthTxs } from './filters.js';
 
// STORAGE CONTRACT (same as transactions.js):
//   user.budget is ALWAYS stored in INR.
//   formatCurrency handles INR→display-currency conversion for rendering.
//   app.js converts the budgetInput value (display currency) → INR before saving.
 
export function updateBudgetUI(txs, user) {
  const currency = user.currency || '₹';
 
  // Budget and all amounts are stored in INR
  const budgetINR = Number(user.budget) || 0;
 
  const monthTxs = getThisMonthTxs(txs);
 
  const spentINR = monthTxs
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
 
  const remainingINR = budgetINR - spentINR;
 
  const pct = budgetINR > 0
    ? Math.min((spentINR / budgetINR) * 100, 100)
    : 0;
 
  // FIX: Do NOT clear budgetInput here — it wipes what the user is currently typing.
  // The input is only cleared explicitly by the Clear Budget button in app.js.
 
  // formatCurrency converts INR → display currency automatically
  document.getElementById('budgetAmount').textContent = budgetINR > 0
    ? formatCurrency(budgetINR, currency)
    : 'Not set';
 
  document.getElementById('budgetSpent').textContent =
    formatCurrency(spentINR, currency);
 
  document.getElementById('budgetRemaining').textContent = budgetINR > 0
    ? formatCurrency(remainingINR, currency)
    : '—';
 
  document.getElementById('budgetPercent').textContent = budgetINR > 0
    ? pct.toFixed(1) + '% used'
    : '0% used';
 
  const fill = document.getElementById('budgetFill');
  const statusEl = document.getElementById('budgetStatus');
 
  fill.style.width = pct + '%';
 
  if (pct >= 100) {
    fill.style.background = 'var(--danger)';
    statusEl.textContent = '🚨 Budget exceeded!';
    statusEl.style.color = 'var(--danger)';
  } else if (pct >= 80) {
    fill.style.background = 'var(--warning)';
    statusEl.textContent = '⚠️ Approaching limit';
    statusEl.style.color = 'var(--warning)';
  } else {
    fill.style.background = 'var(--success)';
    statusEl.textContent = budgetINR > 0 ? '✅ On track' : '';
    statusEl.style.color = 'var(--success)';
  }
}