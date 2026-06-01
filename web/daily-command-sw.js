const CACHE_NAME = 'daily-command-web-sw-v1';
const ASSETS = ['/web/index.html', '/web/app.js', '/web/styles.css'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
      return response;
    })).catch(() => caches.match('/web/index.html'))
  );
});
