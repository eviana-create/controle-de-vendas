/* ============ js/vendas.js ============ */
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
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- Estados ---------- */
let vendas = [];          // itens da venda à vista
let fiadoItens = [];      // itens no fiado
const produtosMap = new Map();

/* ---------- DOM ---------- */
const produtoSelect        = document.getElementById("produto-select");
const quantidadeInput      = document.getElementById("quantidade-venda");
const listaVendas          = document.getElementById("itens-container");
const totalSpan            = document.getElementById("valor-total");
const formVenda            = document.getElementById("form-registro-venda");
const totalDiaSpan         = document.getElementById("total-dia");
const btnFinalizar         = document.getElementById("finalizar-expediente");

/* Modal fiado */
const modalFiado           = document.getElementById("modal-fiado");
const btnFiado             = document.getElementById("btn-fiado");
const btnCancelarFiado     = document.getElementById("btn-cancelar-fiado");
const btnFiadoAddItem      = document.getElementById("fiado-add-item-btn");
const btnSalvarFiado       = document.getElementById("btn-salvar-fiado");
const fiadoClienteInput    = document.getElementById("fiado-cliente");
const fiadoProdutoSelect   = document.getElementById("fiado-produto");
const fiadoQuantidadeInput = document.getElementById("fiado-quantidade");
const fiadoItensLista      = document.getElementById("fiado-itens-lista");
const fiadoSubtotalSpan    = document.getElementById("fiado-subtotal");

/* Modal PIX */
const modalPix         = document.getElementById("modal-pix");
const btnPagarPix      = document.getElementById("btn-pagar-pix");
const btnFecharPix     = document.getElementById("btn-fechar-pix");
const pixQRCodeCanvas  = document.getElementById("pix-qrcode");

/* ---------- Autenticação ---------- */
onAuthStateChanged(auth, async user => {
  if (!user) return (window.location.href = "login.html");

  const snap = await getDoc(doc(db, "usuarios", user.uid));
  const tipo = snap.exists() ? snap.data().tipo : null;

  if (!["admin", "funcionario"].includes(tipo)) {
    alert("Acesso restrito.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  await carregarProdutos();
  await carregarLucroDoDia();
  await carregarVendasDoDia();
});

/* ---------- Carregar estoque ---------- */
async function carregarProdutos() {
  try {
    produtosMap.clear();
    produtoSelect.disabled = true;
    produtoSelect.innerHTML = `<option value="">Carregando...</option>`;

    const snap = await getDocs(collection(db, "estoque"));

    produtoSelect.disabled = false;
    produtoSelect.innerHTML = `<option value="">Selecione o produto</option>`;

    snap.forEach(d => {
      const p = d.data();
      const preco = p.precoVenda ?? p.preco ?? 0;
      produtosMap.set(d.id, { ...p, preco, id: d.id });

      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${p.nome} — R$ ${preco.toFixed(2)} (Qtd: ${p.quantidade})`;
      produtoSelect.appendChild(opt);
    });

    preencherSelectFiado();
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
    produtoSelect.innerHTML = `<option value="">Erro ao carregar</option>`;
  }
}

function preencherSelectFiado() {
  if (!fiadoProdutoSelect) return;
  fiadoProdutoSelect.innerHTML = `<option value="">Selecione o produto</option>`;
  produtosMap.forEach((p, id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${p.nome} — R$ ${p.preco.toFixed(2)} (Qtd: ${p.quantidade})`;
    fiadoProdutoSelect.appendChild(opt);
  });
}

/* ---------- Venda à vista ---------- */
function adicionarItemVenda() {
  const id  = produtoSelect.value;
  const qtd = parseInt(quantidadeInput.value, 10);

  if (!id || !qtd || qtd <= 0) return alert("Preencha produto e quantidade corretamente.");

  const prod = produtosMap.get(id);
  if (!prod)        return alert("Produto não encontrado.");
  if (qtd > prod.quantidade) return alert("Estoque insuficiente.");

  const itemExistente = vendas.find(v => v.id === id);
  if (itemExistente) {
    if (itemExistente.quantidade + qtd > prod.quantidade) return alert("Estoque insuficiente.");
    itemExistente.quantidade += qtd;
    itemExistente.subtotal    = itemExistente.quantidade * prod.preco;
  } else {
    vendas.push({
      id,
      nome: prod.nome,
      quantidade: qtd,
      precoUnitario: prod.preco,
      subtotal: qtd * prod.preco,
    });
  }

  produtoSelect.value = "";
  quantidadeInput.value = "";
  renderVendas();
}

function renderVendas() {
  listaVendas.innerHTML = "";
  const total = vendas.reduce((s, v) => s + v.subtotal, 0);

  vendas.forEach((v, idx) => {
    const row = document.createElement("div");
    row.className = "item-linha";
    row.innerHTML = `
      ${v.nome} | Qtd: ${v.quantidade} | R$ ${v.subtotal.toFixed(2)}
      <button class="remover-item-btn">×</button>`;
    row.querySelector("button").onclick = () => {
      vendas.splice(idx, 1);
      renderVendas();
    };
    listaVendas.appendChild(row);
  });

  totalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

/* ---------- Registrar venda ---------- */
async function registrarVenda(e) {
  e.preventDefault();
  if (vendas.length === 0) return alert("Adicione itens antes de concluir.");

  try {
    await Promise.all(
      vendas.map(async v => {
        await addDoc(collection(db, "vendas"), {
          produto: v.nome,
          quantidade: v.quantidade,
          subtotal: v.subtotal,
          criadoEm: serverTimestamp(),
          usuario : auth.currentUser.uid
        });

        const ref = doc(db, "estoque", v.id);
        const novaQtd = produtosMap.get(v.id).quantidade - v.quantidade;
        await updateDoc(ref, { quantidade: novaQtd });
        produtosMap.get(v.id).quantidade = novaQtd;
      })
    );

    alert("Venda registrada!");
    vendas = [];
    renderVendas();
    await carregarProdutos();
    await carregarLucroDoDia();
    setTimeout(carregarVendasDoDia, 600);
  } catch (err) {
    console.error(err);
    alert("Erro ao registrar venda.");
  }
}

/* ---------- Lucro do dia ---------- */
async function carregarLucroDoDia() {
  const hoje = new Date(); hoje.setHours(0,0,0,0);

  const snap = await getDocs(
    query(collection(db,"vendas"), where("criadoEm",">=",Timestamp.fromDate(hoje)))
  );

  const total = snap.docs.reduce((s,d)=> s + (d.data().subtotal || 0), 0);
  totalDiaSpan.textContent = `R$ ${total.toFixed(2)}`;
}

/* ---------- Vendas do dia ---------- */
async function carregarVendasDoDia() {
  const corpo = document.querySelector("#tabela-vendas-dia tbody");
  if (!corpo) return;

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const snap = await getDocs(
    query(collection(db,"vendas"), where("criadoEm",">=", Timestamp.fromDate(hoje)))
  );

  const mapa = new Map();
  snap.forEach(d=>{
    const { produto, quantidade, subtotal } = d.data();
    if (!mapa.has(produto)) mapa.set(produto,{ quantidade:0, subtotal:0 });
    const it = mapa.get(produto);
    it.quantidade += quantidade;
    it.subtotal   += subtotal;
  });

  corpo.innerHTML = mapa.size ? "" : `<tr><td colspan="3">Nenhuma venda hoje.</td></tr>`;
  mapa.forEach((it,nome)=>{
    corpo.insertAdjacentHTML("beforeend",`
      <tr><td>${nome}</td><td>${it.quantidade}</td><td>R$ ${it.subtotal.toFixed(2)}</td></tr>
    `);
  });
}

/* ---------- Fiado ---------- */
function atualizarSubtotalFiado() {
  fiadoSubtotalSpan.textContent =
    `R$ ${fiadoItens.reduce((s,i)=>s+i.subtotal,0).toFixed(2)}`;
}

function renderFiado() {
  fiadoItensLista.innerHTML = "";
  fiadoItens.forEach((i,idx) => {
    fiadoItensLista.insertAdjacentHTML("beforeend",`
      <li class="item-linha">
        ${i.nome} - ${i.quantidade}x - R$ ${i.subtotal.toFixed(2)}
        <button class="remover-item-btn">×</button>
      </li>`);
    fiadoItensLista.lastElementChild.querySelector("button").onclick = () => {
      fiadoItens.splice(idx,1);
      renderFiado();
    };
  });
  atualizarSubtotalFiado();
}

function adicionarItemFiado() {
  const id  = fiadoProdutoSelect.value;
  const qtd = parseInt(fiadoQuantidadeInput.value,10);
  const cliente = fiadoClienteInput.value.trim();

  if (!cliente)               return alert("Informe o cliente.");
  if (!id || !qtd || qtd<=0 ) return alert("Preencha produto e quantidade.");

  const prod = produtosMap.get(id);
  if (!prod)                  return alert("Produto inválido.");
  if (qtd > prod.quantidade)  return alert("Estoque insuficiente.");

  const ex = fiadoItens.find(i=>i.id===id);
  if (ex) {
    if (ex.quantidade+qtd > prod.quantidade) return alert("Estoque insuficiente.");
    ex.quantidade += qtd;
    ex.subtotal    = ex.quantidade * prod.preco;
  } else {
    fiadoItens.push({
      id,
      nome: prod.nome,
      quantidade: qtd,
      precoUnitario: prod.preco,
      subtotal: qtd * prod.preco
    });
  }
  fiadoProdutoSelect.value="";
  fiadoQuantidadeInput.value="";
  renderFiado();
}

async function salvarFiado() {
  const cliente = fiadoClienteInput.value.trim();
  if (!cliente)          return alert("Informe o cliente.");
  if (!fiadoItens.length) return alert("Adicione itens.");

  try {
    await Promise.all(
      fiadoItens.map(async i => {
        await addDoc(collection(db,"creditos"),{
          cliente,
          produto:i.nome,
          quantidade:i.quantidade,
          subtotal:i.subtotal,
          criadoEm:serverTimestamp(),
          usuario:auth.currentUser.uid
        });
        const ref = doc(db,"estoque",i.id);
        const novaQtd = produtosMap.get(i.id).quantidade - i.quantidade;
        await updateDoc(ref, { quantidade:novaQtd });
        produtosMap.get(i.id).quantidade = novaQtd;
      })
    );

    alert("Crédito salvo!");
    resetModalFiado();
    modalFiado.style.display = "none";
    await carregarProdutos();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar crédito.");
  }
}

function resetModalFiado() {
  fiadoItens = [];
  fiadoClienteInput.value = "";
  fiadoProdutoSelect.value = "";
  fiadoQuantidadeInput.value = "";
  renderFiado();
}

/* ---------- PIX estático ---------- */
// Payload fixo para testes
const PIX_PAYLOAD_STATIC =
  "00020101021126360014BR.GOV.BCB.PIX0114+55119335653055204000053039865802BR5925RAFAEL DOUGLAS CIRIACO CA6008SAOPAULO61080132305062070503***63042B59";

function gerarPixQRCode() {
  if (vendas.length === 0) return alert("Adicione itens antes de pagar.");

  QRCode.toCanvas(pixQRCodeCanvas, PIX_PAYLOAD_STATIC, { width: 220 }, err => {
    if (err) {
      console.error("Erro ao gerar QR Code PIX:", err);
      alert("Erro ao gerar QR Code PIX.");
    }
  });
  modalPix.style.display = "flex";
}

/* ---------- Listeners ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("add-item-btn")?.addEventListener("click", adicionarItemVenda);
  formVenda?.addEventListener("submit", registrarVenda);

  /* Fiado */
  btnFiado?.addEventListener("click", () => { resetModalFiado(); modalFiado.style.display = "flex"; });
  btnCancelarFiado?.addEventListener("click", () => (modalFiado.style.display = "none"));
  btnFiadoAddItem?.addEventListener("click", adicionarItemFiado);
  btnSalvarFiado?.addEventListener("click", salvarFiado);
  modalFiado?.addEventListener("click", e => { if (e.target === modalFiado) modalFiado.style.display = "none"; });

  /* Pix */
  btnPagarPix?.addEventListener("click", gerarPixQRCode);
  btnFecharPix?.addEventListener("click", () => (modalPix.style.display = "none"));

  /* Finalizar expediente */
  btnFinalizar?.addEventListener("click", async () => {
    if (!confirm("Deseja finalizar o expediente?")) return;
    const total = parseFloat(totalDiaSpan.textContent.replace("R$", "").replace(",", ".")) || 0;
    try {
      await addDoc(collection(db,"expedientes"), { data:new Date(), total, usuario:auth.currentUser.uid });
      alert("Expediente finalizado!");
      totalDiaSpan.textContent = "R$ 0,00";
      document.querySelector("#tabela-vendas-dia tbody").innerHTML = "";
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar expediente.");
    }
  });
});
