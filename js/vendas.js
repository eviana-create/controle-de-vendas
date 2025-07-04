import { auth, db } from "./firebaseConfig.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let tipoUsuario = null;
let produtosMap = new Map();

/* ---------- DOM ---------- */
const formVenda = document.getElementById("form-venda");
const produtoSelect = document.getElementById("produto-select");
const quantidadeInput = document.getElementById("quantidade-venda");
const tabelaBody = document.querySelector("#tabela-vendas tbody");
const totalDiaSpan = document.getElementById("total-dia");

/* ---------- Autenticação e acesso ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  const snap = await getDoc(doc(db, "usuarios", user.uid));
  tipoUsuario = snap.exists() ? snap.data().tipo : null;

  if (tipoUsuario !== "admin") {
    document.querySelectorAll("a[href='admin.html'], a[href='historico.html']").forEach(el => el.style.display = "none");
  }

  await carregarProdutos();
  forcarAtualizacaoSelectAndroid(); // 🔧 força o select renderizar corretamente no Android
  await carregarVendas();
});

/* ---------- Carrega produtos no <select> ---------- */
async function carregarProdutos() {
  produtoSelect.innerHTML = `<option value="">Selecione o produto</option>`;
  produtosMap.clear();

  const produtos = await getDocs(collection(db, "estoque"));

  produtos.forEach(docSnap => {
    const produto = docSnap.data();
    produtosMap.set(docSnap.id, { ...produto, id: docSnap.id });

    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = `${produto.nome} (Qtd: ${produto.quantidade})`;
    produtoSelect.appendChild(option);
  });

  // Garantir interatividade do <select> no Android
  setTimeout(() => {
    produtoSelect.disabled = false;
    produtoSelect.focus();
  }, 100);
}

/* ---------- Força atualização visual no Android ---------- */
function forcarAtualizacaoSelectAndroid() {
  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid && produtoSelect) {
    const clone = produtoSelect.cloneNode(true);
    produtoSelect.parentNode.replaceChild(clone, produtoSelect);
  }
}

/* ---------- Registrar venda ---------- */
formVenda.addEventListener("submit", async (e) => {
  e.preventDefault();

  const produtoId = produtoSelect.value;
  const quantidadeVendida = parseInt(quantidadeInput.value);

  if (!produtoId || isNaN(quantidadeVendida) || quantidadeVendida <= 0) {
    alert("Preencha corretamente os campos.");
    return;
  }

  const produto = produtosMap.get(produtoId);

  if (!produto || produto.quantidade < quantidadeVendida) {
    alert("Estoque insuficiente.");
    return;
  }

  const subtotal = quantidadeVendida * produto.preco;

  try {
    await addDoc(collection(db, "vendas"), {
      produto: produto.nome,
      produtoId: produtoId,
      quantidade: quantidadeVendida,
      subtotal,
      criadoEm: serverTimestamp()
    });

    await updateDoc(doc(db, "estoque", produtoId), {
      quantidade: produto.quantidade - quantidadeVendida
    });

    formVenda.reset();
    await carregarProdutos();
    forcarAtualizacaoSelectAndroid();
    await carregarVendas();

  } catch (error) {
    console.error("Erro ao registrar venda:", error);
    alert("Erro ao registrar venda.");
  }
});

/* ---------- Carregar vendas do dia ---------- */
async function carregarVendas() {
  tabelaBody.innerHTML = "";
  totalDiaSpan.textContent = "R$ 0,00";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendasSnap = await getDocs(
    query(collection(db, "vendas"), where("criadoEm", ">=", hoje))
  );

  let total = 0;

  vendasSnap.forEach((doc) => {
    const venda = doc.data();
    const dataVenda = venda.criadoEm?.toDate?.().toLocaleString("pt-BR") || "N/A";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${venda.produto}</td>
      <td>${venda.quantidade}</td>
      <td>R$ ${venda.subtotal.toFixed(2)}</td>
      <td>${dataVenda}</td>
    `;
    tabelaBody.appendChild(tr);

    total += venda.subtotal;
  });

  totalDiaSpan.textContent = `R$ ${total.toFixed(2)}`;
}
