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

/* ----------  Configuração Firebase  ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyCR3Q0HR9CPANGR8aIiGOn-5NP66e7CmcI",
  authDomain: "adega-lounge.firebaseapp.com",
  projectId: "adega-lounge",
  storageBucket: "adega-lounge.appspot.com",
  messagingSenderId: "729628267147",
  appId: "1:729628267147:web:dfee9147983c57fe3f3a8e"
};
initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

/* ----------  Estado global  ---------- */
let tipoUsuario = null;
let editandoId = null; // ID do produto em edição

/* ----------  Referências DOM  ---------- */
const form = document.getElementById("form-produto");
const btnCancelarEdit = document.getElementById("btn-cancelar-edicao");
const nomeInput = document.getElementById("nome-produto");
const qtdInput = document.getElementById("quantidade-produto");
const compraInput = document.getElementById("preco-compra");
const vendaInput = document.getElementById("preco-venda");
const tabelaBody = document.querySelector("#tabela-estoque tbody");

/* ----------  Setup e autenticação  ---------- */
window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    try {
      const perfil = await getDoc(doc(db, "usuarios", user.uid));
      if (!perfil.exists()) {
        alert("Perfil do usuário não encontrado.");
        await signOut(auth);
        window.location.href = "login.html";
        return;
      }
      tipoUsuario = perfil.data().tipo;

      if (tipoUsuario !== "admin") {
        // esconder elementos restritos a admins
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
        form.style.display = "none";
      }

      resetForm();  // garantir que o form esteja limpo e correto
      carregarEstoque();
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      alert("Erro ao autenticar usuário.");
      await signOut(auth);
      window.location.href = "login.html";
    }
  });
});

/* ----------  Envio do formulário (cadastro/edição)  ---------- */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (tipoUsuario !== "admin") {
    alert("Somente administradores podem alterar o estoque.");
    return;
  }

  // Coleta e validação básica
  const nome = nomeInput.value.trim();
  const quantidade = Number(qtdInput.value);
  const precoCompra = Number(compraInput.value);
  const precoVenda = Number(vendaInput.value);

  if (!nome) {
    alert("Informe o nome do produto.");
    nomeInput.focus();
    return;
  }
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    alert("Informe uma quantidade válida (inteiro maior que zero).");
    qtdInput.focus();
    return;
  }
  if (isNaN(precoCompra) || precoCompra < 0) {
    alert("Informe um preço de compra válido (zero ou positivo).");
    compraInput.focus();
    return;
  }
  if (isNaN(precoVenda) || precoVenda < 0) {
    alert("Informe um preço de venda válido (zero ou positivo).");
    vendaInput.focus();
    return;
  }

  const nomeLower = nome.toLowerCase();

  try {
    // Verifica se o produto já existe, ignorando o próprio produto em edição
    const snap = await getDocs(collection(db, "estoque"));
    let docDuplicadoId = null;

    snap.forEach(d => {
      const p = d.data();
      if ((p.nome ?? "").toLowerCase() === nomeLower) {
        if (!editandoId || editandoId !== d.id) {
          docDuplicadoId = d.id;
        }
      }
    });

    if (!editandoId && docDuplicadoId) {
      alert("Este produto já existe no estoque. Utilize o botão ✏️ para editar.");
      return;
    }

    const dados = { nome, quantidade, precoCompra, precoVenda };

    if (editandoId) {
      await updateDoc(doc(db, "estoque", editandoId), dados);
    } else {
      await addDoc(collection(db, "estoque"), dados);
    }

    resetForm();
    carregarEstoque();

  } catch (error) {
    console.error("Erro ao salvar produto:", error);
    alert("Erro ao salvar produto: " + error.message);
  }
});

/* ----------  Botão cancelar edição ---------- */
btnCancelarEdit?.addEventListener("click", () => {
  resetForm();
});

/* ----------  Função para resetar formulário ---------- */
function resetForm() {
  form.reset();
  editandoId = null;
  form.querySelector("button[type=submit]").textContent = "Cadastrar Produto";
  btnCancelarEdit.style.display = "none";
  nomeInput.focus();
}

/* ----------  Carregar e exibir estoque ---------- */
async function carregarEstoque() {
  tabelaBody.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "estoque"));
    snap.forEach(d => {
      const p = d.data();

      // Garantir valores numéricos válidos para evitar erro toFixed
      const quantidade = typeof p.quantidade === "number" ? p.quantidade : 0;
      const precoCompra = typeof p.precoCompra === "number" ? p.precoCompra : 0;
      const precoVenda = typeof p.precoVenda === "number" ? p.precoVenda : 0;
      const totalCompra = quantidade * precoCompra;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.nome ?? ""}</td>
        <td>${quantidade}</td>
        <td>R$ ${precoCompra.toFixed(2)}</td>
        <td>R$ ${precoVenda.toFixed(2)}</td>
        <td>R$ ${totalCompra.toFixed(2)}</td>
        <td class="admin-only">
          <button class="btn-editar" data-id="${d.id}">✏️</button>
          <button class="btn-excluir" data-id="${d.id}">🗑️</button>
        </td>
      `;
      tabelaBody.appendChild(tr);
    });

    if (tipoUsuario === "admin") ativarBotoesAcoes();

  } catch (error) {
    console.error("Erro ao carregar estoque:", error);
  }
}

/* ----------  Ativar ações dos botões editar/excluir ---------- */
function ativarBotoesAcoes() {
  // Excluir
  document.querySelectorAll(".btn-excluir").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Deseja excluir este produto?")) return;
      try {
        await deleteDoc(doc(db, "estoque", btn.dataset.id));
        carregarEstoque();
      } catch (error) {
        console.error("Erro ao excluir produto:", error);
        alert("Não foi possível excluir o produto.");
      }
    };
  });

  // Editar
  document.querySelectorAll(".btn-editar").forEach(btn => {
    btn.onclick = async () => {
      try {
        const snap = await getDoc(doc(db, "estoque", btn.dataset.id));
        if (!snap.exists()) {
          alert("Produto não encontrado.");
          return;
        }

        const p = snap.data();
        nomeInput.value = p.nome ?? "";
        qtdInput.value = p.quantidade ?? 0;
        compraInput.value = p.precoCompra ?? 0;
        vendaInput.value = p.precoVenda ?? 0;

        editandoId = btn.dataset.id;
        form.querySelector("button[type=submit]").textContent = "Salvar alterações";
        btnCancelarEdit.style.display = "inline-block";
        nomeInput.focus();
      } catch (error) {
        console.error("Erro ao carregar produto para edição:", error);
        alert("Erro ao carregar produto para edição.");
      }
    };
  });
}
