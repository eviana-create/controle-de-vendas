const CACHE_NAME = 'adega-v1.4'; // 🔄 atualize sempre que mudar o app
const urlsToCache = [
  '/controle-de-vendas/',
  '/controle-de-vendas/index.html',
  '/controle-de-vendas/css/style.css',
  '/controle-de-vendas/js/login.js',
  // adicione os arquivos relevantes
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
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // 🔥 remove caches antigos
          }
        })
      )
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => {
      return res || fetch(event.request);
    })
  );
});

// 🔔 Comunicação com o app para avisar sobre nova versão
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting(); // força ativação imediata do novo SW
  }
});
