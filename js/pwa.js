// 🔄 Botão de instalação para Android
let deferredPrompt;
const installBtn = document.getElementById('installButton');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'block';
  console.log('beforeinstallprompt disparado');
});

if (installBtn) {
  installBtn.addEventListener('click', () => {
    if (!deferredPrompt) return;
    installBtn.style.display = 'none';
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(() => {
      deferredPrompt = null;
    });
  });
}

// 🛠️ Registro do Service Worker com auto-atualização
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('service-worker.js')
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            if (confirm('Nova versão disponível. Atualizar agora?')) {
              registration.waiting.postMessage('skipWaiting');
            }
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          location.reload();
        }
      });
    })
    .catch((err) =>
      console.error('Erro ao registrar o Service Worker:', err)
    );
}

// 🍎 iOS (Safari) — Alerta único por sessão para instalação
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;

if (isIOS) {
  const jaMostrado = sessionStorage.getItem("ios-install-alert");

  if (!jaMostrado) {
    alert("Para instalar o app, toque no botão de compartilhar e escolha 'Adicionar à Tela de Início'.");
    sessionStorage.setItem("ios-install-alert", "true");
  }
}
