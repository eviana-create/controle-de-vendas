import { auth, db } from './firebaseConfig.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ---------- DOM ---------- */
const btnFinalizar = document.getElementById('btn-finalizar');
const btnHistorico = document.getElementById('btn-historico');
const container = document.getElementById('historico-container');

/* ---------- Controle de acesso ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = 'login.html');

  const snap = await getDocs(
    query(collection(db, 'usuarios'), orderBy('uid'))
  );
  const perfil = snap.docs.find((d) => d.id === user.uid)?.data()?.tipo;

  if (perfil !== 'admin') {
    alert('Acesso restrito a administradores.');
    await signOut(auth);
    window.location.href = 'login.html';
  }
});

/* ---------- Finalizar expediente ---------- */
btnFinalizar.addEventListener('click', async () => {
  if (!confirm('Confirma o encerramento do expediente?')) return;

  try {
    await addDoc(collection(db, 'historico'), {
      evento: 'Expediente finalizado',
      criadoEm: serverTimestamp()
    });
    alert('Expediente finalizado e registrado no histórico.');
    carregarHistorico(); // já exibe o log atualizado
  } catch (err) {
    console.error(err);
    alert('Erro ao registrar expediente.');
  }
});

/* ---------- Ver histórico ---------- */
btnHistorico.addEventListener('click', carregarHistorico);

async function carregarHistorico() {
  container.innerHTML = '<p>Carregando…</p>';

  try {
    const snap = await getDocs(
      query(collection(db, 'historico'), orderBy('criadoEm', 'desc'))
    );
    if (snap.empty) return (container.innerHTML = '<p>Sem registros.</p>');

    const ul = document.createElement('ul');
    snap.forEach((d) => {
      const { evento, criadoEm } = d.data();
      const li = document.createElement('li');
      const data = criadoEm?.toDate()?.toLocaleString('pt-BR') || 'N/A';
      li.textContent = `${data} — ${evento}`;
      ul.appendChild(li);
    });
    container.innerHTML = '';
    container.appendChild(ul);
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Erro ao carregar histórico.</p>';
  }
}
