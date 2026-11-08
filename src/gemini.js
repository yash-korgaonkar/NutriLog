// ────────────────────────────────────────────────────────
//  gemini.js — Gemini 2.5 Flash API integration
// ────────────────────────────────────────────────────────

const MODEL   = 'gemini-2.5-flash';
const BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';
export const API_KEY_STORAGE = 'nutrilog_gemini_key';

// The key lives only in this browser's storage — never in the source code.
export function getApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE) || ''; } catch { return ''; }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key.trim());
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch { /* storage unavailable */ }
}

const SYSTEM_INSTRUCTION = `You are a nutrition analysis API.
You MUST return ONLY valid JSON — no markdown, no explanations, no code fences.
Make reasonable assumptions for ambiguous quantities (e.g. "a large flatbread pizza" → assume Stonefire Artisan, note in the name).
Break compound meals into individual food components.
Return a JSON array of meals. Each meal must include:
- "mealType" (must be one of: "breakfast", "lunch", "dinner", "snack") — infer this from the text context, or fallback to "snack" if unknown.
- "foods" (a JSON array of food items)
For each food item return ALL of these keys exactly:
name, quantity, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, saturated_fat_g, sodium_mg, cholesterol_mg, potassium_mg.
All numeric values must be numbers (not strings). Calories must be reasonable.`;

/**
 * Analyze a meal description and return an array of meals.
 * @param {string} rawText
 * @param {string} forcedMealType 'auto' or a specific type like 'breakfast'
 * @returns {Promise<Array>} array of meal objects
 */
export async function analyzeMeal(rawText, forcedMealType = 'auto') {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key configured. Add it in Profile → Gemini API Key.');

  const url = `${BASE}/${MODEL}:generateContent?key=${apiKey}`;
  
  let forcedMealText = '';
  if (forcedMealType !== 'auto') {
    forcedMealText = `\nCRITICAL: The user has explicitly selected ${forcedMealType}. You MUST set "mealType": "${forcedMealType}" for ALL meals returned, regardless of the description.`;
  }

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Analyze the following description and return a JSON array of meals.
Each meal has a mealType, and an array of foods.
Each food must include: name, quantity, calories, protein_g, carbs_g, fat_g,
fiber_g, sugar_g, saturated_fat_g, sodium_mg, cholesterol_mg, potassium_mg.${forcedMealText}

Description: "${rawText}"`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini API error: ${msg}`);
  }

  const json = await res.json();
  const raw  = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse Gemini response. Please try again or edit manually.');
  }

  // Normalise: accept array at root, or nested
  const mealsData = Array.isArray(parsed) ? parsed
    : Array.isArray(parsed.meals)   ? parsed.meals
    : Array.isArray(parsed.items)   ? parsed.items
    : null;

  if (!mealsData) throw new Error('Unexpected response shape from Gemini.');

  return mealsData.map(m => ({
    mealType: m.mealType || 'snack',
    foods: (m.foods || []).map(normaliseFood)
  }));
}

/** Normalise field names & types */
function normaliseFood(f) {
  return {
    name:         String(f.name         || 'Unknown food'),
    quantity:     String(f.quantity     || '1 serving'),
    calories:     toNum(f.calories),
    protein:      toNum(f.protein_g    ?? f.protein),
    carbs:        toNum(f.carbs_g      ?? f.carbs),
    fat:          toNum(f.fat_g        ?? f.fat),
    fiber:        toNum(f.fiber_g      ?? f.fiber),
    sugar:        toNum(f.sugar_g      ?? f.sugar),
    saturatedFat: toNum(f.saturated_fat_g ?? f.saturatedFat),
    sodium:       toNum(f.sodium_mg    ?? f.sodium),
    cholesterol:  toNum(f.cholesterol_mg ?? f.cholesterol),
    potassium:    toNum(f.potassium_mg ?? f.potassium),
  };
}

function toNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 10) / 10;
}

/** Sum an array of food items into meal-level totals */
export function sumFoods(foods) {
  return {
    mealCalories: Math.round(foods.reduce((s, f) => s + f.calories, 0)),
    mealProtein:  Math.round(foods.reduce((s, f) => s + f.protein,  0) * 10) / 10,
    mealCarbs:    Math.round(foods.reduce((s, f) => s + f.carbs,    0) * 10) / 10,
    mealFat:      Math.round(foods.reduce((s, f) => s + f.fat,      0) * 10) / 10,
  };
}
