import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("historico-container");
  const filtroData = document.getElementById("filtro-data");
  const btnFiltrar = document.getElementById("btn-filtrar");

  if (!container) return;

  const vendasRef = collection(db, "vendas");
  const vendasQuery = query(vendasRef, orderBy("timestamp", "desc"));

  let vendas = [];

  try {
    const snapshot = await getDocs(vendasQuery);
    if (snapshot.empty) {
      alert("Nenhum evento registrado.");
      return;
    }

    snapshot.forEach(doc => {
      const venda = doc.data();
      vendas.push(venda);
    });

    // Ao carregar a página, mostrar apenas vendas do dia atual
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split("T")[0];
    exibirVendasPorData(vendas, hojeStr);

    // Evento de filtro manual
    btnFiltrar.addEventListener("click", () => {
      const dataSelecionada = filtroData.value;
      if (dataSelecionada) {
        exibirVendasPorData(vendas, dataSelecionada);
      } else {
        exibirVendasPorData(vendas, hojeStr); // volta para hoje
      }
    });

  } catch (erro) {
    console.error("Erro ao carregar histórico:", erro);
    alert("Erro ao carregar histórico.");
  }

  function exibirVendasPorData(lista, dataStr) {
    container.innerHTML = ""; // Limpa antes

    const vendasFiltradas = lista.filter(v => {
      const dataVenda = new Date(v.timestamp?.seconds * 1000 || 0);
      const dataVendaStr = dataVenda.toISOString().split("T")[0];
      return dataVendaStr === dataStr;
    });

    if (vendasFiltradas.length === 0) {
      container.innerHTML = `<p>Nenhuma venda registrada para ${dataStr}.</p>`;
      return;
    }

    const tabela = document.createElement("table");
    tabela.className = "tabela-dia";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Produto</th>
        <th>Qtd</th>
        <th>Preço</th>
        <th>Total</th>
      </tr>
    `;
    tabela.appendChild(thead);

    const tbody = document.createElement("tbody");
    let totalDia = 0;

    vendasFiltradas.forEach(venda => {
      if (!venda.itens || !Array.isArray(venda.itens)) return;

      venda.itens.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        totalDia += subtotal;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.nome}</td>
          <td>${item.quantidade}</td>
          <td>R$ ${item.preco.toFixed(2)}</td>
          <td>R$ ${subtotal.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
      });
    });

    const rowTotal = document.createElement("tr");
    rowTotal.innerHTML = `
      <td colspan="3"><strong>Total do Dia</strong></td>
      <td><strong>R$ ${totalDia.toFixed(2)}</strong></td>
    `;
    tbody.appendChild(rowTotal);

    tabela.appendChild(tbody);
    container.appendChild(tabela);
  }
});
