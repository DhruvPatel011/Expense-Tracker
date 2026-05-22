// ===================== charts.js =====================
//
// STORAGE CONTRACT (same as transactions.js):
//   All t.amount values are in INR.
//   formatCurrency(value, currency) is the ONLY place conversion happens.
//   Never pre-convert values before passing to formatCurrency — that causes double conversion.
//
 
import { formatCurrency } from './transactions.js';
 
const chartInstances = {};
 
/* ===================== HELPERS ===================== */
 
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}
 
function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
 
function textColor() {
  return isDark() ? '#94a3b8' : '#64748b';
}
 
function gridColor() {
  return isDark() ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
}
 
const PALETTE = [
  '#4f46e5',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316'
];
 
/* ===================== PIE ===================== */
// Stores raw INR totals per category as chart data.
// formatCurrency in the tooltip converts INR → display currency once.
 
export function renderPieChart(txs, currency = '₹') {
  destroyChart('pie');
 
  const ctx = document.getElementById('pieChart');
  if (!ctx) return;
 
  const catMap = {};
  txs
    .filter(t => t.type === 'expense')
    .forEach(t => {
      // Store raw INR — do NOT convert here
      catMap[t.category] = (catMap[t.category] || 0) + (Number(t.amount) || 0);
    });
 
  const labels = Object.keys(catMap);
  const data   = Object.values(catMap);   // INR values
 
  if (labels.length === 0) {
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    return;
  }
 
  chartInstances['pie'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,                          // raw INR
        backgroundColor: PALETTE,
        borderWidth: 2,
        borderColor: isDark() ? '#1e293b' : '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor(),
            font: { family: 'DM Sans', size: 12 },
            padding: 12,
          },
        },
        tooltip: {
          callbacks: {
            // ctx.raw is INR → formatCurrency converts once to display currency
            label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.raw, currency)}`,
          },
        },
      },
    },
  });
}
 
/* ===================== BAR ===================== */
// Monthly income/expense totals stored in INR.
// formatCurrency used in tooltips and y-axis ticks for conversion.
 
export function renderBarChart(txs, currency = '₹') {
  destroyChart('bar');
 
  const ctx = document.getElementById('barChart');
  if (!ctx) return;
 
  // Build last 6 months in YYYY-MM format
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
 
  // Totals are raw INR — NO convertAmount call
  const incomeData = months.map(m =>
    txs
      .filter(t => t.type === 'income' && t.date.startsWith(m))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0)
  );
 
  const expenseData = months.map(m =>
    txs
      .filter(t => t.type === 'expense' && t.date.startsWith(m))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0)
  );
 
  const labels = months.map(m => {
    const [y, mo] = m.split('-');
    return new Date(y, parseInt(mo) - 1).toLocaleString('default', {
      month: 'short',
      year: '2-digit',
    });
  });
 
  chartInstances['bar'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,             // raw INR
          backgroundColor: 'rgba(16,185,129,.75)',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Expenses',
          data: expenseData,            // raw INR
          backgroundColor: 'rgba(239,68,68,.75)',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor(),
            font: { family: 'DM Sans', size: 12 },
          },
        },
        tooltip: {
          callbacks: {
            // ctx.raw is INR → formatCurrency converts once
            label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw, currency)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor() },
          grid:  { color: gridColor() },
        },
        y: {
          ticks: {
            color: textColor(),
            // v is INR → formatCurrency converts once
            callback: v => formatCurrency(v, currency),
          },
          grid: { color: gridColor() },
        },
      },
    },
  });
}
 
/* ===================== LINE ===================== */
// Running balance accumulated in raw INR.
// formatCurrency used in tooltips and y-axis ticks for conversion.
 
export function renderLineChart(txs, currency = '₹') {
  destroyChart('line');
 
  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
 
  const sorted = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date));
 
  // Accumulate running balance in raw INR — do NOT convert here
  let balance = 0;
  const points = sorted.map(t => {
    const amount = Number(t.amount) || 0;   // raw INR
    balance += t.type === 'income' ? amount : -amount;
    return { x: t.date, y: balance };        // y is raw INR
  });
 
  if (points.length === 0) {
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    return;
  }
 
  const labels = points.map(p =>
    new Date(p.x).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  );
 
  chartInstances['line'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Balance',
        data: points.map(p => p.y),    // raw INR
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79,70,229,.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4f46e5',
        pointRadius: 3,
        pointHoverRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            // ctx.raw is INR → formatCurrency converts once
            label: ctx => ` Balance: ${formatCurrency(ctx.raw, currency)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor(), maxTicksLimit: 8 },
          grid:  { color: gridColor() },
        },
        y: {
          ticks: {
            color: textColor(),
            // v is INR → formatCurrency converts once
            callback: v => formatCurrency(v, currency),
          },
          grid: { color: gridColor() },
        },
      },
    },
  });
}
 
/* ===================== DOUGHNUT ===================== */
// Savings and spent totals in raw INR.
// formatCurrency in tooltip converts once.
 
export function renderDoughnutChart(txs, currency = '₹') {
  destroyChart('doughnut');
 
  const ctx = document.getElementById('doughnutChart');
  if (!ctx) return;
 
  // Totals in raw INR — do NOT convert here
  const income = txs
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
 
  const expense = txs
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
 
  chartInstances['doughnut'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Savings', 'Spent'],
      datasets: [{
        data: [Math.max(income - expense, 0), expense],   // raw INR
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 3,
        borderColor: isDark() ? '#1e293b' : '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor(),
            font: { family: 'DM Sans', size: 12 },
            padding: 16,
          },
        },
        tooltip: {
          callbacks: {
            // ctx.raw is INR → formatCurrency converts once
            label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.raw, currency)}`,
          },
        },
      },
    },
  });
}
 
/* ===================== ALL ===================== */
 
export function renderAllCharts(txs, currency = '₹') {
  renderPieChart(txs, currency);
  renderBarChart(txs, currency);
  renderLineChart(txs, currency);
  renderDoughnutChart(txs, currency);
}