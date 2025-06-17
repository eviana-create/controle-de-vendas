
const CACHE_NAME = "controle-vendas-v2";

const FILES_TO_CACHE = [
  "/controle-de-vendas/",
  "/controle-de-vendas/index.html",
  "/controle-de-vendas/style.css",
  "/controle-de-vendas/script.js",
  "/controle-de-vendas/manifest.json",
  "/controle-de-vendas/icons/icon-192.png",
  "/controle-de-vendas/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Instalando...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Arquivos em cache");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Ativando...");
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Removendo cache antigo", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
