// ────────────────────────────────────────────────────────
//  db.js — Dexie.js IndexedDB schema + all DB operations
// ────────────────────────────────────────────────────────
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.mjs';

const db = new Dexie('NutriLog');

db.version(1).stores({
  userProfile: '&id',        // single row, id = 1
  logs:        '&date',      // keyed by YYYY-MM-DD
  weightLog:   '&date',      // optional daily weigh-in
});

// ────── userProfile ──────
export async function getProfile() {
  return db.userProfile.get(1);
}

export async function saveProfile(data) {
  await db.userProfile.put({ ...data, id: 1 });
}

// ────── daily logs ──────
export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getLog(date = todayDate()) {
  return db.logs.get(date) || null;
}

export async function getAllLogs() {
  return db.logs.orderBy('date').reverse().toArray();
}

/**
 * Add a meal to today's (or any day's) log.
 * Recalculates totals from all meals.
 */
export async function addMeal(meal, date = todayDate()) {
  const existing = (await db.logs.get(date)) || { date, meals: [] };
  const meals = [...(existing.meals || []), meal];
  const totals = sumMeals(meals);
  await db.logs.put({ ...existing, date, meals, ...totals });
}

/**
 * Delete a meal by id from a given day's log.
 */
export async function deleteMeal(mealId, date = todayDate()) {
  const existing = await db.logs.get(date);
  if (!existing) return;
  const meals = existing.meals.filter(m => m.id !== mealId);
  const totals = sumMeals(meals);
  await db.logs.put({ ...existing, meals, ...totals });
}

/**
 * Update optional daily weigh-in on the log row.
 */
export async function saveDayWeight(weight, unit = 'lbs', date = todayDate()) {
  const existing = (await db.logs.get(date)) || { date, meals: [] };
  await db.logs.put({ ...existing, weight, weightUnit: unit });
  // Mirror to dedicated weightLog table
  await db.weightLog.put({ date, weight, unit });
}

// ────── weight log ──────
export async function getWeightLog() {
  return db.weightLog.orderBy('date').toArray();
}

// ────── aggregation helpers ──────
function sumMeals(meals) {
  let cal = 0, prot = 0, carbs = 0, fat = 0, fiber = 0, sodium = 0, sugar = 0;
  for (const m of meals) {
    cal    += m.mealCalories  || 0;
    prot   += m.mealProtein   || 0;
    carbs  += m.mealCarbs     || 0;
    fat    += m.mealFat       || 0;
    for (const f of m.foods || []) {
      fiber  += f.fiber  || 0;
      sodium += f.sodium || 0;
      sugar  += f.sugar  || 0;
    }
  }
  return {
    totalCalories: Math.round(cal),
    totalProtein:  Math.round(prot * 10) / 10,
    totalCarbs:    Math.round(carbs * 10) / 10,
    totalFat:      Math.round(fat * 10) / 10,
    totalFiber:    Math.round(fiber * 10) / 10,
    totalSodium:   Math.round(sodium),
    totalSugar:    Math.round(sugar * 10) / 10,
  };
}

// ────── export / import ──────
export async function exportAll() {
  const [profile, logs, weightLog] = await Promise.all([
    db.userProfile.toArray(),
    db.logs.toArray(),
    db.weightLog.toArray(),
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), profile, logs, weightLog };
}

export async function importAll(data) {
  await db.transaction('rw', db.userProfile, db.logs, db.weightLog, async () => {
    if (data.profile)   await db.userProfile.bulkPut(data.profile);
    if (data.logs)      await db.logs.bulkPut(data.logs);
    if (data.weightLog) await db.weightLog.bulkPut(data.weightLog);
  });
}

export { db };
