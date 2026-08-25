// editor.js — el coordinador edita la plantilla del formulario y la publica.
import { db } from "./firebase.js";
import { protegerPagina } from "./session.js";
import { cargarPlantillaActiva, opcionesDeSeccion, PLANTILLA_DEFAULT } from "./plantilla.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let P = null; // plantilla en edición (copia mutable)
let sesion = null;

// Solo el coordinador entra aquí.
protegerPagina("coordinador", async (s) => {
  sesion = s;
  const cargada = await cargarPlantillaActiva(db);
  P = clonar(cargada);
  normalizarColumnas(P); // asegura que cada sección tenga sec.opciones editables
  render();
  document.getElementById("btn-publicar").addEventListener("click", publicar);
  document.getElementById("btn-restaurar").addEventListener("click", () => {
    if (confirm("¿Restaurar el formulario original? Se perderán los cambios no publicados.")) {
      P = clonar(PLANTILLA_DEFAULT);
      normalizarColumnas(P);
      render();
    }
  });
});

function clonar(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Convierte el formato viejo (sec.escala) al nuevo (sec.opciones editable).
function normalizarColumnas(p) {
  p.secciones.forEach((sec) => {
    sec.opciones = clonar(opcionesDeSeccion(sec));
    delete sec.escala;
  });
}

// Reasigna los valores numéricos 1..N a las columnas que sí cuentan (izq→der).
// Las columnas marcadas "no cuenta" quedan en null (no afectan el puntaje).
function renumerar(sec) {
  let n = 0;
  sec.opciones.forEach((o) => {
    o.valor = o.valor === null ? null : ++n;
  });
}

// ---- Render del editor ----
function render() {
  const cont = document.getElementById("editor");
  cont.innerHTML = `
    <div class="card">
      <div class="campo">
        <label>Nombre del formulario</label>
        <input type="text" id="p-nombre" value="${escapar(P.nombre)}">
      </div>
      <div class="campo">
        <label>Pregunta Sí / No (final del formulario)</label>
        <input type="text" id="p-sino" value="${escapar(P.siNo.label)}">
      </div>
    </div>

    ${P.secciones.map(seccionEditor).join("")}

    <div class="card" style="text-align:center">
      <button type="button" class="btn secundario" id="btn-add-seccion">+ Agregar sección</button>
    </div>
  `;

  document.getElementById("p-nombre").addEventListener("input", (e) => (P.nombre = e.target.value));
  document.getElementById("p-sino").addEventListener("input", (e) => (P.siNo.label = e.target.value));
  document.getElementById("btn-add-seccion").addEventListener("click", agregarSeccion);

  cont.querySelectorAll("[data-accion]").forEach((el) => el.addEventListener("click", onAccion));
  cont.querySelectorAll("[data-edit]").forEach((el) => {
    el.addEventListener("input", onEdit);
    el.addEventListener("change", onEdit); // para los checkbox
  });
}

function seccionEditor(sec, si) {
  const columnas = sec.opciones
    .map(
      (op, ci) => `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:5px">
        <input type="text" data-edit="col" data-sec="${si}" data-col="${ci}" value="${escapar(op.label)}" style="max-width:240px">
        <label style="font-weight:400;font-size:.85rem;display:flex;align-items:center;gap:4px;margin:0">
          <input type="checkbox" style="width:auto" data-edit="colnc" data-sec="${si}" data-col="${ci}" ${op.valor === null ? "checked" : ""}> no cuenta
        </label>
        <button type="button" class="btn secundario" data-accion="del-col" data-sec="${si}" data-col="${ci}" title="Eliminar columna">✕</button>
      </div>`
    )
    .join("");

  const preguntas = sec.preguntas
    .map(
      (preg, pi) => `
      <div class="campo" style="display:flex;gap:8px;align-items:center">
        <input type="text" data-edit="preg" data-sec="${si}" data-preg="${pi}" value="${escapar(preg)}">
        <button type="button" class="btn secundario" data-accion="del-preg" data-sec="${si}" data-preg="${pi}" title="Eliminar pregunta">✕</button>
      </div>`
    )
    .join("");

  return `<div class="card">
    <div class="campo">
      <label>Título de la sección ${si + 1}</label>
      <input type="text" data-edit="titulo" data-sec="${si}" value="${escapar(sec.titulo)}">
    </div>

    <label>Columnas de calificación (de peor a mejor)</label>
    <p style="font-size:.85rem;color:#667;margin:4px 0 8px">
      Marca <em>"no cuenta"</em> en columnas como "No Aplica" para que no afecten el promedio.
    </p>
    ${columnas}
    <button type="button" class="btn secundario" data-accion="add-col" data-sec="${si}" style="margin-bottom:14px">+ Agregar columna</button>

    <label>Preguntas</label>
    ${preguntas}
    <button type="button" class="btn secundario" data-accion="add-preg" data-sec="${si}">+ Agregar pregunta</button>
    <button type="button" class="btn secundario" data-accion="del-seccion" data-sec="${si}" style="margin-left:8px;color:#c0392b;border-color:#c0392b">Eliminar sección</button>
  </div>`;
}

// ---- Ediciones de texto/checkbox (no re-renderizan, para no perder el foco) ----
function onEdit(e) {
  const el = e.target;
  const si = +el.dataset.sec;
  const sec = P.secciones[si];
  switch (el.dataset.edit) {
    case "titulo":
      sec.titulo = el.value;
      break;
    case "preg":
      sec.preguntas[+el.dataset.preg] = el.value;
      break;
    case "col":
      sec.opciones[+el.dataset.col].label = el.value;
      break;
    case "colnc":
      // marcar/desmarcar "no cuenta"
      sec.opciones[+el.dataset.col].valor = el.checked ? null : 0;
      renumerar(sec);
      break;
  }
}

// ---- Acciones estructurales (sí re-renderizan) ----
function onAccion(e) {
  const el = e.target;
  const si = +el.dataset.sec;
  const sec = P.secciones[si];
  switch (el.dataset.accion) {
    case "add-preg":
      sec.preguntas.push("Nueva pregunta");
      break;
    case "del-preg":
      sec.preguntas.splice(+el.dataset.preg, 1);
      break;
    case "add-col":
      sec.opciones.push({ label: "Nueva", valor: 0 });
      renumerar(sec);
      break;
    case "del-col":
      sec.opciones.splice(+el.dataset.col, 1);
      renumerar(sec);
      break;
    case "del-seccion":
      if (!confirm(`¿Eliminar la sección "${sec.titulo}"?`)) return;
      P.secciones.splice(si, 1);
      break;
  }
  render();
}

function agregarSeccion() {
  P.secciones.push({
    id: "seccion_" + P.secciones.length,
    titulo: "Nueva sección",
    opciones: [
      { label: "Mala", valor: 1 },
      { label: "Regular", valor: 2 },
      { label: "Buena", valor: 3 },
      { label: "Excelente", valor: 4 },
    ],
    preguntas: ["Nueva pregunta"],
  });
  render();
}

// ---- Publicar ----
async function publicar() {
  const msg = document.getElementById("mensaje");
  msg.innerHTML = "";

  if (!P.nombre.trim()) return error("El formulario necesita un nombre.");
  if (!P.secciones.length) return error("El formulario necesita al menos una sección.");

  for (const sec of P.secciones) {
    if (!sec.titulo.trim()) return error("Hay una sección sin título.");
    // Limpia columnas y preguntas vacías
    sec.opciones = sec.opciones.filter((o) => o.label.trim());
    sec.opciones.forEach((o) => (o.label = o.label.trim()));
    renumerar(sec);
    if (sec.opciones.length < 2)
      return error(`La sección "${sec.titulo}" necesita al menos 2 columnas.`);
    if (!sec.opciones.some((o) => o.valor !== null))
      return error(`La sección "${sec.titulo}" necesita al menos una columna que cuente en el puntaje.`);
    sec.preguntas = sec.preguntas.map((p) => p.trim()).filter((p) => p.length);
    if (!sec.preguntas.length)
      return error(`La sección "${sec.titulo}" no tiene preguntas.`);
  }

  const registro = {
    ...P,
    id: "activa",
    version: (P.version || 0) + 1,
    actualizadaPor: sesion.perfil.nombre,
    actualizadaEn: serverTimestamp(),
  };

  const btn = document.getElementById("btn-publicar");
  btn.disabled = true;
  btn.textContent = "Publicando…";
  try {
    await setDoc(doc(db, "plantillas", "activa"), registro);
    P.version = registro.version;
    msg.innerHTML = `<div class="msg ok">✔ Formulario publicado (versión ${registro.version}). Los supervisores ya lo usarán.</div>`;
    render(); // refresca por si se limpiaron campos vacíos
  } catch (err) {
    console.error(err);
    error("No se pudo publicar: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar y publicar";
  }
}

function error(texto) {
  document.getElementById("mensaje").innerHTML = `<div class="msg error">${texto}</div>`;
}

// Evita romper el HTML si un texto trae comillas.
function escapar(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
