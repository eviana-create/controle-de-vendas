
let vendas = JSON.parse(localStorage.getItem('vendas')) || [];
let compras = JSON.parse(localStorage.getItem('compras')) || [];
let totalGeral = 0;

// Salva dados no localStorage
function salvarDados() {
  localStorage.setItem('vendas', JSON.stringify(vendas));
  localStorage.setItem('compras', JSON.stringify(compras));
}

// Atualiza a tabela de vendas
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

// Remove uma venda
function removerVenda(index) {
  vendas.splice(index, 1);
  salvarDados();
  atualizarTabelaVendas();
}

// Registro de nova venda
document.getElementById('form-venda').addEventListener('submit', function (e) {
  e.preventDefault();

  const produto = document.getElementById('produto').value;
  const quantidade = parseInt(document.getElementById('quantidade').value);
  const preco = parseFloat(document.getElementById('preco').value);
  const dataVenda = new Date().toLocaleString(); // data + hora

  if (!produto || quantidade <= 0 || preco <= 0) {
    alert('Preencha corretamente os dados da venda.');
    return;
  }

  vendas.push({ produto, quantidade, preco, dataVenda });
  salvarDados();
  atualizarTabelaVendas();

  document.getElementById('produto').value = '';
  document.getElementById('quantidade').value = '';
  document.getElementById('preco').value = '';
});

// Registro de nova compra
document.getElementById('form-compra').addEventListener('submit', function (e) {
  e.preventDefault();

  const produto = document.getElementById('produto-compra').value;
  const quantidade = parseInt(document.getElementById('quantidade-compra').value);
  const preco = parseFloat(document.getElementById('preco-compra').value);
  const dataCompra = new Date().toLocaleString(); // data + hora

  if (!produto || quantidade <= 0 || preco <= 0) {
    alert('Preencha corretamente os dados da compra.');
    return;
  }

  compras.push({ produto, quantidade, preco, dataCompra });
  salvarDados();
  atualizarTabelaCompras();

  document.getElementById('produto-compra').value = '';
  document.getElementById('quantidade-compra').value = '';
  document.getElementById('preco-compra').value = '';

  alert('Compra registrada com sucesso!');
});

// Atualiza a tabela de compras
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

// Calcula e atualiza o lucro
function atualizarLucro() {
  let totalCompras = 0;

  compras.forEach(compra => {
    totalCompras += compra.quantidade * compra.preco;
  });

  const lucro = totalGeral - totalCompras;
  document.getElementById('lucro-total').textContent = lucro.toFixed(2);
}

// Finaliza expediente e salva no histórico
document.getElementById('finalizar-expediente').addEventListener('click', () => {
  if (vendas.length === 0 && compras.length === 0) {
    alert("Nenhuma venda ou compra registrada para este expediente.");
    return;
  }

  const historico = JSON.parse(localStorage.getItem('historicoExpedientes')) || [];

  const novoExpediente = {
    data: new Date().toLocaleString(),
    vendas: vendas,
    compras: compras
  };

  historico.push(novoExpediente);
  localStorage.setItem('historicoExpedientes', JSON.stringify(historico));

  vendas = [];
  compras = [];
  salvarDados();
  atualizarTabelaVendas();
  atualizarTabelaCompras();

  alert("Expediente finalizado com sucesso!");
});

// Exibe histórico de expedientes
document.getElementById('ver-historico').addEventListener('click', () => {
  const historico = JSON.parse(localStorage.getItem('historicoExpedientes')) || [];
  const container = document.getElementById('historico-container');
  container.innerHTML = '';

  if (historico.length === 0) {
    container.innerHTML = '<p>Nenhum expediente anterior registrado.</p>';
    return;
  }

  historico.forEach((exp, i) => {
    let totalVendas = 0;
    let totalCompras = 0;

    exp.vendas.forEach(venda => {
      totalVendas += venda.quantidade * venda.preco;
    });

    exp.compras.forEach(compra => {
      totalCompras += compra.quantidade * compra.preco;
    });

    const lucro = totalVendas - totalCompras;

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
});

// Inicialização
atualizarTabelaVendas();
atualizarTabelaCompras();
