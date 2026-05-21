// ===================== filters.js =====================

export function applyFilters(txs, { type, period, category, search, dateFrom, dateTo }) {
  let result = [...txs];

  // Type filter
  if (type && type !== 'all') {
    result = result.filter(t => t.type === type);
  }

  // Period filter
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (period === 'today') {
    result = result.filter(t => t.date === today);
  } else if (period === 'week') {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    result = result.filter(t => new Date(t.date) >= startOfWeek);
  } else if (period === 'month') {
    const ym = today.slice(0, 7);
    result = result.filter(t => t.date.slice(0, 7) === ym);
  }

  // Custom date range
  if (dateFrom) {
    result = result.filter(t => t.date >= dateFrom);
  }
  if (dateTo) {
    result = result.filter(t => t.date <= dateTo);
  }

  // Category filter
  if (category) {
    result = result.filter(t => t.category === category);
  }

  // Search
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  }

  return result;
}

export function getThisMonthTxs(txs) {
  const ym = new Date().toISOString().slice(0, 7);
  return txs.filter(t => t.date.slice(0, 7) === ym);
}
