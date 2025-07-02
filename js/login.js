// js/login.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔐 Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR3Q0HR9CPANGR8aIiGOn-5NP66e7CmcI",
  authDomain: "adega-lounge.firebaseapp.com",
  projectId: "adega-lounge",
  storageBucket: "adega-lounge.appspot.com",
  messagingSenderId: "729628267147",
  appId: "1:729628267147:web:dfee9147983c57fe3f3a8e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("login-form");
const msgErro = document.getElementById("msg-erro");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgErro.style.display = "none";

  const email = form.email.value.trim();
  const senha = form.senha.value.trim();

  if (!email || !senha) {
    msgErro.textContent = "Preencha todos os campos.";
    msgErro.style.display = "block";
    return;
  }

  try {
    const credenciais = await signInWithEmailAndPassword(auth, email, senha);
    const user = credenciais.user;

    // 🔎 Buscar tipo do usuário no Firestore
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      msgErro.textContent = "Perfil de usuário não encontrado.";
      msgErro.style.display = "block";
      return;
    }

    const tipo = docSnap.data().tipo;

    // 🔁 Redirecionamento com base no tipo
    if (tipo === "admin") {
      window.location.href = "admin.html";
    } else if (tipo === "funcionario") {
      window.location.href = "funcionario.html";
    } else {
      msgErro.textContent = "Tipo de usuário inválido.";
      msgErro.style.display = "block";
    }

  } catch (error) {
    console.error("Erro no login:", error);
    msgErro.textContent = "Erro: " + traduzErro(error.code);
    msgErro.style.display = "block";
  }
});

// 🎯 Traduz erros comuns do Firebase
function traduzErro(codigo) {
  switch (codigo) {
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-mail ou senha incorretos.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente mais tarde.";
    default:
      return "Erro ao fazer login.";
  }
}
