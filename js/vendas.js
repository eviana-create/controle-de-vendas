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

/* ─────────── Referências de elementos ─────────── */
const produtoSelect        = document.getElementById("produto-select");
const quantidadeInput      = document.querySelector(".quantidade-input");
const btnAdicionar         = document.getElementById("add-item-btn");
const listaVendas          = document.getElementById("itens-container");
const totalSpan            = document.getElementById("valor-total");
const btnRegistrar         = document.querySelector("#form-venda button[type='submit']");
const totalDiaSpan         = document.getElementById("total-dia");
const btnFinalizar         = document.getElementById("finalizar-expediente");

/* Modal Crédito / Fiado */
const modalFiado           = document.getElementById("modal-fiado");
const btnFiado             = document.getElementById("btn-fiado");
const btnCancelarFiado     = document.getElementById("btn-cancelar-fiado");
const btnSalvarFiado       = document.getElementById("btn-salvar-fiado");
const produtoSelectFiado   = document.getElementById("fiado-produto");
const quantidadeInputFiado = document.getElementById("fiado-quantidade");
const btnAdicionarFiado    = document.getElementById("fiado-add-item-btn");
const listaItensFiado      = document.getElementById("fiado-itens-lista");
const subtotalFiadoSpan    = document.getElementById("fiado-subtotal");

/* Map para cachear produtos */
const produtosMap = new Map();

/* Estados de venda / fiado */
let vendas     = [];
let fiadoItens = [];

/* ─────────── Autenticação e carga inicial ─────────── */
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  const snap   = await getDoc(doc(db, "usuarios", user.uid));
  const perfil = snap.exists() ? snap.data().tipo : null;

  if (!["admin", "funcionario"].includes(perfil)) {
    alert("Acesso restrito.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  await carregarProdutos();
  await carregarLucroDoDia();
  await carregarClientesFiado();
  carregarProdutosFiado();
});

/* ─────────── Carregar produtos do estoque ─────────── */
async function carregarProdutos() {
  try {
    produtoSelect.disabled = true;
    produtoSelect.innerHTML = `<option value="">Carregando...</option>`;
    produtosMap.clear();

    const snapshot = await getDocs(collection(db, "estoque"));

    produtoSelect.disabled = false;
    produtoSelect.innerHTML = `<option value="">Selecione o produto</option>`;

    snapshot.forEach((docSnap) => {
      const produto = docSnap.data();           // {nome, quantidade, precoCompra, precoVenda}
      produtosMap.set(docSnap.id, { ...produto, id: docSnap.id });

      const option          = document.createElement("option");
      option.value          = docSnap.id;
      option.dataset.preco  = produto.precoVenda;              // guarda preço p/ fácil acesso
      option.textContent    = `${produto.nome} — R$ ${produto.precoVenda.toFixed(2)} (Qtd: ${produto.quantidade})`;
      produtoSelect.appendChild(option);
    });

    carregarProdutosFiado(); // atualiza select do modal fiado
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
    produtoSelect.innerHTML = `<option value="">Erro ao carregar</option>`;
  }
}

/* ─────────── Preenche <select> do modal Fiado ─────────── */
function carregarProdutosFiado() {
  if (!produtoSelectFiado) return;
  produtoSelectFiado.innerHTML = `<option value="">Selecione o produto</option>`;
  produtosMap.forEach((p) => {
    const opt       = document.createElement("option");
    opt.value       = p.nome;
    opt.dataset.preco = p.precoVenda;
    opt.textContent = `${p.nome} — R$ ${p.precoVenda.toFixed(2)}`;
    produtoSelectFiado.appendChild(opt);
  });
}

/* ─────────── Lista clientes já registrados em fiado ─────────── */
async function carregarClientesFiado() {
  try {
    const clientesSet = new Set();
    const snap        = await getDocs(collection(db, "creditos"));
    snap.forEach((d) => {
      const { cliente } = d.data();
      if (cliente) clientesSet.add(cliente);
    });

    const clienteSelect = document.getElementById("fiado-cliente");
    if (!clienteSelect) return;
    clienteSelect.innerHTML = `<option value="">Selecione o cliente</option>`;
    clientesSet.forEach((nome) => {
      const opt       = document.createElement("option");
      opt.value       = nome;
      opt.textContent = nome;
      clienteSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar clientes fiado:", err);
  }
}

/* ─────────── Adicionar item à venda ─────────── */
btnAdicionar.addEventListener("click", () => {
  const id  = produtoSelect.value;
  const qtd = parseInt(quantidadeInput.value);

  if (!id || isNaN(qtd) || qtd <= 0) {
    alert("Preencha o produto e uma quantidade válida.");
    return;
  }

  const produto = produtosMap.get(id);
  if (!produto) return;

  const subtotal = produto.precoVenda * qtd;

  const linha = document.createElement("div");
  linha.className       = "item-linha";
  linha.dataset.id      = id;
  linha.dataset.qtd     = qtd;
  linha.dataset.subtotal = subtotal;

  linha.innerHTML = `
    <select disabled><option>${produto.nome}</option></select>
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

/* ─────────── Atualizar valor total da venda ─────────── */
function atualizarTotal() {
  const linhas = listaVendas.querySelectorAll(".item-linha");
  let total    = 0;
  vendas       = [];

  linhas.forEach((linha) => {
    const id       = linha.dataset.id;
    const qtd      = parseInt(linha.dataset.qtd);
    const subtotal = parseFloat(linha.dataset.subtotal);
    const produto  = produtosMap.get(id);

    if (produto && !isNaN(qtd) && !isNaN(subtotal)) {
      total += subtotal;
      vendas.push({ id, nome: produto.nome, quantidade: qtd, subtotal });

      const span = linha.querySelector(".subtotal-label");
      if (span) span.textContent = `R$ ${subtotal.toFixed(2)}`;
    }
  });

  totalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

/* ─────────── Total de vendas do dia ─────────── */
async function carregarLucroDoDia() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const q = query(collection(db, "vendas"), where("criadoEm", ">=", hoje));

  let total = 0;
  try {
    const snap = await getDocs(q);
    snap.forEach((d) => (total += d.data().subtotal || 0));
    totalDiaSpan.textContent = `R$ ${total.toFixed(2)}`;
  } catch (err) {
    console.error("Erro ao calcular lucro do dia:", err);
  }
}

/* ─────────── Registrar venda ─────────── */
btnRegistrar.addEventListener("click", async (e) => {
  e.preventDefault();
  if (!vendas.length) return alert("Adicione ao menos um item.");

  try {
    for (const v of vendas) {
      await addDoc(collection(db, "vendas"), {
        produto:   v.nome,
        quantidade:v.quantidade,
        subtotal:  v.subtotal,
        criadoEm:  serverTimestamp(),
        usuario:   auth.currentUser.uid
      });

      // atualiza quantidade no estoque
      const ref     = doc(db, "estoque", v.id);
      const produto = produtosMap.get(v.id);
      if (produto) {
        await updateDoc(ref, { quantidade: produto.quantidade - v.quantidade });
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

/* ─────────── Finalizar expediente ─────────── */
btnFinalizar.addEventListener("click", async () => {
  if (!confirm("Deseja realmente finalizar o expediente?")) return;

  const valor = parseFloat(totalDiaSpan.textContent.replace("R$", "").replace(",", "."));

  try {
    await addDoc(collection(db, "expedientes"), {
      data:  new Date(),
      total: valor,
      usuario: auth.currentUser.uid
    });
    alert("Expediente finalizado!");
    totalDiaSpan.textContent = "R$ 0,00";
  } catch (err) {
    console.error("Erro ao finalizar expediente:", err);
    alert("Erro ao finalizar expediente.");
  }
});

/* ─────────── Modal Crédito / Fiado ─────────── */
btnFiado?.addEventListener("click", () => (modalFiado.style.display = "flex"));
btnCancelarFiado?.addEventListener("click", () => {
  modalFiado.style.display = "none";
  limparModalFiado();
});

/* Add item fiado */
btnAdicionarFiado?.addEventListener("click", () => {
  const nomeProduto = produtoSelectFiado.value;
  const quantidade  = parseInt(quantidadeInputFiado.value);

  if (!nomeProduto || isNaN(quantidade) || quantidade <= 0)
    return alert("Preencha o produto e quantidade válidos.");

  const produto = Array.from(produtosMap.values()).find((p) => p.nome === nomeProduto);
  if (!produto) return alert("Produto não encontrado.");

  const subtotal = produto.precoVenda * quantidade;
  fiadoItens.push({ nome: nomeProduto, quantidade, subtotal });

  const li = document.createElement("li");
  li.textContent = `${nomeProduto} - ${quantidade}x - R$ ${subtotal.toFixed(2)}`;
  listaItensFiado.appendChild(li);

  atualizarSubtotalFiado();
  quantidadeInputFiado.value = "";
});

/* Subtotal do modal fiado */
function atualizarSubtotalFiado() {
  const total = fiadoItens.reduce((acc, i) => acc + i.subtotal, 0);
  subtotalFiadoSpan.textContent = `R$ ${total.toFixed(2)}`;
}

function limparModalFiado() {
  fiadoItens = [];
  document.getElementById("fiado-cliente").value = "";
  produtoSelectFiado.value = "";
  quantidadeInputFiado.value = "";
  listaItensFiado.innerHTML = "";
  subtotalFiadoSpan.textContent = "R$ 0,00";
}

/* Salvar crédito/fiado */
btnSalvarFiado?.addEventListener("click", async () => {
  const cliente = document.getElementById("fiado-cliente").value.trim();
  if (!cliente) return alert("Informe o nome do cliente.");
  if (!fiadoItens.length) return alert("Adicione ao menos um produto.");

  try {
    for (const i of fiadoItens) {
      await addDoc(collection(db, "creditos"), {
        cliente,
        produto:    i.nome,
        quantidade: i.quantidade,
        valor:      i.subtotal,
        criadoEm:   serverTimestamp(),
        usuario:    auth.currentUser.uid
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
