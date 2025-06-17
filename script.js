const form = document.getElementById('form-venda');
const tabela = document.querySelector('#tabela-vendas tbody');
const totalVendas = document.getElementById('total-vendas');

// Carrega do localStorage ou cria lista vazia
let vendas = JSON.parse(localStorage.getItem('vendas')) || [];

function atualizarTabela() {
  tabela.innerHTML = '';
  let total = 0;

  vendas.forEach(venda => {
    const totalItem = venda.quantidade * venda.preco;
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td>${venda.produto}</td>
      <td>${venda.quantidade}</td>
      <td>${venda.preco.toFixed(2)}</td>
      <td>${totalItem.toFixed(2)}</td>
    `;
    tabela.appendChild(linha);
    total += totalItem;
  });

  totalVendas.textContent = total.toFixed(2);
}

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const produto = document.getElementById('produto').value;
  const quantidade = parseInt(document.getElementById('quantidade').value);
  const preco = parseFloat(document.getElementById('preco').value);

  const novaVenda = { produto, quantidade, preco };
  vendas.push(novaVenda);

  // Salva no localStorage
  localStorage.setItem('vendas', JSON.stringify(vendas));

  atualizarTabela();
  form.reset();
});

// Atualiza a tabela ao abrir a página
document.addEventListener('DOMContentLoaded', atualizarTabela);
