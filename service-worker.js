<<<<<<< HEAD
const CACHE_NAME = 'adega-v1.1.1'
=======
const CACHE_NAME = 'adega-v1.1.2'
>>>>>>> 9a32f2c (WIP: ajustes em vendas.js e service-worker.js)
const urlsToCache = [
  './',
  './index.html',
  './admin.html',
  './funcionario.html',
  './css/style.css',
  './js/login.js',
  './js/logout.js',
  './js/firebaseConfig.js',
  './js/pwa.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(urlsToCache).catch((err) => {
        console.error('[SW] Erro ao adicionar arquivos ao cache:', err);
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match('./index.html'))
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
