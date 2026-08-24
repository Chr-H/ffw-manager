// ==========================================
// FFW Manager - Service Worker (v5.3.2.)
// ==========================================

const CACHE_NAME = 'ffw-manager-v5.3.2'; // Version erhöht für Icon-Caching

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
  './js/app.js',
  // 🖼️ App-Icons für Homescreen & PWA-Installation
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// 1. Installation: Erzwingt frischen Download vom Server
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

// 3. Fetch-Abfangung mit Firestore-Bypass & sicherem Network-Fallback
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 🛑 1. Nur GET-Anfragen bearbeiten
  if (event.request.method !== 'GET' || !url.startsWith('http')) {
    return;
  }

  // 🛑 2. Firebase, Firestore, Google APIs und externe Dienste komplett bypassen!
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('firebase')
  ) {
    return; // Überlässt das Fetching direkt dem Browser
  }

  // 🟢 3. Lokale Assets abfangen
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).catch((err) => {
        console.warn(`[SW] Netzwerkfehler bei ${url}:`, err);

        // Fallback für Navigationen im Offline-Modus
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }

        // Fängt den "Failed to convert value to 'Response'" ab
        return new Response('Netzwerkfehler', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      });
    })
  );
});