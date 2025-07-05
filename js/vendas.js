// js/vendas.js

import { auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const produtoSelect = document.getElementById("produto-select");
const quantidadeInput = document.querySelector(".quantidade-input");
const btnAdicionar = document.getElementById("add-item-btn");
const listaVendas = document.getElementById("itens-container");
const totalSpan = document.getElementById("valor-total");
const btnRegistrar = document.querySelector("form#form-venda button[type='submit']");

const produtosMap = new Map();
let vendas = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");
  const snap = await getDoc(doc(db, "usuarios", user.uid));
  const perfil = snap.exists() ? snap.data().tipo : null;
  if (!['admin', 'funcionario'].includes(perfil)) {
    alert("Acesso restrito.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }
  carregarProdutos();
});

async function carregarProdutos() {
  if (!produtoSelect) return;
  produtoSelect.disabled = true;
  produtoSelect.innerHTML = `<option>Carregando produtos...</option>`;
  produtosMap.clear();

  try {
    const snapshot = await getDocs(collection(db, "estoque"));
    produtoSelect.disabled = false;
    produtoSelect.innerHTML = `<option value="">Selecione o produto</option>`;

    snapshot.forEach(docSnap => {
      const produto = docSnap.data();
      produtosMap.set(docSnap.id, { ...produto, id: docSnap.id });

      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = `${produto.nome} (Qtd: ${produto.quantidade})`;
      produtoSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
    produtoSelect.innerHTML = `<option value="">Erro ao carregar</option>`;
  }
}

btnAdicionar.addEventListener("click", () => {
  const id = produtoSelect.value;
  const qtd = parseInt(quantidadeInput.value);
  if (!id || !qtd || qtd <= 0) {
    alert("Selecione um produto e insira uma quantidade válida.");
    return;
  }

  const produto = produtosMap.get(id);
  if (!produto) return;

  const existente = vendas.find(v => v.id === id);
  if (existente) {
    existente.quantidade += qtd;
    existente.subtotal = existente.quantidade * produto.preco;
  } else {
    vendas.push({
      id,
      produto: produto.nome,
      quantidade: qtd,
      preco: produto.preco,
      subtotal: qtd * produto.preco
    });
  }

  atualizarLista();
});

function atualizarLista() {
  const itens = listaVendas.querySelectorAll(".item-linha");
  let total = 0;

  itens.forEach((linha, index) => {
    const select = linha.querySelector("select");
    const qtdInput = linha.querySelector(".quantidade-input");
    const subtotalLabel = linha.querySelector(".subtotal-label");

    const id = select.value;
    const qtd = parseInt(qtdInput.value);
    const produto = produtosMap.get(id);

    if (produto && qtd > 0) {
      const subtotal = qtd * produto.preco;
      subtotalLabel.textContent = `R$ ${subtotal.toFixed(2)}`;
      total += subtotal;
    } else {
      subtotalLabel.textContent = "R$ 0,00";
    }
  });

  totalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

listaVendas.addEventListener("input", atualizarLista);

btnRegistrar.addEventListener("click", async (e) => {
  e.preventDefault();
  const itens = listaVendas.querySelectorAll(".item-linha");
  const vendasParaRegistrar = [];

  for (const linha of itens) {
    const select = linha.querySelector("select");
    const qtdInput = linha.querySelector(".quantidade-input");
    const id = select.value;
    const qtd = parseInt(qtdInput.value);
    const produto = produtosMap.get(id);

    if (produto && qtd > 0) {
      vendasParaRegistrar.push({
        id,
        nome: produto.nome,
        quantidade: qtd,
        subtotal: qtd * produto.preco
      });
    }
  }

  if (!vendasParaRegistrar.length) {
    alert("Adicione pelo menos um produto com quantidade válida.");
    return;
  }

  try {
    for (const venda of vendasParaRegistrar) {
      await addDoc(collection(db, "vendas"), {
        produto: venda.nome,
        quantidade: venda.quantidade,
        subtotal: venda.subtotal,
        criadoEm: serverTimestamp()
      });

      const ref = doc(db, "estoque", venda.id);
      const estoqueAtual = produtosMap.get(venda.id)?.quantidade || 0;
      await updateDoc(ref, {
        quantidade: estoqueAtual - venda.quantidade
      });
    }

    alert("Venda registrada com sucesso!");
    window.location.reload();
  } catch (err) {
    console.error("Erro ao registrar venda:", err);
    alert("Erro ao registrar venda.");
  }
});
