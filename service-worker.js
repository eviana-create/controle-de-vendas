const CACHE_NAME = 'adega-v1.1.5'; // AUMENTA A VERSÃO SEMPRE!

const urlsToCache = [
  './',
  './index.html',
  './admin.html',
  './funcionario.html',
  './estoque.html',
  './vendas.html',
  './historico.html',
  './creditos.html',
  './css/style.css',
  './js/login.js',
  './js/logout.js',
  './js/firebaseConfig.js',
  './js/pwa.js',
  './js/estoque.js',
  './js/vendas.js'
];

// Instala e cacheia os arquivos necessários
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando nova versão:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(urlsToCache).catch((err) => {
        console.error('[SW] Erro ao adicionar arquivos ao cache:', err);
      })
    )
  );
  self.skipWaiting(); // Pula para a nova versão imediatamente
});

// Ativa o novo Service Worker e limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando e limpando caches antigos...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // Garante controle imediato sobre as páginas
});

// Intercepta requisições e responde do cache (ou busca online)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        })
      );
    })
  );
});

// Permite atualização forçada via mensagem (vinda do pwa.js)
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    console.log('[SW] Recebido skipWaiting');
    self.skipWaiting();
  }
});
