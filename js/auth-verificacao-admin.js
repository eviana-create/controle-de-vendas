import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "../firebase/firebaseConfig.js";

document.body.style.display = "none"; // Oculta o conteúdo até validar o acesso

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
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

    document.body.style.display = "block"; // Exibe conteúdo liberado para admins

  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    await signOut(auth);
    window.location.href = "login.html";
  }
});

// Garante que o botão logout existe antes de tentar escutar o evento
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });
  }
});
