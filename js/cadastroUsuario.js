import { auth, db, firebaseConfig } from './firebaseConfig.js';
import {
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

/* ---------- instância secundária ---------- */
const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
const secondaryAuth = getAuth(secondaryApp);
await setPersistence(secondaryAuth, browserLocalPersistence); // evita warning

/* ---------- evento submit ---------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // ...validar campos...

  try {
    /* cria usuário NA instância secundária */
    const { user } = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      senha
    );

    /* grava perfil na coleção usuarios */
    await setDoc(doc(db, 'usuarios', user.uid), { nome, tipo });

    /* opcional: desloga a instância secundária */
    await secondaryAuth.signOut();

    msgSucesso.textContent = 'Usuário criado com sucesso!';
    form.reset();
  } catch (err) {
    exibirErro(traduzErro(err.code));
  }
});
