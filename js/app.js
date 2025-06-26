import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Config Firebase - substitua com sua config
const firebaseConfig = {
  apiKey: "AIzaSyCR3Q0HR9CPANGR8aIiGOn-5NP66e7CmcI",
  authDomain: "adega-lounge.firebaseapp.com",
  projectId: "adega-lounge",
  storageBucket: "adega-lounge.firebasestorage.app",
  messagingSenderId: "729628267147",
  appId: "1:729628267147:web:dfee9147983c57fe3f3a8e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Código de autorização para admin
const CODIGO_AUTORIZACAO_ADMIN = "ADEGA2024";

// Formulários
const loginForm = document.getElementById('login-form');
const cadastroForm = document.getElementById('cadastro-form');

const mensagemErro = document.getElementById('mensagem-erro');
const mensagemCadastro = document.getElementById('mensagem-cadastro');
const mensagemErroCadastro = document.getElementById('mensagem-erro-cadastro');

// Login
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensagemErro.style.display = 'none';

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value.trim();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Busca o tipo do usuário no Firestore
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    let tipoUsuario = "usuario";
    if (docSnap.exists()) {
      tipoUsuario = docSnap.data().tipo || "usuario";
    }

    // Salva dados na sessão local (sessionStorage) para controle no app
    sessionStorage.setItem("uid", user.uid);
    sessionStorage.setItem("tipoUsuario", tipoUsuario);
    sessionStorage.setItem("email", email);

    window.location.href = "../pages/index.html";
  } catch (error) {
    mensagemErro.textContent = error.message;
    mensagemErro.style.display = 'block';
  }
});

// Cadastro
cadastroForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensagemErroCadastro.textContent = "";
  mensagemCadastro.textContent = "";

  const email = document.getElementById('email-cadastro').value.trim();
  const senha = document.getElementById('senha-cadastro').value.trim();
  const codigoAutorizacao = document.getElementById('codigo-autorizacao').value.trim();

  if (senha.length < 6) {
    mensagemErroCadastro.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }

  let tipoUsuario = "usuario";
  if (codigoAutorizacao === CODIGO_AUTORIZACAO_ADMIN) {
    tipoUsuario = "admin";
  } else if (codigoAutorizacao) {
    mensagemErroCadastro.textContent = "Código de autorização inválido.";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Salva tipo usuário no Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      email,
      tipo: tipoUsuario,
      criadoEm: new Date()
    });

    mensagemCadastro.textContent = "Usuário cadastrado com sucesso! Você já pode fazer login.";
    cadastroForm.reset();
  } catch (error) {
    mensagemErroCadastro.textContent = error.message;
  }
});

// Monitorar estado da autenticação (caso o usuário já esteja logado)
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Já está logado, redirecionar para index
    window.location.href = "../pages/index.html";
  }
});
