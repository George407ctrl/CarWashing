const CACHE = 'carwash3d-v1';
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const LOCAL_ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(LOCAL_ASSETS.map((u) => cache.add(u).catch(() => {})));
    try {
      const res = await fetch(new Request(THREE_URL, { mode: 'no-cors' }));
      await cache.put(THREE_URL, res);
    } catch (e) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.url === THREE_URL) {
    event.respondWith((async () => {
      const cached = await caches.match(THREE_URL);
      if (cached) return cached;
      const res = await fetch(new Request(THREE_URL, { mode: 'no-cors' }));
      const cache = await caches.open(CACHE);
      cache.put(THREE_URL, res.clone());
      return res;
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', res.clone());
        return res;
      } catch (e) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      return Response.error();
    }
  })());
});
