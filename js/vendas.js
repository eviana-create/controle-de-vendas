/* ============  js/vendas.js  ============ */
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

/* ---------- Estados ---------- */
let vendas      = [];                 // itens da venda “à vista”
let fiadoItens  = [];                 // itens do modal fiado
const produtosMap = new Map();        // cache de produtos (key = id)

/* ---------- Referências DOM ---------- */
const produtoSelect       = document.getElementById("produto-select");
const quantidadeInput     = document.getElementById("quantidade-venda");
const listaVendas         = document.getElementById("itens-container");
const totalSpan           = document.getElementById("valor-total");
const btnRegistrar        = document.querySelector("#form-registro-venda button[type='submit']");
const totalDiaSpan        = document.getElementById("total-dia");
const btnFinalizar        = document.getElementById("finalizar-expediente");

/* Modal fiado */
const modalFiado          = document.getElementById("modal-fiado");
const btnFiado            = document.getElementById("btn-fiado");
const btnCancelarFiado    = document.getElementById("btn-cancelar-fiado");
const btnFiadoAddItem     = document.getElementById("fiado-add-item-btn");
const btnSalvarFiado      = document.getElementById("btn-salvar-fiado");
const fiadoClienteInput   = document.getElementById("fiado-cliente");
const fiadoProdutoSelect  = document.getElementById("fiado-produto");
const fiadoQuantidadeInput= document.getElementById("fiado-quantidade");
const fiadoItensLista     = document.getElementById("fiado-itens-lista");
const fiadoSubtotalSpan   = document.getElementById("fiado-subtotal");

/* ---------- Inicialização ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  const perfilSnap = await getDoc(doc(db, "usuarios", user.uid));
  const tipo = perfilSnap.exists() ? perfilSnap.data().tipo : null;
  if (!["admin", "funcionario"].includes(tipo)) {
    alert("Acesso restrito."); await signOut(auth); return (window.location.href = "login.html");
  }

  await carregarProdutos();   // preenche selects
  await carregarLucroDoDia(); // mostra total do dia
});

/* ---------- Carregar produtos (estoque) ---------- */
async function carregarProdutos() {
  try {
    produtoSelect.disabled = true;
    produtoSelect.innerHTML = `<option value="">Carregando...</option>`;
    produtosMap.clear();

    const snap = await getDocs(collection(db, "estoque"));

    produtoSelect.disabled = false;
    produtoSelect.innerHTML = `<option value="">Selecione o produto</option>`;

    snap.forEach(docSnap => {
      const p = docSnap.data(); // {nome, quantidade, preco}
      produtosMap.set(docSnap.id, { ...p, id: docSnap.id });

      const opt = document.createElement("option");
      opt.value = docSnap.id;
      opt.textContent = `${p.nome} — R$ ${p.preco.toFixed(2)} (Qtd: ${p.quantidade})`;
      produtoSelect.appendChild(opt);
    });

    preencherSelectFiado(snap);
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
    produtoSelect.innerHTML = `<option value="">Erro ao carregar</option>`;
  }
}

function preencherSelectFiado(snapshot) {
  if (!fiadoProdutoSelect) return;
  fiadoProdutoSelect.innerHTML = `<option value="">Selecione o produto</option>`;
  snapshot.forEach(docSnap => {
    const p = docSnap.data();
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.textContent = `${p.nome} — R$ ${p.preco.toFixed(2)} (Qtd: ${p.quantidade})`;
    fiadoProdutoSelect.appendChild(opt);
  });
}

/* ---------- Venda à vista ---------- */
function adicionarItemVenda() {
  const id  = produtoSelect.value;
  const qtd = parseInt(quantidadeInput.value);

  if (!id || !qtd || qtd <= 0)  return alert("Preencha produto e quantidade.");
  const prod = produtosMap.get(id);
  if (!prod)                    return alert("Produto não encontrado.");
  if (qtd > prod.quantidade)    return alert("Estoque insuficiente.");

  const existente = vendas.find(v => v.id === id);
  if (existente) {
    if (existente.quantidade + qtd > prod.quantidade)
      return alert("Estoque insuficiente.");
    existente.quantidade += qtd;
    existente.subtotal    = existente.quantidade * prod.preco;
  } else {
    vendas.push({ id, nome: prod.nome, quantidade: qtd,
                  precoUnitario: prod.preco, subtotal: qtd * prod.preco });
  }
  renderVendas();
  produtoSelect.value = ""; quantidadeInput.value = "";
}

function renderVendas() {
  listaVendas.innerHTML = "";
  let total = 0;
  vendas.forEach((v, idx) => {
    total += v.subtotal;
    const div = document.createElement("div");
    div.className = "item-linha";
    div.innerHTML = `
      ${v.nome} | Qtd: ${v.quantidade} | R$ ${v.subtotal.toFixed(2)}
      <button class="remover-item-btn">×</button>`;
    div.querySelector("button").onclick = () => {
      vendas.splice(idx,1); renderVendas();
    };
    listaVendas.appendChild(div);
  });
  totalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

async function registrarVenda(e){
  e.preventDefault();
  if (!vendas.length) return alert("Adicione itens.");

  try {
    for (const v of vendas) {
      await addDoc(collection(db,"vendas"),{
        produto:v.nome, quantidade:v.quantidade, subtotal:v.subtotal,
        criadoEm:serverTimestamp(), usuario:auth.currentUser.uid
      });
      const ref = doc(db,"estoque", v.id);
      const novo = produtosMap.get(v.id).quantidade - v.quantidade;
      await updateDoc(ref,{ quantidade:novo });
      produtosMap.get(v.id).quantidade = novo;
    }
    alert("Venda registrada!");
    vendas = []; renderVendas();
    await carregarProdutos(); await carregarLucroDoDia();
  } catch(err){ console.error(err); alert("Erro ao registrar venda."); }
}

/* ---------- Lucro do dia ---------- */
async function carregarLucroDoDia(){
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  let total = 0;
  const q = query(collection(db,"vendas"), where("criadoEm",">=", hoje));
  (await getDocs(q)).forEach(d => total += d.data().subtotal||0);
  totalDiaSpan.textContent = `R$ ${total.toFixed(2)}`;
}

/* ---------- Modal Fiado ---------- */
function atualizarSubtotalFiado(){
  const total = fiadoItens.reduce((s,i)=>s+i.subtotal,0);
  fiadoSubtotalSpan.textContent = `R$ ${total.toFixed(2)}`;
}
function renderFiado(){
  fiadoItensLista.innerHTML = "";
  fiadoItens.forEach((i,idx)=>{
    const li=document.createElement("li");
    li.className="item-linha";
    li.innerHTML = `${i.nome} ‑ ${i.quantidade}x ‑ R$ ${i.subtotal.toFixed(2)}
      <button class="remover-item-btn">×</button>`;
    li.querySelector("button").onclick=()=>{ fiadoItens.splice(idx,1); renderFiado(); atualizarSubtotalFiado(); };
    fiadoItensLista.appendChild(li);
  });
  atualizarSubtotalFiado();
}
function adicionarItemFiado(){
  const id  = fiadoProdutoSelect.value;
  const qtd = parseInt(fiadoQuantidadeInput.value);
  const cliente = fiadoClienteInput.value.trim();
  if (!cliente) return alert("Informe o cliente.");
  if (!id || !qtd || qtd<=0) return alert("Preencha produto e quantidade.");

  const prod = produtosMap.get(id);
  if (!prod) return alert("Produto inválido.");
  if (qtd > prod.quantidade) return alert("Estoque insuficiente.");

  const ex = fiadoItens.find(i=>i.id===id);
  if (ex){
    if (ex.quantidade+qtd>prod.quantidade) return alert("Estoque insuficiente.");
    ex.quantidade += qtd; ex.subtotal = ex.quantidade*prod.preco;
  }else{
    fiadoItens.push({ id, nome:prod.nome, quantidade:qtd,
                      precoUnitario:prod.preco, subtotal:qtd*prod.preco });
  }
  renderFiado();
  fiadoProdutoSelect.value=""; fiadoQuantidadeInput.value="";
}
async function salvarFiado(){
  const cliente = fiadoClienteInput.value.trim();
  if (!cliente) return alert("Informe o cliente.");
  if (!fiadoItens.length) return alert("Adicione itens.");

  try {
    for (const i of fiadoItens){
      await addDoc(collection(db,"creditos"),{
        cliente, produto:i.nome, quantidade:i.quantidade, subtotal:i.subtotal,
        criadoEm:serverTimestamp(), usuario:auth.currentUser.uid
      });
      const ref = doc(db,"estoque", i.id);
      const novo = produtosMap.get(i.id).quantidade - i.quantidade;
      await updateDoc(ref,{ quantidade:novo });
      produtosMap.get(i.id).quantidade = novo;
    }
    alert("Crédito salvo!");
    fiadoItens=[]; renderFiado(); fiadoClienteInput.value="";
    modalFiado.style.display="none";
    await carregarProdutos();
  }catch(err){ console.error(err); alert("Erro ao salvar crédito."); }
}
function resetModalFiado(){
  fiadoItens=[]; renderFiado();
  fiadoClienteInput.value=""; fiadoProdutoSelect.value=""; fiadoQuantidadeInput.value="";
}

/* ---------- Listeners ---------- */
document.addEventListener("DOMContentLoaded",()=>{
  document.getElementById("add-item-btn")      ?.addEventListener("click", adicionarItemVenda);
  btnRegistrar                                  ?.addEventListener("click", registrarVenda);
  btnFiado                                      ?.addEventListener("click", ()=>{ modalFiado.style.display="flex"; });
  btnCancelarFiado                              ?.addEventListener("click", ()=>{ modalFiado.style.display="none"; resetModalFiado(); });
  modalFiado                                    ?.addEventListener("click", (e)=>{ if(e.target===modalFiado){ modalFiado.style.display="none"; resetModalFiado(); } });
  btnFiadoAddItem                               ?.addEventListener("click", adicionarItemFiado);
  btnSalvarFiado                                ?.addEventListener("click", salvarFiado);

  btnFinalizar?.addEventListener("click", async()=>{
    if(!confirm("Deseja finalizar o expediente?")) return;
    const total=parseFloat(totalDiaSpan.textContent.replace("R$","").replace(",",".")||"0");
    try{
      await addDoc(collection(db,"expedientes"),{ data:new Date(), total, usuario:auth.currentUser.uid });
      alert("Expediente finalizado!"); totalDiaSpan.textContent="R$ 0,00";
    }catch(err){ console.error(err); alert("Erro ao finalizar expediente."); }
  });
});
