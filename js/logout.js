import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth();

const logoutBtn = document.getElementById("logout-btn") || document.getElementById("btn-logout");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      // Limpar qualquer dado local adicional, se quiser
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "login.html";
    } catch (error) {
      console.error("Erro ao sair:", error);
      alert("Erro ao sair. Tente novamente.");
    }
  });
}
