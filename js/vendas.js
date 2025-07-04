// js/vendas.js
import { auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, doc, getDoc, addDoc, updateDoc,
  serverTimestamp, onSnapshot, query, where, orderBy, Timestamp,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

enableIndexedDbPersistence(db).catch(() => { /* ok offline */ });

/* ---------- helpers ---------- */
const form      = document.getElementById("form-venda");
const container = document.getElementById("itens-container");
const totalSpan = document.getElementById("valor-total");

let produtosMap = new Map();   // id → {nome,preco,quantidade}
let cart        = [];          // [{linhaEl, produtoId, quantidade, subtotal}]

/* ---------- auth ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) location.href = "login.html";

  const perfil = await getDoc(doc(db, "usuarios", user.uid));
  if (perfil.exists() && perfil.data().tipo !== "admin") {
    document.querySelector('a[href="admin.html"]')?.remove();
    document.querySelector('a[href="historico.html"]')?.remove();
  }

  escutarProdutos();   // popula selects
  escutarVendasDoDia();
});

/* ---------- produtos (select) ---------- */
function escutarProdutos() {
  onSnapshot(collection(db, "estoque"), (snap) => {
    produtosMap.clear();

    snap.forEach((d) => {
      produtosMap.set(d.id, { ...d.data(), id: d.id });
    });

    // repopula todos os selects existentes
    document.querySelectorAll(".produto-select").forEach(preencherSelect);
    calcularTodosSubtotais();
  });
}

function preencherSelect(selectEl) {
  const sel = selectEl;
  const selecionado = sel.value;
  sel.innerHTML = `<option value="">Selecione o produto</option>`;

  produtosMap.forEach((p, id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${p.nome} (Qtd: ${p.quantidade})`;
    if (id === selecionado) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* ---------- dinâmico: adicionar / remover linhas ---------- */
document.getElementById("add-item-btn").addEventListener("click", () => {
  const linha = container.firstElementChild.cloneNode(true);
  linha.querySelector(".produto-select").value = "";
  linha.querySelector(".quantidade-input").value = "";
  linha.querySelector(".subtotal-label").textContent = "R$ 0,00";
  container.appendChild(linha);
  wiringLinha(linha);
});

function wiringLinha(linha) {
  const sel  = linha.querySelector(".produto-select");
  const qty  = linha.querySelector(".quantidade-input");
  const sub  = linha.querySelector(".subtotal-label");
  const btn  = linha.querySelector(".remover-item-btn");

  if (!sel.options.length) preencherSelect(sel);

  const recalcular = () => {
    const prod = produtosMap.get(sel.value);
    const q    = parseInt(qty.value) || 0;
    const subtotal = prod ? prod.preco * q : 0;
    sub.textContent = `R$ ${subtotal.toFixed(2)}`;
    calcularTotal();
  };

  sel.onchange = qty.oninput = recalcular;
  btn.onclick  = () => {
    if (container.children.length > 1) {
      linha.remove();
      calcularTotal();
    }
  };

  // guarda referência no carrinho
  cart.push({ linhaEl: linha, get produtoId() { return sel.value; },
              get quantidade() { return parseInt(qty.value) || 0; },
              get subtotal() { const p = produtosMap.get(sel.value); return p ? p.preco * this.quantidade : 0; }});
}

wiringLinha(container.firstElementChild);

/* ---------- total geral ---------- */
function calcularTotal() {
  const total = [...container.children].reduce((acc, l) => {
    const subLabel = l.querySelector(".subtotal-label").textContent;
    return acc + parseFloat(subLabel.replace(/[^\d,.-]/g, "").replace(",", ".") || 0);
  }, 0);
  totalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

function calcularTodosSubtotais() {
  [...container.children].forEach((l) =>
    l.querySelector(".produto-select").dispatchEvent(new Event("change"))
  );
}

/* ---------- submit ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // validação & snapshot local
  const itens = cart
    .filter(c => c.produtoId && c.quantidade > 0)
    .map(c => ({ ...c }));

  if (!itens.length) return alert("Adicione pelo menos um item.");

  try {
    for (const item of itens) {
      const prod = produtosMap.get(item.produtoId);
      if (!prod || prod.quantidade < item.quantidade) {
        throw new Error(`Estoque insuficiente de ${prod?.nome || "produto"}`);
      }

      // registra cada item
      await addDoc(collection(db, "vendas"), {
        produto: prod.nome,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        subtotal: item.subtotal,
        criadoEm: serverTimestamp()
      });

      // atualiza estoque
      await updateDoc(doc(db, "estoque", item.produtoId), {
        quantidade: prod.quantidade - item.quantidade
      });
    }

    // reset
    form.reset();
    container.innerHTML = "";
    const linhaBase = document.createElement("div");
    linhaBase.className = "item-linha";
    linhaBase.innerHTML = container.dataset.prototype; // se quiser
    container.appendChild(linhaBase);
    cart = [];
    wiringLinha(linhaBase);
    calcularTotal();
    alert("Venda registrada com sucesso!");

  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao registrar venda.");
  }
});

/* ---------- vendas do dia em tempo real (sem mudança) ---------- */
function escutarVendasDoDia() {
  const tbody = document.querySelector("#tabela-vendas tbody");
  const totalDia = document.getElementById("total-dia");

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, "vendas"),
    where("criadoEm", ">=", Timestamp.fromDate(hoje)),
    orderBy("criadoEm", "asc")
  );

  onSnapshot(q, (snap) => {
    tbody.innerHTML = "";
    let total = 0;

    const agrupado = {};

    snap.forEach((docSnap) => {
      const v = docSnap.data();
      const nome = v.produto;

      if (!agrupado[nome]) {
        agrupado[nome] = {
          quantidade: 0,
          subtotal: 0,
        };
      }

      agrupado[nome].quantidade += v.quantidade;
      agrupado[nome].subtotal += v.subtotal;
    });

    Object.entries(agrupado).forEach(([produto, dados]) => {
      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${produto}</td>
          <td>${dados.quantidade}</td>
          <td>R$ ${dados.subtotal.toFixed(2)}</td>
          <td>${new Date().toLocaleDateString("pt-BR")}</td>
        </tr>
      `);
      total += dados.subtotal;
    });

    totalDia.textContent = `R$ ${total.toFixed(2)}`;
  });
}

