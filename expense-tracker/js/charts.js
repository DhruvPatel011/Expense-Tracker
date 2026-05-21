// ===================== charts.js =====================

import { formatCurrency } from './transactions.js';
import { USD_RATE } from './app.js';

const chartInstances = {};

/* ===================== HELPERS ===================== */

function destroyChart(id) {

  if (chartInstances[id]) {

    chartInstances[id].destroy();

    delete chartInstances[id];
  }
}

function convertAmount(amount, currency) {

  if (currency === '$') {
    return amount / USD_RATE;
  }

  return amount;
}

function isDark() {

  return (
    document.documentElement.getAttribute(
      'data-theme'
    ) === 'dark'
  );
}

function textColor() {

  return isDark()
    ? '#94a3b8'
    : '#64748b';
}

function gridColor() {

  return isDark()
    ? 'rgba(255,255,255,.06)'
    : 'rgba(0,0,0,.06)';
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

export function renderPieChart(
  txs,
  currency = '₹'
) {

  destroyChart('pie');

  const ctx =
    document.getElementById(
      'pieChart'
    );

  if (!ctx) return;

  const expenses =
    txs.filter(
      t => t.type === 'expense'
    );

  const catMap = {};

  expenses.forEach(t => {

    const amount =
      convertAmount(
        t.amount,
        currency
      );

    catMap[t.category] =
      (catMap[t.category] || 0)
      + amount;
  });

  const labels =
    Object.keys(catMap);

  const data =
    Object.values(catMap);

  if (labels.length === 0) {

    ctx
      .getContext('2d')
      .clearRect(
        0,
        0,
        ctx.width,
        ctx.height
      );

    return;
  }

  chartInstances['pie'] =
    new Chart(ctx, {

      type: 'pie',

      data: {

        labels,

        datasets: [{

          data,

          backgroundColor:
            PALETTE,

          borderWidth: 2,

          borderColor: isDark()
            ? '#1e293b'
            : '#fff'
        }],
      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

          legend: {

            position: 'right',

            labels: {

              color:
                textColor(),

              font: {

                family:
                  'DM Sans',

                size: 12
              },

              padding: 12
            }
          },

          tooltip: {

            callbacks: {

              label: ctx =>
                ` ${ctx.label}: ${formatCurrency(ctx.raw, currency)}`
            }
          },
        },
      },
    });
}

/* ===================== BAR ===================== */

export function renderBarChart(
  txs,
  currency = '₹'
) {

  destroyChart('bar');

  const ctx =
    document.getElementById(
      'barChart'
    );

  if (!ctx) return;

  const months = [];

  const now = new Date();

  for (let i = 5; i >= 0; i--) {

    const d = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    months.push(
      d.toISOString().slice(0, 7)
    );
  }

  const incomeData =
    months.map(m => {

      const total = txs

        .filter(
          t =>
            t.type === 'income' &&
            t.date.startsWith(m)
        )

        .reduce(
          (s, t) =>
            s + t.amount,
          0
        );

      return convertAmount(
        total,
        currency
      );
    });

  const expenseData =
    months.map(m => {

      const total = txs

        .filter(
          t =>
            t.type === 'expense' &&
            t.date.startsWith(m)
        )

        .reduce(
          (s, t) =>
            s + t.amount,
          0
        );

      return convertAmount(
        total,
        currency
      );
    });

  const labels =
    months.map(m => {

      const [y, mo] =
        m.split('-');

      return new Date(
        y,
        parseInt(mo) - 1
      ).toLocaleString(
        'default',
        {
          month: 'short',
          year: '2-digit'
        }
      );
    });

  chartInstances['bar'] =
    new Chart(ctx, {

      type: 'bar',

      data: {

        labels,

        datasets: [

          {
            label: 'Income',

            data: incomeData,

            backgroundColor:
              'rgba(16,185,129,.75)',

            borderRadius: 6,

            borderSkipped: false
          },

          {
            label: 'Expenses',

            data: expenseData,

            backgroundColor:
              'rgba(239,68,68,.75)',

            borderRadius: 6,

            borderSkipped: false
          },
        ],
      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

          legend: {

            labels: {

              color:
                textColor(),

              font: {

                family:
                  'DM Sans',

                size: 12
              }
            }
          },

          tooltip: {

            callbacks: {

              label: ctx =>
                ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw, currency)}`
            }
          },
        },

        scales: {

          x: {

            ticks: {
              color:
                textColor()
            },

            grid: {
              color:
                gridColor()
            }
          },

          y: {

            ticks: {

              color:
                textColor(),

              callback: v =>
                formatCurrency(
                  v,
                  currency
                )
            },

            grid: {
              color:
                gridColor()
            }
          },
        },
      },
    });
}

/* ===================== LINE ===================== */

export function renderLineChart(
  txs,
  currency = '₹'
) {

  destroyChart('line');

  const ctx =
    document.getElementById(
      'lineChart'
    );

  if (!ctx) return;

  const sorted =
    [...txs].sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );

  let balance = 0;

  const points =
    sorted.map(t => {

      const amount =
        convertAmount(
          t.amount,
          currency
        );

      balance +=
        t.type === 'income'
          ? amount
          : -amount;

      return {
        x: t.date,
        y: balance
      };
    });

  if (points.length === 0) {

    ctx
      .getContext('2d')
      .clearRect(
        0,
        0,
        ctx.width,
        ctx.height
      );

    return;
  }

  const labels =
    points.map(p => {

      const d =
        new Date(p.x);

      return d.toLocaleDateString(
        'en-IN',
        {
          day: '2-digit',
          month: 'short'
        }
      );
    });

  chartInstances['line'] =
    new Chart(ctx, {

      type: 'line',

      data: {

        labels,

        datasets: [{

          label: 'Balance',

          data:
            points.map(
              p => p.y
            ),

          borderColor:
            '#4f46e5',

          backgroundColor:
            'rgba(79,70,229,.08)',

          fill: true,

          tension: 0.4,

          pointBackgroundColor:
            '#4f46e5',

          pointRadius: 3,

          pointHoverRadius: 5,
        }],
      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

          legend: {
            display: false
          },

          tooltip: {

            callbacks: {

              label: ctx =>
                ` Balance: ${formatCurrency(ctx.raw, currency)}`
            }
          },
        },

        scales: {

          x: {

            ticks: {

              color:
                textColor(),

              maxTicksLimit: 8
            },

            grid: {
              color:
                gridColor()
            }
          },

          y: {

            ticks: {

              color:
                textColor(),

              callback: v =>
                formatCurrency(
                  v,
                  currency
                )
            },

            grid: {
              color:
                gridColor()
            }
          },
        },
      },
    });
}

/* ===================== DOUGHNUT ===================== */

export function renderDoughnutChart(
  txs,
  currency = '₹'
) {

  destroyChart('doughnut');

  const ctx =
    document.getElementById(
      'doughnutChart'
    );

  if (!ctx) return;

  const income =
    txs

      .filter(
        t => t.type === 'income'
      )

      .reduce(
        (s, t) =>
          s +
          convertAmount(
            t.amount,
            currency
          ),
        0
      );

  const expense =
    txs

      .filter(
        t => t.type === 'expense'
      )

      .reduce(
        (s, t) =>
          s +
          convertAmount(
            t.amount,
            currency
          ),
        0
      );

  chartInstances['doughnut'] =
    new Chart(ctx, {

      type: 'doughnut',

      data: {

        labels: [
          'Savings',
          'Spent'
        ],

        datasets: [{

          data: [

            Math.max(
              income - expense,
              0
            ),

            expense
          ],

          backgroundColor: [
            '#10b981',
            '#ef4444'
          ],

          borderWidth: 3,

          borderColor: isDark()
            ? '#1e293b'
            : '#fff',
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

              color:
                textColor(),

              font: {

                family:
                  'DM Sans',

                size: 12
              },

              padding: 16
            }
          },

          tooltip: {

            callbacks: {

              label: ctx =>
                ` ${ctx.label}: ${formatCurrency(ctx.raw, currency)}`
            }
          },
        },
      },
    });
}

/* ===================== ALL ===================== */

export function renderAllCharts(
  txs,
  currency = '₹'
) {

  renderPieChart(
    txs,
    currency
  );

  renderBarChart(
    txs,
    currency
  );

  renderLineChart(
    txs,
    currency
  );

  renderDoughnutChart(
    txs,
    currency
  );
}