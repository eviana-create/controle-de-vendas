import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔧 Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR3Q0HR9CPANGR8aIiGOn-5NP66e7CmcI",
  authDomain: "adega-lounge.firebaseapp.com",
  projectId: "adega-lounge",
  storageBucket: "adega-lounge.appspot.com",
  messagingSenderId: "729628267147",
  appId: "1:729628267147:web:dfee9147983c57fe3f3a8e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔐 Verificação de autenticação e tipo de usuário
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Aguarda sincronização do Firebase Auth
    setTimeout(() => {
      if (!auth.currentUser) {
        window.location.href = "login.html";
      }
    }, 300);
    return;
  }

  try {
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      alert("Usuário sem perfil definido.");
      await signOut(auth);
      window.location.href = "login.html";
      return;
    }

    const tipoUsuario = docSnap.data().tipo;

    if (tipoUsuario !== "admin") {
      alert("Acesso restrito a administradores.");
      await signOut(auth);
      window.location.href = "login.html";
      return;
    }

    // ✅ Acesso permitido: mostra o conteúdo
    document.body.style.display = "block";

  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    await signOut(auth);
    window.location.href = "login.html";
  }
});

// 🔘 Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
