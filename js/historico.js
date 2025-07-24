import { auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  where,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- DOM ---------- */
const btnFinalizar = document.getElementById("btn-finalizar");
const btnHistorico = document.getElementById("btn-historico");
const btnVoltar = document.getElementById("btn-voltar");
const container = document.getElementById("historico-container");
const btnBuscarData = document.getElementById("btn-buscar-data");
const inputData = document.getElementById("data-historico");

/* ---------- Controle de acesso ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  const snap = await getDoc(doc(db, "usuarios", user.uid));
  const perfil = snap.exists() ? snap.data().tipo : null;

  if (perfil !== "admin") {
    alert("Acesso restrito a administradores.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  carregarHistorico(); // Carrega histórico de hoje
});

/* ---------- Finalizar expediente ---------- */
btnFinalizar?.addEventListener("click", async () => {
  if (!confirm("Confirma o encerramento do expediente?")) return;

  try {
    await addDoc(collection(db, "historico"), {
      evento: "Expediente finalizado",
      criadoEm: serverTimestamp()
    });
    alert("Expediente finalizado e registrado no histórico.");
    carregarHistorico();
  } catch (err) {
    console.error(err);
    alert("Erro ao registrar expediente.");
  }
});

/* ---------- Botão ver histórico de hoje ---------- */
btnHistorico?.addEventListener("click", carregarHistorico);

/* ---------- Botão buscar por data ---------- */
btnBuscarData?.addEventListener("click", () => {
  const dataSelecionada = inputData?.value;
  if (!dataSelecionada) {
    alert("Selecione uma data válida.");
    return;
  }

  // ✅ Correção: cria a data no fuso local (sem UTC)
  const partes = dataSelecionada.split("-");
  const dataObj = new Date(
    partes[0],
    partes[1] - 1, // mês começa do zero
    partes[2]
  );

  carregarHistoricoPorData(dataObj);
});

/* ---------- Botão voltar ---------- */
btnVoltar?.addEventListener("click", () => {
  window.history.back();
});

/* ---------- Utilitário: intervalo de datas ---------- */
function getIntervaloData(dataBase) {
  const inicio = new Date(dataBase);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 1);
  return { inicio, fim, formatado: inicio.toLocaleDateString("pt-BR") };
}

/* ---------- Carregar histórico de hoje ---------- */
function carregarHistorico() {
  const hoje = new Date();
  carregarHistoricoPorData(hoje);
}

/* ---------- Carrega histórico de uma data específica ---------- */
async function carregarHistoricoPorData(dataAlvo) {
  container.innerHTML = "<p>Carregando…</p>";

  try {
    const { inicio, fim, formatado } = getIntervaloData(dataAlvo);

    // 1. VENDAS
    const vendasSnap = await getDocs(
      query(collection(db, "vendas"),
        orderBy("criadoEm"),
        where("criadoEm", ">=", inicio),
        where("criadoEm", "<", fim)
      )
    );

    const vendasAgrupadas = {};
    vendasSnap.forEach((doc) => {
      const venda = doc.data();
      const produto = venda.produto;

      if (!vendasAgrupadas[produto]) {
        vendasAgrupadas[produto] = {
          quantidade: 0,
          subtotal: 0
        };
      }

      vendasAgrupadas[produto].quantidade += venda.quantidade;
      vendasAgrupadas[produto].subtotal += venda.subtotal;
    });

    // 2. LOG DE EVENTOS
    const logSnap = await getDocs(
      query(collection(db, "historico"),
        orderBy("criadoEm"),
        where("criadoEm", ">=", inicio),
        where("criadoEm", "<", fim)
      )
    );

    const eventos = [];
    logSnap.forEach((d) => {
      const { evento, criadoEm } = d.data();
      const dataStr = criadoEm?.toDate?.().toLocaleString("pt-BR") || "N/A";
      eventos.push(`${dataStr} — ${evento}`);
    });

    // 3. MONTA HTML
    let html = "";

    if (Object.keys(vendasAgrupadas).length) {
      html += `<h2>📊 Vendas em ${formatado}</h2>`;
      const linhas = Object.entries(vendasAgrupadas).map(([produto, info]) => `
        <tr>
          <td>${produto}</td>
          <td>${info.quantidade}</td>
          <td>R$ ${info.subtotal.toFixed(2)}</td>
        </tr>
      `).join("");

      const totalDia = Object.values(vendasAgrupadas)
        .reduce((acc, p) => acc + p.subtotal, 0);

      html += `
        <section class="bloco-dia">
          <h3>🗓️ ${formatado}</h3>
          <table class="tabela-dia">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${linhas}
              <tr style="font-weight:bold; background:#f2f2f2;">
                <td colspan="2">TOTAL DO DIA</td>
                <td>R$ ${totalDia.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      `;
    } else {
      html += `<p>Sem vendas registradas em ${formatado}.</p>`;
    }

    // LOG DE EVENTOS
    html += `<h2>🗒️ Log de Eventos em ${formatado}</h2>`;
    if (eventos.length) {
      html += "<ul>" + eventos.map(e => `<li>${e}</li>`).join("") + "</ul>";
    } else {
      html += `<p>Sem eventos registrados em ${formatado}.</p>`;
    }

    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Erro ao carregar histórico.</p>";
  }
}