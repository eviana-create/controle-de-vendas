// cadastroUsuario.js
import { auth, db, firebaseConfig } from './firebaseConfig.js';

import {
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

import {
  doc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// Instância secundária para criação de usuários
const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
const secondaryAuth = getAuth(secondaryApp);
await setPersistence(secondaryAuth, browserLocalPersistence); // evita warning

const form = document.getElementById('form-cadastro');
const msgErro = document.getElementById('msg-erro');
const msgSucesso = document.getElementById('msg-sucesso');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Limpa mensagens
  msgErro.style.display = 'none';
  msgSucesso.style.display = 'none';

  // Pega dados do formulário
  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  const tipo = document.getElementById('tipo').value;
  const codigo = document.getElementById('codigo').value.trim();

  // Validação simples do código de autorização (exemplo)
  const CODIGO_AUTORIZACAO = '12345';
  if (codigo !== CODIGO_AUTORIZACAO) {
    exibirErro('Código de autorização inválido.');
    return;
  }

  try {
    // Cria usuário com a instância secundária
    const { user } = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      senha
    );

    // Salva dados adicionais no Firestore
    await setDoc(doc(db, 'usuarios', user.uid), { nome, tipo });

    // Desloga a instância secundária para não conflitar
    await secondaryAuth.signOut();

    msgSucesso.textContent = 'Usuário criado com sucesso!';
    msgSucesso.style.display = 'block';
    form.reset();
  } catch (err) {
    exibirErro(traduzErro(err.code));
  }
});

function exibirErro(texto) {
  msgErro.textContent = texto;
  msgErro.style.display = 'block';
}

// Tradução simples dos erros Firebase
function traduzErro(codigo) {
  switch (codigo) {
    case 'auth/email-already-in-use':
      return 'Este email já está em uso.';
    case 'auth/invalid-email':
      return 'Email inválido.';
    case 'auth/weak-password':
      return 'Senha fraca. Use ao menos 6 caracteres.';
    default:
      return 'Erro: ' + codigo;
  }
}
