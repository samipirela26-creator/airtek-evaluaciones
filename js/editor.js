// editor.js — el coordinador gestiona VARIOS formularios (crear/editar/eliminar).
import { db, toast, logAudit } from "./firebase.js";
import { protegerPagina } from "./session.js";
import { cargarPlantillasDeCoordinador, opcionesDeSeccion, PLANTILLA_DEFAULT } from "./plantilla.js";
import {
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let sesion = null;
let P = null; // formulario en edición (null = viendo la lista)

protegerPagina("coordinador", (s) => {
  sesion = s;
  verLista();
});

function clonar(o) { return JSON.parse(JSON.stringify(o)); }
function escapar(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function normalizarColumnas(p) {
  p.secciones.forEach((sec) => {
    sec.opciones = clonar(opcionesDeSeccion(sec));
    delete sec.escala;
  });
}
function renumerar(sec) {
  let n = 0;
  sec.opciones.forEach((o) => (o.valor = o.valor === null ? null : ++n));
}

// ══════════ LISTA DE FORMULARIOS ══════════
async function verLista() {
  P = null;
  const cont = document.getElementById("editor");
  cont.innerHTML = "Cargando…";
  const forms = await cargarPlantillasDeCoordinador(db, sesion.user.uid);

  let html = `<div class="card"><button class="btn" id="btn-nuevo">+ Crear formulario</button></div>`;
  if (!forms.length) {
    html += `<div class="card lista-vacia">Aún no tienes formularios. Crea el primero (parte de la plantilla oficial de Airtek y edítala a tu gusto).</div>`;
  } else {
    html += `<div class="card">` + forms
      .map(
        (f) => `<div class="srow" style="cursor:default">
          <div class="srow-main">
            <span class="srow-name">${escapar(f.nombre || "(sin nombre)")}</span>
            <span class="srow-sub">${f.tipo === "supervisor" ? "Evalúa supervisores (privado)" : "Evalúa técnicos"}</span>
          </div>
          <button class="btn secundario" data-editar="${f.id}">Editar</button>
          <button class="srow-x" data-eliminar="${f.id}" title="Eliminar">✕</button>
        </div>`
      )
      .join("") + `</div>`;
  }
  cont.innerHTML = html;

  document.getElementById("btn-nuevo").addEventListener("click", () => {
    P = clonar(PLANTILLA_DEFAULT);
    P.id = null;
    P.nombre = "Nuevo formulario";
    normalizarColumnas(P);
    verEditor();
  });
  cont.querySelectorAll("[data-editar]").forEach((b) =>
    b.addEventListener("click", () => {
      P = clonar(forms.find((x) => x.id === b.dataset.editar));
      normalizarColumnas(P);
      verEditor();
    })
  );
  cont.querySelectorAll("[data-eliminar]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("¿Eliminar este formulario? Las evaluaciones ya hechas con él se conservan.")) return;
      try {
        await deleteDoc(doc(db, "plantillas", b.dataset.eliminar));
        logAudit("formulario_eliminado", { plantillaId: b.dataset.eliminar });
        toast("Formulario eliminado");
        verLista();
      } catch (err) {
        toast("No se pudo eliminar: " + err.message, { ms: 5000 });
      }
    })
  );
}

// ══════════ EDITOR DE UN FORMULARIO ══════════
function verEditor() {
  const cont = document.getElementById("editor");
  cont.innerHTML = `
    <div class="card">
      <div class="btn-row">
        <button class="btn secundario" id="btn-volver-lista">← Volver a la lista</button>
        <button class="btn" id="btn-guardar">Guardar formulario</button>
      </div>
    </div>
    <div class="card">
      <div class="campo">
        <label>Nombre del formulario</label>
        <input type="text" id="p-nombre" value="${escapar(P.nombre)}">
      </div>
      <div class="campo">
        <label>¿Para qué es este formulario?</label>
        <select id="p-tipo">
          <option value="tecnico" ${(P.tipo || "tecnico") === "tecnico" ? "selected" : ""}>Para evaluar TÉCNICOS (lo usan tus supervisores)</option>
          <option value="supervisor" ${P.tipo === "supervisor" ? "selected" : ""}>Para evaluar SUPERVISORES (privado — para el link a técnicos)</option>
        </select>
      </div>
      <div class="campo">
        <label>Pregunta Sí / No (final del formulario)</label>
        <input type="text" id="p-sino" value="${escapar(P.siNo.label)}">
      </div>
    </div>
    ${P.secciones.map(seccionEditor).join("")}
    <div class="card" style="text-align:center">
      <button type="button" class="btn secundario" id="btn-add-seccion">+ Agregar sección</button>
    </div>`;

  document.getElementById("btn-volver-lista").addEventListener("click", verLista);
  document.getElementById("btn-guardar").addEventListener("click", guardar);
  document.getElementById("p-nombre").addEventListener("input", (e) => (P.nombre = e.target.value));
  document.getElementById("p-tipo").addEventListener("change", (e) => (P.tipo = e.target.value));
  document.getElementById("p-sino").addEventListener("input", (e) => (P.siNo.label = e.target.value));
  document.getElementById("btn-add-seccion").addEventListener("click", agregarSeccion);
  cont.querySelectorAll("[data-accion]").forEach((el) => el.addEventListener("click", onAccion));
  cont.querySelectorAll("[data-edit]").forEach((el) => {
    el.addEventListener("input", onEdit);
    el.addEventListener("change", onEdit);
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
    <p style="font-size:.85rem;color:#667;margin:4px 0 8px">Marca <em>"no cuenta"</em> en columnas como "No Aplica".</p>
    ${columnas}
    <button type="button" class="btn secundario" data-accion="add-col" data-sec="${si}" style="margin-bottom:14px">+ Agregar columna</button>
    <label>Preguntas</label>
    ${preguntas}
    <button type="button" class="btn secundario" data-accion="add-preg" data-sec="${si}">+ Agregar pregunta</button>
    <button type="button" class="btn secundario" data-accion="del-seccion" data-sec="${si}" style="margin-left:8px;color:#c0392b;border-color:#c0392b">Eliminar sección</button>
  </div>`;
}

function onEdit(e) {
  const el = e.target;
  const si = +el.dataset.sec;
  const sec = P.secciones[si];
  switch (el.dataset.edit) {
    case "titulo": sec.titulo = el.value; break;
    case "preg": sec.preguntas[+el.dataset.preg] = el.value; break;
    case "col": sec.opciones[+el.dataset.col].label = el.value; break;
    case "colnc":
      sec.opciones[+el.dataset.col].valor = el.checked ? null : 0;
      renumerar(sec);
      break;
  }
}

function onAccion(e) {
  const el = e.target;
  const si = +el.dataset.sec;
  const sec = P.secciones[si];
  switch (el.dataset.accion) {
    case "add-preg": sec.preguntas.push("Nueva pregunta"); break;
    case "del-preg": sec.preguntas.splice(+el.dataset.preg, 1); break;
    case "add-col": sec.opciones.push({ label: "Nueva", valor: 0 }); renumerar(sec); break;
    case "del-col": sec.opciones.splice(+el.dataset.col, 1); renumerar(sec); break;
    case "del-seccion":
      if (!confirm(`¿Eliminar la sección "${sec.titulo}"?`)) return;
      P.secciones.splice(si, 1);
      break;
  }
  verEditor();
}

function agregarSeccion() {
  P.secciones.push({
    id: "seccion_" + P.secciones.length,
    titulo: "Nueva sección",
    opciones: [
      { label: "Mala", valor: 1 }, { label: "Regular", valor: 2 },
      { label: "Buena", valor: 3 }, { label: "Excelente", valor: 4 },
    ],
    preguntas: ["Nueva pregunta"],
  });
  verEditor();
}

async function guardar() {
  const msg = document.getElementById("mensaje");
  msg.innerHTML = "";
  const error = (t) => (msg.innerHTML = `<div class="msg error">${t}</div>`);

  if (!P.nombre.trim()) return error("El formulario necesita un nombre.");
  if (!P.secciones.length) return error("El formulario necesita al menos una sección.");
  for (const sec of P.secciones) {
    if (!sec.titulo.trim()) return error("Hay una sección sin título.");
    sec.opciones = sec.opciones.filter((o) => o.label.trim());
    sec.opciones.forEach((o) => (o.label = o.label.trim()));
    renumerar(sec);
    if (sec.opciones.length < 2) return error(`La sección "${sec.titulo}" necesita al menos 2 columnas.`);
    if (!sec.opciones.some((o) => o.valor !== null)) return error(`La sección "${sec.titulo}" necesita una columna que cuente en el puntaje.`);
    sec.preguntas = sec.preguntas.map((p) => p.trim()).filter((p) => p.length);
    if (!sec.preguntas.length) return error(`La sección "${sec.titulo}" no tiene preguntas.`);
  }

  const registro = {
    nombre: P.nombre,
    tipo: P.tipo || "tecnico",
    datos: P.datos,
    secciones: P.secciones,
    siNo: P.siNo,
    coordinadorUid: sesion.user.uid,
    version: (P.version || 0) + 1,
    actualizadaPor: sesion.perfil.nombre,
    actualizadaEn: serverTimestamp(),
  };

  const btn = document.getElementById("btn-guardar");
  btn.disabled = true;
  btn.textContent = "Guardando…";
  try {
    if (P.id) {
      await setDoc(doc(db, "plantillas", P.id), registro);
    } else {
      const ref = await addDoc(collection(db, "plantillas"), { ...registro, createdAt: serverTimestamp() });
      P.id = ref.id;
    }
    logAudit("formulario_guardado", { plantillaId: P.id, nombre: P.nombre });
    toast("Formulario guardado ✓");
    verLista();
  } catch (err) {
    console.error(err);
    error("No se pudo guardar: " + err.message);
    btn.disabled = false;
    btn.textContent = "Guardar formulario";
  }
}
