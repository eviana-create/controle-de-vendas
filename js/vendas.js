// vendas.js – versão corrigida para permitir acesso de funcionário, mantendo links de admin ocultos

import { auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, doc, getDoc, addDoc, updateDoc, serverTimestamp,
  onSnapshot, query, where, orderBy, Timestamp,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- Cache offline ---------- */
enableIndexedDbPersistence(db).catch(() => {});

/* ---------- DOM ---------- */
const form        = document.getElementById("form-venda");
const container   = document.getElementById("itens-container");
const totalSpan   = document.getElementById("valor-total");

let produtosMap = new Map();
let cart         = [];

/* ---------- Autenticação & acesso ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "usuarios", user.uid));
  const tipo = snap.exists() ? snap.data().tipo : null;

  // Se não for admin, apenas oculta links restritos; não redireciona
  if (tipo !== "admin") {
    document.querySelector('a[href="admin.html"]')?.remove();
    document.querySelector('a[href="historico.html"]')?.remove();
  }

  escutarProdutos();
  escutarVendasDoDia();
});

/* ---------- Produtos em tempo real ---------- */
function escutarProdutos() {
  onSnapshot(collection(db, "estoque"), (snap) => {
    produtosMap.clear();
    snap.forEach((d) => produtosMap.set(d.id, { ...d.data(), id: d.id }));

    // Repopular selects existentes
    document.querySelectorAll(".produto-select").forEach(preencherSelect);
    recalcularTodosSubtotais();
  });
}

function preencherSelect(selectEl) {
  const current = selectEl.value;
  selectEl.innerHTML = '<option value="">Selecione o produto</option>';
  produtosMap.forEach((p, id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${p.nome} (Qtd: ${p.quantidade})`;
    if (id === current) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

/* ---------- Linha dinâmica ---------- */
function wiringLinha(linha) {
  const sel = linha.querySelector(".produto-select");
  const qty = linha.querySelector(".quantidade-input");
  const sub = linha.querySelector(".subtotal-label");
  const btn = linha.querySelector(".remover-item-btn");

  if (!sel.options.length) preencherSelect(sel);

  const recalc = () => {
    const prod = produtosMap.get(sel.value);
    const q    = parseInt(qty.value) || 0;
    sub.textContent = `R$ ${(prod ? prod.preco * q : 0).toFixed(2)}`;
    recalcularTotal();
  };

  sel.onchange = qty.oninput = recalc;
  btn.onclick  = () => {
    if (container.children.length > 1) {
      linha.remove();
      recalcularTotal();
    } else {
      sel.value = "";
      qty.value = "";
      sub.textContent = "R$ 0,00";
      recalcularTotal();
    }
  };

  cart.push({
    linhaEl: linha,
    get produtoId() { return sel.value; },
    get quantidade() { return parseInt(qty.value) || 0; },
    get subtotal() {
      const p = produtosMap.get(sel.value);
      return p ? p.preco * this.quantidade : 0;
    }
  });
}

document.getElementById("add-item-btn").addEventListener("click", () => {
  const linha = container.firstElementChild.cloneNode(true);
  linha.querySelector(".produto-select").value = "";
  linha.querySelector(".quantidade-input").value = "";
  linha.querySelector(".subtotal-label").textContent = "R$ 0,00";
  container.appendChild(linha);
  wiringLinha(linha);
});

/* ---------- Cálculos ---------- */
function recalcularTotal() {
  const total = [...container.children].reduce((acc, l) => {
    const text = l.querySelector(".subtotal-label").textContent;
    return acc + parseFloat(text.replace(/[^\d,.-]/g, "").replace(",", ".") || 0);
  }, 0);
  totalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

function recalcularTodosSubtotais() {
  [...container.children].forEach((l) =>
    l.querySelector(".produto-select").dispatchEvent(new Event("change"))
  );
}

/* ---------- Registrar venda ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const itens = cart.filter(c => c.produtoId && c.quantidade > 0);
  if (!itens.length) return alert("Adicione pelo menos um item.");

  try {
    for (const item of itens) {
      const prod = produtosMap.get(item.produtoId);
      if (!prod || prod.quantidade < item.quantidade) {
        throw new Error(`Estoque insuficiente para ${prod?.nome || "produto"}`);
      }

      await addDoc(collection(db, "vendas"), {
        produto: prod.nome,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        subtotal: item.subtotal,
        criadoEm: serverTimestamp()
      });

      await updateDoc(doc(db, "estoque", item.produtoId), {
        quantidade: prod.quantidade - item.quantidade
      });
    }

    alert("Venda registrada com sucesso!");
    form.reset();
    container.innerHTML = "";
    const base = document.createElement("div");
    base.className = "item-linha";
    base.innerHTML = `
      <select class="produto-select" required></select>
      <input type="number" class="quantidade-input" placeholder="Qtd" min="1" required />
      <span class="subtotal-label">R$ 0,00</span>
      <button type="button" class="remover-item-btn">×</button>`;
    container.appendChild(base);
    cart = [];
    wiringLinha(base);
    recalcularTotal();
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao registrar venda.");
  }
});

/* ---------- Vendas do dia em tempo real ---------- */
function escutarVendasDoDia() {
  const tbody = document.querySelector("#tabela-vendas tbody");
  const totalDia = document.getElementById("total-dia");

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const q = query(collection(db, "vendas"),
    where("criadoEm", ">=", Timestamp.fromDate(hoje)),
    orderBy("criadoEm", "asc")
  );

  onSnapshot(q, (snap) => {
    tbody.innerHTML = "";
    let total = 0;
    const agrupado = {};

    snap.forEach((d) => {
      const v = d.data();
      if (!agrupado[v.produto]) agrupado[v.produto] = { quantidade:0, subtotal:0 };
      agrupado[v.produto].quantidade += v.quantidade;
      agrupado[v.produto].subtotal   += v.subtotal;
    });

    Object.entries(agrupado).forEach(([prod, info]) => {
      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${prod}</td>
          <td>${info.quantidade}</td>
          <td>R$ ${info.subtotal.toFixed(2)}</td>
        </tr>`);
      total += info.subtotal;
    });

    totalDia.textContent = `R$ ${total.toFixed(2)}`;
  });
}

/* ---------- Inicialização da primeira linha ---------- */
wiringLinha(container.firstElementChild);
recalcularTodosSubtotais();
