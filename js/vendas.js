import { auth, db } from './firebaseConfig.js';
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, addDoc,
  runTransaction, Timestamp, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let tipoUsuario = null;

const selectProduto = document.getElementById('produto-select');
const qtdInput      = document.getElementById('quantidade-venda');
const formVenda     = document.getElementById('form-venda');
const tbodyVendas   = document.querySelector('#tabela-vendas tbody');
const totalDiaCell  = document.getElementById('total-dia');

// ---------- Autenticação ----------
onAuthStateChanged(auth, async user => {
  if (!user) return location.href = 'login.html';

  const snap = await getDoc(doc(db, 'usuarios', user.uid));
  tipoUsuario = snap.exists() ? snap.data().tipo : null;

  // Oculta botões de admin p/ funcionário
  if (tipoUsuario !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.remove());
  }

  await carregarProdutos();
  await listarVendasDia();
});

// ---------- Carregar produtos no <select> ----------
async function carregarProdutos() {
  selectProduto.innerHTML = '<option value="">Selecione um produto</option>';
  const produtosSnap = await getDocs(collection(db, 'estoque'));

  produtosSnap.forEach(p => {
    const { nome, preco, quantidade } = p.data();
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${nome} — ${quantidade} und · R$ ${preco.toFixed(2)}`;
    opt.dataset.preco = preco;
    opt.dataset.nome  = nome;
    opt.dataset.qtdEstoque = quantidade;
    selectProduto.appendChild(opt);
  });
}

// ---------- Registrar venda ----------
formVenda.addEventListener('submit', async e => {
  e.preventDefault();

  const optSel   = selectProduto.selectedOptions[0];
  const prodId   = selectProduto.value;
  const prodNome = optSel?.dataset.nome;
  const precoUni = Number(optSel?.dataset.preco);
  const qtdEst   = Number(optSel?.dataset.qtdEstoque);
  const qtdVenda = Number(qtdInput.value);

  if (!prodId || qtdVenda <= 0) {
    alert('Selecione o produto e informe a quantidade.');
    return;
  }
  if (qtdVenda > qtdEst) {
    alert('Quantidade em estoque insuficiente.');
    return;
  }

  try {
    // Transação: grava venda e já reduz estoque
    await runTransaction(db, async (tx) => {
      const estoqueRef = doc(db, 'estoque', prodId);
      const estoqueSnap = await tx.get(estoqueRef);
      const estoqueAtual = estoqueSnap.data().quantidade;

      if (estoqueAtual < qtdVenda) {
        throw new Error('Estoque insuficiente (concorrência).');
      }

      // grava venda
      const vendaRef = collection(db, 'vendas');
      tx.set(doc(vendaRef), {
        produtoId: prodId,
        produto: prodNome,
        quantidade: qtdVenda,
        precoUnit: precoUni,
        subtotal: precoUni * qtdVenda,
        vendedor: auth.currentUser.uid,
        criadoEm: Timestamp.now()
      });

      // atualiza estoque
      tx.update(estoqueRef, { quantidade: estoqueAtual - qtdVenda });
    });

    formVenda.reset();
    await carregarProdutos();  // atualiza dropdown
    await listarVendasDia();   // atualiza tabela

  } catch (err) {
    console.error(err);
    alert('Falha ao registrar venda: ' + err.message);
  }
});

// ---------- Listar vendas do dia ----------
async function listarVendasDia() {
  const hoje = new Date();
  hoje.setHours(0,0,0,0); // 00h00

  const vendasQ = query(
    collection(db, 'vendas'),
    where('criadoEm', '>=', Timestamp.fromDate(hoje))
  );

  const vendasSnap = await getDocs(vendasQ);
  tbodyVendas.innerHTML = '';
  let totalDia = 0;

  vendasSnap.forEach(v => {
    const d = v.data();
    totalDia += d.subtotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.produto}</td>
      <td>${d.quantidade}</td>
      <td>R$ ${d.subtotal.toFixed(2)}</td>
      <td>${d.criadoEm.toDate().toLocaleString()}</td>
    `;
    tbodyVendas.appendChild(tr);
  });

  totalDiaCell.textContent = `R$ ${totalDia.toFixed(2)}`;
}
