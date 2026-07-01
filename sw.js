// ============================================================
// Service Worker — Offline caching for PWA (Progressive Web App)
// ============================================================
// This service worker enables the Tower Defense game to work
// offline and load instantly on repeat visits by caching all
// game assets (HTML, CSS, JS, manifest) during installation.
//
// Caching strategy: Cache-first with network fallback.
//   - On install: pre-cache all static assets
//   - On fetch: return cached version if available, otherwise
//     fetch from network (useful for future updates)
//   - On activate: purge old cache versions to keep storage clean

// Cache version identifier — bump this when assets change to
// force a fresh cache download for returning users.
const CACHE_NAME = 'tower-defense-v1';

// All static assets needed for the game to run offline.
// These are pre-cached during the 'install' event.
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/constants.js',
    './js/sprites.js',
    './js/sound.js',
    './js/map.js',
    './js/maps/crossroads.js',
    './js/maps/winding_valley.js',
    './js/maps/frozen_pass.js',
    './js/maps/fortress_siege.js',
    './js/maps/desert_oasis.js',
    './js/maps/jungle_ruins.js',
    './js/maps/volcanic_caldera.js',
    './js/maps/coastal_cliffs.js',
    './js/enemy.js',
    './js/tower.js',
    './js/projectile.js',
    './js/effects.js',
    './js/wave.js',
    './js/input.js',
    './js/ui.js',
    './js/main.js',
    './manifest.json',
];

// ---- Install: Pre-cache all assets ----
// Fires when the service worker is first registered or updated.
// skipWaiting() forces the new worker to activate immediately
// instead of waiting for all tabs to close.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// ---- Activate: Clean up old caches ----
// Fires after install completes. Delete any caches that don't
// match the current CACHE_NAME to prevent storage bloat.
// clients.claim() makes this worker control all open pages
// without requiring a refresh.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// ---- Fetch: Serve from cache, fall back to network ----
// Intercepts all network requests from the game. Returns the
// cached version immediately for fast loading; if not in cache,
// fetches from the network (which also implicitly adds it to
// the browser's HTTP cache).
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(
            (cachedResponse) => cachedResponse || fetch(event.request)
        )
    );
});
