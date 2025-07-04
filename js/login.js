import { auth, db } from './firebaseConfig.js';
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ---------- DOM ---------- */
const form = document.getElementById('login-form');
const msgErro = document.getElementById('msg-erro');

/* ---------- Sessão local ---------- */
await setPersistence(auth, browserLocalPersistence);

/* ---------- Submit ---------- */
if (form && msgErro) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgErro.style.display = 'none';

    const email = form.email.value.trim();
    const senha = form.senha.value.trim();
    if (!email || !senha) return exibirErro('Preencha todos os campos.');

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, senha);

      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (!snap.exists()) return exibirErro('Perfil de usuário não encontrado.');

      const tipo = snap.data().tipo;

      /* ---------- basePath dinâmico ---------- */
      const basePath = window.location.pathname.includes('/controle-de-vendas/')
        ? '/controle-de-vendas/'
        : '/';

      if (tipo === 'admin') {
        window.location.href = `${basePath}admin.html`;
      } else if (tipo === 'funcionario') {
        window.location.href = `${basePath}funcionario.html`;
      } else {
        exibirErro('Tipo de usuário inválido.');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      exibirErro(traduzErro(err.code));
    }
  });
}

/* ---------- utilidades ---------- */
function exibirErro(msg) {
  msgErro.textContent = msg;
  msgErro.style.display = 'block';
}

function traduzErro(codigo) {
  switch (codigo) {
    case 'auth/invalid-email':
      return 'E‑mail inválido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E‑mail ou senha incorretos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde.';
    default:
      return 'Erro ao fazer login.';
  }
}
