import { db, auth } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Função para carregar créditos
async function carregarCreditos() {
  const tbody = document.querySelector("#tabela-creditos tbody");
  tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  try {
    const snap = await getDocs(collection(db, "creditos"));
    tbody.innerHTML = "";

    if (snap.empty) {
      tbody.innerHTML = "<tr><td colspan='5'>Nenhum cliente com crédito registrado.</td></tr>";
      return;
    }

    snap.forEach(docSnap => {
      const { cliente, produto, valor, data } = docSnap.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${cliente}</td>
        <td>${produto}</td>
        <td>R$ ${parseFloat(valor).toFixed(2)}</td>
        <td>${new Date(data).toLocaleDateString()}</td>
        <td><button onclick="quitarCredito('${docSnap.id}')">Quitar</button></td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar créditos:", err);
    tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar dados.</td></tr>";
  }
}

window.quitarCredito = async (id) => {
  if (!confirm("Deseja marcar este crédito como quitado?")) return;
  try {
    await deleteDoc(doc(db, "creditos", id));
    alert("Crédito quitado com sucesso!");
    carregarCreditos();
  } catch (err) {
    console.error("Erro ao quitar crédito:", err);
    alert("Erro ao quitar crédito.");
  }
};

carregarCreditos();
