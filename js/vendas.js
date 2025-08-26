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
import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js";

/* ---------- Estados ---------- */
let vendas = [];
let fiadoItens = [];
const produtosMap = new Map();

/* ---------- DOM ---------- */
const produtoSelect        = document.getElementById("produto-select");
const quantidadeInput      = document.getElementById("quantidade-venda");
const listaVendas          = document.getElementById("itens-container");
const totalSpan            = document.getElementById("valor-total");
const formVenda            = document.getElementById("form-registro-venda");
const totalDiaSpan         = document.getElementById("total-dia");
const btnFinalizar         = document.getElementById("finalizar-expediente");

/* Modal Fiado */
const modalFiado           = document.getElementById("modal-fiado");
const btnFiado             = document.getElementById("btn-fiado");
const btnCancelarFiado     = document.getElementById("btn-cancelar-fiado");
const btnFiadoAddItem      = document.getElementById("fiado-add-item-btn");
const btnSalvarFiado       = document.getElementById("btn-salvar-fiado");
const fiadoClienteInput    = document.getElementById("fiado-cliente-select");
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
  await carregarClientes();
  await carregarLucroDoDia();
  await carregarVendasDoDia();
  await carregarCreditosDoDia();
});

/* ---------- Carregar produtos ---------- */
async function carregarProdutos() {
  produtosMap.clear();
  produtoSelect.innerHTML = `<option value="">Carregando...</option>`;
  fiadoProdutoSelect.innerHTML = `<option value="">Carregando...</option>`;

  try {
    const snap = await getDocs(collection(db, "estoque"));

    produtoSelect.innerHTML = `<option value="">Selecione o produto</option>`;
    fiadoProdutoSelect.innerHTML = `<option value="">Selecione o produto</option>`;

    snap.forEach(d => {
      const p = d.data();
      const preco = p.precoVenda ?? p.preco ?? 0;
      produtosMap.set(d.id, { ...p, preco, id: d.id });

      const opt1 = document.createElement("option");
      opt1.value = d.id;
      opt1.textContent = `${p.nome} — R$ ${preco.toFixed(2)} (Qtd: ${p.quantidade})`;
      produtoSelect.appendChild(opt1);

      const opt2 = opt1.cloneNode(true);
      fiadoProdutoSelect.appendChild(opt2);
    });

  } catch (err) {
    console.error(err);
    produtoSelect.innerHTML = `<option value="">Erro ao carregar</option>`;
    fiadoProdutoSelect.innerHTML = `<option value="">Erro ao carregar</option>`;
  }
}

/* ---------- Carregar clientes ---------- */
async function carregarClientes() {
  if (!fiadoClienteInput) return;
  fiadoClienteInput.innerHTML = `<option value="">Carregando...</option>`;
  try {
    const snap = await getDocs(collection(db, "clientes"));
    fiadoClienteInput.innerHTML = `<option value="">Selecione o cliente</option>`;
    snap.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.data().nome;
      opt.textContent = d.data().nome;
      fiadoClienteInput.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

/* ---------- Vendas à vista ---------- */
function adicionarItemVenda() {
  const id  = produtoSelect.value;
  const qtd = parseInt(quantidadeInput.value,10);
  if (!id || !qtd || qtd<=0) return alert("Preencha produto e quantidade.");

  const prod = produtosMap.get(id);
  if (!prod) return alert("Produto não encontrado.");
  if (qtd>prod.quantidade) return alert("Estoque insuficiente.");

  const ex = vendas.find(i=>i.id===id);
  if (ex) {
    if(ex.quantidade+qtd>prod.quantidade) return alert("Estoque insuficiente.");
    ex.quantidade+=qtd;
    ex.subtotal = ex.quantidade * prod.preco;
  } else {
    vendas.push({ id, nome: prod.nome, quantidade:qtd, precoUnitario:prod.preco, subtotal:qtd*prod.preco });
  }

  produtoSelect.value="";
  quantidadeInput.value="";
  renderVendas();
}

function renderVendas() {
  listaVendas.innerHTML="";
  const total = vendas.reduce((s,v)=>s+v.subtotal,0);
  vendas.forEach((v,idx)=>{
    const div = document.createElement("div");
    div.className="item-linha";
    div.innerHTML = `${v.nome} | Qtd: ${v.quantidade} | R$ ${v.subtotal.toFixed(2)} <button>×</button>`;
    div.querySelector("button").onclick = ()=>{
      vendas.splice(idx,1);
      renderVendas();
    };
    listaVendas.appendChild(div);
  });
  totalSpan.textContent=`R$ ${total.toFixed(2)}`;
}

async function registrarVenda(e){
  e.preventDefault();
  if(vendas.length===0) return alert("Adicione itens.");
  try {
    await Promise.all(vendas.map(async v=>{
      await addDoc(collection(db,"vendas"),{
        produto:v.nome,
        quantidade:v.quantidade,
        subtotal:v.subtotal,
        criadoEm:serverTimestamp(),
        usuario:auth.currentUser.uid
      });
      const ref = doc(db,"estoque",v.id);
      const novaQtd = produtosMap.get(v.id).quantidade - v.quantidade;
      await updateDoc(ref,{ quantidade:novaQtd });
      produtosMap.get(v.id).quantidade = novaQtd;
    }));
    alert("Venda registrada!");
    vendas=[];
    renderVendas();
    await carregarProdutos();
    await carregarLucroDoDia();
    setTimeout(carregarVendasDoDia,600);
  } catch(err) {
    console.error(err);
    alert("Erro ao registrar venda.");
  }
}

/* ---------- Modal Fiado ---------- */
function resetModalFiado(){
  fiadoItens=[];
  fiadoClienteInput.value="";
  fiadoProdutoSelect.value="";
  fiadoQuantidadeInput.value="";
  renderFiado();
}

function renderFiado(){
  fiadoItensLista.innerHTML="";
  fiadoItens.forEach((i,idx)=>{
    const li = document.createElement("li");
    li.textContent = `${i.nome} - ${i.quantidade}x - R$ ${i.subtotal.toFixed(2)}`;
    const btn = document.createElement("button");
    btn.textContent="×";
    btn.onclick=()=>{
      fiadoItens.splice(idx,1);
      renderFiado();
    };
    li.appendChild(btn);
    fiadoItensLista.appendChild(li);
  });
  const total = fiadoItens.reduce((s,i)=>s+i.subtotal,0);
  fiadoSubtotalSpan.textContent=`R$ ${total.toFixed(2)}`;
}

function adicionarItemFiado(){
  const id  = fiadoProdutoSelect.value;
  const qtd = parseInt(fiadoQuantidadeInput.value,10);
  const cliente = fiadoClienteInput.value;
  if(!cliente) return alert("Informe o cliente.");
  if(!id || !qtd || qtd<=0) return alert("Preencha produto e quantidade.");

  const prod = produtosMap.get(id);
  if(!prod) return alert("Produto inválido.");
  if(qtd>prod.quantidade) return alert("Estoque insuficiente.");

  const ex = fiadoItens.find(i=>i.id===id);
  if(ex){
    if(ex.quantidade+qtd>prod.quantidade) return alert("Estoque insuficiente.");
    ex.quantidade+=qtd;
    ex.subtotal = ex.quantidade*prod.preco;
  } else {
    fiadoItens.push({ id, nome:prod.nome, quantidade:qtd, precoUnitario:prod.preco, subtotal:qtd*prod.preco });
  }

  fiadoProdutoSelect.value="";
  fiadoQuantidadeInput.value="";
  renderFiado();
}

async function salvarFiado(){
  const cliente = fiadoClienteInput.value;
  if(!cliente) return alert("Informe o cliente.");
  if(fiadoItens.length===0) return alert("Adicione itens.");

  try {
    await Promise.all(fiadoItens.map(async i=>{
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
      await updateDoc(ref,{ quantidade:novaQtd });
      produtosMap.get(i.id).quantidade = novaQtd;
    }));
    alert("Crédito salvo!");
    resetModalFiado();
    modalFiado.style.display="none";
    await carregarProdutos();
    await carregarCreditosDoDia();
  } catch(err){
    console.error(err);
    alert("Erro ao salvar crédito.");
  }
}

/* ---------- Listeners ---------- */
document.addEventListener("DOMContentLoaded",()=>{
  document.getElementById("add-item-btn")?.addEventListener("click",adicionarItemVenda);
  formVenda?.addEventListener("submit",registrarVenda);

  btnFiado?.addEventListener("click", async ()=>{
    resetModalFiado();
    await carregarClientes();
    modalFiado.style.display="flex";
  });
  btnCancelarFiado?.addEventListener("click",()=> modalFiado.style.display="none");
  modalFiado?.addEventListener("click", e=>{ if(e.target===modalFiado) modalFiado.style.display="none"; });
  btnFiadoAddItem?.addEventListener("click", adicionarItemFiado);
  btnSalvarFiado?.addEventListener("click", salvarFiado);
});
