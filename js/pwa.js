// js/pwa.js
(() => {
  /* ───────────────────── Instalador Android ───────────────────── */
  let deferredPrompt = null;
  const installBtn   = document.getElementById('installButton');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();              // bloqueia banner nativo
    deferredPrompt = e;
    installBtn?.style?.setProperty('display', 'block');
    console.log('[PWA] beforeinstallprompt disparado');
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    installBtn.style.display = 'none';
    deferredPrompt.prompt();
    await deferredPrompt.userChoice; // espera usuário agir
    deferredPrompt = null;
  });

  /* ───────────────────── Registro do Service Worker ───────────── */
  if ('serviceWorker' in navigator) {
    registrarServiceWorker();
  }

  async function registrarServiceWorker() {
    try {
      const reg = await navigator.serviceWorker.register(
        '/service-worker.js',      // escopo raiz
        { updateViaCache: 'none' } // força busca fresh
      );
      console.log('[PWA] SW registrado em:', reg.scope);

      // Se já houver uma versão waiting (usuário reabriu o app)
      if (reg.waiting) {
        solicitarAtualizacao(reg);
      }

      // Quando SW novo é encontrado
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            solicitarAtualizacao(reg);
          }
        });
      });

      // Recarrega quando o novo SW assume controle
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err) {
      console.error('[PWA] Erro ao registrar SW:', err);
    }
  }

  function solicitarAtualizacao(reg) {
    if (
      window.confirm(
        'Uma nova versão do Adega Lounge está disponível. Atualizar agora?'
      )
    ) {
      reg.waiting?.postMessage('skipWaiting');
    }
  }

  /* ───────────────────── Banner iOS (instalação) ───────────────── */
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS && !sessionStorage.getItem('ios-install-alert')) {
    alert(
      "Para instalar o app, toque no botão de compartilhar e escolha 'Adicionar à Tela de Início'."
    );
    sessionStorage.setItem('ios-install-alert', 'true');
  }
})();
