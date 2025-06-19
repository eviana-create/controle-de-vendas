// script.js
let vendas = JSON.parse(localStorage.getItem('vendas')) || [];
let compras = JSON.parse(localStorage.getItem('compras')) || [];
let historico = JSON.parse(localStorage.getItem('historicoExpedientes')) || [];
let totalGeral = 0;

function salvarDados() {
  localStorage.setItem('vendas', JSON.stringify(vendas));
  localStorage.setItem('compras', JSON.stringify(compras));
  localStorage.setItem('historicoExpedientes', JSON.stringify(historico));
}

function atualizarTabelaVendas() {
  const tbody = document.querySelector('#tabela-vendas tbody');
  tbody.innerHTML = '';
  totalGeral = 0;

  vendas.forEach((venda, index) => {
    const total = venda.quantidade * venda.preco;
    totalGeral += total;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${venda.produto}</td>
      <td>${venda.quantidade}</td>
      <td>R$ ${venda.preco.toFixed(2)}</td>
      <td>R$ ${total.toFixed(2)}</td>
      <td>${venda.dataVenda}</td>
      <td><button onclick="removerVenda(${index})">Remover</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('total-vendas').textContent = totalGeral.toFixed(2);
  atualizarLucro();
}

function removerVenda(index) {
  vendas.splice(index, 1);
  salvarDados();
  atualizarTabelaVendas();
  atualizarTabelaEstoque();
}

document.getElementById('form-venda').addEventListener('submit', function (e) {
  e.preventDefault();

  const produto = document.getElementById('produto').value;
  const quantidade = parseInt(document.getElementById('quantidade').value);
  const preco = parseFloat(document.getElementById('preco').value);
  const dataVenda = new Date().toLocaleString();

  if (!produto || quantidade <= 0 || preco <= 0) {
    alert('Preencha corretamente os dados da venda.');
    return;
  }

  const estoque = calcularEstoque();
  if (!estoque[produto] || estoque[produto].quantidade < quantidade) {
    alert('Estoque insuficiente!');
    return;
  }

  vendas.push({ produto, quantidade, preco, dataVenda });
  salvarDados();
  atualizarTabelaVendas();
  atualizarTabelaEstoque();

  this.reset();
});

function atualizarTabelaCompras() {
  const tbody = document.querySelector('#tabela-compras tbody');
  tbody.innerHTML = '';

  compras.forEach(compra => {
    const total = compra.quantidade * compra.preco;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${compra.produto}</td>
      <td>${compra.quantidade}</td>
      <td>R$ ${compra.preco.toFixed(2)}</td>
      <td>R$ ${total.toFixed(2)}</td>
      <td>${compra.dataCompra}</td>
    `;
    tbody.appendChild(tr);
  });

  atualizarLucro();
}

document.getElementById('form-compra').addEventListener('submit', function (e) {
  e.preventDefault();

  const produto = document.getElementById('produto-compra').value;
  const quantidade = parseInt(document.getElementById('quantidade-compra').value);
  const preco = parseFloat(document.getElementById('preco-compra').value);
  const dataCompra = new Date().toLocaleString();

  if (!produto || quantidade <= 0 || preco <= 0) {
    alert('Preencha corretamente os dados da compra.');
    return;
  }

  compras.push({ produto, quantidade, preco, dataCompra });
  salvarDados();
  atualizarTabelaCompras();
  atualizarTabelaEstoque();

  this.reset();
  alert('Compra registrada com sucesso!');
});

function calcularEstoque() {
  const estoque = {};

  compras.forEach(compra => {
    if (!estoque[compra.produto]) {
      estoque[compra.produto] = { quantidade: 0, totalCompra: 0 };
    }
    estoque[compra.produto].quantidade += compra.quantidade;
    estoque[compra.produto].totalCompra += compra.quantidade * compra.preco;
  });

  vendas.forEach(venda => {
    if (!estoque[venda.produto]) {
      estoque[venda.produto] = { quantidade: 0, totalCompra: 0 };
    }
    estoque[venda.produto].quantidade -= venda.quantidade;
  });

  return estoque;
}

function atualizarTabelaEstoque() {
  const tbody = document.querySelector('#tabela-estoque tbody');
  tbody.innerHTML = '';
  const estoque = calcularEstoque();

  for (let produto in estoque) {
    const item = estoque[produto];
    const precoMedio = item.totalCompra / (item.quantidade + (vendas.filter(v => v.produto === produto).reduce((s, v) => s + v.quantidade, 0)) || 1);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${produto}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${precoMedio.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function atualizarLucro() {
  let totalCompras = 0;

  compras.forEach(compra => {
    totalCompras += compra.quantidade * compra.preco;
  });

  const lucro = totalGeral - totalCompras;
  document.getElementById('lucro-total').textContent = lucro.toFixed(2);
}

// ========== GRÁFICO DE LUCRO ==========
let chartLucro;

function gerarGraficoLucro(labels, lucros) {
  const ctx = document.getElementById('graficoLucro').getContext('2d');

  if (chartLucro) chartLucro.destroy();

  chartLucro = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Lucro por Expediente',
        data: lucros,
        backgroundColor: lucros.map(v => v >= 0 ? 'rgba(0, 200, 83, 0.6)' : 'rgba(255, 82, 82, 0.6)'),
        borderColor: lucros.map(v => v >= 0 ? 'rgba(0, 150, 0, 1)' : 'rgba(200, 0, 0, 1)'),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

document.getElementById('ver-historico').addEventListener('click', () => {
  const container = document.getElementById('historico-container');
  container.innerHTML = '';

  if (historico.length === 0) {
    container.innerHTML = '<p>Nenhum expediente anterior registrado.</p>';
    return;
  }

  const labels = [];
  const lucros = [];

  historico.forEach((exp, i) => {
    let totalVendas = 0;
    let totalCompras = 0;

    exp.vendas.forEach(v => totalVendas += v.quantidade * v.preco);
    exp.compras.forEach(c => totalCompras += c.quantidade * c.preco);

    const lucro = totalVendas - totalCompras;
    labels.push(`Exp ${i + 1}`);
    lucros.push(lucro);

    const div = document.createElement('div');
    div.innerHTML = `
      <h4>Expediente ${i + 1} - ${exp.data}</h4>
      <p><strong>Total de Vendas:</strong> R$ ${totalVendas.toFixed(2)}</p>
      <p><strong>Total de Compras:</strong> R$ ${totalCompras.toFixed(2)}</p>
      <p><strong>Lucro:</strong> <span style="color: ${lucro >= 0 ? 'green' : 'red'};">R$ ${lucro.toFixed(2)}</span></p>
      <details>
        <summary>Ver detalhes completos</summary>
        <pre>${JSON.stringify(exp, null, 2)}</pre>
      </details>
    `;
    div.style.border = '1px solid #ccc';
    div.style.margin = '10px 0';
    div.style.padding = '10px';
    container.appendChild(div);
  });

  gerarGraficoLucro(labels, lucros);
});

  
  
function gerarGraficoLucro(labels, lucros) {
  const ctx = document.getElementById('graficoLucro').getContext('2d');

  if (window.graficoLucro) window.graficoLucro.destroy();

  window.graficoLucro = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Lucro por Expediente',
        data: lucros,
        backgroundColor: lucros.map(v => v >= 0 ? 'rgba(0, 200, 83, 0.6)' : 'rgba(255, 82, 82, 0.6)'),
        borderColor: lucros.map(v => v >= 0 ? 'rgba(0, 150, 0, 1)' : 'rgba(200, 0, 0, 1)'),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `Lucro: R$ ${context.raw.toFixed(2)}`
          }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}


  const labels = [];
  const lucros = [];

  historico.forEach((exp, i) => {
    let totalVendas = 0;
    let totalCompras = 0;

    exp.vendas.forEach(v => totalVendas += v.quantidade * v.preco);
    exp.compras.forEach(c => totalCompras += c.quantidade * c.preco);

    const lucro = totalVendas - totalCompras;
    labels.push(`Exp ${i + 1}`);
    lucros.push(lucro);

    const div = document.createElement('div');
    div.innerHTML = `
      <h4>Expediente ${i + 1} - ${exp.data}</h4>
      <p><strong>Total de Vendas:</strong> R$ ${totalVendas.toFixed(2)}</p>
      <p><strong>Total de Compras:</strong> R$ ${totalCompras.toFixed(2)}</p>
      <p><strong>Lucro:</strong> <span style="color: ${lucro >= 0 ? 'green' : 'red'};">R$ ${lucro.toFixed(2)}</span></p>
      <details>
        <summary>Ver detalhes completos</summary>
        <pre>${JSON.stringify(exp, null, 2)}</pre>
      </details>
    `;
    div.style.border = '1px solid #ccc';
    div.style.margin = '10px 0';
    div.style.padding = '10px';
    container.appendChild(div);
  });

  gerarGraficoLucro(labels, lucros);
;

document.getElementById('finalizar-expediente').addEventListener('click', () => {
  if (vendas.length === 0 && compras.length === 0) {
    alert("Nenhuma venda ou compra registrada para este expediente.");
    return;
  }

  historico.push({
    data: new Date().toLocaleString(),
    vendas: [...vendas],
    compras: [...compras]
  });

  vendas = [];
  compras = [];
  salvarDados();
  atualizarTabelaVendas();
  atualizarTabelaCompras();
  atualizarTabelaEstoque();

  alert("Expediente finalizado com sucesso!");
});

// Inicialização
atualizarTabelaVendas();
atualizarTabelaCompras();
atualizarTabelaEstoque();

// Restaurar aba ativa ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
  const abaSalva = localStorage.getItem('abaAtiva') || 'vendas';
  mostrarAba(abaSalva);
});
