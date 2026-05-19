// sw.js
const CACHE_NAME = "delivery-scanner-v2"; // bump version when you change files
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./libs/jsqr.min.js",
  "./libs/zxing.min.js",
  "./assets/logo-192.png",
  "./assets/logo-512.png"
];

// Install: cache all required files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    }).catch(err => {
      console.error("SW install cache error", err);
    })
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(err => {
      console.warn("SW fetch error", err);
      return fetch(event.request);
    })
  );
});
