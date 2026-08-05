const CACHE_NAME = 'ffw-manager-v0.5.6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/kategorien.js',
  './js/geraete.js',
  './js/fahrzeuge.js',
  './js/app.js',
  './manifest.json'
];

// Install Event: Neuen Cache anlegen
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Erzwingt das sofortige Aktivieren des neuen Service Workers
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event: Alte Caches automatisch löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Lösche alten Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Übernimmt sofort die Kontrolle
  );
});

// Fetch Event: Dateiaufrufe bedienen
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});