// dashboard.js — tablero de eficiencia para el coordinador (Chart.js).
import { db } from "./firebase.js";
import { protegerPagina } from "./session.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const AZUL = "#0066ff";
const PALETA = ["#0066ff", "#059669", "#7c3aed", "#dc2626", "#d97706", "#0891b2", "#be185d", "#374151"];

protegerPagina("coordinador", async ({ user }) => {
  let evals = [];
  try {
    // Solo MIS supervisores (no los de otros coordinadores).
    const supSnap = await getDocs(query(collection(db, "usuarios"), where("coordinadorUid", "==", user.uid)));
    const supUids = supSnap.docs.map((d) => d.id);
    if (supUids.length) {
      // Firestore 'in' admite hasta 10 valores → lo hacemos por lotes.
      const lotes = [];
      for (let i = 0; i < supUids.length; i += 10) lotes.push(supUids.slice(i, i + 10));
      const resultados = await Promise.all(
        lotes.map((c) => getDocs(query(collection(db, "evaluaciones"), where("supervisorUid", "in", c))))
      );
      resultados.forEach((r) => r.forEach((d) => evals.push(d.data())));
    }
  } catch (err) {
    document.getElementById("vacio").innerHTML = `<div class="msg error">No se pudieron cargar los datos: ${err.message}</div>`;
    return;
  }

  if (!evals.length) {
    document.getElementById("vacio").innerHTML = `<div class="card lista-vacia">Todavía no hay evaluaciones para analizar.</div>`;
    return;
  }

  // ── Agregados ──
  const bySup = {}; // nombre -> {sum, scored, count}
  const bySec = {}; // titulo -> {sum, n}
  let sumGlobal = 0, nGlobal = 0;

  evals.forEach((e) => {
    const n = e.supervisorNombre || "—";
    bySup[n] = bySup[n] || { sum: 0, scored: 0, count: 0 };
    bySup[n].count++;
    const p = e.puntajes?.promedioGeneral;
    if (p != null) { bySup[n].sum += p; bySup[n].scored++; sumGlobal += p; nGlobal++; }

    (e.plantillaSnapshot?.secciones || []).forEach((s) => {
      const ps = e.puntajes?.porSeccion?.[s.id];
      if (ps != null) {
        bySec[s.titulo] = bySec[s.titulo] || { sum: 0, n: 0 };
        bySec[s.titulo].sum += ps;
        bySec[s.titulo].n++;
      }
    });
  });

  // ── KPIs ──
  const promGlobal = nGlobal ? (sumGlobal / nGlobal).toFixed(2) : "—";
  const kpi = (valor, label) => `
    <div style="flex:1;min-width:120px;background:var(--azul);color:#fff;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:1.6rem;font-weight:800">${valor}</div>
      <div style="font-size:.8rem;opacity:.9">${label}</div>
    </div>`;
  document.getElementById("kpis").innerHTML =
    kpi(evals.length, "Evaluaciones") +
    kpi(Object.keys(bySup).length, "Supervisores") +
    kpi(promGlobal + " / 10", "Promedio global");

  // ── Gráfica 1: promedio por supervisor ──
  const supNombres = Object.keys(bySup);
  const supProm = supNombres.map((n) => (bySup[n].scored ? bySup[n].sum / bySup[n].scored : 0));
  barChart("chart-sup", supNombres, supProm, "Promedio (0–10)", 10, supNombres.map((_, i) => PALETA[i % PALETA.length]));

  // ── Gráfica 2: cantidad por supervisor ──
  const supCant = supNombres.map((n) => bySup[n].count);
  barChart("chart-cant", supNombres, supCant, "Evaluaciones", null, AZUL);

  // ── Gráfica 3: promedio por sección ──
  const secNombres = Object.keys(bySec);
  const secProm = secNombres.map((t) => bySec[t].sum / bySec[t].n);
  barChart("chart-sec", secNombres, secProm, "Promedio (0–10)", 10, "#059669", true);
});

function barChart(canvasId, labels, data, label, max, color, horizontal = false) {
  const colors = Array.isArray(color) ? color : labels.map(() => color);
  new Chart(document.getElementById(canvasId), {
    type: "bar",
    data: {
      labels,
      datasets: [{ label, data, backgroundColor: colors, borderRadius: 6, maxBarThickness: 46 }],
    },
    options: {
      indexAxis: horizontal ? "y" : "x",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        [horizontal ? "x" : "y"]: { beginAtZero: true, ...(max ? { max } : {}) },
      },
    },
  });
}
