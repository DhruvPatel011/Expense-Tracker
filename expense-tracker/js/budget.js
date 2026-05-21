// ===================== budget.js =====================
import { formatCurrency } from './transactions.js';
import { getThisMonthTxs } from './filters.js';
import { USD_RATE } from './app.js';

export function updateBudgetUI(txs, user) {

  const currency = user.currency || '₹';

  // Original budget always INR me store hoga
  const budgetINR = Number(user.budget) || 0;

  const monthTxs = getThisMonthTxs(txs);

  // Expenses INR me
  const spentINR = monthTxs
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const remainingINR = budgetINR - spentINR;

  // Display values
  let budget = budgetINR;
  let spent = spentINR;
  let remaining = remainingINR;

  // USD convert
  if (currency === '$') {
    budget = budgetINR / USD_RATE;
    spent = spentINR / USD_RATE;
    remaining = remainingINR / USD_RATE;
  }

  const pct =
    budgetINR > 0
      ? Math.min((spentINR / budgetINR) * 100, 100)
      : 0;

  document.getElementById('budgetInput').value =
    budgetINR || '';

  document.getElementById('budgetAmount').textContent =
    budgetINR > 0
      ? formatCurrency(budget, currency)
      : 'Not set';

  document.getElementById('budgetSpent').textContent =
    formatCurrency(spent, currency);

  document.getElementById('budgetRemaining').textContent =
    budgetINR > 0
      ? formatCurrency(remaining, currency)
      : '—';

  document.getElementById('budgetPercent').textContent =
    budgetINR > 0
      ? pct.toFixed(1) + '% used'
      : '0% used';

  const fill = document.getElementById('budgetFill');

  const statusEl =
    document.getElementById('budgetStatus');

  fill.style.width = pct + '%';

  if (pct >= 100) {

    fill.style.background = 'var(--danger)';

    statusEl.textContent =
      '🚨 Budget exceeded!';

    statusEl.style.color =
      'var(--danger)';

  } else if (pct >= 80) {

    fill.style.background =
      'var(--warning)';

    statusEl.textContent =
      '⚠️ Approaching limit';

    statusEl.style.color =
      'var(--warning)';

  } else {

    fill.style.background =
      'var(--success)';

    statusEl.textContent =
      budgetINR > 0
        ? '✅ On track'
        : '';

    statusEl.style.color =
      'var(--success)';
  }
}