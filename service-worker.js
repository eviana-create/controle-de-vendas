const CACHE_NAME = 'adega-' + Date.now(); // Garante nova versão sempre
const urlsToCache = [
  '/controle-de-vendas/',
  '/controle-de-vendas/index.html',
  '/controle-de-vendas/style.css',
  '/controle-de-vendas/script.js',
  '/controle-de-vendas/manifest.json'
];

// Instala e armazena no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // Ativa imediatamente após instalação
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  return self.clients.claim();
});

// Intercepta requisições e responde do cache ou internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Permite ativar nova versão sob comando
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
