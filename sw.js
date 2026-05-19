// sw.js (production-ready)
const CACHE_VERSION = 'delivery-scanner-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './libs/jsqr.min.js',
  './libs/zxing.min.js',
  './assets/logo-192.png',
  './assets/logo-512.png',
  // add any other local assets here (CSS, images, fonts)
];

// runtime cache names
const RUNTIME_CACHE = 'runtime-cache-v1';
const IMAGE_CACHE = 'images-cache-v1';
const FALLBACK_HTML = './offline.html';

// Install: cache app shell and offline page
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async cache => {
      // ensure all files exist; if any fail, install should still proceed but log error
      try {
        await cache.addAll(APP_SHELL);
      } catch (err) {
        console.error('SW install: cache.addAll failed', err);
        // try to add files individually to get more granular errors
        for (const url of APP_SHELL) {
          try { await cache.add(url); } catch(e){ console.error('Failed to cache', url, e); }
        }
      }
      // cache offline fallback if present
      try { await cache.add(FALLBACK_HTML); } catch(e){ /* optional */ }
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION && k !== RUNTIME_CACHE && k !== IMAGE_CACHE)
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app shell, network-first for API (none), runtime for images
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests (avoid interfering with other origins)
  if (url.origin !== location.origin) return;

  // Serve app shell from cache first
  if (APP_SHELL.includes(url.pathname) || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(resp => {
        // update cache for future
        return caches.open(CACHE_VERSION).then(cache => { cache.put(req, resp.clone()); return resp; });
      }).catch(()=> caches.match(FALLBACK_HTML))
    ));
    return;
  }

  // Images: cache-first with fallback
  if (req.destination === 'image' || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(resp => {
        return caches.open(IMAGE_CACHE).then(cache => { cache.put(req, resp.clone()); return resp; });
      }).catch(()=> caches.match('./assets/logo-192.png')))
    );
    return;
  }

  // Default: try cache, then network, then fallback
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        // optionally cache runtime GET requests (non-POST)
        if (req.method === 'GET') {
          return caches.open(RUNTIME_CACHE).then(cache => { cache.put(req, resp.clone()); return resp; });
        }
        return resp;
      }).catch(() => caches.match(FALLBACK_HTML));
    })
  );
});
