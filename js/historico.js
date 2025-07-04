import { auth, db } from "./js/firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const docRef = doc(db, "usuarios", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    alert("Perfil de usuário não encontrado.");
    window.location.href = "login.html";
    return;
  }

  const tipo = docSnap.data().tipo;

  if (tipo !== "admin") {
    alert("Acesso restrito: somente administradores podem acessar esta página.");
    window.location.href = "vendas.html"; // ou outra página permitida para funcionário
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
