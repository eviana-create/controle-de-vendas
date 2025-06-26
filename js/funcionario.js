import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCR3Q0HR9CPANGR8aIiGOn-5NP66e7CmcI",
  authDomain: "adega-lounge.firebaseapp.com",
  projectId: "adega-lounge",
  storageBucket: "adega-lounge.firebasestorage.app",
  messagingSenderId: "729628267147",
  appId: "1:729628267147:web:dfee9147983c57fe3f3a8e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const docRef = doc(db, "usuarios", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    alert("Usuário sem perfil definido.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  const tipoUsuario = docSnap.data().tipo;

  if (tipoUsuario !== "funcionario") {
    alert("Acesso restrito a funcionários.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  // Se quiser esconder algo no painel de funcionário, faça aqui
  // Exemplo: se existir link para admin, esconda-o
  const adminLink = document.querySelector('a[href="admin.html"]');
  if (adminLink) adminLink.style.display = "none";
});

// Logout no botão
document.getElementById("btn-logout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
