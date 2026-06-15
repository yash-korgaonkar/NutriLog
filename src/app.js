// ────────────────────────────────────────────────────────
//  app.js — Routing & screen manager (main entry point)
// ────────────────────────────────────────────────────────
import { getProfile, saveProfile, getLog, getAllLogs, addMeal, deleteMeal,
         saveDayWeight, getWeightLog, exportAll, importAll, todayDate } from './db.js';
import { analyzeMeal, sumFoods } from './gemini.js';
import { calcBMR, calcTDEE, calcGoalCalories, calcMacros,
         kgToLbs, lbsToKg, inToCm, cmToIn } from './calculator.js';
import { renderDashboard, renderAnalysisResults, readEditedFoods,
         renderHistory, renderInsights, renderProfile,
         renderTDEEResult, showToast, showLoading } from './ui.js';

// ── State ─────────────────────────────────────────────────
let currentScreen = 'home';
let pendingFoods  = [];   // foods returned by Gemini, waiting to be confirmed
let currentMealType = 'breakfast';

// ── Init ─────────────────────────────────────────────────
async function init() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  const profile = await getProfile();

  if (!profile) {
    showSetupScreen();
  } else {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    navigateTo('home');
  }

  attachNavListeners();
  attachFab();
  attachLogScreen();
  attachProfileScreen();
  attachSetupScreen();
}

// ── Navigation ────────────────────────────────────────────
function navigateTo(screen) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target screen
  const el = document.getElementById(`screen-${screen}`);
  if (el) el.classList.add('active');
  const navEl = document.querySelector(`[data-screen="${screen}"]`);
  if (navEl) navEl.classList.add('active');

  // FAB visibility — hide on log screen (we have its own UI)
  document.getElementById('fab').style.display =
    ['home', 'history', 'insights'].includes(screen) ? 'flex' : 'none';

  currentScreen = screen;
  loadScreen(screen);
}

async function loadScreen(screen) {
  const profile = await getProfile();

  if (screen === 'home') {
    const log = await getLog(todayDate());
    renderDashboard(log, profile);
  }

  if (screen === 'history') {
    const logs = await getAllLogs();
    renderHistory(logs, profile);
  }

  if (screen === 'insights') {
    const logs = await getAllLogs();
    renderInsights(logs, profile);
  }

  if (screen === 'profile') {
    renderProfile(profile);
  }
}

function attachNavListeners() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.dataset.screen;
      if (screen) navigateTo(screen);
    });
  });
}

function attachFab() {
  document.getElementById('fab').addEventListener('click', () => navigateTo('log'));
}

// ── Setup Screen ──────────────────────────────────────────
function showSetupScreen() {
  document.getElementById('loading-overlay').style.display = 'none';
  document.getElementById('main-app').style.display        = 'none';
  document.getElementById('setup-screen').style.display    = 'flex';
}

function attachSetupScreen() {
  const form = document.getElementById('setup-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Collect profile basics
    const height = +document.getElementById('setup-height').value;
    const weight = +document.getElementById('setup-weight').value;
    const age    = +document.getElementById('setup-age').value;
    const sex    = document.getElementById('setup-sex').value;
    const activ  = document.getElementById('setup-activity').value;
    const goal   = document.getElementById('setup-goal').value;
    const unit   = document.getElementById('setup-unit').value;

    if (!height || !weight || !age) { showToast('Please fill in all fields', 'error'); return; }

    // Convert to metric for calculations
    const weightKg  = unit === 'lbs' ? lbsToKg(weight) : weight;
    const heightCm  = height; // we ask in cm during setup
    const weightLbs = unit === 'lbs' ? weight : kgToLbs(weight);

    const bmr   = calcBMR(weightKg, heightCm, age, sex);
    const tdee  = calcTDEE(bmr, activ);
    const goalCal = calcGoalCalories(tdee, goal);
    const macros  = calcMacros(weightLbs, goalCal);

    await saveProfile({
      height: heightCm, weight, age, sex, activityLevel: activ,
      goal, unit,
      bmr, tdee, goalCalories: goalCal,
      goalProtein: macros.protein, goalCarbs: macros.carbs, goalFat: macros.fat,
    });

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-app').style.display     = 'flex';
    navigateTo('home');
    showToast('Welcome to NutriLog!', 'success');
  });
}

// ── Log Screen ────────────────────────────────────────────
function attachLogScreen() {
  // Meal type toggle
  document.querySelectorAll('#log-meal-type .toggle-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('#log-meal-type .toggle-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      currentMealType = opt.dataset.type;
    });
  });
  // Auto-detect meal type from time
  autoDetectMealType();

  // Analyze button
  document.getElementById('btn-analyze')?.addEventListener('click', handleAnalyze);

  // Re-analyze button
  document.getElementById('btn-reanalyze')?.addEventListener('click', () => {
    document.getElementById('log-results-section').classList.add('hidden');
    document.getElementById('log-input-section').classList.remove('hidden');
    pendingFoods = [];
  });

  // Confirm & Save
  document.getElementById('btn-save-meal')?.addEventListener('click', handleSaveMeal);
}

function autoDetectMealType() {
  const h = new Date().getHours();
  let type = 'snack';
  if (h >= 5  && h < 11)  type = 'breakfast';
  else if (h >= 11 && h < 15) type = 'lunch';
  else if (h >= 17 && h < 21) type = 'dinner';

  currentMealType = type;
  document.querySelectorAll('#log-meal-type .toggle-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.type === type);
  });
}

async function handleAnalyze() {
  const text = document.getElementById('log-meal-text').value.trim();
  if (!text) { showToast('Please describe your meal first', 'error'); return; }

  const btn = document.getElementById('btn-analyze');
  btn.disabled = true;
  document.getElementById('log-spinner').classList.remove('hidden');
  document.getElementById('log-results-section').classList.add('hidden');

  try {
    pendingFoods = await analyzeMeal(text);
    renderAnalysisResults(pendingFoods, document.getElementById('log-foods-container'));
    document.getElementById('log-input-section').classList.add('hidden');
    document.getElementById('log-results-section').classList.remove('hidden');
  } catch (err) {
    showToast(err.message || 'Analysis failed', 'error');
    // Show manual fallback
    showManualFallback(text);
  } finally {
    btn.disabled = false;
    document.getElementById('log-spinner').classList.add('hidden');
  }
}

function showManualFallback(rawText) {
  pendingFoods = [{
    name: rawText, quantity: '1 serving',
    calories: 0, protein: 0, carbs: 0, fat: 0,
    fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, cholesterol: 0, potassium: 0,
  }];
  renderAnalysisResults(pendingFoods, document.getElementById('log-foods-container'));
  document.getElementById('log-input-section').classList.add('hidden');
  document.getElementById('log-results-section').classList.remove('hidden');
  showToast('Gemini unavailable — enter macros manually', 'info');
}

async function handleSaveMeal() {
  if (!pendingFoods.length) return;

  const container = document.getElementById('log-foods-container');
  const editedFoods = readEditedFoods(pendingFoods, container);
  const totals = sumFoods(editedFoods);
  const rawText = document.getElementById('log-meal-text').value.trim();

  const meal = {
    id:         crypto.randomUUID(),
    mealType:   currentMealType,
    rawText,
    foods:      editedFoods,
    ...totals,
  };

  try {
    await addMeal(meal);
    showToast('Meal saved!', 'success');
    // Reset log screen
    document.getElementById('log-meal-text').value = '';
    pendingFoods = [];
    document.getElementById('log-results-section').classList.add('hidden');
    document.getElementById('log-input-section').classList.remove('hidden');
    autoDetectMealType();
    navigateTo('home');
  } catch (err) {
    showToast('Failed to save meal', 'error');
  }
}

// ── Profile Screen ────────────────────────────────────────
function attachProfileScreen() {
  // Recalculate on change
  ['profile-height', 'profile-weight', 'profile-age', 'profile-sex',
   'profile-activityLevel', 'profile-goal', 'profile-unit'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', recalcProfile);
    document.getElementById(id)?.addEventListener('input',  recalcProfile);
  });

  // Save profile
  document.getElementById('btn-save-profile')?.addEventListener('click', handleSaveProfile);

  // API key toggle
  document.getElementById('profile-key-toggle')?.addEventListener('click', () => {
    const inp = document.getElementById('profile-api-key');
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  // Export
  document.getElementById('btn-export')?.addEventListener('click', handleExport);

  // Import
  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });
  document.getElementById('import-file-input')?.addEventListener('change', handleImport);

  // Daily weight log
  document.getElementById('btn-save-weight')?.addEventListener('click', handleSaveWeight);
}

async function recalcProfile() {
  const height = +document.getElementById('profile-height')?.value;
  const weight = +document.getElementById('profile-weight')?.value;
  const age    = +document.getElementById('profile-age')?.value;
  const sex    = document.getElementById('profile-sex')?.value;
  const activ  = document.getElementById('profile-activityLevel')?.value;
  const goal   = document.getElementById('profile-goal')?.value;
  const unit   = document.getElementById('profile-unit')?.value;
  if (!height || !weight || !age) return;

  const weightKg  = unit === 'lbs' ? lbsToKg(weight) : weight;
  const weightLbs = unit === 'lbs' ? weight : kgToLbs(weight);

  const bmr   = calcBMR(weightKg, height, age, sex);
  const tdee  = calcTDEE(bmr, activ);
  const goalCal = calcGoalCalories(tdee, goal);
  const macros  = calcMacros(weightLbs, goalCal);

  renderTDEEResult(bmr, tdee, goalCal);

  // Update macro fields
  const fields = { goalCalories: goalCal, goalProtein: macros.protein, goalCarbs: macros.carbs, goalFat: macros.fat };
  for (const [k, v] of Object.entries(fields)) {
    const el = document.getElementById(`profile-${k}`);
    if (el) el.value = v;
  }
}

async function handleSaveProfile() {
  const fields = ['height', 'weight', 'age', 'sex', 'activityLevel', 'goal', 'unit',
                  'goalCalories', 'goalProtein', 'goalCarbs', 'goalFat'];
  const data = {};
  for (const f of fields) {
    const el = document.getElementById(`profile-${f}`);
    if (el) data[f] = isNaN(el.value) || el.value === '' ? el.value : +el.value;
  }

  // Recompute BMR/TDEE for storage
  const unit     = data.unit || 'lbs';
  const weightKg = unit === 'lbs' ? lbsToKg(data.weight) : data.weight;
  data.bmr  = calcBMR(weightKg, data.height, data.age, data.sex);
  data.tdee = calcTDEE(data.bmr, data.activityLevel);

  await saveProfile(data);
  showToast('Profile saved', 'success');
}

async function handleExport() {
  try {
    const data = await exportAll();
    const blob  = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `nutrilog-backup-${todayDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported', 'success');
  } catch {
    showToast('Export failed', 'error');
  }
}

async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await importAll(data);
    showToast('Data imported! Reload to refresh.', 'success');
    e.target.value = '';
  } catch {
    showToast('Import failed — invalid file', 'error');
  }
}

async function handleSaveWeight() {
  const weightVal = +document.getElementById('log-weight-val')?.value;
  const unit      = document.getElementById('log-weight-unit')?.value || 'lbs';
  if (!weightVal) { showToast('Enter a valid weight', 'error'); return; }
  await saveDayWeight(weightVal, unit);
  showToast('Weight logged', 'success');
}

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
