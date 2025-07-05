// vendas.js atualizado para múltiplos itens

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

const itensContainer = document.getElementById("itens-container");
const addItemBtn = document.getElementById("add-item-btn");
const valorTotalSpan = document.getElementById("valor-total");
const formVenda = document.getElementById("form-venda");

const produtosMap = new Map();

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
  try {
    const snapshot = await getDocs(collection(db, "estoque"));
    produtosMap.clear();

    snapshot.forEach(docSnap => {
      const produto = docSnap.data();
      produtosMap.set(docSnap.id, { ...produto, id: docSnap.id });
    });

    atualizarSelects();
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
  }
}

function atualizarSelects() {
  const selects = document.querySelectorAll("select");
  selects.forEach(select => {
    const valorAnterior = select.value;
    select.innerHTML = '<option value="">Selecione o produto</option>';
    produtosMap.forEach((produto, id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${produto.nome} (Qtd: ${produto.quantidade})`;
      select.appendChild(option);
    });
    select.value = valorAnterior;
  });
  calcularTotais();
}

addItemBtn.addEventListener("click", () => {
  const novaLinha = document.createElement("div");
  novaLinha.classList.add("item-linha");
  novaLinha.innerHTML = `
    <select required>
      <option value="">Selecione o produto</option>
    </select>
    <input type="number" class="quantidade-input" placeholder="Qtd" min="1" required />
    <span class="subtotal-label">R$ 0,00</span>
    <button type="button" class="remover-item-btn">×</button>
  `;
  itensContainer.appendChild(novaLinha);
  atualizarSelects();
});

itensContainer.addEventListener("input", calcularTotais);
itensContainer.addEventListener("change", calcularTotais);
itensContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("remover-item-btn")) {
    e.target.parentElement.remove();
    calcularTotais();
  }
});

function calcularTotais() {
  const linhas = document.querySelectorAll(".item-linha");
  let total = 0;

  linhas.forEach(linha => {
    const select = linha.querySelector("select");
    const quantidadeInput = linha.querySelector(".quantidade-input");
    const subtotalLabel = linha.querySelector(".subtotal-label");

    const id = select.value;
    const qtd = parseInt(quantidadeInput.value);
    const produto = produtosMap.get(id);

    if (id && produto && qtd > 0) {
      const subtotal = qtd * produto.preco;
      subtotalLabel.textContent = `R$ ${subtotal.toFixed(2)}`;
      total += subtotal;
    } else {
      subtotalLabel.textContent = "R$ 0,00";
    }
  });

  valorTotalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

formVenda.addEventListener("submit", async (e) => {
  e.preventDefault();
  const linhas = document.querySelectorAll(".item-linha");
  let vendas = [];

  linhas.forEach(linha => {
    const select = linha.querySelector("select");
    const quantidadeInput = linha.querySelector(".quantidade-input");

    const id = select.value;
    const qtd = parseInt(quantidadeInput.value);
    const produto = produtosMap.get(id);

    if (id && produto && qtd > 0) {
      vendas.push({ id, nome: produto.nome, preco: produto.preco, quantidade: qtd });
    }
  });

  if (!vendas.length) return alert("Adicione produtos válidos.");

  try {
    for (const venda of vendas) {
      await addDoc(collection(db, "vendas"), {
        produto: venda.nome,
        quantidade: venda.quantidade,
        subtotal: venda.quantidade * venda.preco,
        criadoEm: serverTimestamp()
      });

      const ref = doc(db, "estoque", venda.id);
      const estoqueAtual = produtosMap.get(venda.id)?.quantidade || 0;
      await updateDoc(ref, {
        quantidade: estoqueAtual - venda.quantidade
      });
    }

    alert("Venda registrada com sucesso!");
    itensContainer.innerHTML = "";
    addItemBtn.click();
    carregarProdutos();
  } catch (err) {
    console.error("Erro ao registrar venda:", err);
    alert("Erro ao registrar venda.");
  }
});
