// panel.js — panel según el rol.
//  - Supervisor: gestiona sus técnicos (avatar cards) y hace clic para evaluar; ve sus planillas.
//  - Coordinador: edita el formulario y ve todas las planillas.
import { db, toast, logAudit } from "./firebase.js";
import { protegerPagina, cerrarSesion } from "./session.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
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

// ── Inhabilitar / reactivar usuarios ──
async function leerActivo(uid) {
  const s = await getDoc(doc(db, "usuarios", uid));
  return s.exists() ? s.data().activo !== false : true;
}
function htmlBotonEstado(activo, quienLabel) {
  return activo
    ? `<button class="btn secundario" id="btn-estado" style="color:#c0392b;border-color:#c0392b">Inhabilitar ${quienLabel}</button>`
    : `<button class="btn" id="btn-estado">Reactivar ${quienLabel}</button>`;
}
function wireBotonEstado(uid, nombre, activo, quienLabel, recargar) {
  const b = document.getElementById("btn-estado");
  if (!b) return;
  b.addEventListener("click", async () => {
    const accion = activo ? "Inhabilitar" : "Reactivar";
    if (!confirm(`¿${accion} a ${nombre}? ${activo ? "No podrá iniciar sesión." : ""}`)) return;
    try {
      await updateDoc(doc(db, "usuarios", uid), { activo: !activo });
      logAudit(activo ? "usuario_inhabilitado" : "usuario_reactivado", { objetivoUid: uid, nombre });
      toast(`${quienLabel} ${activo ? "inhabilitado" : "reactivado"} ✓`);
      recargar();
    } catch (err) {
      toast("No se pudo: " + err.message, { ms: 5000 });
    }
  });
}

document.getElementById("btn-salir").addEventListener("click", cerrarSesion);

let sesion = null;

protegerPagina(null, async ({ user, perfil }) => {
  sesion = { user, perfil };
  document.getElementById("usuario-info").textContent = `${perfil.nombre} · ${perfil.rol}`;

  if (perfil.rol === "supervisor") {
    document.getElementById("acciones").innerHTML = `
      <h2>Hola, ${esc(perfil.nombre)}</h2>
      <p>Tus técnicos. Haz clic en uno para evaluarlo.
         <a href="perfil.html" style="color:var(--azul);font-weight:600">⚙️ Mi cuenta</a></p>
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
    cargarLista(perfil, user.uid);
  } else if (perfil.rol === "root") {
    document.getElementById("acciones").innerHTML = `
      <h2>Hola, ${esc(perfil.nombre)} (Administrador)</h2>
      <p>Crea y administra a los coordinadores de Airtek.</p>
      <div class="btn-row">
        <button class="btn" id="btn-invitar-coord">🎟️ Invitar coordinador</button>
        <a class="btn secundario" href="auditoria.html">📜 Auditoría</a>
        <button class="btn secundario" id="btn-respaldo">⬇️ Respaldo</button>
        <a class="btn secundario" href="perfil.html">⚙️ Mi cuenta</a>
      </div>
      <div id="invite-box"></div>
      <div id="invites-list"></div>`;
    document.getElementById("titulo-lista").textContent = "Coordinadores";

    document.getElementById("btn-invitar-coord")
      .addEventListener("click", (e) => generarInvitacion("coordinador", e.currentTarget));
    document.getElementById("btn-respaldo").addEventListener("click", descargarRespaldo);
    cargarCoordinadores();
    cargarInvitaciones();
  } else {
    document.getElementById("acciones").innerHTML = `
      <h2>Hola, ${esc(perfil.nombre)} (Coordinador)</h2>
      <p>Aquí ves a tus supervisores y sus planillas.</p>
      <div class="btn-row">
        <a class="btn" href="dashboard.html">📊 Tablero de eficiencia</a>
        <a class="btn" href="editor.html">✎ Editar formulario</a>
        <button class="btn secundario" id="btn-invitar">🎟️ Invitar supervisor</button>
        <a class="btn secundario" href="perfil.html">⚙️ Mi cuenta</a>
      </div>
      <div id="invite-box"></div>
      <div id="invites-list"></div>`;
    document.getElementById("titulo-lista").textContent = "Mis supervisores";

    document.getElementById("btn-invitar")
      .addEventListener("click", (e) => generarInvitacion("supervisor", e.currentTarget));
    cargarSupervisores();
    cargarInvitaciones();
  }
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
          <button class="srow-x" data-hist="${t.id}" title="Historial" style="color:var(--azul)">📋</button>
          <button class="srow-x" data-editar="${t.id}" data-nombre="${esc(t.nombre)}" title="Editar nombre">✏️</button>
          <button class="srow-x" data-del="${t.id}" title="Eliminar técnico">✕</button>
        </div>`;
      })
      .join("");

    // Clic en la tarjeta → evaluar ese técnico
    cont.querySelectorAll("[data-eval]").forEach((el) =>
      el.addEventListener("click", () => (window.location.href = `evaluacion.html?tecnico=${el.dataset.eval}`))
    );
    // Historial del técnico
    cont.querySelectorAll("[data-hist]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = `historial.html?tecnico=${el.dataset.hist}`;
      })
    );
    // Editar nombre del técnico
    cont.querySelectorAll("[data-editar]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        editarTecnico(el.dataset.editar, el.dataset.nombre);
      })
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
    toast(`${nombres.length} técnico${nombres.length === 1 ? "" : "s"} agregado${nombres.length === 1 ? "" : "s"} ✓`);
    await cargarTecnicos();
  } catch (err) {
    console.error(err);
    toast("No se pudieron agregar: " + err.message, { ms: 5000 });
  } finally {
    input.disabled = false;
    btn.disabled = false;
    input.focus();
  }
}

async function editarTecnico(id, nombreActual) {
  const nuevo = prompt("Nuevo nombre del técnico:", nombreActual);
  if (nuevo === null) return;
  const nombre = nuevo.trim();
  if (!nombre || nombre === nombreActual) return;
  try {
    await updateDoc(doc(db, "tecnicos", id), { nombre });
    toast("Nombre actualizado ✓");
    await cargarTecnicos();
  } catch (err) {
    toast("No se pudo: " + err.message, { ms: 5000 });
  }
}

async function eliminarTecnico(id) {
  if (!confirm("¿Eliminar este técnico? (sus evaluaciones ya guardadas se conservan)")) return;
  try {
    await deleteDoc(doc(db, "tecnicos", id));
    toast("Técnico eliminado");
    await cargarTecnicos();
  } catch (err) {
    console.error(err);
    toast("No se pudo eliminar: " + err.message, { ms: 5000 });
  }
}

// ───────── Vista del root: sus coordinadores ─────────
async function cargarCoordinadores() {
  const cont = document.getElementById("lista");
  document.getElementById("titulo-lista").textContent = "Coordinadores";
  cont.innerHTML = "Cargando…";
  try {
    // El root puede leer todos los usuarios: los traemos una vez y armamos el árbol.
    const snap = await getDocs(collection(db, "usuarios"));
    const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const coords = all
      .filter((u) => u.rol === "coordinador" && u.rootUid === sesion.user.uid)
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    const countSup = (cid) => all.filter((u) => u.rol === "supervisor" && u.coordinadorUid === cid).length;
    if (!coords.length) {
      cont.innerHTML = `<div class="lista-vacia">Aún no tienes coordinadores. Genera un enlace con "🎟️ Invitar coordinador".</div>`;
      return;
    }
    cont.innerHTML = coords
      .map((c, i) => {
        const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const n = countSup(c.uid);
        return `
        <div class="srow" data-coord="${c.uid}" data-nombre="${esc(c.nombre)}">
          <div class="aa-avatar" style="background:${bg}">${initials(c.nombre)}</div>
          <div class="srow-main">
            <span class="srow-name">${esc(c.nombre)}</span>
            <span class="srow-sub">Coordinador · ${n} supervisor${n === 1 ? "" : "es"}</span>
          </div>
          <span class="badge">ver ›</span>
        </div>`;
      })
      .join("");
    cont.querySelectorAll("[data-coord]").forEach((el) =>
      el.addEventListener("click", () => mostrarCoordinador(el.dataset.coord, el.dataset.nombre))
    );
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">No se pudieron cargar los coordinadores: ${err.message}</div>`;
  }
}

async function mostrarCoordinador(uid, nombre) {
  const cont = document.getElementById("lista");
  document.getElementById("titulo-lista").textContent = `Coordinador: ${nombre}`;
  cont.innerHTML = "Cargando…";
  try {
    const [uSnap, tSnap] = await Promise.all([
      getDocs(query(collection(db, "usuarios"), where("coordinadorUid", "==", uid))),
      getDocs(collection(db, "tecnicos")),
    ]);
    const sups = uSnap.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .filter((u) => u.rol === "supervisor")
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    const tecs = tSnap.docs.map((d) => d.data());
    const countTec = (sid) => tecs.filter((t) => t.supervisorUid === sid).length;
    const activo = await leerActivo(uid);
    let html = `<div class="btn-row">
      <button class="btn secundario" id="btn-volver-coords">← Volver</button>
      ${htmlBotonEstado(activo, "coordinador")}
    </div>`;
    html += `<h3 style="margin-top:16px">Supervisores (${sups.length})</h3>`;
    html += sups.length
      ? sups
          .map((s, i) => {
            const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const n = countTec(s.uid);
            return `<div class="srow" data-sup="${s.uid}" data-nombre="${esc(s.nombre)}">
              <div class="aa-avatar" style="background:${bg}">${initials(s.nombre)}</div>
              <div class="srow-main">
                <span class="srow-name">${esc(s.nombre)}</span>
                <span class="srow-sub">Supervisor · ${n} técnico${n === 1 ? "" : "s"}</span>
              </div><span class="badge">ver ›</span></div>`;
          })
          .join("")
      : `<div class="lista-vacia">Sin supervisores.</div>`;
    cont.innerHTML = html;
    document.getElementById("btn-volver-coords").addEventListener("click", cargarCoordinadores);
    wireBotonEstado(uid, nombre, activo, "Coordinador", () => mostrarCoordinador(uid, nombre));
    cont.querySelectorAll("[data-sup]").forEach((el) =>
      el.addEventListener("click", () => mostrarSupervisor(el.dataset.sup, el.dataset.nombre))
    );
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">Error: ${err.message}</div>`;
  }
}

// ───────── Invitaciones (root o coordinador) ─────────
async function generarInvitacion(rol, btn) {
  const box = document.getElementById("invite-box");
  if (btn) btn.disabled = true;
  const quien = rol === "coordinador" ? "un coordinador" : "un supervisor";
  box.innerHTML = `<p class="meta" style="margin-top:12px">Generando enlace…</p>`;
  try {
    const ref = await addDoc(collection(db, "invitaciones"), {
      creadorUid: sesion.user.uid,
      creadorNombre: sesion.perfil.nombre,
      rol,
      usado: false,
      expiraEnMs: Date.now() + 7 * 24 * 60 * 60 * 1000, // vence en 7 días
      createdAt: serverTimestamp(),
    });
    logAudit("invitacion_creada", { rol, invitacionId: ref.id });
    const link = new URL(`registro.html?invite=${ref.id}`, location.href).href;
    box.innerHTML = `
      <div class="msg ok" style="margin-top:12px">
        📎 Enlace para <strong>${quien}</strong>. Cópialo y compártelo.
      </div>
      <div class="msg" style="background:#fffbeb;color:#92400e">
        ⚠️ <strong>Un solo uso:</strong> este enlace crea <strong>una sola cuenta</strong>. Cuando ${quien} lo use, deja de funcionar. Para invitar a otra persona, genera un enlace nuevo.
      </div>`;
    box.innerHTML += `
      <div class="add-row">
        <input id="invite-link" type="text" readonly value="${esc(link)}">
        <button class="btn" id="btn-copiar">Copiar</button>
      </div>`;
    document.getElementById("btn-copiar").addEventListener("click", async () => {
      const input = document.getElementById("invite-link");
      input.select();
      try {
        await navigator.clipboard.writeText(input.value);
        document.getElementById("btn-copiar").textContent = "¡Copiado!";
      } catch {
        document.execCommand("copy");
        document.getElementById("btn-copiar").textContent = "¡Copiado!";
      }
    });
    cargarInvitaciones(); // refresca la lista de invitaciones
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="msg error" style="margin-top:12px">No se pudo generar: ${err.message}</div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ───────── Panel de invitaciones (root o coordinador) ─────────
async function cargarInvitaciones() {
  const cont = document.getElementById("invites-list");
  if (!cont) return;
  try {
    const snap = await getDocs(
      query(collection(db, "invitaciones"), where("creadorUid", "==", sesion.user.uid))
    );
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (!items.length) {
      cont.innerHTML = "";
      return;
    }
    const ahora = Date.now();
    const rows = items
      .map((inv) => {
        let estado, color, bg;
        if (inv.usado) { estado = "Usada"; color = "#6b7280"; bg = "#f3f4f6"; }
        else if (inv.expiraEnMs && ahora > inv.expiraEnMs) { estado = "Vencida"; color = "#c0392b"; bg = "#fdecea"; }
        else { estado = "Pendiente"; color = "#0047b3"; bg = "#eef2ff"; }
        const link = new URL(`registro.html?invite=${inv.id}`, location.href).href;
        const acciones =
          estado === "Pendiente"
            ? `<button class="srow-x" data-copiar="${esc(link)}" title="Copiar enlace" style="color:var(--azul)">⧉</button>
               <button class="srow-x" data-revocar="${inv.id}" title="Revocar">✕</button>`
            : `<button class="srow-x" data-revocar="${inv.id}" title="Eliminar">✕</button>`;
        const quien = inv.rol === "coordinador" ? "Coordinador" : "Supervisor";
        const badge = `<span style="background:${bg};color:${color};border-radius:20px;padding:3px 10px;font-size:.78rem;font-weight:700">${estado}</span>`;
        return `<div class="srow" style="cursor:default">
          <span class="srow-name" style="font-weight:500">${quien}</span>
          ${badge}
          ${acciones}
        </div>`;
      })
      .join("");
    cont.innerHTML = `<h3 style="margin:16px 0 8px">Invitaciones generadas</h3>${rows}`;

    cont.querySelectorAll("[data-copiar]").forEach((b) =>
      b.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(b.dataset.copiar); b.textContent = "✓"; } catch {}
      })
    );
    cont.querySelectorAll("[data-revocar]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("¿Revocar esta invitación? El enlace dejará de funcionar.")) return;
        try {
          await deleteDoc(doc(db, "invitaciones", b.dataset.revocar));
          logAudit("invitacion_revocada", { invitacionId: b.dataset.revocar });
          toast("Invitación revocada");
          cargarInvitaciones();
        } catch (err) {
          toast("No se pudo revocar: " + err.message, { ms: 5000 });
        }
      })
    );
  } catch (err) {
    console.error(err);
  }
}

// ───────── Vista del coordinador: sus supervisores ─────────
async function cargarSupervisores() {
  const cont = document.getElementById("lista");
  document.getElementById("titulo-lista").textContent = "Mis supervisores";
  cont.innerHTML = "Cargando…";
  try {
    const [uSnap, tSnap] = await Promise.all([
      getDocs(query(collection(db, "usuarios"), where("coordinadorUid", "==", sesion.user.uid))),
      getDocs(collection(db, "tecnicos")),
    ]);
    const sups = uSnap.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .filter((u) => u.rol === "supervisor")
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    const tecs = tSnap.docs.map((d) => d.data());
    const countTec = (sid) => tecs.filter((t) => t.supervisorUid === sid).length;

    if (!sups.length) {
      cont.innerHTML = `<div class="lista-vacia">Aún no tienes supervisores. Genera un enlace con "🎟️ Invitar supervisor" y compártelo.</div>`;
      return;
    }
    cont.innerHTML = sups
      .map((s, i) => {
        const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const n = countTec(s.uid);
        return `
        <div class="srow" data-sup="${s.uid}" data-nombre="${esc(s.nombre)}">
          <div class="aa-avatar" style="background:${bg}">${initials(s.nombre)}</div>
          <div class="srow-main">
            <span class="srow-name">${esc(s.nombre)}</span>
            <span class="srow-sub">Supervisor · ${n} técnico${n === 1 ? "" : "s"}</span>
          </div>
          <span class="badge">ver ›</span>
        </div>`;
      })
      .join("");
    cont.querySelectorAll("[data-sup]").forEach((el) =>
      el.addEventListener("click", () => mostrarSupervisor(el.dataset.sup, el.dataset.nombre))
    );
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">No se pudieron cargar los supervisores: ${err.message}</div>`;
  }
}

async function mostrarSupervisor(uid, nombre) {
  const cont = document.getElementById("lista");
  document.getElementById("titulo-lista").textContent = `Supervisor: ${nombre}`;
  cont.innerHTML = "Cargando…";
  try {
    const [tSnap, eSnap] = await Promise.all([
      getDocs(query(collection(db, "tecnicos"), where("supervisorUid", "==", uid))),
      getDocs(query(collection(db, "evaluaciones"), where("supervisorUid", "==", uid))),
    ]);
    const tecnicos = tSnap.docs.map((d) => d.data()).sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    const evals = eSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    const activo = await leerActivo(uid);
    let html = `<div class="btn-row">
      <button class="btn secundario" id="btn-volver-sups">← Volver</button>
      ${htmlBotonEstado(activo, "supervisor")}
    </div>`;

    html += `<h3 style="margin-top:16px">Técnicos (${tecnicos.length})</h3>`;
    html += tecnicos.length
      ? tecnicos
          .map((t, i) => {
            const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
            return `<div class="srow" style="cursor:default">
              <div class="aa-avatar sm" style="background:${bg}">${initials(t.nombre)}</div>
              <span class="srow-name">${esc(t.nombre)}</span></div>`;
          })
          .join("")
      : `<div class="lista-vacia">Sin técnicos.</div>`;

    html += `<h3 style="margin-top:16px">Planillas llenadas (${evals.length})</h3>`;
    html += evals.length
      ? evals
          .map((e) => {
            const fecha = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleString("es-VE") : "";
            const prom = e.puntajes?.promedioGeneral;
            const badge = prom != null ? `${prom.toFixed(2)} / 4` : "—";
            return `<div class="lista-item" data-id="${e.id}" style="cursor:pointer">
              <div><strong>${esc(e.tecnicoNombre) || "(sin nombre)"}</strong>
                <div class="meta">${esc(e.area) || ""} · ${esc(e.motivo) || "s/motivo"}<br>${fecha}</div>
              </div>
              <span class="badge">${badge}</span></div>`;
          })
          .join("")
      : `<div class="lista-vacia">Aún no ha llenado planillas.</div>`;

    cont.innerHTML = html;
    document.getElementById("btn-volver-sups").addEventListener("click", cargarSupervisores);
    wireBotonEstado(uid, nombre, activo, "Supervisor", () => mostrarSupervisor(uid, nombre));
    cont.querySelectorAll("[data-id]").forEach((el) =>
      el.addEventListener("click", () => (window.location.href = `detalle.html?id=${el.dataset.id}`))
    );
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">Error: ${err.message}</div>`;
  }
}

// ───────── Respaldo descargable (root) ─────────
async function descargarRespaldo() {
  toast("Generando respaldo…");
  try {
    const cols = ["usuarios", "tecnicos", "evaluaciones", "invitaciones", "plantillas"];
    const data = { generadoEn: new Date().toISOString() };
    for (const c of cols) {
      const snap = await getDocs(collection(db, c));
      data[c] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airtek-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Respaldo descargado ✓");
  } catch (err) {
    console.error(err);
    toast("No se pudo el respaldo: " + err.message, { ms: 5000 });
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

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (perfil.rol === "supervisor") {
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }

    let html = "";
    items.forEach((e) => {
      const fecha = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleString("es-VE") : "";
      const prom = e.puntajes?.promedioGeneral;
      const badge = prom != null ? `${prom.toFixed(2)} / 4` : "—";
      html += `
        <div class="lista-item" data-id="${e.id}" style="cursor:pointer">
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
    cont.querySelectorAll("[data-id]").forEach((el) =>
      el.addEventListener("click", () => (window.location.href = `detalle.html?id=${el.dataset.id}`))
    );
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">Error al cargar. Revisa la consola (F12).</div>`;
  }
}
