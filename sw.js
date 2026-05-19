// sw.js
const CACHE_NAME = 'delivery-scanner-v1';
const PRECACHE_URLS = [
  '/', '/index.html', '/manifest.json',
  '/libs/jsqr.min.js', '/libs/zxing.min.js',
  '/assets/logo-192.png', '/assets/logo-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(networkRes => {
        if (req.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then(cache => cache.put(req, networkRes.clone()));
        }
        return networkRes.clone();
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});
