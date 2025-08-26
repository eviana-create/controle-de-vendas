// sw.js — Adega Lounge
const APP_VERSION = "v0.1.9";
const CACHE_NAME = `adega-cache-${APP_VERSION}`;

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/firebaseConfig.js",
  "/js/vendas.js",
  "/js/estoque.js",
  "/js/historico.js",
  "/js/creditos.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Instala e faz cache inicial
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("adega-cache-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Estratégias de fetch
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Navegação (HTML) → network first, fallback cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Demais → cache first, fallback network
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
    )
  );
});

// Mensagens do app → exibir anúncios ou atualizar
self.addEventListener("message", (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "USER_LOGGED_IN":
      // Exemplo: quando usuário logar, disparar aviso para mostrar banner
      sendMessageToClients({ type: "SHOW_AD" });
      break;
  }
});

// Utilitário: mandar msg para todas as abas
async function sendMessageToClients(msg) {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage(msg);
  }
}
