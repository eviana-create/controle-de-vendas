import { auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  orderBy,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- Variáveis globais ---------- */
let tipoUsuario = null;
const produtoSelect = document.getElementById("produto-select");
const form = document.getElementById("form-venda");
const tbody = document.querySelector("#tabela-vendas tbody");
const totalDiaEl = document.getElementById("total-dia");
const produtosMap = new Map();

/* ---------- Inicialização ---------- */
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Pega tipo do usuário
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    tipoUsuario = snap.exists() ? snap.data().tipo : null;

    // Oculta links de admin para funcionário
    if (tipoUsuario !== "admin") {
      document.querySelectorAll('a[href="admin.html"], a[href="historico.html"]').forEach(el => {
        el.style.display = "none";
      });
    }

    await carregarProdutos();

    // Força atualização do select só no Android (não afeta Windows/iOS)
    if (/android/i.test(navigator.userAgent)) {
      forcarAtualizacaoSelectAndroid();
    }

    await carregarVendas();
  });

  form.addEventListener("submit", registrarVenda);
});

/* ---------- Funções ---------- */

async function carregarProdutos() {
  produtoSelect.disabled = true;
  produtoSelect.innerHTML = `<option>Carregando produtos...</option>`;
  produtosMap.clear();

  try {
    const produtosSnapshot = await getDocs(collection(db, "estoque"));
    produtoSelect.disabled = false;
    produtoSelect.innerHTML = `<option value="">Selecione o produto</option>`;

    produtosSnapshot.forEach(docSnap => {
      const produto = docSnap.data();
      produtosMap.set(docSnap.id, { ...produto, id: docSnap.id });

      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = `${produto.nome} (Qtd: ${produto.quantidade})`;
      produtoSelect.appendChild(option);
    });

  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    produtoSelect.innerHTML = `<option value="">Erro ao carregar produtos</option>`;
  }
}

function forcarAtualizacaoSelectAndroid() {
  // Clona e substitui o select para forçar atualização em Android
  const clone = produtoSelect.cloneNode(true);
  produtoSelect.parentNode.replaceChild(clone, produtoSelect);
}

async function registrarVenda(event) {
  event.preventDefault();

  const produtoId = produtoSelect.value;
  const quantidadeVendida = parseInt(document.getElementById("quantidade-venda").value);

  if (!produtoId || isNaN(quantidadeVendida) || quantidadeVendida <= 0) {
    alert("Preencha corretamente os campos.");
    return;
  }

  const produto = produtosMap.get(produtoId);

  if (!produto) {
    alert("Produto não encontrado.");
    return;
  }

  if (produto.quantidade < quantidadeVendida) {
    alert("Quantidade em estoque insuficiente.");
    return;
  }

  const subtotal = quantidadeVendida * produto.preco;

  try {
    // Salva venda no Firestore
    await addDoc(collection(db, "vendas"), {
      produto: produto.nome,
      produtoId,
      quantidade: quantidadeVendida,
      subtotal,
      criadoEm: serverTimestamp()
    });

    // Atualiza estoque
    const novoEstoque = produto.quantidade - quantidadeVendida;
    await updateDoc(doc(db, "estoque", produtoId), {
      quantidade: novoEstoque
    });

    form.reset();
    await carregarProdutos();
    await carregarVendas();

  } catch (error) {
    console.error("Erro ao registrar venda:", error);
    alert("Erro ao registrar venda.");
  }
}

async function carregarVendas() {
  tb
