import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCR3Q0HR9CPANGR8aIiGOn-5NP66e7CmcI",
  authDomain: "adega-lounge.firebaseapp.com",
  projectId: "adega-lounge",
  storageBucket: "adega-lounge.firebasestorage.app",
  messagingSenderId: "729628267147",
  appId: "1:729628267147:web:dfee9147983c57fe3f3a8e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let tipoUsuario = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const docRef = doc(db, "usuarios", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    alert("Usuário sem perfil definido.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  tipoUsuario = docSnap.data().tipo;

  // Oculta links admin/historico se funcionário
  if (tipoUsuario === "funcionario") {
    const navAdmin = document.querySelector('nav a[href="admin.html"]');
    const navHistorico = document.querySelector('nav a[href="historico.html"]');
    if (navAdmin) navAdmin.style.display = "none";
    if (navHistorico) navHistorico.style.display = "none";
  }

  carregarVendas();
});

const form = document.getElementById("form-venda");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Apenas admin ou funcionário podem registrar venda (ajuste aqui se quiser restringir mais)
  if (!tipoUsuario || (tipoUsuario !== "admin" && tipoUsuario !== "funcionario")) {
  alert("Permissão negada. Tipo de usuário inválido.");
  return;
}

  const nomeProduto = document.getElementById("produto").value.trim();
  const quantidade = Number(document.getElementById("quantidade").value);
  const preco = Number(document.getElementById("preco").value);

  if (!nomeProduto || quantidade <= 0 || preco <= 0) {
    alert("Preencha os campos corretamente.");
    return;
  }

  try {
    // 1. Registrar a venda
await addDoc(collection(db, "vendas"), {
  produto: nomeProduto,
  quantidade,
  preco,
  data: new Date()
});

// 2. Buscar produto no estoque
const querySnapshot = await getDocs(collection(db, "estoque"));
let produtoId = null;
let produtoAtual = null;

querySnapshot.forEach((docSnap) => {
  const data = docSnap.data();
  if (data.nome.toLowerCase() === nomeProduto.toLowerCase()) {
    produtoId = docSnap.id;
    produtoAtual = data;
  }
});

if (produtoId && produtoAtual) {
  const novaQuantidade = produtoAtual.quantidade - quantidade;
  if (novaQuantidade < 0) {
    alert("Estoque insuficiente para essa venda.");
    return;
  }

  // 3. Atualizar estoque
  await addDoc(collection(db, "historico-vendas"), {
    produto: nomeProduto,
    quantidade,
    preco,
    data: new Date()
  });

  await updateDoc(doc(db, "estoque", produtoId), {
    quantidade: novaQuantidade
  });
}

form.reset();
carregarVendas();


  } catch (error) {
    console.error("Erro ao registrar venda:", error);
  }
});

async function carregarVendas() {
  const tbody = document.querySelector("#tabela-vendas tbody");
  tbody.innerHTML = "";

  try {
    const querySnapshot = await getDocs(collection(db, "vendas"));

    let totalVendas = 0;

    querySnapshot.forEach(docSnap => {
      const venda = docSnap.data();
      const tr = document.createElement("tr");

      const total = venda.quantidade * venda.preco;
      totalVendas += total;

      const dataFormatada = venda.data.toDate ? venda.data.toDate().toLocaleString("pt-BR") : new Date(venda.data).toLocaleString("pt-BR");

      tr.innerHTML = `
        <td>${venda.produto}</td>
        <td>${venda.quantidade}</td>
        <td>R$ ${venda.preco.toFixed(2)}</td>
        <td>R$ ${total.toFixed(2)}</td>
        <td>${dataFormatada}</td>
        <td>
          ${tipoUsuario === "admin" ? `<button class="btn-excluir" data-id="${docSnap.id}">🗑️</button>` : "-"}
        </td>
      `;

      tbody.appendChild(tr);
    });

    document.getElementById("total-vendas").textContent = totalVendas.toFixed(2);

    if (tipoUsuario === "admin") ativarExclusao();

  } catch (error) {
    console.error("Erro ao carregar vendas:", error);
  }
}

function ativarExclusao() {
  document.querySelectorAll(".btn-excluir").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("Deseja excluir esta venda?")) {
        try {
          await deleteDoc(doc(db, "vendas", id));
          carregarVendas();
        } catch (error) {
          console.error("Erro ao excluir venda:", error);
        }
      }
    });
  });
}
