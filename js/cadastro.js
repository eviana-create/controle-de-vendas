import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const CODIGOS_AUTORIZACAO = {
  admin: "ADMIN2025",
  funcionario: "FUNC2025"
};

const form = document.getElementById('form-cadastro');
const msgErro = document.getElementById('msg-erro');
const msgSucesso = document.getElementById('msg-sucesso');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msgErro.style.display = 'none';
  msgSucesso.style.display = 'none';

  const email = form.email.value.trim();
  const senha = form.senha.value.trim();
  const tipo = form.tipo.value;
  const codigo = form.codigo.value.trim();

  if (!email || !senha || !tipo || !codigo) {
    msgErro.textContent = 'Preencha todos os campos.';
    msgErro.style.display = 'block';
    return;
  }

  if (codigo !== CODIGOS_AUTORIZACAO[tipo]) {
    msgErro.textContent = 'Código de autorização inválido.';
    msgErro.style.display = 'block';
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Salvar perfil no Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      email: email,
      tipo: tipo,
      criadoEm: new Date()
    });

    msgSucesso.textContent = 'Funcionário cadastrado com sucesso! Voltando ao painel.';
    msgSucesso.style.display = 'block';

    setTimeout(() => {
      window.location.href = 'admin.html'; // ou o caminho correto do painel admin
    }, 3000);


  } catch (error) {
    msgErro.textContent = error.message;
    msgErro.style.display = 'block';
  }
});
