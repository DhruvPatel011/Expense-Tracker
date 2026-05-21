// ===================== export.js =====================
import { formatCurrency, formatDate, getTotals } from './transactions.js';
import { getThisMonthTxs } from './filters.js';

export function exportCSV(txs, currency) {
  const header = ['Date', 'Title', 'Type', 'Category', 'Amount', 'Notes'];
  const rows = txs.map(t => [
    t.date,
    `"${t.title.replace(/"/g, '""')}"`,
    t.type,
    t.category,
    t.amount,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finflow_transactions_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(txs, user) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const currency = user.currency || '₹';
  const { income, expense, balance } = getTotals(txs);
  const monthTxs = getThisMonthTxs(txs);
  const monthSpent = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const budget = user.budget || 0;

  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FinFlow – Financial Report', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}  |  User: ${user.name}`, 14, 28);

  let y = 50;

  // Summary
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Financial Summary', 14, y); y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const summary = [
    ['Total Income', formatCurrency(income, currency)],
    ['Total Expenses', formatCurrency(expense, currency)],
    ['Net Balance', formatCurrency(balance, currency)],
    ['Savings Rate', income > 0 ? ((income - expense) / income * 100).toFixed(1) + '%' : '0%'],
    ['Monthly Budget', budget > 0 ? formatCurrency(budget, currency) : 'Not set'],
    ['Spent This Month', formatCurrency(monthSpent, currency)],
  ];

  summary.forEach(([label, val]) => {
    doc.setTextColor(100, 116, 139);
    doc.text(label, 14, y);
    doc.setTextColor(15, 23, 42);
    doc.text(val, 120, y);
    y += 7;
  });

  y += 8;

  // Top expenses by category
  const catMap = {};
  txs.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (topCats.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Top Expense Categories', 14, y); y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    topCats.forEach(([cat, amt], i) => {
      doc.setTextColor(100, 116, 139);
      doc.text(`${i + 1}. ${cat}`, 14, y);
      doc.setTextColor(239, 68, 68);
      doc.text(formatCurrency(amt, currency), 120, y);
      y += 7;
    });
    y += 8;
  }

  // Recent Transactions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Recent Transactions', 14, y); y += 8;

  const recent = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

  doc.setFontSize(9);
  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 4, 182, 7, 'F');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 16, y);
  doc.text('Title', 42, y);
  doc.text('Category', 110, y);
  doc.text('Amount', 165, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  recent.forEach((t, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 4, 182, 7, 'F'); }
    doc.setTextColor(100, 116, 139);
    doc.text(t.date, 16, y);
    doc.setTextColor(15, 23, 42);
    doc.text(t.title.slice(0, 28), 42, y);
    doc.setTextColor(100, 116, 139);
    doc.text(t.category, 110, y);
    if (t.type === 'income') doc.setTextColor(16, 185, 129);
    else doc.setTextColor(239, 68, 68);
    doc.text((t.type === 'income' ? '+' : '-') + formatCurrency(t.amount, currency), 155, y);
    y += 7;
  });

  // Footer
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text('FinFlow – Smart Expense Tracker  |  finflow.app', 14, 290);

  doc.save(`finflow_report_${new Date().toISOString().slice(0,10)}.pdf`);
}
