import { db } from './firebaseConfig.js';
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const tabelaCreditosBody = document.querySelector('#tabela-creditos tbody');

async function carregarCreditos() {
  tabelaCreditosBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';

  try {
    const colecao = collection(db, 'creditos');
    // Buscar documentos ordenados por criadoEm decrescente
    const snap = await getDocs(query(colecao, orderBy('criadoEm', 'desc')));

    if (snap.empty) {
      tabelaCreditosBody.innerHTML = '<tr><td colspan="5">Nenhum crédito registrado.</td></tr>';
      return;
    }

    // Agrupar por cliente
    const creditosPorCliente = new Map();

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const cliente = data.cliente || "Sem cliente";
      const produto = data.produto || "-";
      const subtotal = data.subtotal || 0;
      const criadoEm = data.criadoEm ? data.criadoEm.toDate() : null;

      if (!creditosPorCliente.has(cliente)) {
        creditosPorCliente.set(cliente, {
          total: 0,
          produtos: new Map(),
          ultimaData: criadoEm
        });
      }

      const entry = creditosPorCliente.get(cliente);

      // Somar subtotal
      entry.total += subtotal;

      // Contar produtos e quantidades
      if (entry.produtos.has(produto)) {
        entry.produtos.set(produto, entry.produtos.get(produto) + (data.quantidade || 0));
      } else {
        entry.produtos.set(produto, data.quantidade || 0);
      }

      // Atualizar última data
      if (!entry.ultimaData || (criadoEm && criadoEm > entry.ultimaData)) {
        entry.ultimaData = criadoEm;
      }
    });

    // Agora gerar as linhas da tabela
    tabelaCreditosBody.innerHTML = '';

    for (const [cliente, info] of creditosPorCliente.entries()) {
      // Criar string resumo produtos: "Produto (Qtd)"
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

    // Adicionar listener para botão pagar por cliente
    tabelaCreditosBody.querySelectorAll('.pagar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pagarCreditoCliente(btn.dataset.cliente);
      });
    });

  } catch (err) {
    tabelaCreditosBody.innerHTML = `<tr><td colspan="5">Erro ao carregar créditos.</td></tr>`;
    console.error("Erro ao carregar créditos:", err);
  }
}

// Função para pagar todos os créditos de um cliente (remover documentos do cliente)
async function pagarCreditoCliente(cliente) {
  if (!confirm(`Confirma pagamento e quitação do crédito do cliente "${cliente}"?`)) return;

  try {
    // Buscar todos documentos do cliente
    const colecao = collection(db, 'creditos');
    const q = query(colecao, where('cliente', '==', cliente));
    const snap = await getDocs(q);

    // Apagar todos os documentos (ou poderia criar um campo para marcar pago)
    // Aqui vamos deletar para simplificar
    const batch = db.batch ? db.batch() : null; // Verifica se batch disponível

    if (batch) {
      snap.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
    } else {
      // Se batch não disponível, deletar um a um (menos eficiente)
      for (const docSnap of snap.docs) {
        await docSnap.ref.delete();
      }
    }

    alert(`Crédito do cliente "${cliente}" quitado!`);
    await carregarCreditos();

  } catch (err) {
    console.error("Erro ao quitar crédito:", err);
    alert("Erro ao quitar crédito.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarCreditos();
});
