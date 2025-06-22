const CACHE_NAME = 'adega-v1.3';
const urlsToCache = [
  '/controle-de-vendas/',
  '/controle-de-vendas/index.html',
  '/controle-de-vendas/style.css',
  '/controle-de-vendas/script.js',
  '/controle-de-vendas/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
