// js/cadastroUsuario.js
import { auth, db } from './firebaseConfig.js';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Elementos do formulário
const formCadastro = document.getElementById("form-cadastro");
const msgErro = document.getElementById("msg-erro");
const msgSucesso = document.getElementById("msg-sucesso");

let usuarioLogado = null;

// Verifica se o usuário logado é administrador
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  usuarioLogado = user;

  const docRef = doc(db, "usuarios", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists() || docSnap.data().tipo !== "admin") {
    alert("Acesso permitido apenas para administradores.");
    await signOut(auth);
    window.location.href = "login.html";
  }
});

// Cadastrar novo usuário
formCadastro.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const tipo = document.getElementById("tipo").value;
  const codigo = document.getElementById("codigo").value.trim();

  msgErro.style.display = "none";
  msgSucesso.style.display = "none";

  if (!nome || !email || !senha || !tipo) {
    msgErro.textContent = "Preencha todos os campos obrigatórios.";
    msgErro.style.display = "block";
    return;
  }

  if (tipo === "admin" && codigo !== "ADMIN2025") {
    msgErro.textContent = "Código de autorização inválido para administrador.";
    msgErro.style.display = "block";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    const uid = cred.user.uid;

    await setDoc(doc(db, "usuarios", uid), {
      nome,
      email,
      tipo,
      criadoEm: serverTimestamp()
    });

    msgSucesso.textContent = "Usuário cadastrado com sucesso!";
    msgSucesso.style.display = "block";
    formCadastro.reset();

  } catch (error) {
    msgErro.textContent = "Erro ao cadastrar: " + error.message;
    msgErro.style.display = "block";
  }
});
