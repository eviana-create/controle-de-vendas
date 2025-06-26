document.addEventListener('DOMContentLoaded', () => {
  const usuarioLogado = localStorage.getItem('usuario') || 'Usuário';
  const tipoUsuario = localStorage.getItem('tipoUsuario');

  document.getElementById('usuario-logado').textContent = usuarioLogado;

  if (tipoUsuario === 'admin') {
    document.getElementById('btn-admin').style.display = 'inline-block';
  }

  const abaSalva = localStorage.getItem('abaAtiva') || 'vendas';
  mostrarAba(abaSalva);
});

function mostrarAba(id) {
  document.querySelectorAll('.aba').forEach(div => div.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  localStorage.setItem('abaAtiva', id);
}

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}
