/* ===========================
   service-worker.js  v1.1.7
   =========================== */
const CACHE_NAME = "adega-v1.2.0"; // AUMENTE SEMPRE QUE MUDAR ARQUIVOS!

const urlsToCache = [
  "./",
  "./index.html",
  "./admin.html",
  "./funcionario.html",
  "./estoque.html",
  "./vendas.html",
  "./historico.html",
  "./creditos.html",
  "./css/style.css",
  "./js/login.js",
  "./js/logout.js",
  "./js/firebaseConfig.js",
  "./js/pwa.js",
  "./js/estoque.js",
  "./js/vendas.js"
];

/* -------- INSTALL -------- */
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando:", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.error("[SW] Erro ao cachear:", err))
  );
  self.skipWaiting(); // assume controle imediatamente
});

/* -------- ACTIVATE -------- */
self.addEventListener("activate", (event) => {
  console.log("[SW] Ativando e limpando caches antigos…");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* -------- FETCH -------- */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const acceptHeader = event.request.headers.get("accept") || "";
  const isHTML = acceptHeader.includes("text/html");

  if (isHTML) {
    /* Network‑First para páginas */
    event.respondWith(
      fetch(event.request)
        .then((networkResp) => {
          // Atualiza cache com nova versão
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
          return networkResp;
        })
        .catch(() =>
          /* offline → tenta cache */
          caches.match(event.request).then(
            (cached) => cached || caches.match("./index.html")
          )
        )
    );
  } else {
    /* Cache‑First para assets */
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((networkResp) => {
            // Guarda asset novo no cache
            const respClone = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
            return networkResp;
          })
      )
    );
  }
});

/* -------- Mensagens (skipWaiting) -------- */
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    console.log("[SW] skipWaiting recebido");
    self.skipWaiting();
  }
});
