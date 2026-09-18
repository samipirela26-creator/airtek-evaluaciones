// reporte-herramientas.js — Consolidado de herramientas para el coordinador.
// Responde la pregunta del audio 4: "cuántos alicates tengo regulares,
// cuántos destornilladores malos", con números para pedir reposición.

import { db } from "./firebase.js";
import { protegerPagina, contextoActual } from "./session.js";
import { misSupervisores, traerPorLotes } from "./consultas.js";
import { filasACSV, descargarCSV, nombreConFecha } from "./exportar-csv.js";
import {
  resumirHerramientas,
  totalesHerramientas,
  porReponer,
  COLUMNAS_CSV_REQUERIMIENTOS,
} from "./inventario-data.js";

let resumen = [];
let soloReponer = false;

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

protegerPagina("coordinador", async ({ user, perfil }) => {
  const sesion = contextoActual({ user, perfil });
  const aviso = document.getElementById("aviso");
  aviso.innerHTML = `<div class="lista-vacia">Cargando inventarios…</div>`;

  let inventarios = [];
  try {
    const uids = (await misSupervisores(db, sesion.uid)).map((s) => s.uid);
    inventarios = await traerPorLotes(db, "inventario_herramientas", "supervisorUid", uids);
  } catch (err) {
    console.error(err);
    aviso.innerHTML = `<div class="msg error">No se pudieron cargar los inventarios: ${esc(err.message)}</div>`;
    return;
  }

  resumen = resumirHerramientas(inventarios);

  if (!inventarios.length) {
    aviso.innerHTML = `<div class="lista-vacia">Todavía no hay inventarios cargados. Pide a tus supervisores que los registren desde su panel.</div>`;
  } else {
    const criticas = porReponer(resumen).length;
    aviso.innerHTML = criticas
      ? `<div class="msg">🔧 ${criticas} tipo${criticas === 1 ? "" : "s"} de herramienta con unidades en mal estado. Las filas resaltadas son las que hay que reponer.</div>`
      : `<div class="msg ok">Ninguna herramienta reportada en mal estado.</div>`;
  }

  document.getElementById("btn-exportar").addEventListener("click", exportar);
  document.getElementById("btn-solo-reponer").addEventListener("click", (e) => {
    soloReponer = !soloReponer;
    e.currentTarget.textContent = soloReponer ? "Ver todas" : "Ver solo lo que hay que reponer";
    pintarTabla();
  });

  pintarKpis(inventarios.length);
  pintarTabla();
});

function pintarKpis(cuantosTecnicos) {
  const t = totalesHerramientas(resumen);
  const kpi = (valor, label, color) => `
    <div style="flex:1;min-width:110px;background:${color};color:#fff;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:1.6rem;font-weight:800">${valor}</div>
      <div style="font-size:.8rem;opacity:.9">${label}</div>
    </div>`;
  document.getElementById("kpis").innerHTML =
    kpi(cuantosTecnicos, "Técnicos con inventario", "#374151") +
    kpi(t.total, "Unidades en campo", "#0066ff") +
    kpi(t.regular, "Regulares (vigilar)", "#d97706") +
    kpi(t.malo, "Malas (reponer)", "#dc2626");
}

function pintarTabla() {
  const filas = soloReponer ? porReponer(resumen) : resumen;
  const cuerpo = document.getElementById("tabla-cuerpo");

  if (!filas.length) {
    cuerpo.innerHTML = `<tr><td colspan="6" style="padding:16px;text-align:center;color:var(--muted)">Sin datos que mostrar.</td></tr>`;
    return;
  }

  let catActual = null;
  cuerpo.innerHTML = filas.map((f) => {
    let encabezado = "";
    // Al filtrar por "solo reponer" el orden es por urgencia, no por categoría,
    // así que los separadores solo tienen sentido en la vista completa.
    if (!soloReponer && f.categoria !== catActual) {
      catActual = f.categoria;
      encabezado = `<tr><td colspan="6" style="padding:10px 6px 4px;font-weight:700;font-size:.78rem;color:var(--muted);text-transform:uppercase">${esc(f.categoria)}</td></tr>`;
    }
    const critica = f.malo > 0;
    const num = (v, color) => `<td style="padding:8px 6px;text-align:center;${color ? `color:${color};font-weight:700` : ""}">${v || "—"}</td>`;

    // Sin los encabezados de categoría, dos herramientas homónimas de kits
    // distintos (pasa con "Cleaver") quedan indistinguibles. Se rotula la fila.
    const rotulo = soloReponer
      ? `<div class="meta" style="font-size:.72rem">${esc(f.categoria)}</div>`
      : "";

    // Auditada y sin existencias: es un dato, no un vacío. Se dice explícito.
    const sinExistencias = f.total === 0 && f.auditados > 0
      ? `<div class="meta" style="font-size:.72rem;color:#d97706">Revisada en ${f.auditados} ${f.auditados === 1 ? "técnico" : "técnicos"}: ninguno la tiene</div>`
      : "";

    return `${encabezado}
      <tr style="border-bottom:1px solid var(--borde);${critica ? "background:#fef2f2" : ""}">
        <td style="padding:8px 6px">${esc(f.nombre)}${rotulo}${sinExistencias}</td>
        ${num(f.total)}
        ${num(f.bueno, "#059669")}
        ${num(f.regular, "#d97706")}
        ${num(f.malo, "#dc2626")}
        ${num(f.tecnicos)}
      </tr>`;
  }).join("");
}

function exportar() {
  const filas = soloReponer ? porReponer(resumen) : resumen;
  if (!filas.length) {
    alert("No hay datos que exportar.");
    return;
  }
  descargarCSV(
    nombreConFecha(soloReponer ? "requerimiento_reposicion" : "inventario_herramientas"),
    filasACSV(COLUMNAS_CSV_REQUERIMIENTOS, filas)
  );
}
