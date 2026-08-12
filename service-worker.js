// ==========================================
// FFW Manager - Service Worker (v3.7.2)
// ==========================================

const CACHE_NAME = 'ffw-manager-v4.0.6'; // Erhöht für Lager-Update

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/storage.js',
  './js/kategorien.js',
  './js/geraete.js',
  './js/fahrzeuge.js',
  './js/psa.js',
  './js/lager.js',
  './js/pruefungen.js',
  './js/app.js'
];

// 1. Installation: Erzwingt frischen Download vom Server (kein HTTP-Browser-Cache)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => {
          return fetch(new Request(url, { cache: 'reload' }))
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Fehler beim Laden von ${url}: ${response.statusText}`);
              }
              return cache.put(url, response);
            })
            .catch((err) => console.warn(`[SW] Konnte Asset nicht cachen: ${url}`, err));
        })
      );
    })
  );
  self.skipWaiting();
});

// 2. Aktivierung: Alte Caches zuverlässig löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log(`[SW] Alter Cache gelöscht: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch-Abfangung: Nur GET-Requests verarbeiten & Offline-Fallback
self.addEventListener('fetch', (event) => {
  // Nur HTTP(S) GET-Anfragen cachen (ignoriert POST, Browser-Extensions etc.)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          // Fallback für Seitennavigationen im Offline-Modus
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});