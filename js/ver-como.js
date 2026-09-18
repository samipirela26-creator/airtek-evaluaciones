// ver-como.js — Selector "Ver como" (spec 003): deja que root elija un
// coordinador o supervisor y navegue la app con sus datos reales.
import { db, toast } from "./firebase.js";
import { activarVerComo, salirDeVerComo } from "./session.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

const ETIQUETA_ROL = { coordinador: "Coordinador", supervisor: "Supervisor" };

// Coordinadores y supervisores reales, ordenados por nombre. Los técnicos no
// tienen cuenta propia y root queda fuera porque el filtro no lo incluye.
async function listarObjetivos() {
  const snap = await getDocs(collection(db, "usuarios"));
  const items = snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => u.rol === "coordinador" || u.rol === "supervisor");
  items.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  return items;
}

// Pinta el selector dentro de `contenedor`. Debe llamarse solo cuando quien
// mira la pantalla es root (RF-1) — este módulo no lo vuelve a comprobar.
export async function montarSelectorVerComo(contenedor) {
  if (!contenedor) return;
  contenedor.innerHTML = `<p class="meta">Cargando usuarios…</p>`;

  let objetivos;
  try {
    objetivos = await listarObjetivos();
  } catch (err) {
    contenedor.innerHTML = `<p class="msg error">No se pudo cargar la lista de usuarios: ${esc(err.message)}</p>`;
    return;
  }
  if (!objetivos.length) {
    contenedor.innerHTML = `<p class="meta">Aún no hay coordinadores ni supervisores para elegir.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="add-row" style="align-items:center">
      <select id="ver-como-select" style="flex:1">
        <option value="">👁️ Ver como…</option>
        ${objetivos
          .map(
            (o) =>
              `<option value="${esc(o.uid)}">${esc(o.nombre)} · ${esc(ETIQUETA_ROL[o.rol] || o.rol)}</option>`
          )
          .join("")}
      </select>
      <button class="btn secundario" id="ver-como-btn">Entrar</button>
    </div>`;

  document.getElementById("ver-como-btn").addEventListener("click", async () => {
    const uid = document.getElementById("ver-como-select").value;
    if (!uid) {
      toast("Elige primero a quién quieres ver.");
      return;
    }
    const objetivo = objetivos.find((o) => o.uid === uid);
    // Se espera el registro de auditoría (RF-10) antes de recargar: si no,
    // la petición puede quedar cancelada por la propia recarga de la página.
    await activarVerComo(uid, objetivo);
    location.reload();
  });
}

// Pinta el aviso fijo de "Ver como" justo debajo de la topbar, en cualquier
// página. Lo llama session.js (protegerPagina) cuando hay modo activo —
// nunca hace falta llamarlo a mano desde una página.
export function montarAvisoVerComo(verComo) {
  if (document.querySelector(".banner-ver-como")) return; // ya está pintado
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const rolLabel = ETIQUETA_ROL[verComo.rol] || verComo.rol;
  const banner = document.createElement("div");
  banner.className = "banner-ver-como";
  banner.innerHTML = `
    <span>👁️ Viendo como <strong>${esc(verComo.nombre)}</strong> (${esc(rolLabel)})</span>
    <button type="button" id="btn-volver-mi-cuenta">Volver a mi cuenta</button>`;
  topbar.insertAdjacentElement("afterend", banner);

  document.getElementById("btn-volver-mi-cuenta").addEventListener("click", async () => {
    // Igual que al activar: se espera el registro de cierre (RF-11) antes
    // de navegar, para que la escritura no quede cancelada por la propia
    // navegación.
    await salirDeVerComo();
    location.href = "panel.html";
  });
}

// ── Bloqueo de escritura mientras "Ver como" está activo (RF-8, RF-9) ──

// Guarda de escritura: se llama al PRINCIPIO de cada función que crea,
// edita o borra algo en Firestore. Es la protección real (RF-9) — no
// depende de que el botón que la disparó estuviera deshabilitado, así que
// también frena una llamada directa (p. ej. desde la consola).
export function bloqueaSiImpersona(sesion) {
  if (!sesion?.impersonando) return false;
  toast("No puedes hacer cambios mientras ves la app como otra persona. Vuelve a tu cuenta para editar.", { ms: 5000 });
  return true;
}

// Deshabilita de una vez los controles de escritura de una pantalla (RF-8):
// se llama una sola vez, después de pintarlos, con la lista de sus ids.
export function deshabilitarControlesDeEscritura(sesion, ids) {
  if (!sesion?.impersonando) return;
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = true;
      el.title = "No disponible mientras ves la app como otra persona";
    }
  }
}
