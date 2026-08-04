const CACHE_NAME = 'ffw-manager-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/kategorien.js',
  './js/geraete.js',
  './js/app.js',
  './manifest.json'
];

// Service Worker installieren & Dateien cachen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching aller Dateien...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Anfragen abfangen & Offline-Daten liefern
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});