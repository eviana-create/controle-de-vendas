import { db } from './firebaseConfig.js';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const tabelaCreditosBody = document.querySelector('#tabela-creditos tbody');

async function carregarCreditos() {
  tabelaCreditosBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';

  try {
    const colecao = collection(db, 'creditos');
    const snap = await getDocs(query(colecao, orderBy('criadoEm', 'desc')));

    if (snap.empty) {
      tabelaCreditosBody.innerHTML = '<tr><td colspan="5">Nenhum crédito registrado.</td></tr>';
      return;
    }

    /* ---------- Agrupa por cliente ---------- */
    const creditosPorCliente = new Map();

    snap.forEach(docSnap => {
      const d = docSnap.data();
      const cliente   = d.cliente   ?? 'Sem cliente';
      const produto   = d.produto   ?? '-';
      const subtotal  = d.subtotal  ?? 0;
      const quantidade= d.quantidade?? 0;
      const criadoEm  = d.criadoEm  ? d.criadoEm.toDate() : null;

      if (!creditosPorCliente.has(cliente)) {
        creditosPorCliente.set(cliente, {
          total: 0,
          produtos: new Map(),
          ultimaData: criadoEm
        });
      }
      const entry = creditosPorCliente.get(cliente);

      entry.total += subtotal;
      entry.produtos.set(produto, (entry.produtos.get(produto) || 0) + quantidade);
      if (!entry.ultimaData || (criadoEm && criadoEm > entry.ultimaData)) entry.ultimaData = criadoEm;
    });

    /* ---------- Renderiza tabela ---------- */
    tabelaCreditosBody.innerHTML = '';

    for (const [cliente, info] of creditosPorCliente.entries()) {
      const produtosResumo = Array.from(info.produtos.entries())
        .map(([prod, qtd]) => `${prod} (${qtd})`)
        .join(', ');

      const dataFmt = info.ultimaData ? info.ultimaData.toLocaleString() : '-';

      tabelaCreditosBody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${cliente}</td>
          <td>${produtosResumo}</td>
          <td>R$ ${info.total.toFixed(2)}</td>
          <td>${dataFmt}</td>
          <td><button class="pagar-btn" data-cliente="${cliente}">Pagar</button></td>
        </tr>
      `);
    }

    /* ---------- Listener botão Pagar ---------- */
    tabelaCreditosBody.querySelectorAll('.pagar-btn').forEach(btn => {
      btn.addEventListener('click', () => pagarCreditoCliente(btn.dataset.cliente));
    });

  } catch (err) {
    console.error('Erro ao carregar créditos:', err);
    tabelaCreditosBody.innerHTML = '<tr><td colspan="5">Erro ao carregar créditos.</td></tr>';
  }
}

/* ---------- Quitar todos os débitos de um cliente ---------- */
async function pagarCreditoCliente(cliente) {
  if (!confirm(`Confirma quitação do crédito do cliente "${cliente}"?`)) return;

  try {
    const q = query(collection(db, 'creditos'), where('cliente', '==', cliente));
    const snap = await getDocs(q);

    if (snap.empty) {
      alert(`Nenhum crédito encontrado para "${cliente}".`);
      return;
    }

    for (const docSnap of snap.docs) {
      await deleteDoc(doc(db, 'creditos', docSnap.id));
    }

    alert(`Crédito de "${cliente}" quitado!`);
    carregarCreditos();

  } catch (err) {
    console.error('Erro ao quitar crédito:', err);
    alert('Erro ao quitar crédito.');
  }
}

document.addEventListener('DOMContentLoaded', carregarCreditos);
