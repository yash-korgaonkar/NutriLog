// ────────────────────────────────────────────────────────
//  charts.js — Chart.js wrappers
// ────────────────────────────────────────────────────────

// Chart.js is loaded as a global via CDN in index.html
const { Chart } = window;

const defaults = {
  font:     { family: "'Inter', sans-serif" },
  color:    '#9491b4',
};

// Apply once
if (Chart) {
  Chart.defaults.font.family  = defaults.font.family;
  Chart.defaults.color        = defaults.color;
  Chart.defaults.plugins.legend.display = false;
}

let calorieRingChart = null;
let weeklyBarChart   = null;
let weightLineChart  = null;
let macroDonutChart  = null;

// ── Calorie Ring (Dashboard) ────────────────────────────
export function renderCalorieRing(consumed, goal) {
  const ctx = document.getElementById('calorie-ring')?.getContext('2d');
  if (!ctx) return;

  const remaining = Math.max(0, goal - consumed);
  const over      = consumed > goal ? consumed - goal : 0;

  if (calorieRingChart) calorieRingChart.destroy();
  calorieRingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: over > 0
          ? [consumed, over]
          : [consumed, remaining],
        backgroundColor: over > 0
          ? ['#7c6af7', '#f87171']
          : ['#7c6af7', 'rgba(255,255,255,0.05)'],
        borderWidth: 0,
        borderRadius: 4,
      }],
    },
    options: {
      cutout:    '78%',
      animation: { duration: 800, easing: 'easeInOutQuart' },
      plugins:   { tooltip: { enabled: false } },
    },
  });
}

// ── Weekly Calorie Bar Chart (Insights) ─────────────────
export function renderWeeklyBar(labels, values, goalLine) {
  const ctx = document.getElementById('weekly-bar-chart')?.getContext('2d');
  if (!ctx) return;

  if (weeklyBarChart) weeklyBarChart.destroy();
  weeklyBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label:           'Calories',
          data:            values,
          backgroundColor: values.map(v => v > goalLine ? 'rgba(248,113,113,0.7)' : 'rgba(124,106,247,0.7)'),
          borderRadius:    6,
          borderSkipped:   false,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} kcal`,
          },
        },
        annotation: {},
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } } },
        y: {
          grid:        { color: 'rgba(255,255,255,0.04)' },
          ticks:       { font: { size: 11 }, callback: v => `${v}` },
          suggestedMin: 0,
        },
      },
    },
    plugins: [
      {
        id: 'goalLine',
        afterDraw(chart) {
          const { ctx, scales: { y }, chartArea } = chart;
          if (!y) return;
          const yPos = y.getPixelForValue(goalLine);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(chartArea.left, yPos);
          ctx.lineTo(chartArea.right, yPos);
          ctx.strokeStyle = 'rgba(124,106,247,0.5)';
          ctx.setLineDash([6, 4]);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        },
      },
    ],
  });
}

// ── Weight Trend Line Chart (Insights) ──────────────────
export function renderWeightLine(labels, values, unit) {
  const ctx = document.getElementById('weight-line-chart')?.getContext('2d');
  if (!ctx) return;

  if (weightLineChart) weightLineChart.destroy();
  weightLineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label:           `Weight (${unit})`,
        data:            values,
        borderColor:     '#4ade80',
        backgroundColor: 'rgba(74,222,128,0.08)',
        pointBackgroundColor: '#4ade80',
        pointRadius:     4,
        pointHoverRadius:6,
        fill:            true,
        tension:         0.4,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} ${unit}` } },
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

// ── Macro Donut (Insights) ───────────────────────────────
export function renderMacroDonut(protein, carbs, fat) {
  const ctx = document.getElementById('macro-donut-chart')?.getContext('2d');
  if (!ctx) return;

  if (macroDonutChart) macroDonutChart.destroy();
  macroDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [protein * 4, carbs * 4, fat * 9],
        backgroundColor: ['rgba(96,165,250,0.8)', 'rgba(251,191,36,0.8)', 'rgba(248,113,113,0.8)'],
        borderWidth: 0,
        borderRadius: 3,
      }],
    },
    options: {
      cutout:    '65%',
      animation: { duration: 700 },
      plugins: {
        legend: {
          display:  true,
          position: 'bottom',
          labels:   { font: { size: 12 }, color: '#9491b4', boxWidth: 12, padding: 16 },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              return ` ${Math.round((ctx.parsed / total) * 100)}%`;
            },
          },
        },
      },
    },
  });
}

export function destroyAll() {
  [calorieRingChart, weeklyBarChart, weightLineChart, macroDonutChart].forEach(c => c?.destroy());
}
