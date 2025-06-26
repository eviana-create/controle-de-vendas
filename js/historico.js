import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const docRef = doc(db, "usuarios", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists() || docSnap.data().tipo !== "admin") {
    alert("Acesso restrito a administradores.");
    window.location.href = "funcionario.html";
  }
});

// Função final de expediente (exemplo)
window.finalizarExpediente = async () => {
  const data = new Date().toLocaleString();
  try {
    await addDoc(collection(db, "historico"), {
      data,
      evento: "Expediente finalizado"
    });
    alert("Expediente finalizado.");
  } catch (error) {
    console.error("Erro:", error);
  }
};

window.verHistorico = async () => {
  const container = document.getElementById("historico-container");
  container.innerHTML = "<p>Carregando...</p>";

  try {
    const querySnapshot = await getDocs(collection(db, "historico"));
    container.innerHTML = "";

    querySnapshot.forEach(doc => {
      const item = doc.data();
      const p = document.createElement("p");
      p.textContent = `${item.data} - ${item.evento}`;
      container.appendChild(p);
    });
  } catch (error) {
    container.innerHTML = "<p>Erro ao carregar histórico.</p>";
    console.error(error);
  }
};
