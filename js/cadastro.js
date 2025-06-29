import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔧 Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR3Q0HR9CPANGR8aIiGOn-5NP66e7CmcI",
  authDomain: "adega-lounge.firebaseapp.com",
  projectId: "adega-lounge",
  storageBucket: "adega-lounge.appspot.com", // corrigido
  messagingSenderId: "729628267147",
  appId: "1:729628267147:web:dfee9147983c57fe3f3a8e"
};

// 🔌 Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🛡️ Códigos por tipo
const CODIGOS_AUTORIZACAO = {
  admin: "ADMIN2025",
  funcionario: "FUNC2025"
};

// 🎯 Seleciona elementos do formulário
const form = document.getElementById('form-cadastro');
const msgErro = document.getElementById('msg-erro');
const msgSucesso = document.getElementById('msg-sucesso');

// 📥 Evento de envio do formulário
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msgErro.style.display = 'none';
  msgSucesso.style.display = 'none';

  // 🧾 Captura dados do formulário
  const nome = form.nome?.value.trim(); // novo campo de nome
  const email = form.email.value.trim();
  const senha = form.senha.value.trim();
  const tipo = form.tipo.value;
  const codigo = form.codigo.value.trim();

  // ✅ Validação simples
  if (!nome || !email || !senha || !tipo || !codigo) {
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
    // 👤 Criação do usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // 🗃️ Registro no Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      nome: nome,
      email: email,
      tipo: tipo,
      criadoEm: serverTimestamp()
    });

    msgSucesso.textContent = `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} cadastrado com sucesso! Redirecionando...`;
    msgSucesso.style.display = 'block';

    setTimeout(() => {
  if (tipo === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'funcionario.html';
  }
}, 3000);

  } catch (error) {
    msgErro.textContent = "Erro ao cadastrar: " + error.message;
    msgErro.style.display = 'block';
  }
});
