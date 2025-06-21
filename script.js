let vendas = JSON.parse(localStorage.getItem('vendas')) || [];
let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
let historico = JSON.parse(localStorage.getItem('historicoExpedientes')) || [];
let totalGeral = 0;

// ========== FUNÇÃO SALVAR ==========
function salvarDados() {
  localStorage.setItem('vendas', JSON.stringify(vendas));
  localStorage.setItem('produtos', JSON.stringify(produtos));
  localStorage.setItem('historicoExpedientes', JSON.stringify(historico));
}

// ========== VENDAS ==========
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
      <td>
        <button onclick="removerVenda(${index})" style="background: red; color: white;">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('total-vendas').textContent = totalGeral.toFixed(2);
  atualizarLucro();
}

function removerVenda(index) {
  if (confirm('Deseja realmente excluir esta venda?')) {
    vendas.splice(index, 1);
    salvarDados();
    atualizarTabelaVendas();
    atualizarTabelaEstoque();
    atualizarTabelaProdutos();
  }
}

document.getElementById('form-venda').addEventListener('submit', function (e) {
  e.preventDefault();

  const produto = document.getElementById('produto').value.trim();
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
  atualizarTabelaProdutos();

  this.reset();
});

// ========== PRODUTOS ==========
function atualizarTabelaProdutos() {
  const tbody = document.querySelector('#tabela-produtos tbody');
  tbody.innerHTML = '';

  const estoque = calcularEstoque();

  produtos.forEach((produto, index) => {
    const quantidadeAtual = estoque[produto.nome]?.quantidade ?? 0;
    const total = quantidadeAtual * produto.preco;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${quantidadeAtual}</td>
      <td>R$ ${produto.preco.toFixed(2)}</td>
      <td>R$ ${total.toFixed(2)}</td>
      <td>${produto.dataCadastro}</td>
      <td>
        <button onclick="excluirProduto(${index})" style="background: red; color: white;">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function excluirProduto(index) {
  const confirma = confirm(`Tem certeza que deseja excluir o produto "${produtos[index].nome}"?`);
  if (confirma) {
    produtos.splice(index, 1);
    salvarDados();
    atualizarTabelaProdutos();
    atualizarTabelaEstoque();
  }
}

document.getElementById('form-produto').addEventListener('submit', function (e) {
  e.preventDefault();

  const nome = document.getElementById('nome-produto').value.trim();
  const quantidade = parseInt(document.getElementById('quantidade-produto').value);
  const preco = parseFloat(document.getElementById('preco-produto').value);
  const dataCadastro = new Date().toLocaleString();

  if (!nome || quantidade < 0 || preco <= 0) {
    alert('Preencha corretamente os dados do produto.');
    return;
  }

  const existente = produtos.find(p => p.nome.toLowerCase() === nome.toLowerCase());
  if (existente) {
    existente.quantidade += quantidade;
    existente.preco = preco;
    existente.dataCadastro = dataCadastro;
  } else {
    produtos.push({ nome, quantidade, preco, dataCadastro });
  }

  salvarDados();
  atualizarTabelaProdutos();
  atualizarTabelaEstoque();

  this.reset();
  alert('Produto cadastrado ou atualizado com sucesso!');
});

// ========== ESTOQUE ==========
function calcularEstoque() {
  const estoque = {};

  produtos.forEach(produto => {
    estoque[produto.nome] = {
      quantidade: produto.quantidade,
      preco: produto.preco
    };
  });

  vendas.forEach(venda => {
    if (estoque[venda.produto]) {
      estoque[venda.produto].quantidade -= venda.quantidade;
      if (estoque[venda.produto].quantidade < 0) {
        estoque[venda.produto].quantidade = 0;
      }
    }
  });

  return estoque;
}

function atualizarTabelaEstoque() {
  const tbody = document.querySelector('#tabela-estoque tbody');
  tbody.innerHTML = '';
  const estoque = calcularEstoque();

  produtos.forEach(produto => {
    const item = estoque[produto.nome] || { quantidade: 0, preco: produto.preco };

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${item.preco.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ========== LUCRO ==========
function atualizarLucro() {
  let totalCusto = 0;

  produtos.forEach(produto => {
    totalCusto += produto.quantidade * produto.preco;
  });

  const lucro = totalGeral - totalCusto;
  document.getElementById('lucro-total').textContent = lucro.toFixed(2);
}

// ========== HISTÓRICO ==========
document.getElementById('finalizar-expediente').addEventListener('click', () => {
  if (vendas.length === 0 && produtos.length === 0) {
    alert("Nenhuma venda ou produto registrado para este expediente.");
    return;
  }

  historico.push({
    data: new Date().toLocaleString(),
    vendas: [...vendas],
    produtos: [...produtos]
  });

  vendas = [];
  produtos = [];
  salvarDados();
  atualizarTabelaVendas();
  atualizarTabelaProdutos();
  atualizarTabelaEstoque();

  alert("Expediente finalizado com sucesso!");
});

document.getElementById('ver-historico').addEventListener('click', () => {
  const container = document.getElementById('historico-container');
  container.innerHTML = '';

  if (historico.length === 0) {
    container.innerHTML = '<p>Nenhum expediente anterior registrado.</p>';
    return;
  }

  historico.forEach((exp, i) => {
    const totalVendas = exp.vendas.reduce((s, v) => s + v.quantidade * v.preco, 0);
    const totalProdutos = exp.produtos.reduce((s, p) => s + p.quantidade * p.preco, 0);
    const lucro = totalVendas - totalProdutos;

    const div = document.createElement('div');
    div.innerHTML = `
      <h4>Expediente ${i + 1} - ${exp.data}</h4>
      <p><strong>Total de Vendas:</strong> R$ ${totalVendas.toFixed(2)}</p>
      <p><strong>Total de Produtos:</strong> R$ ${totalProdutos.toFixed(2)}</p>
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

// ========== INICIALIZAÇÃO ==========
atualizarTabelaVendas();
atualizarTabelaProdutos();
atualizarTabelaEstoque();

window.addEventListener('DOMContentLoaded', () => {
  const abaSalva = localStorage.getItem('abaAtiva') || 'vendas';
  mostrarAba(abaSalva);
});
