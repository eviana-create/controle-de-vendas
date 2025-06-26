import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔧 Config Firebase
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

  const email = form.email.value.trim();
  const senha = form.senha.value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // 🔍 Verifica tipo do usuário no Firestore
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      msgErro.textContent = "Perfil de usuário não encontrado.";
      msgErro.style.display = "block";
      return;
    }

    const tipo = docSnap.data().tipo;

    // 🚀 Redireciona conforme o tipo
    if (tipo === "admin") {
      window.location.href = "admin.html";
    } else if (tipo === "funcionario") {
      window.location.href = "funcionario.html";
    } else {
      msgErro.textContent = "Tipo de usuário inválido.";
      msgErro.style.display = "block";
    }

  } catch (error) {
    console.error("Erro ao logar:", error);
    msgErro.textContent = "Email ou senha incorretos.";
    msgErro.style.display = "block";
  }
});
