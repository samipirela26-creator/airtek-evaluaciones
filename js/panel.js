// panel.js — panel según el rol.
//  - Supervisor: gestiona sus técnicos (avatar cards) y hace clic para evaluar; ve sus planillas.
//  - Coordinador: edita el formulario y ve todas las planillas.
import { db } from "./firebase.js";
import { protegerPagina, cerrarSesion } from "./session.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const AVATAR_COLORS = ["#0066ff", "#059669", "#7c3aed", "#dc2626", "#d97706", "#0891b2", "#be185d", "#374151"];
function initials(n) {
  if (!n) return "?";
  return n.split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
}
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

document.getElementById("btn-salir").addEventListener("click", cerrarSesion);

let sesion = null;

protegerPagina(null, async ({ user, perfil }) => {
  sesion = { user, perfil };
  document.getElementById("usuario-info").textContent = `${perfil.nombre} · ${perfil.rol}`;

  if (perfil.rol === "supervisor") {
    document.getElementById("acciones").innerHTML = `
      <h2>Hola, ${esc(perfil.nombre)}</h2>
      <p>Tus técnicos. Haz clic en uno para evaluarlo.</p>
      <div class="add-row">
        <textarea id="nuevo-tecnico" rows="2"
          placeholder="Un técnico por línea. Puedes pegar una lista completa y se agregan todos."></textarea>
        <button class="btn" id="btn-add-tecnico">+ Agregar</button>
      </div>
      <div id="add-hint" class="meta" style="margin:-8px 0 12px"></div>
      <div id="tecnicos-list">Cargando…</div>`;
    document.getElementById("titulo-lista").textContent = "Mis evaluaciones realizadas";

    document.getElementById("btn-add-tecnico").addEventListener("click", agregarTecnico);
    document.getElementById("nuevo-tecnico").addEventListener("input", actualizarHint);
    cargarTecnicos();
  } else {
    document.getElementById("acciones").innerHTML = `
      <h2>Hola, ${esc(perfil.nombre)} (Coordinador)</h2>
      <p>Aquí ves todas las evaluaciones que hacen tus supervisores.</p>
      <a class="btn" href="editor.html">✎ Editar formulario de evaluación</a>`;
    document.getElementById("titulo-lista").textContent = "Todas las evaluaciones";
  }

  cargarLista(perfil, user.uid);
});

// ───────── Técnicos (solo supervisor) ─────────
async function cargarTecnicos() {
  const cont = document.getElementById("tecnicos-list");
  try {
    const snap = await getDocs(query(collection(db, "tecnicos"), where("supervisorUid", "==", sesion.user.uid)));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    if (!items.length) {
      cont.innerHTML = `<div class="lista-vacia">Aún no tienes técnicos. Agrega el primero arriba. 👆</div>`;
      return;
    }
    cont.innerHTML = items
      .map((t, i) => {
        const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
        return `
        <div class="srow" data-eval="${t.id}">
          <div class="aa-avatar" style="background:${bg}">${initials(t.nombre)}</div>
          <span class="srow-name">${esc(t.nombre)}</span>
          <button class="srow-x" data-del="${t.id}" title="Eliminar técnico">✕</button>
        </div>`;
      })
      .join("");

    // Clic en la tarjeta → evaluar ese técnico
    cont.querySelectorAll("[data-eval]").forEach((el) =>
      el.addEventListener("click", () => (window.location.href = `evaluacion.html?tecnico=${el.dataset.eval}`))
    );
    // Botón eliminar
    cont.querySelectorAll("[data-del]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        eliminarTecnico(el.dataset.del);
      })
    );
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">No se pudieron cargar los técnicos: ${err.message}</div>`;
  }
}

// Convierte el texto (una lista pegada) en nombres limpios, sin numeración
// tipo "1." o "-", sin vacíos y sin repetidos.
function parseNombres(texto) {
  const vistos = new Set();
  return texto
    .split(/\n+/)
    .map((l) => l.replace(/^\s*\d+[.)\-]?\s*/, "").replace(/^\s*[-•*]\s*/, "").trim())
    .filter((l) => {
      if (!l) return false;
      const k = l.toLowerCase();
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
}

function actualizarHint() {
  const n = parseNombres(document.getElementById("nuevo-tecnico").value).length;
  document.getElementById("add-hint").textContent =
    n > 1 ? `Se agregarán ${n} técnicos` : "";
}

async function agregarTecnico() {
  const input = document.getElementById("nuevo-tecnico");
  const btn = document.getElementById("btn-add-tecnico");
  const nombres = parseNombres(input.value);
  if (!nombres.length) return;
  input.disabled = true;
  btn.disabled = true;
  try {
    // Agrega todos de golpe.
    await Promise.all(
      nombres.map((nombre) =>
        addDoc(collection(db, "tecnicos"), {
          nombre,
          supervisorUid: sesion.user.uid,
          supervisorNombre: sesion.perfil.nombre,
          createdAt: serverTimestamp(),
        })
      )
    );
    input.value = "";
    actualizarHint();
    await cargarTecnicos();
  } catch (err) {
    console.error(err);
    alert("No se pudieron agregar: " + err.message);
  } finally {
    input.disabled = false;
    btn.disabled = false;
    input.focus();
  }
}

async function eliminarTecnico(id) {
  if (!confirm("¿Eliminar este técnico? (sus evaluaciones ya guardadas se conservan)")) return;
  try {
    await deleteDoc(doc(db, "tecnicos", id));
    await cargarTecnicos();
  } catch (err) {
    console.error(err);
    alert("No se pudo eliminar: " + err.message);
  }
}

// ───────── Lista de evaluaciones (ambos roles) ─────────
async function cargarLista(perfil, uid) {
  const cont = document.getElementById("lista");
  try {
    const ref = collection(db, "evaluaciones");
    const q =
      perfil.rol === "supervisor"
        ? query(ref, where("supervisorUid", "==", uid))
        : query(ref, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);
    if (snap.empty) {
      cont.innerHTML = "<p>No hay evaluaciones todavía.</p>";
      return;
    }

    const items = snap.docs.map((d) => d.data());
    if (perfil.rol === "supervisor") {
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }

    let html = "";
    items.forEach((e) => {
      const fecha = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleString("es-VE") : "";
      const prom = e.puntajes?.promedioGeneral;
      const badge = prom != null ? `${prom.toFixed(2)} / 4` : "—";
      html += `
        <div class="lista-item">
          <div>
            <strong>${esc(e.tecnicoNombre) || "(sin nombre)"}</strong>
            <div class="meta">
              ${esc(e.area) || ""} · ${esc(e.motivo) || "s/motivo"}<br>
              Supervisor: ${esc(e.supervisorNombre) || ""} · ${fecha}
            </div>
          </div>
          <span class="badge" title="Promedio general">${badge}</span>
        </div>`;
    });
    cont.innerHTML = html;
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">Error al cargar. Revisa la consola (F12).</div>`;
  }
}
