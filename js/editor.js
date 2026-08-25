// editor.js — el coordinador edita la plantilla del formulario y la publica.
import { db } from "./firebase.js";
import { protegerPagina } from "./session.js";
import { cargarPlantillaActiva, PLANTILLA_DEFAULT, ESCALAS } from "./plantilla.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Etiquetas amigables para elegir la escala de una sección.
const ESCALAS_LABEL = {
  calidad: "Mala / Regular / Buena / Excelente",
  nivel: "Ninguno / Básico / Intermedio / Avanzado",
  calidadNA: "Mala / Regular / Buena / Excelente / No Aplica",
};

let P = null; // plantilla en edición (copia mutable)
let sesion = null;

// Solo el coordinador entra aquí.
protegerPagina("coordinador", async (s) => {
  sesion = s;
  const cargada = await cargarPlantillaActiva(db);
  P = clonar(cargada);
  render();
  document.getElementById("btn-publicar").addEventListener("click", publicar);
  document.getElementById("btn-restaurar").addEventListener("click", () => {
    if (confirm("¿Restaurar el formulario original? Se perderán los cambios no publicados.")) {
      P = clonar(PLANTILLA_DEFAULT);
      render();
    }
  });
});

function clonar(obj) {
  return JSON.parse(JSON.stringify(obj));
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

  // Enlaza eventos
  document.getElementById("p-nombre").addEventListener("input", (e) => (P.nombre = e.target.value));
  document.getElementById("p-sino").addEventListener("input", (e) => (P.siNo.label = e.target.value));
  document.getElementById("btn-add-seccion").addEventListener("click", agregarSeccion);

  cont.querySelectorAll("[data-accion]").forEach((el) => el.addEventListener("click", onAccion));
  cont.querySelectorAll("[data-edit]").forEach((el) => el.addEventListener("input", onEdit));
}

function seccionEditor(sec, si) {
  const opciones = Object.keys(ESCALAS)
    .map(
      (k) =>
        `<option value="${k}" ${k === sec.escala ? "selected" : ""}>${ESCALAS_LABEL[k]}</option>`
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
    <div class="campo">
      <label>Escala de calificación</label>
      <select data-edit="escala" data-sec="${si}">${opciones}</select>
    </div>
    <label>Preguntas</label>
    ${preguntas}
    <button type="button" class="btn secundario" data-accion="add-preg" data-sec="${si}">+ Agregar pregunta</button>
    <button type="button" class="btn secundario" data-accion="del-seccion" data-sec="${si}" style="margin-left:8px;color:#c0392b;border-color:#c0392b">Eliminar sección</button>
  </div>`;
}

// ---- Ediciones de texto/selección (no re-renderizan, para no perder el foco) ----
function onEdit(e) {
  const el = e.target;
  const si = +el.dataset.sec;
  if (el.dataset.edit === "titulo") P.secciones[si].titulo = el.value;
  else if (el.dataset.edit === "escala") P.secciones[si].escala = el.value;
  else if (el.dataset.edit === "preg") P.secciones[si].preguntas[+el.dataset.preg] = el.value;
}

// ---- Acciones estructurales (sí re-renderizan) ----
function onAccion(e) {
  const el = e.target;
  const si = +el.dataset.sec;
  const accion = el.dataset.accion;
  if (accion === "add-preg") P.secciones[si].preguntas.push("Nueva pregunta");
  else if (accion === "del-preg") P.secciones[si].preguntas.splice(+el.dataset.preg, 1);
  else if (accion === "del-seccion") {
    if (confirm(`¿Eliminar la sección "${P.secciones[si].titulo}"?`)) P.secciones.splice(si, 1);
    else return;
  }
  render();
}

function agregarSeccion() {
  P.secciones.push({
    id: "seccion_" + Date.now(),
    titulo: "Nueva sección",
    escala: "calidad",
    preguntas: ["Nueva pregunta"],
  });
  render();
}

// ---- Publicar ----
async function publicar() {
  const msg = document.getElementById("mensaje");
  msg.innerHTML = "";

  // Validaciones mínimas
  if (!P.nombre.trim()) return error("El formulario necesita un nombre.");
  for (const sec of P.secciones) {
    if (!sec.titulo.trim()) return error("Hay una sección sin título.");
    // Quita preguntas vacías
    sec.preguntas = sec.preguntas.map((p) => p.trim()).filter((p) => p.length);
    if (!sec.preguntas.length)
      return error(`La sección "${sec.titulo}" no tiene preguntas.`);
  }
  if (!P.secciones.length) return error("El formulario necesita al menos una sección.");

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
