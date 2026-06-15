// ────────────────────────────────────────────────────────
//  calculator.js — BMR, TDEE, macro goal math
// ────────────────────────────────────────────────────────

const ACTIVITY = {
  sedentary:     1.2,
  light:         1.375,
  moderate:      1.55,
  active:        1.725,
  'very-active': 1.9,
};

/**
 * Mifflin-St Jeor BMR (returns kcal/day)
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} age
 * @param {'male'|'female'} sex
 */
export function calcBMR(weightKg, heightCm, age, sex) {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return sex === 'female' ? base - 161 : base + 5;
}

export function calcTDEE(bmr, activityLevel) {
  return Math.round(bmr * (ACTIVITY[activityLevel] || 1.2));
}

/**
 * Goal calories based on objective
 * @param {number} tdee
 * @param {'cut'|'maintain'|'bulk'} goal
 */
export function calcGoalCalories(tdee, goal) {
  if (goal === 'cut')  return tdee - 500;
  if (goal === 'bulk') return tdee + 300;
  return tdee;
}

/**
 * Macro targets
 * Protein: 0.8g per lb of bodyweight
 * Fat: ~27.5% of goal calories (4.5 → 9 cal/g)
 * Carbs: remainder
 * @param {number} weightLbs
 * @param {number} goalCalories
 */
export function calcMacros(weightLbs, goalCalories) {
  const protein = Math.round(0.8 * weightLbs);            // grams
  const fat     = Math.round((goalCalories * 0.275) / 9); // grams
  const carbs   = Math.round((goalCalories - protein * 4 - fat * 9) / 4); // grams
  return { protein, fat, carbs };
}

/** Convert kg ↔ lbs */
export function kgToLbs(kg) { return +(kg * 2.20462).toFixed(1); }
export function lbsToKg(lbs){ return +(lbs / 2.20462).toFixed(1); }

/** Convert cm ↔ inches */
export function cmToIn(cm) { return +(cm / 2.54).toFixed(1); }
export function inToCm(inches){ return +(inches * 2.54).toFixed(1); }

/** Given height in feet+inches return cm */
export function ftInToCm(feet, inches) { return inToCm(feet * 12 + inches); }
