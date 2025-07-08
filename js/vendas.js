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
  updateDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const produtoSelect = document.getElementById("produto-select");
const quantidadeInput = document.querySelector(".quantidade-input");
const btnAdicionar = document.getElementById("add-item-btn");
const listaVendas = document.getElementById("itens-container");
const totalSpan = document.getElementById("valor-total");
const btnRegistrar = document.querySelector("#form-venda button[type='submit']");
const totalDiaSpan = document.getElementById("total-dia");
const btnFinalizar = document.getElementById("finalizar-expediente");

const produtosMap = new Map();
let vendas = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  const snap = await getDoc(doc(db, "usuarios", user.uid));
  const perfil = snap.exists() ? snap.data().tipo : null;

  if (!["admin", "funcionario"].includes(perfil)) {
    alert("Acesso restrito.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  await carregarProdutos();
  await carregarLucroDoDia();
});

async function carregarProdutos() {
  produtoSelect.disabled = true;
  produtoSelect.innerHTML = `<option>Carregando...</option>`;
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
  if (!id || isNaN(qtd) || qtd <= 0) {
    alert("Preencha o produto e uma quantidade válida.");
    return;
  }

  const produto = produtosMap.get(id);
  if (!produto) return;

  const linha = document.createElement("div");
  linha.className = "item-linha";

  linha.innerHTML = `
    <select disabled>
      <option>${produto.nome}</option>
    </select>
    <input type="number" value="${qtd}" min="1" disabled />
    <span class="subtotal-label">R$ ${(produto.preco * qtd).toFixed(2)}</span>
    <button type="button" class="remover-item-btn">×</button>
  `;

  linha.querySelector(".remover-item-btn").onclick = () => {
    linha.remove();
    atualizarTotal();
  };

  linha.dataset.id = id;
  linha.dataset.qtd = qtd;
  linha.dataset.subtotal = produto.preco * qtd;

  listaVendas.appendChild(linha);
  atualizarTotal();

  produtoSelect.value = "";
  quantidadeInput.value = "";
});

function atualizarTotal() {
  const linhas = listaVendas.querySelectorAll(".item-linha");
  let total = 0;
  vendas = [];

  linhas.forEach(linha => {
    const id = linha.dataset.id;
    const qtd = parseInt(linha.dataset.qtd);
    const subtotal = parseFloat(linha.dataset.subtotal);
    const produto = produtosMap.get(id);

    if (produto && !isNaN(qtd) && !isNaN(subtotal)) {
      total += subtotal;
      vendas.push({ id, nome: produto.nome, quantidade: qtd, subtotal });

      // Atualiza visual do subtotal
      const subtotalSpan = linha.querySelector(".subtotal-label");
      if (subtotalSpan) {
        subtotalSpan.textContent = `R$ ${subtotal.toFixed(2)}`;
      }
    }
  });

  totalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

btnRegistrar.addEventListener("click", async (e) => {
  e.preventDefault();
  if (!vendas.length) {
    alert("Adicione ao menos um item.");
    return;
  }

  try {
    for (const venda of vendas) {
      await addDoc(collection(db, "vendas"), {
        produto: venda.nome,
        quantidade: venda.quantidade,
        subtotal: venda.subtotal,
        criadoEm: serverTimestamp(),
        usuario: auth.currentUser.uid
      });

      // Atualiza estoque
      const ref = doc(db, "estoque", venda.id);
      const produtoAtual = produtosMap.get(venda.id);
      if (produtoAtual) {
        const novaQtd = produtoAtual.quantidade - venda.quantidade;
        await updateDoc(ref, { quantidade: novaQtd });
      }
    }

    alert("Venda registrada com sucesso.");
    vendas = [];
    listaVendas.innerHTML = "";
    atualizarTotal();
    await carregarProdutos();
    await carregarLucroDoDia();
  } catch (err) {
    console.error("Erro ao registrar venda:", err);
    alert("Erro ao registrar venda.");
  }
});

async function carregarLucroDoDia() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, "vendas"),
    where("criadoEm", ">=", hoje)
  );

  let total = 0;
  try {
    const snap = await getDocs(q);
    snap.forEach(doc => {
      const venda = doc.data();
      total += venda.subtotal || 0;
    });
    totalDiaSpan.textContent = `R$ ${total.toFixed(2)}`;
  } catch (err) {
    console.error("Erro ao calcular lucro do dia:", err);
  }
}

btnFinalizar.addEventListener("click", async () => {
  if (!confirm("Deseja realmente finalizar o expediente?")) return;

  const valor = totalDiaSpan.textContent.replace("R$", "").trim();
  try {
    await addDoc(collection(db, "expedientes"), {
      data: new Date(),
      total: parseFloat(valor),
      usuario: auth.currentUser.uid
    });
    alert("Expediente finalizado!");
    totalDiaSpan.textContent = "R$ 0,00";
  } catch (err) {
    console.error("Erro ao finalizar expediente:", err);
    alert("Erro ao finalizar expediente.");
  }
});
