import { logout, cadastrarUsuario, getUsuarioAtual } from './auth.js';
import { adicionarProduto, listarProdutos, excluirProduto } from './estoque.js';

const btnLogout = document.getElementById('btn-logout');
const formCadastro = document.getElementById('form-cadastrar-usuario');
const formProduto = document.getElementById('form-adicionar-produto');
const tabelaProdutos = document.querySelector('#tabela-produtos tbody');

btnLogout.addEventListener('click', async () => {
  await logout();
  window.location.href = 'login.html';
});

// Verifica sessão
const usuario = getUsuarioAtual();
if (!usuario.uid || usuario.tipo !== 'admin') {
  alert('Acesso negado.');
  window.location.href = 'login.html';
}

// Cadastrar usuário
formCadastro.addEventListener('submit', async e => {
  e.preventDefault();
  const email = formCadastro.email.value.trim();
  const senha = formCadastro.senha.value.trim();
  const tipo = formCadastro.tipo.value;
  const codigo = formCadastro['codigo-autorizacao'].value.trim();

  const res = await cadastrarUsuario(email, senha, tipo, codigo);
  if (res.success) {
    alert('Usuário cadastrado com sucesso!');
    formCadastro.reset();
  } else {
    alert('Erro: ' + res.error);
  }
});

// Produtos
async function carregarProdutos() {
  tabelaProdutos.innerHTML = '';
  const produtos = await listarProdutos();
  produtos.forEach(prod => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prod.nome}</td>
      <td>${prod.quantidade}</td>
      <td>R$ ${prod.preco.toFixed(2)}</td>
      <td><button data-id="${prod.id}" class="btn-excluir">Excluir</button></td>
    `;
    tabelaProdutos.appendChild(tr);
  });

  // Binda exclusão
  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.onclick = async (e) => {
      if (confirm('Excluir produto?')) {
        await excluirProduto(e.target.dataset.id);
        carregarProdutos();
      }
    };
  });
}

formProduto.addEventListener('submit', async e => {
  e.preventDefault();
  const nome = formProduto['nome-produto'].value.trim();
  const quantidade = parseInt(formProduto['quantidade-produto'].value);
  const preco = parseFloat(formProduto['preco-produto'].value);

  try {
    await adicionarProduto(nome, quantidade, preco);
    alert('Produto adicionado/atualizado!');
    formProduto.reset();
    carregarProdutos();
  } catch (error) {
    alert('Erro ao adicionar produto: ' + error.message);
  }
});

carregarProdutos();
