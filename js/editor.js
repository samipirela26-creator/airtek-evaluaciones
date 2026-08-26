// editor.js — el coordinador gestiona VARIOS formularios (crear/editar/eliminar).
// Rediseñado para que crear un formulario sea guiado e intuitivo:
//  · escalas predefinidas de 1 clic (Calidad / Nivel / Con "No Aplica")
//  · vista previa de cómo lo verá el supervisor
//  · reordenar secciones y preguntas con flechas
//  · edición sin saltos de scroll
import { db, toast, logAudit } from "./firebase.js";
import { protegerPagina } from "./session.js";
import { cargarPlantillasDeCoordinador, opcionesDeSeccion, PLANTILLA_DEFAULT, ESCALAS } from "./plantilla.js";
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

// Escalas listas para usar (etiqueta amigable → columnas). El coordinador
// elige una con un clic en vez de teclear columnas y puntos a mano.
const PRESETS = [
  { key: "calidad", nombre: "Calidad", ejemplo: "Mala · Regular · Buena · Excelente" },
  { key: "nivel", nombre: "Nivel de dominio", ejemplo: "Ninguno · Básico · Intermedio · Avanzado" },
  { key: "calidadNA", nombre: "Calidad + No Aplica", ejemplo: "Mala … Excelente · No Aplica" },
];

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
// ¿Las columnas de esta sección coinciden con un preset? (para resaltar el botón activo)
function presetActivo(sec) {
  for (const pr of PRESETS) {
    const base = ESCALAS[pr.key];
    if (base.length !== sec.opciones.length) continue;
    if (base.every((o, i) => o.label === sec.opciones[i].label && o.valor === sec.opciones[i].valor)) return pr.key;
  }
  return null; // personalizada
}

// ══════════ LISTA DE FORMULARIOS ══════════
async function verLista() {
  P = null;
  const cont = document.getElementById("editor");
  cont.innerHTML = "Cargando…";
  const forms = await cargarPlantillasDeCoordinador(db, sesion.user.uid);

  let html = `<div class="card"><button class="btn" id="btn-nuevo">+ Crear formulario</button></div>`;
  // Formulario oficial de Airtek (precargado para todos, disponible a los supervisores).
  html += `<div class="card"><div class="srow" style="cursor:default">
      <div class="srow-main">
        <span class="srow-name">${escapar(PLANTILLA_DEFAULT.nombre)}</span>
        <span class="srow-sub">Oficial de Airtek · ya disponible para tus supervisores</span>
      </div>
      <button class="btn secundario" id="btn-duplicar-oficial">Duplicar para editar</button>
    </div></div>`;
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
    P.oficial = false;
    P.nombre = "Nuevo formulario";
    normalizarColumnas(P);
    verEditor();
  });
  document.getElementById("btn-duplicar-oficial").addEventListener("click", () => {
    P = clonar(PLANTILLA_DEFAULT);
    P.id = null;
    P.oficial = false;
    P.nombre = "Copia de " + PLANTILLA_DEFAULT.nombre;
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
// Re-render que NO pierde la posición de scroll (edición fluida en formularios largos).
function reRender() {
  const y = window.scrollY;
  verEditor();
  window.scrollTo(0, y);
}

function verEditor() {
  const cont = document.getElementById("editor");
  cont.innerHTML = `
    <div class="card ed-sticky">
      <div class="btn-row">
        <button class="btn secundario" id="btn-volver-lista">← Volver a la lista</button>
        <button class="btn" id="btn-guardar">Guardar formulario</button>
      </div>
    </div>

    <div class="card ed-ayuda">
      <strong>¿Cómo funciona?</strong> Un formulario tiene <b>secciones</b>; cada sección tiene
      <b>preguntas</b> y una <b>escala de respuesta</b> (las columnas que el supervisor marcará).
      Elige una escala lista o personalízala. La nota final de cada evaluación va de <b>0 a 10</b>.
    </div>

    <div class="card">
      <div class="campo">
        <label>Nombre del formulario</label>
        <input type="text" id="p-nombre" value="${escapar(P.nombre)}" placeholder="Ej: Evaluación trimestral de técnicos">
      </div>
      <div class="campo">
        <label>¿A quién evalúa?</label>
        <select id="p-tipo">
          <option value="tecnico" ${(P.tipo || "tecnico") === "tecnico" ? "selected" : ""}>A TÉCNICOS — lo usan tus supervisores</option>
          <option value="supervisor" ${P.tipo === "supervisor" ? "selected" : ""}>A SUPERVISORES — privado (para el link a técnicos)</option>
        </select>
      </div>
      <div class="campo">
        <label>Pregunta final de Sí / No</label>
        <input type="text" id="p-sino" value="${escapar(P.siNo.label)}" placeholder="Ej: ¿Conoce los canales de atención?">
      </div>
    </div>

    <div class="ed-secciones-titulo">Secciones del formulario</div>
    ${P.secciones.map(seccionEditor).join("")}

    <div class="card" style="text-align:center">
      <button type="button" class="btn secundario" id="btn-add-seccion">+ Agregar sección</button>
    </div>
    <div class="card ed-sticky-abajo" style="text-align:center">
      <button class="btn" id="btn-guardar-2">Guardar formulario</button>
    </div>`;

  document.getElementById("btn-volver-lista").addEventListener("click", verLista);
  document.getElementById("btn-guardar").addEventListener("click", guardar);
  document.getElementById("btn-guardar-2").addEventListener("click", guardar);
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
  const total = P.secciones.length;
  const activo = presetActivo(sec);

  // Vista previa: la misma tabla que verá el supervisor (con la 1ª pregunta de ejemplo).
  const ejemplo = (sec.preguntas.find((p) => p.trim()) || "Ejemplo de pregunta").trim();
  const preview = `
    <div class="ed-preview">
      <div class="ed-preview-cap">Vista previa (así lo verá el supervisor)</div>
      <div class="tabla-scroll">
        <table class="tabla-escala">
          <thead><tr><th></th>${sec.opciones.map((o) => `<th>${escapar(o.label)}</th>`).join("")}</tr></thead>
          <tbody><tr><td>${escapar(ejemplo)}</td>${sec.opciones.map(() => `<td><input type="radio" disabled></td>`).join("")}</tbody>
        </table>
      </div>
    </div>`;

  // Botones de escala lista.
  const presets = PRESETS.map(
    (pr) => `<button type="button" class="ed-chip ${activo === pr.key ? "on" : ""}"
        data-accion="preset" data-sec="${si}" data-preset="${pr.key}" title="${pr.ejemplo}">${pr.nombre}</button>`
  ).join("");

  // Panel avanzado: editar columnas y puntos a mano (plegado por defecto).
  const columnas = sec.opciones
    .map(
      (op, ci) => `
      <div class="ed-col">
        <input type="text" data-edit="col" data-sec="${si}" data-col="${ci}" value="${escapar(op.label)}" placeholder="Opción">
        <input type="number" data-edit="col-val" data-sec="${si}" data-col="${ci}" value="${op.valor === null ? "" : op.valor}" min="0" step="1" placeholder="pts" title="Puntos" ${op.valor === null ? "disabled" : ""}>
        <label class="ed-nc"><input type="checkbox" data-edit="colnc" data-sec="${si}" data-col="${ci}" ${op.valor === null ? "checked" : ""}> no cuenta</label>
        <button type="button" class="srow-x" data-accion="del-col" data-sec="${si}" data-col="${ci}" title="Eliminar columna">✕</button>
      </div>`
    )
    .join("");

  const preguntas = sec.preguntas
    .map(
      (preg, pi) => `
      <div class="ed-preg">
        <span class="ed-num">${pi + 1}</span>
        <input type="text" data-edit="preg" data-sec="${si}" data-preg="${pi}" value="${escapar(preg)}" placeholder="Escribe la pregunta">
        <button type="button" class="ed-mini" data-accion="preg-up" data-sec="${si}" data-preg="${pi}" ${pi === 0 ? "disabled" : ""} title="Subir">↑</button>
        <button type="button" class="ed-mini" data-accion="preg-down" data-sec="${si}" data-preg="${pi}" ${pi === sec.preguntas.length - 1 ? "disabled" : ""} title="Bajar">↓</button>
        <button type="button" class="srow-x" data-accion="del-preg" data-sec="${si}" data-preg="${pi}" title="Eliminar pregunta">✕</button>
      </div>`
    )
    .join("");

  return `<div class="card ed-seccion">
    <div class="ed-seccion-head">
      <span class="ed-badge">Sección ${si + 1}</span>
      <div class="ed-seccion-tools">
        <button type="button" class="ed-mini" data-accion="sec-up" data-sec="${si}" ${si === 0 ? "disabled" : ""} title="Subir sección">↑</button>
        <button type="button" class="ed-mini" data-accion="sec-down" data-sec="${si}" ${si === total - 1 ? "disabled" : ""} title="Bajar sección">↓</button>
        <button type="button" class="srow-x" data-accion="del-seccion" data-sec="${si}" title="Eliminar sección">✕</button>
      </div>
    </div>

    <div class="campo">
      <label>Título de la sección</label>
      <input type="text" data-edit="titulo" data-sec="${si}" value="${escapar(sec.titulo)}" placeholder="Ej: Aspectos personales">
    </div>

    <label>Escala de respuesta</label>
    <div class="ed-chips">${presets}
      <button type="button" class="ed-chip ${activo === null ? "on" : ""}" data-accion="toggle-avz" data-sec="${si}">Personalizar ⚙</button>
    </div>

    ${preview}

    <details class="ed-avz" data-sec="${si}" ${activo === null ? "open" : ""}>
      <summary>Editar columnas y puntos manualmente</summary>
      <p class="ed-nota">
        <b>pts</b> = cuánto vale cada opción (tú decides). Marca <em>"no cuenta"</em> en columnas como "No Aplica".
      </p>
      ${columnas}
      <button type="button" class="btn secundario" data-accion="add-col" data-sec="${si}" style="margin-top:6px">+ Agregar columna</button>
    </details>

    <label style="margin-top:16px">Preguntas</label>
    ${preguntas}
    <button type="button" class="btn secundario" data-accion="add-preg" data-sec="${si}">+ Agregar pregunta</button>
  </div>`;
}

function onEdit(e) {
  const el = e.target;
  const si = +el.dataset.sec;
  const sec = P.secciones[si];
  switch (el.dataset.edit) {
    case "titulo": sec.titulo = el.value; actualizarPreview(si); break;
    case "preg": sec.preguntas[+el.dataset.preg] = el.value; if (+el.dataset.preg === 0) actualizarPreview(si); break;
    case "col": sec.opciones[+el.dataset.col].label = el.value; actualizarPreview(si); break;
    case "col-val": {
      const v = el.value.trim();
      sec.opciones[+el.dataset.col].valor = v === "" ? 0 : Number(v);
      break;
    }
    case "colnc": {
      const ci = +el.dataset.col;
      sec.opciones[ci].valor = el.checked ? null : 1;
      // No re-render completo: solo habilita/deshabilita el campo de puntos vecino.
      const num = document.querySelector(`input[data-edit="col-val"][data-sec="${si}"][data-col="${ci}"]`);
      if (num) { num.disabled = el.checked; if (!el.checked && num.value.trim() === "") num.value = "1"; }
      break;
    }
  }
}

// Repinta solo la tabla de vista previa de una sección (sin tocar el resto).
function actualizarPreview(si) {
  const sec = P.secciones[si];
  const cont = document.querySelectorAll(".ed-seccion")[si];
  if (!cont) return;
  const tbody = cont.querySelector(".ed-preview tbody");
  const thead = cont.querySelector(".ed-preview thead tr");
  if (!tbody || !thead) return;
  const ejemplo = (sec.preguntas.find((p) => p.trim()) || "Ejemplo de pregunta").trim();
  thead.innerHTML = `<th></th>${sec.opciones.map((o) => `<th>${escapar(o.label)}</th>`).join("")}`;
  tbody.innerHTML = `<tr><td>${escapar(ejemplo)}</td>${sec.opciones.map(() => `<td><input type="radio" disabled></td>`).join("")}</tr>`;
}

function onAccion(e) {
  const el = e.target.closest("[data-accion]");
  if (!el) return;
  const si = +el.dataset.sec;
  const sec = P.secciones[si];
  switch (el.dataset.accion) {
    case "preset":
      sec.opciones = clonar(ESCALAS[el.dataset.preset]);
      break;
    case "toggle-avz": {
      const det = document.querySelector(`details.ed-avz[data-sec="${si}"]`);
      if (det) det.open = !det.open;
      return; // no re-render
    }
    case "add-preg": sec.preguntas.push(""); break;
    case "del-preg": sec.preguntas.splice(+el.dataset.preg, 1); break;
    case "preg-up": [sec.preguntas[el.dataset.preg - 1], sec.preguntas[+el.dataset.preg]] = [sec.preguntas[+el.dataset.preg], sec.preguntas[el.dataset.preg - 1]]; break;
    case "preg-down": [sec.preguntas[+el.dataset.preg + 1], sec.preguntas[+el.dataset.preg]] = [sec.preguntas[+el.dataset.preg], sec.preguntas[+el.dataset.preg + 1]]; break;
    case "add-col": sec.opciones.push({ label: "Nueva", valor: 1 }); break;
    case "del-col": sec.opciones.splice(+el.dataset.col, 1); break;
    case "sec-up": [P.secciones[si - 1], P.secciones[si]] = [P.secciones[si], P.secciones[si - 1]]; break;
    case "sec-down": [P.secciones[si + 1], P.secciones[si]] = [P.secciones[si], P.secciones[si + 1]]; break;
    case "del-seccion":
      if (!confirm(`¿Eliminar la sección "${sec.titulo}"?`)) return;
      P.secciones.splice(si, 1);
      break;
  }
  reRender();
}

function agregarSeccion() {
  P.secciones.push({
    id: "seccion_" + Date.now(),
    titulo: "Nueva sección",
    opciones: clonar(ESCALAS.calidad),
    preguntas: [""],
  });
  verEditor();
  // Baja hasta la sección recién creada.
  const cards = document.querySelectorAll(".ed-seccion");
  if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: "smooth", block: "center" });
}

async function guardar() {
  const msg = document.getElementById("mensaje");
  msg.innerHTML = "";
  const error = (t) => { msg.innerHTML = `<div class="msg error">${t}</div>`; msg.scrollIntoView({ behavior: "smooth", block: "center" }); };

  if (!P.nombre.trim()) return error("El formulario necesita un nombre.");
  if (!P.secciones.length) return error("El formulario necesita al menos una sección.");
  for (const sec of P.secciones) {
    if (!sec.titulo.trim()) return error("Hay una sección sin título.");
    sec.opciones = sec.opciones.filter((o) => o.label.trim());
    sec.opciones.forEach((o) => (o.label = o.label.trim()));
    if (sec.opciones.length < 2) return error(`La sección "${sec.titulo}" necesita al menos 2 columnas.`);
    if (!sec.opciones.some((o) => o.valor !== null && o.valor > 0))
      return error(`La sección "${sec.titulo}" necesita al menos una columna con puntos mayores a 0.`);
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

  const btns = [document.getElementById("btn-guardar"), document.getElementById("btn-guardar-2")].filter(Boolean);
  btns.forEach((b) => { b.disabled = true; b.textContent = "Guardando…"; });
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
    btns.forEach((b) => { b.disabled = false; b.textContent = "Guardar formulario"; });
  }
}
