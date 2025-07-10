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

// Modal Crédito / Fiado elements
const modalFiado = document.getElementById("modal-fiado");
const btnFiado = document.getElementById("btn-fiado");
const btnCancelarFiado = document.getElementById("btn-cancelar-fiado");
const btnSalvarFiado = document.getElementById("btn-salvar-fiado");

const produtoSelectFiado = document.getElementById("fiado-produto");
const quantidadeInputFiado = document.getElementById("fiado-quantidade");
const btnAdicionarFiado = document.getElementById("fiado-add-item-btn");
const listaItensFiado = document.getElementById("fiado-itens-lista");
const subtotalFiadoSpan = document.getElementById("fiado-subtotal");

const produtosMap = new Map();
let vendas = [];
let fiadoItens = [];

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
  carregarProdutosFiado();
  await carregarLucroDoDia();
  await carregarClientesFiado();
});

async function carregarProdutos() {
  try {
    produtoSelect.disabled = true;
    produtoSelect.innerHTML = `<option value="">Carregando...</option>`;
    produtosMap.clear();

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

function carregarProdutosFiado() {
  if (!produtoSelectFiado) return;
  produtoSelectFiado.innerHTML = `<option value="">Selecione o produto</option>`;
  produtosMap.forEach(produto => {
    const option = document.createElement("option");
    option.value = produto.nome;
    option.textContent = `${produto.nome} (R$ ${produto.preco.toFixed(2)})`;
    produtoSelectFiado.appendChild(option);
  });
}

async function carregarClientesFiado() {
  try {
    const clientesSet = new Set();
    const snap = await getDocs(collection(db, "creditos"));
    snap.forEach(doc => {
      const { cliente } = doc.data();
      if (cliente) clientesSet.add(cliente);
    });

    const clienteSelect = document.getElementById("fiado-cliente");
    if (!clienteSelect) return;
    clienteSelect.innerHTML = `<option value="">Selecione o cliente</option>`;
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

// Adicionar item na venda normal
btnAdicionar.addEventListener("click", () => {
  const id = produtoSelect.value;
  const qtd = parseInt(quantidadeInput.value);
  if (!id || isNaN(qtd) || qtd <= 0) {
    alert("Preencha o produto e uma quantidade válida.");
    return;
  }

  const produto = produtosMap.get(id);
  if (!produto) return;

  const subtotal = produto.preco * qtd;

  const linha = document.createElement("div");
  linha.className = "item-linha";
  linha.dataset.id = id;
  linha.dataset.qtd = qtd;
  linha.dataset.subtotal = subtotal;

  linha.innerHTML = `
    <select disabled>
      <option>${produto.nome}</option>
    </select>
    <input type="number" value="${qtd}" min="1" disabled />
    <span class="subtotal-label">R$ ${subtotal.toFixed(2)}</span>
    <button type="button" class="remover-item-btn">×</button>
  `;

  linha.querySelector(".remover-item-btn").onclick = () => {
    linha.remove();
    atualizarTotal();
  };

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

      const subtotalSpan = linha.querySelector(".subtotal-label");
      if (subtotalSpan) {
        subtotalSpan.textContent = `R$ ${subtotal.toFixed(2)}`;
      }
    }
  });

  totalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

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
    carregarProdutosFiado();
    await carregarLucroDoDia();
  } catch (err) {
    console.error("Erro ao registrar venda:", err);
    alert("Erro ao registrar venda.");
  }
});

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

// ---------- Modal Crédito / Fiado ----------

if (btnFiado && modalFiado) {
  btnFiado.addEventListener("click", () => {
    modalFiado.style.display = "flex";
  });
}

if (btnCancelarFiado && modalFiado) {
  btnCancelarFiado.addEventListener("click", () => {
    modalFiado.style.display = "none";
    limparModalFiado();
  });
}

btnAdicionarFiado.addEventListener("click", () => {
  const nomeProduto = produtoSelectFiado.value;
  const quantidade = parseInt(quantidadeInputFiado.value);
  if (!nomeProduto || isNaN(quantidade) || quantidade <= 0) {
    alert("Preencha o produto e quantidade válidos.");
    return;
  }

  // Buscar produto pelo nome na Map
  const produto = Array.from(produtosMap.values()).find(p => p.nome === nomeProduto);
  if (!produto) {
    alert("Produto não encontrado.");
    return;
  }

  const subtotal = produto.preco * quantidade;

  fiadoItens.push({ nome: nomeProduto, quantidade, subtotal });

  // Atualiza lista no modal
  const li = document.createElement("li");
  li.textContent = `${nomeProduto} - ${quantidade}x - R$ ${subtotal.toFixed(2)}`;
  listaItensFiado.appendChild(li);

  atualizarSubtotalFiado();

  // Limpar input quantidade
  quantidadeInputFiado.value = "";
});

function atualizarSubtotalFiado() {
  const total = fiadoItens.reduce((acc, item) => acc + item.subtotal, 0);
  subtotalFiadoSpan.textContent = `R$ ${total.toFixed(2)}`;
}

function limparModalFiado() {
  fiadoItens = [];
  const cliente = document.getElementById("fiado-cliente");
  if (cliente) cliente.value = "";
  if (produtoSelectFiado) produtoSelectFiado.value = "";
  if (quantidadeInputFiado) quantidadeInputFiado.value = "";
  if (listaItensFiado) listaItensFiado.innerHTML = "";
  if (subtotalFiadoSpan) subtotalFiadoSpan.textContent = "R$ 0,00";
}

btnSalvarFiado.addEventListener("click", async () => {
  const cliente = document.getElementById("fiado-cliente").value.trim();
  if (!cliente) {
    alert("Informe o nome do cliente.");
    return;
  }
  if (!fiadoItens.length) {
    alert("Adicione pelo menos um produto.");
    return;
  }

  try {
    for (const item of fiadoItens) {
      await addDoc(collection(db, "creditos"), {
        cliente,
        produto: item.nome,
        quantidade: item.quantidade,
        valor: item.subtotal,
        criadoEm: serverTimestamp(),
        usuario: auth.currentUser.uid
      });
    }
    alert("Crédito salvo com sucesso!");
    modalFiado.style.display = "none";
    limparModalFiado();
  } catch (err) {
    console.error("Erro ao salvar crédito:", err);
    alert("Erro ao salvar crédito. Tente novamente.");
  }
});
