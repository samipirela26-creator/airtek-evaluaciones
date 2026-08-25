// evaluar.js — página PÚBLICA (sin login) para que un técnico evalúe a un supervisor.
import { db } from "./firebase.js";
import { opcionesDeSeccion } from "./plantilla.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

const token = new URLSearchParams(location.search).get("e");
let enlace = null;
let P = null; // el formulario (snapshot guardado en el enlace)

(async function init() {
  const estado = document.getElementById("estado");
  if (!token) {
    estado.innerHTML = `<div class="msg error">Enlace inválido.</div>`;
    return;
  }
  try {
    const snap = await getDoc(doc(db, "enlaces", token));
    if (!snap.exists() || snap.data().activo === false) {
      estado.innerHTML = `<div class="msg error">Este enlace no está disponible. Pídele uno nuevo al coordinador.</div>`;
      return;
    }
    enlace = snap.data();
    P = enlace.plantillaSnapshot;
    estado.style.display = "none";
    render();
  } catch (err) {
    console.error(err);
    estado.innerHTML = `<div class="msg error">No se pudo cargar: ${err.message}</div>`;
  }
})();

function render() {
  document.getElementById("form-eval").style.display = "block";
  document.getElementById("titulo").textContent = `Evalúa a ${enlace.supervisorNombre || "tu supervisor"}`;
  document.getElementById("subtitulo").textContent = P.nombre || "";

  document.getElementById("secciones").innerHTML = P.secciones.map(seccionHTML).join("");
  document.getElementById("bloque-sino").innerHTML = P.siNo
    ? `<label class="requerido">${esc(P.siNo.label)}</label>
       <div style="margin-top:6px">
         <label style="display:inline;font-weight:400;margin-right:20px"><input type="radio" name="${P.siNo.id}" value="Si" required> Sí</label>
         <label style="display:inline;font-weight:400"><input type="radio" name="${P.siNo.id}" value="No"> No</label>
       </div>
       <div class="campo" style="margin-top:12px"><label>Observaciones:</label><textarea id="${P.siNo.id}_obs"></textarea></div>`
    : "";

  document.getElementById("form-eval").addEventListener("submit", enviar);
}

function seccionHTML(sec) {
  const escala = opcionesDeSeccion(sec);
  const cabeceras = escala.map((op) => `<th>${esc(op.label)}</th>`).join("");
  const filas = sec.preguntas
    .map((preg, i) => {
      const name = `${sec.id}_${i}`;
      const radios = escala.map((op) => `<td><input type="radio" name="${name}" value="${esc(op.label)}" required></td>`).join("");
      return `<tr><td>${esc(preg)}</td>${radios}</tr>`;
    })
    .join("");
  return `<div class="card">
    <h2 class="requerido">${esc(sec.titulo)}</h2>
    <div class="tabla-scroll">
      <table class="tabla-escala">
        <thead><tr><th></th>${cabeceras}</tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <div class="campo" style="margin-top:12px"><label>Observaciones:</label><textarea id="${sec.id}_obs"></textarea></div>
  </div>`;
}

function calcularPuntajes(respuestas) {
  const porSeccion = {};
  const todos = [];
  for (const sec of P.secciones) {
    const escala = opcionesDeSeccion(sec);
    const valores = [];
    sec.preguntas.forEach((_, i) => {
      const op = escala.find((o) => o.label === respuestas[sec.id][i]);
      if (op && op.valor != null) valores.push(op.valor);
    });
    const prom = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
    porSeccion[sec.id] = prom;
    todos.push(...valores);
  }
  const promedioGeneral = todos.length ? todos.reduce((a, b) => a + b, 0) / todos.length : null;
  return { porSeccion, promedioGeneral };
}

async function enviar(e) {
  e.preventDefault();
  const msg = document.getElementById("mensaje");
  const btn = document.getElementById("btn-enviar");
  msg.innerHTML = "";

  const respuestas = {};
  const observaciones = {};
  for (const sec of P.secciones) {
    respuestas[sec.id] = [];
    for (let i = 0; i < sec.preguntas.length; i++) {
      const sel = document.querySelector(`input[name="${sec.id}_${i}"]:checked`);
      respuestas[sec.id][i] = sel ? sel.value : null;
    }
    const obs = document.getElementById(sec.id + "_obs");
    observaciones[sec.id] = obs ? obs.value.trim() : "";
  }
  let conoceCanales = null;
  if (P.siNo) {
    const sino = document.querySelector(`input[name="${P.siNo.id}"]:checked`);
    conoceCanales = sino ? sino.value : null;
    const so = document.getElementById(P.siNo.id + "_obs");
    observaciones[P.siNo.id] = so ? so.value.trim() : "";
  }

  const registro = {
    enlaceId: token,
    supervisorUid: enlace.supervisorUid,
    supervisorNombre: enlace.supervisorNombre || "",
    tecnicoNombre: document.getElementById("tu-nombre").value.trim() || "Anónimo",
    respuestas,
    observaciones,
    conoceCanales,
    puntajes: calcularPuntajes(respuestas),
    plantillaSnapshot: P,
    createdAt: serverTimestamp(),
  };

  btn.disabled = true;
  btn.textContent = "Enviando…";
  try {
    await addDoc(collection(db, "evaluacionesSupervisor"), registro);
    document.getElementById("form-eval").innerHTML =
      `<div class="card"><h2>¡Gracias! ✅</h2><p>Tu evaluación fue enviada. Ya puedes cerrar esta página.</p></div>`;
  } catch (err) {
    console.error(err);
    msg.innerHTML = `<div class="msg error">No se pudo enviar: ${err.message}</div>`;
    btn.disabled = false;
    btn.textContent = "Enviar evaluación";
  }
}
