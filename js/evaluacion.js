// evaluacion.js — renderiza la plantilla, recoge respuestas, calcula puntajes y guarda.
import { db } from "./firebase.js";
import { protegerPagina } from "./session.js";
import { cargarPlantillaActiva, ESCALAS } from "./plantilla.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// La plantilla vigente se carga desde Firebase al abrir la página.
let P = null;

let sesion = null; // { user, perfil }
const firmas = {}; // guarda los controladores de cada canvas

// Solo supervisores evalúan.
protegerPagina("supervisor", async (s) => {
  sesion = s;
  P = await cargarPlantillaActiva(db);
  render();
});

function render() {
  document.getElementById("titulo-form").textContent = P.nombre;
  document.getElementById("datos-generales").innerHTML = P.datos.map(campoDato).join("");
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

  // Firmas
  firmas["firma-supervisor"] = crearFirma("firma-supervisor");
  firmas["firma-tecnico"] = crearFirma("firma-tecnico");
  document.querySelectorAll("[data-limpiar]").forEach((b) =>
    b.addEventListener("click", () => firmas[b.dataset.limpiar].limpiar())
  );

  document.getElementById("form-eval").addEventListener("submit", guardar);
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
  const escala = ESCALAS[sec.escala];
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
    <table class="tabla-escala">
      <thead><tr><th></th>${cabeceras}</tr></thead>
      <tbody>${filas}</tbody>
    </table>
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
  };
}

// ---- Cálculo de puntajes ----
// Convierte la respuesta elegida a su valor numérico y promedia por sección.
function calcularPuntajes(respuestas) {
  const porSeccion = {};
  const todos = [];
  for (const sec of P.secciones) {
    const escala = ESCALAS[sec.escala];
    const valores = [];
    sec.preguntas.forEach((_, i) => {
      const elegido = respuestas[sec.id][i];
      const op = escala.find((o) => o.label === elegido);
      if (op && op.valor != null) valores.push(op.valor); // "No Aplica" no cuenta
    });
    const prom = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
    porSeccion[sec.id] = prom;
    todos.push(...valores);
  }
  const promedioGeneral = todos.length
    ? todos.reduce((a, b) => a + b, 0) / todos.length
    : null;
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
    createdAt: serverTimestamp(),
  };

  btn.disabled = true;
  btn.textContent = "Guardando…";
  try {
    await addDoc(collection(db, "evaluaciones"), registro);
    msg.innerHTML = `<div class="msg ok">✔ Evaluación guardada. Redirigiendo…</div>`;
    setTimeout(() => (window.location.href = "panel.html"), 1200);
  } catch (err) {
    console.error(err);
    msg.innerHTML = `<div class="msg error">No se pudo guardar: ${err.message}</div>`;
    btn.disabled = false;
    btn.textContent = "Guardar evaluación";
  }
}
