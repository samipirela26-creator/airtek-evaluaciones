// bitacora-tablero.js — Tablero de Bitácora de Campo (solo coordinador).
// Mide actividad operativa: horas, tipos de actividad, supervisores y nodos.
// El tablero de evaluaciones (dashboard.js) mide otra cosa y vive aparte.

import { db } from "./firebase.js";
import { protegerPagina } from "./session.js";
import { misSupervisores, traerPorLotes } from "./consultas.js";
import { barChart, donaChart, acortar, AZUL } from "./graficas.js";
import { filasACSV, descargarCSV, nombreConFecha } from "./exportar-csv.js";
import {
  ZONAS,
  hoyISO,
  filtrarBitacoras,
  resumirBitacoras,
  ordenarPorMinutos,
  formatoDuracion,
  fechaEsInferida,
  COLUMNAS_CSV_BITACORA,
} from "./bitacora-data.js";

let todas = []; // todas las bitácoras de mis supervisores, sin filtrar

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function primerDiaDelMes() {
  const d = new Date();
  return hoyISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

protegerPagina("coordinador", async ({ user }) => {
  const vacio = document.getElementById("vacio");
  vacio.innerHTML = `<div class="card lista-vacia">Cargando bitácoras…</div>`;

  let supervisores = [];
  try {
    supervisores = await misSupervisores(db, user.uid);
    const uids = supervisores.map((s) => s.uid);
    todas = await traerPorLotes(db, "bitacoras", "supervisorUid", uids);
  } catch (err) {
    console.error(err);
    vacio.innerHTML = `<div class="msg error">No se pudieron cargar las bitácoras: ${esc(err.message)}</div>`;
    return;
  }
  vacio.innerHTML = "";

  // Poblar filtros
  const selSup = document.getElementById("f-supervisor");
  supervisores.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.uid;
    opt.textContent = s.nombre || s.uid;
    selSup.appendChild(opt);
  });
  const selZona = document.getElementById("f-zona");
  ZONAS.forEach((z) => {
    const opt = document.createElement("option");
    opt.value = z;
    opt.textContent = z;
    selZona.appendChild(opt);
  });

  // Rango inicial: el mes en curso. Evita bajar años de fotos en Base64 de golpe.
  document.getElementById("f-desde").value = primerDiaDelMes();
  document.getElementById("f-hasta").value = hoyISO();

  ["f-desde", "f-hasta", "f-supervisor", "f-zona"].forEach((id) =>
    document.getElementById(id).addEventListener("change", pintar)
  );
  document.getElementById("btn-mes-actual").addEventListener("click", () => {
    document.getElementById("f-desde").value = primerDiaDelMes();
    document.getElementById("f-hasta").value = hoyISO();
    pintar();
  });
  document.getElementById("btn-todo").addEventListener("click", () => {
    document.getElementById("f-desde").value = "";
    document.getElementById("f-hasta").value = "";
    pintar();
  });
  document.getElementById("btn-exportar").addEventListener("click", exportar);

  if (!todas.length) {
    vacio.innerHTML = `<div class="card lista-vacia">Tus supervisores todavía no han registrado actividades.</div>`;
    return;
  }
  pintar();
});

function filtroActual() {
  return {
    desde: document.getElementById("f-desde").value || null,
    hasta: document.getElementById("f-hasta").value || null,
    supervisorUid: document.getElementById("f-supervisor").value || null,
    zona: document.getElementById("f-zona").value || null,
  };
}

function pintar() {
  const filtradas = filtrarBitacoras(todas, filtroActual());
  const r = resumirBitacoras(filtradas);

  const kpi = (valor, label) => `
    <div style="flex:1;min-width:120px;background:var(--azul);color:#fff;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:1.6rem;font-weight:800">${esc(valor)}</div>
      <div style="font-size:.8rem;opacity:.9">${esc(label)}</div>
    </div>`;
  document.getElementById("kpis").innerHTML =
    kpi(r.cantidad, "Actividades") +
    kpi(formatoDuracion(r.minutosTotales), "Tiempo total") +
    kpi(r.supervisores, "Supervisores") +
    kpi(r.nodos, "Nodos visitados");

  // Aviso honesto: las bitácoras viejas no traen fecha propia.
  const inferidas = filtradas.filter(fechaEsInferida).length;
  document.getElementById("aviso").innerHTML = inferidas
    ? `<div class="msg">⚠ ${inferidas} de ${filtradas.length} actividades no tienen fecha propia (se registraron antes de que el formulario la pidiera). Para esas se usa la fecha en que fueron cargadas, que puede no ser el día en que se trabajó.</div>`
    : "";

  if (!filtradas.length) {
    document.getElementById("vacio").innerHTML =
      `<div class="card lista-vacia">No hay actividades con estos filtros.</div>`;
  } else {
    document.getElementById("vacio").innerHTML = "";
  }

  const horas = (m) => +(m / 60).toFixed(2);

  const macro = ordenarPorMinutos(r.porTipoMacro);
  donaChart("chart-macro", macro.map((x) => acortar(x.clave, 30)), macro.map((x) => horas(x.minutos)), "Horas");

  const act = ordenarPorMinutos(r.porActividad).slice(0, 12);
  barChart("chart-actividad", act.map((x) => acortar(x.clave, 44)), act.map((x) => horas(x.minutos)), "Horas", null, "#059669", true);

  const sup = ordenarPorMinutos(r.porSupervisor);
  barChart("chart-supervisor", sup.map((x) => acortar(x.clave, 28)), sup.map((x) => horas(x.minutos)), "Horas", null, AZUL, true);

  const nodo = ordenarPorMinutos(r.porNodo).slice(0, 15);
  barChart("chart-nodo", nodo.map((x) => acortar(x.clave, 34)), nodo.map((x) => horas(x.minutos)), "Horas", null, "#7c3aed", true);
}

function exportar() {
  const filtradas = filtrarBitacoras(todas, filtroActual());
  if (!filtradas.length) {
    alert("No hay actividades que exportar con los filtros actuales.");
    return;
  }
  // Orden cronológico: es como se lee una bitácora.
  const orden = [...filtradas].sort((a, b) => {
    const fa = `${a.fecha || ""}${a.horaInicio || ""}`;
    const fb = `${b.fecha || ""}${b.horaInicio || ""}`;
    return fa.localeCompare(fb);
  });
  descargarCSV(nombreConFecha("bitacoras_airtek"), filasACSV(COLUMNAS_CSV_BITACORA, orden));
}
