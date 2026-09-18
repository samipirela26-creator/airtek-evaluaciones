// dashboard.js — Métricas de Gestión de Personal para el coordinador (Chart.js).
// Mide la calidad de las evaluaciones y el posible sesgo de cada supervisor.
// La actividad de campo se mide aparte, en bitacora-tablero.js.
import { db } from "./firebase.js";
import { protegerPagina, contextoActual } from "./session.js";
import { misSupervisores, traerPorLotes } from "./consultas.js";
import { barChart, AZUL, PALETA, SIN_DATOS } from "./graficas.js";

protegerPagina("coordinador", async ({ user, perfil }) => {
  const sesion = contextoActual({ user, perfil });
  // ── Estado de carga ──
  const vacio = document.getElementById("vacio");
  vacio.innerHTML = `<div class="card lista-vacia">Cargando datos…</div>`;

  let evals = [];
  try {
    // Solo MIS supervisores (no los de otros coordinadores).
    const supUids = (await misSupervisores(db, sesion.uid)).map((s) => s.uid);
    evals = await traerPorLotes(db, "evaluaciones", "supervisorUid", supUids);
  } catch (err) {
    vacio.innerHTML = `<div class="msg error">No se pudieron cargar los datos: ${err.message}</div>`;
    return;
  }

  // Carga terminada → limpiar indicador
  vacio.innerHTML = "";

  if (!evals.length) {
    vacio.innerHTML = `<div class="card lista-vacia">Todavía no hay evaluaciones para analizar.</div>`;
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

  // ── Gráfica 1: promedio por supervisor (horizontal, con gris si sin puntaje) ──
  const supNombres = Object.keys(bySup);
  const supProm = supNombres.map((n) => (bySup[n].scored ? bySup[n].sum / bySup[n].scored : 0));
  // Gris cuando el supervisor no tiene ninguna evaluación puntuada (evita confundir 0 real con sin datos).
  const supColors = supNombres.map((n, i) => bySup[n].scored === 0 ? SIN_DATOS : PALETA[i % PALETA.length]);
  barChart("chart-sup", supNombres, supProm, "Promedio (0–10)", 10, supColors, true);

  // ── Gráfica 2: cantidad por supervisor (horizontal) ──
  const supCant = supNombres.map((n) => bySup[n].count);
  barChart("chart-cant", supNombres, supCant, "Evaluaciones", null, AZUL, true);

  // ── Gráfica 3: promedio por sección ──
  const secNombres = Object.keys(bySec);
  const secProm = secNombres.map((t) => bySec[t].sum / bySec[t].n);
  barChart("chart-sec", secNombres, secProm, "Promedio (0–10)", 10, "#059669", true);
});
