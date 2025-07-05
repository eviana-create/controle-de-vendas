import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔧 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCR3Q0HR9CPANGR8aIiGOn-5NP66e7CmcI",
  authDomain: "adega-lounge.firebaseapp.com",
  projectId: "adega-lounge",
  storageBucket: "adega-lounge.appspot.com",
  messagingSenderId: "729628267147",
  appId: "1:729628267147:web:dfee9147983c57fe3f3a8e"
};

// 🔌 Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let tipoUsuario = null;
let produtosMap = new Map(); // id -> produto

// 👤 Verifica usuário e carrega produtos
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  const snap = await getDoc(doc(db, "usuarios", user.uid));
  tipoUsuario = snap.exists() ? snap.data().tipo : null;

  // 👁️‍🗨️ Oculta botões se for funcionário
  if (tipoUsuario !== "admin") {
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
  }

  await carregarProdutos();
  await carregarVendas();
});

// 📥 Preenche o <select> com produtos
async function carregarProdutos() {
  const select = document.getElementById("produto-select");
  select.innerHTML = `<option value="">Selecione o produto</option>`;

  const produtos = await getDocs(collection(db, "estoque"));

  produtos.forEach(docSnap => {
    const produto = docSnap.data();
    produtosMap.set(docSnap.id, { ...produto, id: docSnap.id });

    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = `${produto.nome} (Qtd: ${produto.quantidade})`;
    select.appendChild(option);
  });
}

// 🧾 Registrar venda
const form = document.getElementById("form-venda");
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const produtoId = document.getElementById("produto-select").value;
  const quantidadeVendida = parseInt(document.getElementById("quantidade-venda").value);

  if (!produtoId || isNaN(quantidadeVendida) || quantidadeVendida <= 0) {
    alert("Preencha corretamente os campos.");
    return;
  }

  const produto = produtosMap.get(produtoId);

  if (!produto || produto.quantidade < quantidadeVendida) {
    alert("Quantidade em estoque insuficiente.");
    return;
  }

  const subtotal = quantidadeVendida * produto.preco;

  try {
    // 🧾 Salvar venda
    await addDoc(collection(db, "vendas"), {
      produto: produto.nome,
      produtoId: produtoId,
      quantidade: quantidadeVendida,
      subtotal,
      criadoEm: serverTimestamp()
    });

    // 🔄 Atualizar estoque
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
});

// 📊 Carrega vendas do dia
async function carregarVendas() {
  const tbody = document.querySelector("#tabela-vendas tbody");
  const totalDia = document.getElementById("total-dia");
  tbody.innerHTML = "";
  let total = 0;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendasSnap = await getDocs(
    query(
      collection(db, "vendas"),
      where("criadoEm", ">=", hoje)
    )
  );

  vendasSnap.forEach(docSnap => {
    const venda = docSnap.data();
    const data = venda.criadoEm?.toDate?.().toLocaleString() || "N/A";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${venda.produto}</td>
      <td>${venda.quantidade}</td>
      <td>R$ ${venda.subtotal.toFixed(2)}</td>
      <td>${data}</td>
    `;
    tbody.appendChild(tr);

    total += venda.subtotal;
  });

  totalDia.textContent = `R$ ${total.toFixed(2)}`;
}
