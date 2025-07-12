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

    // Agrupar por cliente
    const creditosPorCliente = new Map();

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const cliente   = data.cliente   ?? 'Sem cliente';
      const produto   = data.produto   ?? '-';
      const subtotal  = data.subtotal  ?? 0;
      const quantidade= data.quantidade?? 0;
      const criadoEm  = data.criadoEm  ? data.criadoEm.toDate() : null;

      if (!creditosPorCliente.has(cliente)) {
        creditosPorCliente.set(cliente, {
          total: 0,
          produtos: new Map(),
          ultimaData: criadoEm
        });
      }

      const entry = creditosPorCliente.get(cliente);
      entry.total += subtotal;

      const qtdAtual = entry.produtos.get(produto) || 0;
      entry.produtos.set(produto, qtdAtual + quantidade);

      if (!entry.ultimaData || (criadoEm && criadoEm > entry.ultimaData)) {
        entry.ultimaData = criadoEm;
      }
    });

    // Exibir na tabela
    tabelaCreditosBody.innerHTML = '';

    for (const [cliente, info] of creditosPorCliente.entries()) {
      const produtosResumo = Array.from(info.produtos.entries())
        .map(([prod, qtd]) => `${prod} (${qtd})`)
        .join(', ');

      const dataFormatada = info.ultimaData
        ? info.ultimaData.toLocaleString()
        : '-';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${cliente}</td>
        <td>${produtosResumo}</td>
        <td>R$ ${info.total.toFixed(2)}</td>
        <td>${dataFormatada}</td>
        <td><button class="pagar-btn" data-cliente="${cliente}">Pagar</button></td>
      `;

      tabelaCreditosBody.appendChild(tr);
    }

    // Adicionar listeners aos botões "Pagar"
    document.querySelectorAll('.pagar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cliente = btn.dataset.cliente;
        pagarCreditoCliente(cliente);
      });
    });

  } catch (err) {
    console.error("Erro ao carregar créditos:", err);
    tabelaCreditosBody.innerHTML = `<tr><td colspan="5">Erro ao carregar créditos.</td></tr>`;
  }
}

async function pagarCreditoCliente(cliente) {
  if (!confirm(`Confirma quitação de todos os débitos do cliente "${cliente}"?`)) return;

  try {
    const q = query(collection(db, 'creditos'), where('cliente', '==', cliente));
    const snap = await getDocs(q);

    if (snap.empty) {
      alert("Nenhum crédito encontrado para este cliente.");
      return;
    }

    for (const docSnap of snap.docs) {
      await deleteDoc(doc(db, 'creditos', docSnap.id));
    }

    alert(`Crédito de "${cliente}" quitado com sucesso!`);
    carregarCreditos();

  } catch (err) {
    console.error("Erro ao quitar crédito:", err);
    alert("Erro ao quitar crédito.");
  }
}

document.addEventListener('DOMContentLoaded', carregarCreditos);
