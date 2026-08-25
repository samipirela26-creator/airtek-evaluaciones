// historial.js — muestra todas las evaluaciones de un técnico y su evolución.
import { db } from "./firebase.js";
import { protegerPagina } from "./session.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

const tecnicoId = new URLSearchParams(location.search).get("tecnico");

protegerPagina(null, async () => {
  if (!tecnicoId) {
    document.getElementById("lista-evals").innerHTML = `<div class="msg error">Falta el técnico.</div>`;
    return;
  }
  // Nombre del técnico
  try {
    const t = await getDoc(doc(db, "tecnicos", tecnicoId));
    if (t.exists()) document.getElementById("tec-nombre").textContent = t.data().nombre || "Técnico";
  } catch {}

  // Evaluaciones del técnico (orden en cliente para no requerir índice)
  let evals = [];
  try {
    const snap = await getDocs(query(collection(db, "evaluaciones"), where("tecnicoId", "==", tecnicoId)));
    evals = snap.docs.map((d) => d.data()).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  } catch (err) {
    document.getElementById("lista-evals").innerHTML = `<div class="msg error">No se pudo cargar: ${err.message}</div>`;
    return;
  }

  if (!evals.length) {
    document.getElementById("tec-resumen").textContent = "Este técnico aún no tiene evaluaciones.";
    document.getElementById("lista-evals").innerHTML = `<div class="lista-vacia">Sin evaluaciones.</div>`;
    return;
  }

  // Resumen
  const proms = evals.map((e) => e.puntajes?.promedioGeneral).filter((p) => p != null);
  const promProm = proms.length ? (proms.reduce((a, b) => a + b, 0) / proms.length).toFixed(2) : "—";
  const ultimo = proms.length ? proms[proms.length - 1].toFixed(2) : "—";
  document.getElementById("tec-resumen").innerHTML =
    `${evals.length} evaluación${evals.length === 1 ? "" : "es"} · Promedio histórico <strong>${promProm}/4</strong> · Última <strong>${ultimo}/4</strong>`;

  // Gráfica de evolución
  const labels = evals.map((e) => (e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString("es-VE") : ""));
  const data = evals.map((e) => e.puntajes?.promedioGeneral ?? null);
  new Chart(document.getElementById("chart-evol"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Promedio general",
        data,
        borderColor: "#0066ff",
        backgroundColor: "rgba(0,102,255,.12)",
        fill: true,
        tension: 0.25,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 4 } },
    },
  });

  // Lista (recientes primero)
  const html = [...evals].reverse().map((e) => {
    const fecha = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleString("es-VE") : "";
    const prom = e.puntajes?.promedioGeneral;
    const badge = prom != null ? `${prom.toFixed(2)} / 4` : "—";
    return `<div class="lista-item">
      <div><strong>${esc(e.area) || ""}</strong>
        <div class="meta">${esc(e.motivo) || "s/motivo"} · Supervisor: ${esc(e.supervisorNombre) || ""}<br>${fecha}</div>
      </div>
      <span class="badge">${badge}</span></div>`;
  }).join("");
  document.getElementById("lista-evals").innerHTML = html;
});
