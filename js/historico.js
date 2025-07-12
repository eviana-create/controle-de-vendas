import { auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, getDoc, getDocs,
  serverTimestamp, query, orderBy, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- DOM ---------- */
const btnFinalizar = document.getElementById("btn-finalizar");
const btnHistorico = document.getElementById("btn-historico");
const container    = document.getElementById("historico-container");

/* ---------- Controle de acesso ---------- */
onAuthStateChanged(auth, async user => {
  if (!user) return (window.location.href = "login.html");

  const snap = await getDoc(doc(db, "usuarios", user.uid));
  const perfil = snap.exists() ? snap.data().tipo : null;

  if (perfil !== "admin") {
    alert("Acesso restrito a administradores.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  carregarHistorico();
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

/* ---------- Botão ver histórico ---------- */
btnHistorico?.addEventListener("click", carregarHistorico);

/* ---------- Carrega histórico ---------- */
async function carregarHistorico() {
  container.innerHTML = "<p>Carregando…</p>";

  try {
    /* ----- 1. VENDAS (coleção 'vendas' + fallback 'historico-vendas') ----- */
    const vendasSnap     = await getDocs(query(collection(db, "vendas"),          orderBy("criadoEm", "desc")));
    const histVendasSnap = await getDocs(query(collection(db, "historico-vendas"), orderBy("data",     "desc")));

    const vendasAgrupadas = {};

    // fun auxiliar
    const agrupar = (obj, dataObj, prod, qtd, sub) => {
      const dia = dataObj.toLocaleDateString("pt-BR");
      if (!obj[dia]) obj[dia] = {};
      if (!obj[dia][prod]) obj[dia][prod] = { quantidade: 0, subtotal: 0 };
      obj[dia][prod].quantidade += qtd;
      obj[dia][prod].subtotal   += sub;
    };

    vendasSnap.forEach(d => {
      const v = d.data();
      const data = v.criadoEm?.toDate() ?? new Date();
      agrupar(vendasAgrupadas, data, v.produto, v.quantidade ?? 0, v.subtotal ?? 0);
    });

    histVendasSnap.forEach(d => {
      const v = d.data();
      const data = v.data?.toDate() ?? new Date();
      agrupar(vendasAgrupadas, data, v.produto, v.quantidade ?? 0, v.preco * (v.quantidade ?? 1));
    });

    /* ----- 2. LOG DE EVENTOS ----- */
    const logSnap = await getDocs(query(collection(db, "historico"), orderBy("criadoEm", "desc")));
    const eventos = [];
    logSnap.forEach(d => {
      const { evento, criadoEm } = d.data();
      const dataStr = criadoEm?.toDate().toLocaleString("pt-BR") ?? "N/A";
      eventos.push(`${dataStr} — ${evento}`);
    });

    /* ----- 3. MONTA HTML ----- */
    let html = "";

    if (Object.keys(vendasAgrupadas).length) {
      html += "<h2>📊 Vendas Diárias (Agrupadas por Produto)</h2>";

      for (const [dia, produtos] of Object.entries(vendasAgrupadas)) {
        const linhas = Object.entries(produtos).map(([produto, info]) => `
          <tr>
            <td>${produto}</td>
            <td>${info.quantidade}</td>
            <td>R$ ${info.subtotal.toFixed(2)}</td>
          </tr>
        `).join("");

        const totalDia = Object.values(produtos)
          .reduce((acc, p) => acc + p.subtotal, 0);

        html += `
          <section class="bloco-dia">
            <h3>🗓️ ${dia}</h3>
            <table class="tabela-dia">
              <thead>
                <tr><th>Produto</th><th>Quantidade</th><th>Subtotal</th></tr>
              </thead>
              <tbody>
                ${linhas}
                <tr style="font-weight:bold;background:#f2f2f2;">
                  <td colspan="2">TOTAL DO DIA</td>
                  <td>R$ ${totalDia.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </section>`;
      }
    } else {
      html += "<p>Sem vendas registradas.</p>";
    }

    /* ----- eventos ----- */
    html += "<h2>🗒️ Log de Eventos</h2>";
    html += eventos.length
      ? `<ul>${eventos.map(e => `<li>${e}</li>`).join("")}</ul>`
      : "<p>Sem eventos registrados.</p>";

    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Erro ao carregar histórico.</p>";
  }
}
