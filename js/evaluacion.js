// evaluacion.js — renderiza la plantilla, recoge respuestas, calcula puntajes y guarda.
import { db, toast } from "./firebase.js";
import { protegerPagina } from "./session.js";
import { cargarPlantillasDeCoordinador, opcionesDeSeccion, PLANTILLA_DEFAULT } from "./plantilla.js";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Los formularios disponibles (los del coordinador del supervisor) y el elegido.
let plantillasDisponibles = [];
let P = null;

let sesion = null; // { user, perfil }
const firmas = {}; // guarda los controladores de cada canvas
let tecnicoId = null; // técnico seleccionado (viene en ?tecnico=ID)
let tecnicoPre = null; // nombre pre-cargado de ese técnico
let borradorRestaurado = false; // para restaurar el borrador una sola vez
let editId = null; // si venimos a EDITAR una evaluación (?edit=ID)
let evalCargada = null; // datos de la evaluación que se está editando

// Solo supervisores evalúan.
protegerPagina("supervisor", async (s) => {
  sesion = s;
  const forms = await cargarPlantillasDeCoordinador(db, sesion.perfil.coordinadorUid);
  // Solo formularios para evaluar TÉCNICOS (no los privados de supervisores).
  const propios = forms.filter((f) => (f.tipo || "tecnico") === "tecnico");
  // El formulario OFICIAL de Airtek siempre está disponible, más los del coordinador.
  plantillasDisponibles = [...propios, PLANTILLA_DEFAULT];
  P = plantillasDisponibles[0];

  const params = new URLSearchParams(location.search);
  editId = params.get("edit");
  tecnicoId = params.get("tecnico");

  if (editId) {
    // Modo edición: cargamos la evaluación y usamos su mismo formulario (snapshot).
    try {
      const snap = await getDoc(doc(db, "evaluaciones", editId));
      if (snap.exists()) {
        evalCargada = snap.data();
        if (evalCargada.plantillaSnapshot) {
          plantillasDisponibles = [evalCargada.plantillaSnapshot];
          P = evalCargada.plantillaSnapshot;
        }
        tecnicoId = evalCargada.tecnicoId || null;
        tecnicoPre = evalCargada.tecnicoNombre || null;
      }
    } catch (err) {
      console.warn("No se pudo cargar la evaluación a editar:", err);
    }
  } else if (tecnicoId) {
    // Si se abrió desde una tarjeta de técnico, pre-cargamos su nombre.
    try {
      const snap = await getDoc(doc(db, "tecnicos", tecnicoId));
      if (snap.exists()) tecnicoPre = snap.data().nombre;
    } catch (err) {
      console.warn("No se pudo cargar el técnico:", err);
    }
  }
  render();
  if (evalCargada) prellenar();
});

// Configuración fija (una sola vez): firmas y submit.
function render() {
  firmas["firma-supervisor"] = crearFirma("firma-supervisor");
  firmas["firma-tecnico"] = crearFirma("firma-tecnico");
  document.querySelectorAll("[data-limpiar]").forEach((b) =>
    b.addEventListener("click", () => firmas[b.dataset.limpiar].limpiar())
  );
  document.getElementById("form-eval").addEventListener("submit", guardar);
  // Autoguardado de borrador: guarda mientras escribe (sin las firmas).
  let t;
  document.getElementById("form-eval").addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(guardarBorrador, 500);
  });
  pintarPlantilla();
}

// ---- Borrador (localStorage), para no perder una evaluación a medio llenar ----
function draftKey() {
  return `airtek_borrador_${tecnicoId || "nuevo"}`;
}
function guardarBorrador() {
  if (editId) return; // en edición no usamos borrador
  const form = document.getElementById("form-eval");
  const data = {};
  form.querySelectorAll("input, select, textarea").forEach((el) => {
    if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
    else if (el.id) data[el.id] = el.value;
  });
  try { localStorage.setItem(draftKey(), JSON.stringify({ data, ts: Date.now() })); } catch {}
}
function restaurarBorrador() {
  if (editId) return; // en edición no restauramos borrador
  let raw;
  try { raw = localStorage.getItem(draftKey()); } catch { return; }
  if (!raw) return;
  try {
    const { data } = JSON.parse(raw);
    let algo = false;
    Object.entries(data).forEach(([k, v]) => {
      if (!v) return;
      const radios = document.querySelectorAll(`input[type=radio][name="${k}"]`);
      if (radios.length) { radios.forEach((r) => { if (r.value === v) { r.checked = true; algo = true; } }); return; }
      const el = document.getElementById(k);
      if (el && !el.readOnly) { el.value = v; algo = true; }
    });
    if (algo) toast("📝 Borrador restaurado", { ms: 2500 });
  } catch {}
}
function limpiarBorrador() {
  try { localStorage.removeItem(draftKey()); } catch {}
}

// Pre-llena el formulario con una evaluación existente (modo edición).
function prellenar() {
  const E = evalCargada;
  document.getElementById("titulo-form").textContent = "Editar: " + (P.nombre || "");
  for (const c of P.datos) {
    const el = document.getElementById(c.id);
    if (el && E[c.id] != null) el.value = E[c.id];
  }
  for (const sec of P.secciones) {
    const arr = E.respuestas?.[sec.id] || [];
    sec.preguntas.forEach((_, i) => {
      const val = arr[i];
      if (val) document.querySelectorAll(`input[name="${sec.id}_${i}"]`).forEach((r) => { if (r.value === val) r.checked = true; });
    });
    const obs = document.getElementById(sec.id + "_obs");
    if (obs && E.observaciones?.[sec.id]) obs.value = E.observaciones[sec.id];
  }
  if (E.conoceCanales) document.querySelectorAll(`input[name="${P.siNo.id}"]`).forEach((r) => { if (r.value === E.conoceCanales) r.checked = true; });
  const so = document.getElementById(P.siNo.id + "_obs");
  if (so && E.observaciones?.[P.siNo.id]) so.value = E.observaciones[P.siNo.id];
  if (E.firmaSupervisor) firmas["firma-supervisor"].cargar(E.firmaSupervisor);
  if (E.firmaTecnico) firmas["firma-tecnico"].cargar(E.firmaTecnico);
}

// Pinta las partes que dependen del formulario elegido (P). Se puede repintar
// al cambiar de formulario sin tocar las firmas ni el submit.
function pintarPlantilla() {
  document.getElementById("titulo-form").textContent = P.nombre;

  const selector =
    plantillasDisponibles.length > 1
      ? `<div class="campo"><label>Formulario a usar</label>
           <select id="sel-form">${plantillasDisponibles
             .map((f, i) => `<option value="${i}" ${f === P ? "selected" : ""}>${String(f.nombre || "Formulario " + (i + 1)).replace(/</g, "&lt;")}</option>`)
             .join("")}</select></div>`
      : "";
  document.getElementById("datos-generales").innerHTML = selector + P.datos.map(campoDato).join("");

  // Si venimos de una tarjeta de técnico, fijamos su nombre (no editable).
  if (tecnicoPre) {
    const el = document.getElementById("tecnicoNombre");
    if (el) {
      el.value = tecnicoPre;
      el.readOnly = true;
      el.style.background = "#eef2ff";
    }
  }
  document.getElementById("secciones").innerHTML = P.secciones.map(seccionHTML).join("");
  document.getElementById("bloque-sino").innerHTML = `
    <label class="requerido">${P.siNo.label}</label>
    <div style="margin-top:6px">
      <label style="display:inline;font-weight:400;margin-right:20px">
        <input type="radio" name="${P.siNo.id}" value="Si" required> Sí</label>
      <label style="display:inline;font-weight:400">
        <input type="radio" name="${P.siNo.id}" value="No"> No</label>
    </div>
    ${textareaObs(P.siNo.id + "_obs")}`;

  const sel = document.getElementById("sel-form");
  if (sel) sel.addEventListener("change", () => { P = plantillasDisponibles[+sel.value]; pintarPlantilla(); });

  if (!borradorRestaurado) { restaurarBorrador(); borradorRestaurado = true; }
}

// ---- Render de campos ----
function campoDato(c) {
  const req = c.requerido ? "requerido" : "";
  const reqAttr = c.requerido ? "required" : "";
  let control;
  if (c.tipo === "select") {
    control = `<select id="${c.id}" ${reqAttr}>
      <option value="">— Seleccionar —</option>
      ${c.opciones.map((o) => `<option value="${o}">${o}</option>`).join("")}
    </select>`;
  } else {
    control = `<input type="${c.tipo}" id="${c.id}" ${reqAttr}>`;
  }
  return `<div class="campo"><label for="${c.id}" class="${req}">${c.label}</label>${control}</div>`;
}

function seccionHTML(sec) {
  const escala = opcionesDeSeccion(sec);
  const cabeceras = escala.map((op) => `<th>${op.label}</th>`).join("");
  const filas = sec.preguntas
    .map((preg, i) => {
      const name = `${sec.id}_${i}`;
      const radios = escala
        .map(
          (op) =>
            `<td><input type="radio" name="${name}" value="${op.label}" required></td>`
        )
        .join("");
      return `<tr><td>${preg}</td>${radios}</tr>`;
    })
    .join("");

  return `<div class="card">
    <h2 class="requerido">${sec.titulo}</h2>
    <div class="tabla-scroll">
      <table class="tabla-escala">
        <thead><tr><th></th>${cabeceras}</tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    ${textareaObs(sec.id + "_obs")}
  </div>`;
}

function textareaObs(id) {
  return `<div class="campo" style="margin-top:12px">
    <label for="${id}">Observaciones:</label>
    <textarea id="${id}"></textarea></div>`;
}

// ---- Firma en canvas (mouse y táctil) ----
function crearFirma(id) {
  const canvas = document.getElementById(id);
  // Ajusta el tamaño real del canvas al tamaño visible (evita el dibujo "estirado").
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#111";

  let dibujando = false;
  let vacio = true;

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const inicio = (e) => { dibujando = true; const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y); e.preventDefault(); };
  const mover = (e) => { if (!dibujando) return; const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); vacio = false; e.preventDefault(); };
  const fin = () => { dibujando = false; };

  canvas.addEventListener("mousedown", inicio);
  canvas.addEventListener("mousemove", mover);
  window.addEventListener("mouseup", fin);
  canvas.addEventListener("touchstart", inicio);
  canvas.addEventListener("touchmove", mover);
  canvas.addEventListener("touchend", fin);

  return {
    limpiar: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); vacio = true; },
    estaVacio: () => vacio,
    dataURL: () => (vacio ? null : canvas.toDataURL("image/png")),
    // Carga una firma guardada (para editar): la dibuja y la marca como presente.
    cargar: (durl) => {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = durl;
      vacio = false;
    },
  };
}

// ---- Cálculo de puntajes (modelo rúbrica → NOTA de 0 a 10) ----
// Nota = (puntos obtenidos / puntos máximos posibles) × 10. Así el coordinador
// decide cuánto vale cada opción y la nota final siempre queda entre 0 y 10.
function calcularPuntajes(respuestas) {
  const porSeccion = {};
  let totalObt = 0, totalMax = 0;
  for (const sec of P.secciones) {
    const escala = opcionesDeSeccion(sec);
    const maxVal = Math.max(0, ...escala.map((o) => (o.valor == null ? 0 : o.valor)));
    let obt = 0, max = 0;
    sec.preguntas.forEach((_, i) => {
      const op = escala.find((o) => o.label === respuestas[sec.id][i]);
      if (op && op.valor != null) { obt += op.valor; max += maxVal; } // "No Aplica" no cuenta
    });
    porSeccion[sec.id] = max > 0 ? (obt / max) * 10 : null;
    totalObt += obt;
    totalMax += max;
  }
  const promedioGeneral = totalMax > 0 ? (totalObt / totalMax) * 10 : null;
  return { porSeccion, promedioGeneral };
}

// ---- Guardar ----
async function guardar(e) {
  e.preventDefault();
  const msg = document.getElementById("mensaje");
  const btn = document.getElementById("btn-guardar");
  msg.innerHTML = "";

  // Datos generales
  const datos = {};
  for (const c of P.datos) datos[c.id] = document.getElementById(c.id).value.trim();

  // Respuestas por sección (radios)
  const respuestas = {};
  const observaciones = {};
  for (const sec of P.secciones) {
    respuestas[sec.id] = [];
    for (let i = 0; i < sec.preguntas.length; i++) {
      const sel = document.querySelector(`input[name="${sec.id}_${i}"]:checked`);
      respuestas[sec.id][i] = sel ? sel.value : null;
    }
    observaciones[sec.id] = document.getElementById(sec.id + "_obs").value.trim();
  }

  // Sí/No + su observación
  const sino = document.querySelector(`input[name="${P.siNo.id}"]:checked`);
  observaciones[P.siNo.id] = document.getElementById(P.siNo.id + "_obs").value.trim();

  // Firma del supervisor obligatoria
  if (firmas["firma-supervisor"].estaVacio()) {
    msg.innerHTML = `<div class="msg error">Falta la firma del supervisor.</div>`;
    return;
  }

  const puntajes = calcularPuntajes(respuestas);

  const registro = {
    plantillaId: P.id,
    plantillaVersion: P.version,
    supervisorUid: sesion.user.uid,
    supervisorNombre: sesion.perfil.nombre,
    tecnicoId: tecnicoId || null,
    tecnicoNombre: datos.tecnicoNombre,
    fechaHora: datos.fechaHora,
    ordenTrabajo: datos.ordenTrabajo,
    area: datos.area,
    motivo: datos.motivo,
    respuestas,
    observaciones,
    conoceCanales: sino ? sino.value : null,
    firmaSupervisor: firmas["firma-supervisor"].dataURL(),
    firmaTecnico: firmas["firma-tecnico"].dataURL(),
    puntajes,
    // Foto del formulario usado, para poder ver/exportar la planilla aunque
    // el coordinador edite la plantilla después.
    plantillaSnapshot: {
      nombre: P.nombre,
      siNo: P.siNo,
      secciones: P.secciones.map((s) => ({
        id: s.id,
        titulo: s.titulo,
        preguntas: s.preguntas,
        opciones: opcionesDeSeccion(s),
      })),
    },
    createdAt: serverTimestamp(),
  };

  btn.disabled = true;
  btn.textContent = "Guardando…";
  try {
    if (editId) {
      const { createdAt, ...sinFecha } = registro; // no pisamos la fecha original
      await updateDoc(doc(db, "evaluaciones", editId), { ...sinFecha, editadoEn: serverTimestamp() });
    } else {
      await addDoc(collection(db, "evaluaciones"), registro);
      limpiarBorrador();
    }
    msg.innerHTML = `<div class="msg ok">✔ Evaluación ${editId ? "actualizada" : "guardada"}. Redirigiendo…</div>`;
    toast(`Evaluación ${editId ? "actualizada" : "guardada"} ✓`);
    setTimeout(() => (window.location.href = editId ? `detalle.html?id=${editId}` : "panel.html"), 1200);
  } catch (err) {
    console.error(err);
    msg.innerHTML = `<div class="msg error">No se pudo guardar: ${err.message}</div>`;
    btn.disabled = false;
    btn.textContent = "Guardar evaluación";
  }
}
