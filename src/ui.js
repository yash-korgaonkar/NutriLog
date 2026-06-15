// ────────────────────────────────────────────────────────
//  ui.js — Render functions for each screen
// ────────────────────────────────────────────────────────
import { renderCalorieRing, renderWeeklyBar, renderWeightLine, renderMacroDonut } from './charts.js';

const MEAL_ICONS = {
  breakfast: '<svg width="22" height="22"><use href="#icon-sunrise"/></svg>',
  lunch:     '<svg width="22" height="22"><use href="#icon-sun"/></svg>',
  dinner:    '<svg width="22" height="22"><use href="#icon-moon"/></svg>',
  snack:     '<svg width="22" height="22"><use href="#icon-apple"/></svg>',
};

// ── Toast ─────────────────────────────────────────────────
export function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── Loading Overlay ───────────────────────────────────────
export function showLoading(show) {
  document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

// ── Dashboard (Screen: home) ──────────────────────────────
export function renderDashboard(log, profile) {
  const consumed = log?.totalCalories  || 0;
  const goal     = profile?.goalCalories || 2000;
  const pGram    = log?.totalProtein    || 0;
  const cGram    = log?.totalCarbs      || 0;
  const fGram    = log?.totalFat        || 0;
  const pGoal    = profile?.goalProtein  || 150;
  const cGoal    = profile?.goalCarbs    || 200;
  const fGoal    = profile?.goalFat      || 65;

  // Calorie ring center text
  const remaining = goal - consumed;
  document.getElementById('calorie-ring-num').textContent     = consumed;
  document.getElementById('calorie-ring-remaining').textContent =
    remaining >= 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over`;

  renderCalorieRing(consumed, goal);

  // Stats row
  document.getElementById('dash-goal-cal').textContent   = goal;
  document.getElementById('dash-burned-cal').textContent = '—';  // no fitness tracker
  const netEl = document.getElementById('dash-net-cal');
  if (netEl) { netEl.textContent = consumed; netEl.style.color = consumed > goal ? 'var(--red)' : 'var(--text-primary)'; }

  // Macro bars
  renderMacroBar('protein', pGram, pGoal);
  renderMacroBar('carbs',   cGram, cGoal);
  renderMacroBar('fat',     fGram, fGoal);

  // Meal cards
  const container = document.getElementById('dash-meals');
  if (!log?.meals?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon"><svg width="48" height="48" style="color:var(--text-muted)"><use href="#icon-utensils"/></svg></div>
        <h3>No meals logged today</h3>
        <p>Tap the + button to log your first meal</p>
      </div>`;
    return;
  }

  container.innerHTML = log.meals.map(meal => renderMealCard(meal)).join('');
  container.querySelectorAll('.meal-card').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('expanded'));
  });
}

function renderMacroBar(type, current, goal) {
  const pct = Math.min(100, goal > 0 ? (current / goal) * 100 : 0);
  const el  = document.getElementById(`bar-${type}`);
  if (el) el.style.width = `${pct}%`;
  const labelEl = document.getElementById(`bar-${type}-label`);
  if (labelEl) labelEl.textContent = `${current}g / ${goal}g`;
}

function renderMealCard(meal) {
  const icon  = MEAL_ICONS[meal.mealType] || '<svg width="22" height="22"><use href="#icon-utensils"/></svg>';
  const foods = (meal.foods || []).map(f => `
    <div class="food-item-row">
      <div>
        <div class="food-item-name">${f.name}</div>
        <div class="food-item-qty">${f.quantity}</div>
        <div class="flex-row gap-8 mt-8">
          <span class="macro-pill p">${f.protein}g P</span>
          <span class="macro-pill c">${f.carbs}g C</span>
          <span class="macro-pill f">${f.fat}g F</span>
        </div>
      </div>
      <div class="food-item-cal">${f.calories}<span style="font-size:11px;color:var(--text-muted)"> kcal</span></div>
    </div>`).join('');

  return `
    <div class="meal-card" data-meal-id="${meal.id}">
      <div class="meal-card-header">
        <div class="meal-icon ${meal.mealType}">${icon}</div>
        <div class="meal-card-info">
          <div class="meal-card-title">${capitalise(meal.mealType)}</div>
          <div class="meal-card-sub">${(meal.foods || []).length} item${meal.foods?.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="meal-card-cal">${meal.mealCalories} <span style="font-size:11px;color:var(--text-muted)">kcal</span></div>
        <svg class="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="meal-card-body">${foods}</div>
    </div>`;
}

// ── Analysis Results (Log screen) ────────────────────────
export function renderAnalysisResults(foods, container) {
  container.innerHTML = foods.map((f, i) => `
    <div class="food-result-card" data-food-idx="${i}">
      <div class="food-name">${f.name}</div>
      <div class="food-qty">${f.quantity}</div>
      <div class="food-macros-grid">
        <div class="macro-cell cal">
          <input type="number" class="edit-cal"  value="${f.calories}" min="0" step="1">
          <div class="lbl">kcal</div>
        </div>
        <div class="macro-cell prot">
          <input type="number" class="edit-prot" value="${f.protein}"  min="0" step="0.1">
          <div class="lbl">Protein</div>
        </div>
        <div class="macro-cell carb">
          <input type="number" class="edit-carb" value="${f.carbs}"    min="0" step="0.1">
          <div class="lbl">Carbs</div>
        </div>
        <div class="macro-cell fat">
          <input type="number" class="edit-fat"  value="${f.fat}"      min="0" step="0.1">
          <div class="lbl">Fat</div>
        </div>
      </div>
    </div>`).join('');
}

/** Read back edited values from the results container */
export function readEditedFoods(originalFoods, container) {
  return originalFoods.map((f, i) => {
    const card  = container.querySelector(`[data-food-idx="${i}"]`);
    if (!card) return f;
    return {
      ...f,
      calories: +card.querySelector('.edit-cal').value  || f.calories,
      protein:  +card.querySelector('.edit-prot').value || f.protein,
      carbs:    +card.querySelector('.edit-carb').value || f.carbs,
      fat:      +card.querySelector('.edit-fat').value  || f.fat,
    };
  });
}

// ── History ───────────────────────────────────────────────
export function renderHistory(logs, profile) {
  const goalCal = profile?.goalCalories || 2000;

  // Heatmap (last 35 days)
  renderHeatmap(logs, goalCal);

  // Day list
  const listEl = document.getElementById('history-list');
  if (!logs.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="icon"><svg width="48" height="48" style="color:var(--text-muted)"><use href="#icon-calendar"/></svg></div><h3>No history yet</h3><p>Start logging meals to see your history.</p></div>`;
    return;
  }

  listEl.innerHTML = logs.map(day => {
    const pct = goalCal > 0 ? Math.round((day.totalCalories / goalCal) * 100) : 0;
    const badgeClass = pct < 80 ? 'badge-yellow' : pct > 115 ? 'badge-red' : 'badge-green';
    const meals = (day.meals || []).map(m => renderMealCard(m)).join('');
    const dateObj = new Date(day.date + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return `
      <div class="history-day" data-date="${day.date}">
        <div class="history-day-header">
          <div class="history-date">
            <div class="date-main">${dateStr}</div>
            <div class="date-sub">${(day.meals || []).length} meal${day.meals?.length !== 1 ? 's' : ''} · P ${day.totalProtein}g C ${day.totalCarbs}g F ${day.totalFat}g</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="badge ${badgeClass}">${pct}%</span>
            <div class="history-cal" style="color:var(--accent)">${day.totalCalories}</div>
            <svg class="history-chevron chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div class="history-day-body">
          ${meals || '<p class="text-sm text-muted" style="padding-top:12px">No meals recorded.</p>'}
        </div>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.history-day').forEach(day => {
    day.querySelector('.history-day-header').addEventListener('click', () => day.classList.toggle('expanded'));
  });
  listEl.querySelectorAll('.meal-card').forEach(card => {
    card.addEventListener('click', e => { e.stopPropagation(); card.classList.toggle('expanded'); });
  });
}

function renderHeatmap(logs, goalCal) {
  const wrap = document.getElementById('heatmap-grid');
  if (!wrap) return;

  // Build a map date→pct
  const map = {};
  for (const l of logs) {
    map[l.date] = goalCal > 0 ? (l.totalCalories / goalCal) : 0;
  }

  // Last 35 days
  const cells = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const pct = map[key] || 0;
    let heat = 'h0';
    if (pct > 0 && pct < 0.5)  heat = 'h1';
    else if (pct >= 0.5 && pct < 0.85) heat = 'h2';
    else if (pct >= 0.85 && pct < 1.1) heat = 'h3';
    else if (pct >= 1.1)        heat = 'h4';
    cells.push(`<div class="heatmap-cell ${heat}" title="${key}: ${Math.round(pct*100)}% of goal"></div>`);
  }
  wrap.innerHTML = cells.join('');
}

// ── Insights ──────────────────────────────────────────────
export function renderInsights(logs, profile) {
  const goalCal = profile?.goalCalories || 2000;

  // Last 7 days
  const days7 = getLast7Days(logs);
  const labels = days7.map(d => {
    const [,, day] = d.date.split('-');
    const dt = new Date(d.date + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { weekday: 'short' });
  });
  const calVals = days7.map(d => d.totalCalories || 0);
  renderWeeklyBar(labels, calVals, goalCal);

  // Averages
  const activeDays = days7.filter(d => d.totalCalories > 0);
  const avgCal  = activeDays.length ? Math.round(activeDays.reduce((s, d) => s + d.totalCalories, 0) / activeDays.length) : 0;
  const avgProt = activeDays.length ? Math.round(activeDays.reduce((s, d) => s + d.totalProtein,  0) / activeDays.length) : 0;
  const avgCarb = activeDays.length ? Math.round(activeDays.reduce((s, d) => s + d.totalCarbs,    0) / activeDays.length) : 0;
  const avgFat  = activeDays.length ? Math.round(activeDays.reduce((s, d) => s + d.totalFat,      0) / activeDays.length) : 0;

  safeText('insights-avg-cal',         avgCal);
  safeText('insights-avg-prot',        avgProt + 'g');
  safeText('insights-avg-carb',        avgCarb + 'g');
  safeText('insights-avg-fat',         avgFat  + 'g');
  safeText('insights-macro-prot-disp', avgProt + 'g');
  safeText('insights-macro-fat-disp',  avgFat  + 'g');

  renderMacroDonut(avgProt, avgCarb, avgFat);

  // Surplus/deficit
  const defEl = document.getElementById('insights-deficit');
  if (defEl) {
    const avg = avgCal - goalCal;
    defEl.textContent = (avg >= 0 ? '+' : '') + avg + ' kcal avg / day';
    defEl.style.color = avg > 0 ? 'var(--red)' : 'var(--green)';
  }

  // Best / worst
  const sorted = activeDays.slice().sort((a, b) => {
    const da = Math.abs(a.totalCalories - goalCal);
    const db = Math.abs(b.totalCalories - goalCal);
    return da - db;
  });
  if (sorted.length) {
    const best  = sorted[0];
    const worst = sorted[sorted.length - 1];
    safeText('insights-best-day',  fmtDate(best.date)  + ' — ' + best.totalCalories  + ' kcal');
    safeText('insights-worst-day', fmtDate(worst.date) + ' — ' + worst.totalCalories + ' kcal');
  }

  // Weight chart
  const weightData = logs.filter(l => l.weight).slice(-30);
  if (weightData.length >= 2) {
    document.getElementById('weight-chart-section').classList.remove('hidden');
    const wUnit = profile?.unit || 'lbs';
    renderWeightLine(
      weightData.map(d => fmtDate(d.date)),
      weightData.map(d => d.weight),
      wUnit
    );
  }
}

function getLast7Days(logs) {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push(logs.find(l => l.date === key) || { date: key, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
  }
  return result;
}

// ── Profile ───────────────────────────────────────────────
export function renderProfile(profile) {
  if (!profile) return;
  const fields = ['height', 'weight', 'age', 'sex', 'activityLevel', 'goal', 'unit',
                  'goalCalories', 'goalProtein', 'goalCarbs', 'goalFat'];
  for (const f of fields) {
    const el = document.getElementById(`profile-${f}`);
    if (el && profile[f] !== undefined) el.value = profile[f];
  }
  if (profile.goalCalories) {
    renderTDEEResult(profile.bmr, profile.tdee, profile.goalCalories);
  }
}

export function renderTDEEResult(bmr, tdee, goalCal) {
  safeText('tdee-result-num', goalCal || tdee);
  safeText('tdee-bmr',        `BMR: ${Math.round(bmr || 0)} kcal`);
  safeText('tdee-tdee',       `TDEE: ${Math.round(tdee || 0)} kcal`);
  const wrap = document.getElementById('tdee-result-wrap');
  if (wrap) wrap.classList.remove('hidden');
}

// ── Utilities ─────────────────────────────────────────────
function safeText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function capitalise(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
