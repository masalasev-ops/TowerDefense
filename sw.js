// Service Worker — Tower Defense
const CACHE_NAME = 'tower-defense-v1';
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

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
});
