// ────────────────────────────────────────────────────────
//  sw.js — NutriLog Service Worker (Cache-first PWA)
// ────────────────────────────────────────────────────────

const CACHE_NAME = 'nutrilog-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles/main.css',
  './src/app.js',
  './src/db.js',
  './src/gemini.js',
  './src/ui.js',
  './src/charts.js',
  './src/calculator.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  // CDN assets — cached on first fetch
];

// Install: pre-cache static shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go to network for Gemini API calls
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
        return response;
      });
    }).catch(() => {
      // Offline fallback — return cached index.html for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('./index.html').then(res => res || caches.match('./'));
      }
    })
  );
});
