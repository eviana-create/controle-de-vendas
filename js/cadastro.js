import { db, auth } from './js/firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const nomeInput = document.getElementById('nome');
const quantidadeInput = document.getElementById('quantidade');
const precoInput = document.getElementById('preco');
const btnAdicionar = document.getElementById('btnAdicionar');

let usuarioLogado = null;

// Monitorar se tem usuário logado
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Usuário logado:", user.email);
    usuarioLogado = user;
  } else {
    console.log("Usuário não logado");
    usuarioLogado = null;
    alert("Você precisa estar logado para acessar esta página.");
    window.location.href = 'login.html';
  }
});

btnAdicionar.addEventListener('click', async () => {
  if (!usuarioLogado) {
    alert("Você precisa estar logado para adicionar produtos.");
    return;
  }

  const nome = nomeInput.value.trim();
  const quantidade = parseInt(quantidadeInput.value);
  const preco = parseFloat(precoInput.value);

  if (!nome || isNaN(quantidade) || isNaN(preco)) {
    alert('Preencha todos os campos corretamente.');
    return;
  }

  try {
    await addDoc(collection(db, "produtos"), {
      nome,
      quantidade,
      preco,
      criadoPor: usuarioLogado.uid,
      criadoEm: new Date()
    });
    console.log("Produto cadastrado com sucesso:", nome);

    nomeInput.value = '';
    quantidadeInput.value = '';
    precoInput.value = '';

  } catch (error) {
    console.error("Erro ao salvar produto:", error);
    alert("Erro ao salvar produto: " + error.message);
  }
});
