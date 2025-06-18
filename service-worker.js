const CACHE_NAME = 'controle-vendas-v2';
const urlsToCache = [ /* seus arquivos */ ];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  return self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
});
