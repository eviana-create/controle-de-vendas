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
<<<<<<< HEAD
  // Carrega nomes de clientes que já têm crédito
async function carregarClientesFiado() {
  const clientesSet = new Set();
  try {
    const snap = await getDocs(collection(db, "creditos"));
    snap.forEach(doc => {
      const { cliente } = doc.data();
      if (cliente) clientesSet.add(cliente);
    });

    const clienteSelect = document.getElementById("fiado-cliente");
    clientesSet.forEach(nome => {
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = nome;
      clienteSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Erro ao carregar clientes fiado:", err);
  }
}

// Carrega produtos para o modal de fiado
function carregarProdutosFiado() {
  const produtoSelect = document.getElementById("fiado-produto");
  produtoSelect.innerHTML = `<option value="">Selecione o produto</option>`;
  produtosMap.forEach(produto => {
    const option = document.createElement("option");
    option.value = produto.nome;
    option.textContent = `${produto.nome} (R$ ${produto.preco})`;
    produtoSelect.appendChild(option);
  });
}

=======
>>>>>>> 9a32f2c (WIP: ajustes em vendas.js e service-worker.js)

  await carregarProdutos();
  await carregarLucroDoDia();
  await carregarClientesFiado();
  carregarProdutosFiado();
<<<<<<< HEAD

});

async function carregarProdutos() {
  produtoSelect.disabled = true;
  produtoSelect.innerHTML = `<option>Carregando...</option>`;
  produtosMap.clear();

  try {
=======
});

async function carregarProdutos() {
  try {
    produtoSelect.disabled = true;
    produtoSelect.innerHTML = `<option value="">Carregando...</option>`;
    produtosMap.clear();

>>>>>>> 9a32f2c (WIP: ajustes em vendas.js e service-worker.js)
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

<<<<<<< HEAD
  const linha = document.createElement("div");
  linha.className = "item-linha";
=======
  const subtotal = produto.preco * qtd;

  const linha = document.createElement("div");
  linha.className = "item-linha";
  linha.dataset.id = id;
  linha.dataset.qtd = qtd;
  linha.dataset.subtotal = subtotal;
>>>>>>> 9a32f2c (WIP: ajustes em vendas.js e service-worker.js)

  linha.innerHTML = `
    <select disabled>
      <option>${produto.nome}</option>
    </select>
    <input type="number" value="${qtd}" min="1" disabled />
<<<<<<< HEAD
    <span class="subtotal-label">R$ ${(produto.preco * qtd).toFixed(2)}</span>
=======
    <span class="subtotal-label">R$ ${subtotal.toFixed(2)}</span>
>>>>>>> 9a32f2c (WIP: ajustes em vendas.js e service-worker.js)
    <button type="button" class="remover-item-btn">×</button>
  `;

  linha.querySelector(".remover-item-btn").onclick = () => {
    linha.remove();
    atualizarTotal();
  };

<<<<<<< HEAD
  linha.dataset.id = id;
  linha.dataset.qtd = qtd;
  linha.dataset.subtotal = produto.preco * qtd;

=======
>>>>>>> 9a32f2c (WIP: ajustes em vendas.js e service-worker.js)
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

<<<<<<< HEAD
      // Atualiza visual do subtotal
=======
>>>>>>> 9a32f2c (WIP: ajustes em vendas.js e service-worker.js)
      const subtotalSpan = linha.querySelector(".subtotal-label");
      if (subtotalSpan) {
        subtotalSpan.textContent = `R$ ${subtotal.toFixed(2)}`;
      }
    }
  });

  totalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

<<<<<<< HEAD
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

=======
>>>>>>> 9a32f2c (WIP: ajustes em vendas.js e service-worker.js)
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

<<<<<<< HEAD
=======
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

>>>>>>> 9a32f2c (WIP: ajustes em vendas.js e service-worker.js)
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
<<<<<<< HEAD
// Controles do Modal Crédito / Fiado
const modalFiado = document.getElementById("modal-fiado");
const btnFiado = document.getElementById("btn-fiado");
const btnSalvarFiado = document.getElementById("btn-salvar-fiado");
const btnCancelarFiado = document.getElementById("btn-cancelar-fiado");

btnFiado.addEventListener("click", () => {
  modalFiado.style.display = "flex";
});

btnCancelarFiado.addEventListener("click", () => {
  modalFiado.style.display = "none";
  limparModalFiado();
});

btnSalvarFiado.addEventListener("click", async () => {
  const cliente = document.getElementById("fiado-cliente").value.trim();
  const produto = document.getElementById("fiado-produto").value.trim();
  const valor = parseFloat(document.getElementById("fiado-valor").value);

  if (!cliente) {
    alert("Informe o nome ou apelido do cliente.");
    return;
  }
  if (!produto) {
    alert("Informe o produto.");
    return;
  }
  if (isNaN(valor) || valor <= 0) {
    alert("Informe um valor válido maior que zero.");
    return;
  }

  try {
    await addDoc(collection(db, "creditos"), {
      cliente,
      produto,
      valor,
      criadoEm: serverTimestamp(),
      usuario: auth.currentUser.uid
    });
    alert("Crédito salvo com sucesso!");
    modalFiado.style.display = "none";
    limparModalFiado();
  } catch (error) {
    console.error("Erro ao salvar crédito:", error);
    alert("Erro ao salvar crédito. Tente novamente.");
  }
});

function limparModalFiado() {
  document.getElementById("fiado-cliente").value = "";
  document.getElementById("fiado-produto").value = "";
  document.getElementById("fiado-valor").value = "";
}
=======
>>>>>>> 9a32f2c (WIP: ajustes em vendas.js e service-worker.js)
