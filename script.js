let vendas = JSON.parse(localStorage.getItem('vendas')) || [];
let compras = JSON.parse(localStorage.getItem('compras')) || [];
let totalGeral = 0;

// Salva vendas e compras no localStorage
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
}

// Remove uma venda pelo índice
function removerVenda(index) {
  vendas.splice(index, 1);
  salvarDados();
  atualizarTabelaVendas();
}

// Envia o formulário de venda
document.getElementById('form-venda').addEventListener('submit', function (e) {
  e.preventDefault();

  const produto = document.getElementById('produto').value;
  const quantidade = parseInt(document.getElementById('quantidade').value);
  const preco = parseFloat(document.getElementById('preco').value);
  const dataVenda = new Date().toLocaleDateString();

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

// Envia o formulário de compra
document.getElementById('form-compra').addEventListener('submit', function (e) {
  e.preventDefault();

  const produto = document.getElementById('produto-compra').value;
  const quantidade = parseInt(document.getElementById('quantidade-compra').value);
  const preco = parseFloat(document.getElementById('preco-compra').value);
  const dataCompra = document.getElementById('data-compra').value;

  if (!produto || quantidade <= 0 || preco <= 0 || !dataCompra) {
    alert('Preencha corretamente os dados da compra.');
    return;
  }

  compras.push({ produto, quantidade, preco, dataCompra });
  salvarDados();
  atualizarTabelaCompras();

  document.getElementById('produto-compra').value = '';
  document.getElementById('quantidade-compra').value = '';
  document.getElementById('preco-compra').value = '';
  document.getElementById('data-compra').value = '';

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
}

// Inicializa as tabelas ao carregar a página
atualizarTabelaVendas();
atualizarTabelaCompras();
