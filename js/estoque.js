import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
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

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR3Q0HR9CPANGR8aIiGOn-5NP66e7CmcI",
  authDomain: "adega-lounge.firebaseapp.com",
  projectId: "adega-lounge",
  storageBucket: "adega-lounge.appspot.com",
  messagingSenderId: "729628267147",
  appId: "1:729628267147:web:dfee9147983c57fe3f3a8e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let tipoUsuario = null;
let editandoId = null; // ID do produto sendo editado

window.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      alert("Usuário sem perfil definido.");
      await auth.signOut();
      window.location.href = "login.html";
      return;
    }

    tipoUsuario = docSnap.data().tipo;

    if (tipoUsuario === "funcionario") {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = "none";
      });

      const form = document.getElementById("form-produto");
      if (form) form.style.display = "none";
    }

    carregarEstoque();
  });

  const form = document.getElementById("form-produto");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (tipoUsuario !== "admin") {
        alert("Apenas administradores podem cadastrar ou editar produtos.");
        return;
      }

      const nome = document.getElementById("nome-produto").value.trim();
      const quantidade = Number(document.getElementById("quantidade-produto").value);
      const preco = Number(document.getElementById("preco-produto").value);

      if (!nome || quantidade <= 0 || preco <= 0) {
        alert("Preencha todos os campos corretamente.");
        return;
      }

      try {
        if (editandoId) {
          // Atualizar produto existente
          const produtoRef = doc(db, "estoque", editandoId);
          await updateDoc(produtoRef, { nome, quantidade, preco });

          editandoId = null;
          form.querySelector("button[type=submit]").textContent = "Cadastrar Produto";
        } else {
          // Adicionar novo produto
          await addDoc(collection(db, "estoque"), { nome, quantidade, preco });
        }

        form.reset();
        carregarEstoque();
      } catch (error) {
        console.error("Erro ao salvar produto:", error);
        alert("Erro ao salvar produto: " + error.message);
      }
    });
  }
});

async function carregarEstoque() {
  const tbody = document.querySelector("#tabela-estoque tbody");
  tbody.innerHTML = "";

  try {
    const querySnapshot = await getDocs(collection(db, "estoque"));

    querySnapshot.forEach((docSnap) => {
      const item = docSnap.data();
      const tr = document.createElement("tr");
      const total = item.quantidade * item.preco;

      // Botões de Ação: Editar e Excluir (apenas para admin)
      const botoes = tipoUsuario === "admin" ? `
        <button class="btn-editar" data-id="${docSnap.id}">✏️</button>
        <button class="btn-excluir" data-id="${docSnap.id}">🗑️</button>
      ` : "-";

      tr.innerHTML = `
        <td>${item.nome}</td>
        <td>${item.quantidade}</td>
        <td>R$ ${item.preco.toFixed(2)}</td>
        <td>R$ ${total.toFixed(2)}</td>
        <td>${botoes}</td>
      `;

      tbody.appendChild(tr);
    });

    if (tipoUsuario === "admin") {
      ativarBotoesAcoes();
    }
  } catch (error) {
    console.error("Erro ao carregar estoque:", error);
  }
}

function ativarBotoesAcoes() {
  // Botões Excluir
  document.querySelectorAll(".btn-excluir").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("Deseja excluir este produto?")) {
        try {
          await deleteDoc(doc(db, "estoque", id));
          carregarEstoque();
        } catch (error) {
          console.error("Erro ao excluir produto:", error);
          alert("Erro ao excluir produto.");
        }
      }
    });
  });

  // Botões Editar
  document.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      try {
        const docSnap = await getDoc(doc(db, "estoque", id));
        if (!docSnap.exists()) {
          alert("Produto não encontrado.");
          return;
        }
        const item = docSnap.data();

        // Preencher formulário com dados do produto para editar
        document.getElementById("nome-produto").value = item.nome;
        document.getElementById("quantidade-produto").value = item.quantidade;
        document.getElementById("preco-produto").value = item.preco;

        // Alterar estado para edição
        editandoId = id;
        document.querySelector("#form-produto button[type=submit]").textContent = "Salvar Alterações";
      } catch (error) {
        console.error("Erro ao carregar produto para editar:", error);
        alert("Erro ao carregar produto para edição.");
      }
    });
  });
}
