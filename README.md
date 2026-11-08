# NutriLog

**An AI nutrition tracker you log by typing what you ate.** Installable as an app on your phone.

**Live:** [yash-korgaonkar.github.io/NutriLog](https://yash-korgaonkar.github.io/NutriLog/)

Calorie apps make you search a database for every ingredient. With NutriLog you write "two eggs, toast with butter, and a large iced latte" and Gemini 2.5 Flash breaks it into individual foods with calories, protein, carbs, fat, fiber, sugar, saturated fat, sodium, cholesterol, and potassium. You review or edit the numbers, then save.

## Features

- **Natural-language logging** — describe a meal in plain English; compound meals are split into components and the meal type is inferred
- **Editable results** — every AI estimate can be corrected before it's saved
- **Goals from your body stats** — BMR via Mifflin-St Jeor, TDEE from activity level, and calorie/macro targets for cutting, maintaining, or bulking
- **Dashboard and insights** — calorie ring, macro donut, weekly trends, and averages over time
- **Weight tracking** — daily weigh-ins with a trend chart
- **Private by design** — all data stays on your device in IndexedDB; export/import as JSON backup
- **Works offline** — progressive web app with a service worker; add it to your home screen

## Stack

Vanilla JavaScript (ES modules) · Gemini 2.5 Flash API · Dexie.js (IndexedDB) · Chart.js · Service Worker / PWA · GitHub Pages

No build step, no backend, no framework.

## Code

| File | Role |
|---|---|
| `src/gemini.js` | Prompting Gemini for structured JSON nutrition data |
| `src/calculator.js` | BMR, TDEE, goal calories, macro split |
| `src/db.js` | IndexedDB schema and all reads/writes |
| `src/charts.js` | Calorie ring, weekly bars, macro donut, weight line |
| `src/ui.js`, `src/app.js` | Screens, routing, and event handling |
| `sw.js` | Offline caching |

## Run it

Serve the folder with any static server (e.g. `npx serve .`), open it, and paste a [Gemini API key](https://aistudio.google.com/apikey) under **Profile → Gemini API Key**. The key is stored only in your browser.
