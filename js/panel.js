// panel.js — panel según el rol.
//  - Supervisor: gestiona sus técnicos (avatar cards) y hace clic para evaluar; ve sus planillas.
//  - Coordinador: edita el formulario y ve todas las planillas.
import { db, auth, toast, logAudit, crearCuentaAux } from "./firebase.js";
import { protegerPagina, cerrarSesion, contextoActual } from "./session.js";
import { montarSelectorVerComo, bloqueaSiImpersona, deshabilitarControlesDeEscritura } from "./ver-como.js";
import { montarSelectorPrueba } from "./prueba.js";
import { conPrefijoPrueba } from "./prueba-data.js";
import { cargarPlantillasDeCoordinador, opcionesDeSeccion } from "./plantilla.js";
import { fechaDeBitacora, fechaEsInferida } from "./bitacora-data.js";
import { mostrarNovedades } from "./novedades.js";
import { renombrarSupervisor, renombrarTecnico, contarAfectados } from "./renombrar.js";
import {
  describirResumen,
  totalDeResumen,
  validarNombre,
  COPIAS_DE_SUPERVISOR,
  COPIAS_DE_TECNICO,
} from "./renombrar-data.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const AVATAR_COLORS = ["#0066ff", "#059669", "#7c3aed", "#dc2626", "#d97706", "#0891b2", "#be185d", "#374151"];
function initials(n) {
  if (!n) return "?";
  return n.split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
}
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const ICONS = {
  cuenta: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  bitacora: `<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  inventario: `<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  historial: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 10h6"/></svg>`,
  editar: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
  eliminar: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  crear: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  invitar: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  auditoria: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  respaldo: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  metricas: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  tablero: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
  herramientas: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  formulario: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  verComo: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  prueba: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2v7.31L4.14 18.2A2 2 0 0 0 5.86 21h12.28a2 2 0 0 0 1.72-2.8L14 9.31V2"/></svg>`,
  key: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
  trash: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  back: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  users: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  star: `<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};

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
  deshabilitarControlesDeEscritura(sesion, ["btn-estado"]);
  b.addEventListener("click", async () => {
    if (bloqueaSiImpersona(sesion)) return;
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

// ── Pestañas (tabs) para vistas de detalle con varias secciones ──
function htmlTabs(tabs) {
  const botones = tabs
    .map(
      (t, i) =>
        `<button class="tab-btn${i === 0 ? " active" : ""}" data-tab-target="${t.id}">${t.label} (${t.count})</button>`
    )
    .join("");
  const paneles = tabs
    .map(
      (t, i) =>
        `<div class="tab-panel" id="tab-${t.id}"${i === 0 ? "" : " hidden"}>${t.contentHtml}</div>`
    )
    .join("");
  return `<div class="tab-row">${botones}</div>${paneles}`;
}
function wireTabs(container) {
  const botones = container.querySelectorAll(".tab-btn");
  botones.forEach((btn) =>
    btn.addEventListener("click", () => {
      botones.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      container.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = p.id !== `tab-${btn.dataset.tabTarget}`));
    })
  );
}

// ── Listas largas: mostrar solo los primeros N con botón "Ver más" ──
function htmlListaConVerMas(items, renderItem, { limite = 5 } = {}) {
  if (!items.length) return "";
  const visibles = items.slice(0, limite).map(renderItem).join("");
  const resto = items.slice(limite);
  if (!resto.length) return visibles;
  const ocultos = resto.map(renderItem).join("");
  return `${visibles}<div class="ver-mas-resto" hidden>${ocultos}</div>
    <button class="btn secundario btn-ver-mas" type="button">Ver más (+${resto.length})</button>`;
}
function wireVerMas(container) {
  container.querySelectorAll(".btn-ver-mas").forEach((btn) =>
    btn.addEventListener("click", () => {
      const resto = btn.previousElementSibling;
      resto.hidden = false;
      btn.remove();
    })
  );
}

// Enviar a un usuario un correo para que restablezca su contraseña.
async function enviarReset(correo, nombre) {
  if (bloqueaSiImpersona(sesion)) return;
  if (!correo) {
    toast("Ese usuario no tiene correo registrado (cuenta antigua). Que use 'Olvidé mi contraseña' en el login.", { ms: 7000 });
    return;
  }
  if (!confirm(`¿Enviar a ${nombre} un correo para restablecer su contraseña?\n(${correo})`)) return;
  try {
    await sendPasswordResetEmail(auth, correo);
    logAudit("reset_contrasena_enviado", { correo });
    toast("Correo de restablecimiento enviado ✓");
  } catch (err) {
    toast("No se pudo: " + err.message, { ms: 5000 });
  }
}

// Elimina a un usuario del sistema (borra su perfil → pierde acceso y desaparece).
async function eliminarUsuario(uid, nombre, recargar) {
  if (bloqueaSiImpersona(sesion)) return;
  if (!confirm(
    `¿Eliminar a ${nombre} del sistema?\n\n` +
    `Perderá el acceso y desaparecerá de la lista. NO borra a sus subordinados, ` +
    `y su correo queda reservado hasta purgar la cuenta en el servidor.`
  )) return;
  try {
    await deleteDoc(doc(db, "usuarios", uid));
    logAudit("usuario_eliminado", { objetivoUid: uid, nombre });
    toast("Usuario eliminado del sistema");
    recargar();
  } catch (err) {
    toast("No se pudo eliminar: " + err.message, { ms: 5000 });
  }
}

const btnSalir = document.getElementById("btn-salir");
if (btnSalir) btnSalir.addEventListener("click", cerrarSesion);
const btnSalirSidebar = document.getElementById("btn-salir-sidebar");
if (btnSalirSidebar) btnSalirSidebar.addEventListener("click", cerrarSesion);

let sesion = null;

function montarSidebar(perfil) {
  const elInfo = document.getElementById("usuario-info-sidebar");
  if (elInfo) elInfo.textContent = perfil.nombre;
  const elRol = document.getElementById("usuario-rol-sidebar");
  if (elRol) elRol.textContent = perfil.rol === "root" ? "Administrador" : perfil.rol;
  const elAvatar = document.getElementById("sidebar-user-avatar");
  if (elAvatar) elAvatar.textContent = initials(perfil.nombre);

  const nav = document.getElementById("sidebar-nav");
  if (!nav) return;

  if (perfil.rol === "supervisor") {
    nav.innerHTML = `
      <div class="sidebar-nav-title">Operaciones</div>
      <a class="sidebar-nav-item active" href="panel.html">
        ${ICONS.users}
        <span>Mis Técnicos</span>
      </a>
      <a class="sidebar-nav-item" href="bitacora.html">
        ${ICONS.bitacora}
        <span>Bitácora de Campo</span>
      </a>
      <a class="sidebar-nav-item" href="inventario.html">
        ${ICONS.inventario}
        <span>Inventario de Técnicos</span>
      </a>
      <div class="sidebar-nav-title">Configuración</div>
      <a class="sidebar-nav-item" href="perfil.html">
        ${ICONS.cuenta}
        <span>Mi Cuenta</span>
      </a>`;
  } else if (perfil.rol === "root") {
    nav.innerHTML = `
      <div class="sidebar-nav-title">Sistema</div>
      <a class="sidebar-nav-item active" href="panel.html">
        ${ICONS.users}
        <span>Coordinadores</span>
      </a>
      <a class="sidebar-nav-item" href="auditoria.html">
        ${ICONS.auditoria}
        <span>Auditoría</span>
      </a>
      <a class="sidebar-nav-item" id="sidebar-btn-respaldo" href="javascript:void(0)">
        ${ICONS.respaldo}
        <span>Descargar Respaldo</span>
      </a>
      <div class="sidebar-nav-title">Configuración</div>
      <a class="sidebar-nav-item" href="perfil.html">
        ${ICONS.cuenta}
        <span>Mi Cuenta</span>
      </a>`;
    const btnRespaldo = document.getElementById("sidebar-btn-respaldo");
    if (btnRespaldo) btnRespaldo.addEventListener("click", descargarRespaldo);
  } else {
    nav.innerHTML = `
      <div class="sidebar-nav-title">Operaciones</div>
      <a class="sidebar-nav-item active" href="panel.html">
        ${ICONS.users}
        <span>Supervisores</span>
      </a>
      <a class="sidebar-nav-item" href="dashboard.html">
        ${ICONS.metricas}
        <span>Métricas de Personal</span>
      </a>
      <a class="sidebar-nav-item" href="bitacora-tablero.html">
        ${ICONS.tablero}
        <span>Tablero de Bitácora</span>
      </a>
      <a class="sidebar-nav-item" href="reporte-herramientas.html">
        ${ICONS.herramientas}
        <span>Requerimiento Herramientas</span>
      </a>
      <a class="sidebar-nav-item" href="inventario.html">
        ${ICONS.inventario}
        <span>Inventario de Técnicos</span>
      </a>
      <div class="sidebar-nav-title">Administración</div>
      <a class="sidebar-nav-item" href="editor.html">
        ${ICONS.formulario}
        <span>Editar Formulario</span>
      </a>
      <a class="sidebar-nav-item" href="perfil.html">
        ${ICONS.cuenta}
        <span>Mi Cuenta</span>
      </a>`;
  }
}

protegerPagina(null, async ({ user, perfil }) => {
  // `sesion` guarda la identidad EFECTIVA (la de "Ver como" si está activo).
  // Toda lectura de este archivo debe usar sesion.uid/sesion.perfil; toda
  // ESCRITURA que registre "quién hizo esto" debe usar sesion.real (la
  // identidad verdadera de quien tiene la sesión de Firebase Auth) — nunca
  // hay que atribuirle una escritura a la persona vista.
  sesion = contextoActual({ user, perfil });
  const elInfo = document.getElementById("usuario-info");
  if (elInfo) elInfo.textContent = `${perfil.nombre} · ${perfil.rol}`;
  montarSidebar(perfil);

  // Qué cambió en la última entrega. Solo la primera vez que entran con ella,
  // y solo lo que le toca a su rol. Esto es sobre la cuenta real, no sobre
  // "Ver como": a root no le sirve un aviso pensado para otro rol.
  mostrarNovedades(document.getElementById("novedades"), perfil.rol, { esc });

  if (sesion.perfil.rol === "supervisor") {
    document.getElementById("acciones").innerHTML = `
      <div class="panel-hero-banner">
        <div class="panel-hero-content">
          <span class="panel-hero-tag">OPERACIONES DE CAMPO</span>
          <h2>Hola, ${esc(sesion.perfil.nombre)}</h2>
          <p>Supervisa a tu cuadrilla, registra bitácoras y evalúa el trabajo técnico.</p>
        </div>
        <a class="btn-account-pill" href="perfil.html">
          ${ICONS.cuenta}
          <span>Mi cuenta</span>
        </a>
      </div>
      <div style="margin-bottom:12px">
        <h3 style="margin:0 0 4px">Tus técnicos</h3>
        <p class="meta" style="margin:0">Haz clic en un técnico para evaluarlo o usa los botones para ver su historial o editarlo.</p>
      </div>
      <div class="add-row">
        <textarea id="nuevo-tecnico" rows="2"
          placeholder="Un técnico por línea. Puedes pegar una lista completa y se agregan todos."></textarea>
        <button class="btn" id="btn-add-tecnico">${ICONS.crear} Agregar</button>
      </div>
      <div id="add-hint" class="meta" style="margin:-8px 0 12px"></div>
      <div id="tecnicos-list">Cargando…</div>`;
    document.getElementById("titulo-lista").textContent = "Mis evaluaciones realizadas";

    const modBit = document.getElementById("modulo-bitacora");
    if (modBit) {
      modBit.style.display = "block";
      modBit.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div>
            <h2 style="margin:0 0 4px;display:flex;align-items:center;gap:8px">${ICONS.bitacora} Bitácora de Supervisión</h2>
            <p class="meta" style="margin:0">Registra tus actividades diarias (administrativas, operativas o certificación).</p>
          </div>
          <a class="btn" href="bitacora.html" style="text-decoration:none">
            ${ICONS.crear} Registrar actividad
          </a>
        </div>
        <div id="bitacoras-supervisor-recientes" style="margin-top:14px"></div>`;
      cargarBitacorasSupervisorRecientes(sesion.uid);
    }

    const modInv = document.getElementById("modulo-inventario");
    if (modInv) {
      modInv.style.display = "block";
      modInv.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div>
            <h2 style="margin:0 0 4px;display:flex;align-items:center;gap:8px">${ICONS.inventario} Inventario de Técnicos</h2>
            <p class="meta" style="margin:0">Herramientas y equipos con su estado, y entregas de material de uso diario.</p>
          </div>
          <a class="btn" href="inventario.html" style="text-decoration:none">
            Abrir inventario
          </a>
        </div>`;
    }

    document.getElementById("btn-add-tecnico").addEventListener("click", agregarTecnico);
    document.getElementById("nuevo-tecnico").addEventListener("input", actualizarHint);
    deshabilitarControlesDeEscritura(sesion, ["btn-add-tecnico", "nuevo-tecnico"]);
    cargarTecnicos();
    cargarLista(sesion.perfil, sesion.uid);
  } else if (sesion.perfil.rol === "root") {
    const modBit = document.getElementById("modulo-bitacora");
    if (modBit) modBit.style.display = "none";
    const modInv = document.getElementById("modulo-inventario");
    if (modInv) modInv.style.display = "none";
    document.getElementById("acciones").innerHTML = `
      <div class="panel-hero-banner">
        <div class="panel-hero-content">
          <span class="panel-hero-tag">SISTEMA ADMINISTRATIVO</span>
          <h2>Hola, ${esc(sesion.perfil.nombre)}</h2>
          <p>Crea y administra a los coordinadores de Airtek, gestiona auditorías y respaldos del sistema.</p>
        </div>
        <a class="btn-account-pill" href="perfil.html">
          ${ICONS.cuenta}
          <span>Mi cuenta</span>
        </a>
      </div>
      <div class="btn-row">
        <button class="btn" id="btn-crear-coord">${ICONS.crear} Crear coordinador</button>
        <button class="btn secundario" id="btn-invitar-coord">${ICONS.invitar} Invitar por link</button>
        <a class="btn secundario" href="auditoria.html">${ICONS.auditoria} Auditoría</a>
        <button class="btn secundario" id="btn-respaldo">${ICONS.respaldo} Respaldo</button>
      </div>
      <div id="crear-box"></div>
      <div id="invite-box"></div>
      <div id="invites-list"></div>
      <h4 class="btn-row-titulo" style="display:flex;align-items:center;gap:6px">${ICONS.verComo} Ver como</h4>
      <p class="meta" style="margin:0 0 10px">Navega la app con los datos reales de un coordinador o supervisor, sin pedirle su contraseña. Mientras tanto no podrás crear, editar ni borrar nada.</p>
      <div id="ver-como-box"></div>
      <h4 class="btn-row-titulo" style="display:flex;align-items:center;gap:6px">${ICONS.prueba} Modo de prueba</h4>
      <p class="meta" style="margin:0 0 10px">Actúa como coordinador o supervisor con datos 100% inventados — nunca toca cuentas ni datos reales — para reproducir problemas de punta a punta.</p>
      <div id="modo-prueba-box"></div>`;
    document.getElementById("titulo-lista").textContent = "Coordinadores";

    document.getElementById("btn-crear-coord").addEventListener("click", () => crearUsuarioDirecto("coordinador"));
    document.getElementById("btn-invitar-coord")
      .addEventListener("click", (e) => generarInvitacion("coordinador", e.currentTarget));
    document.getElementById("btn-respaldo").addEventListener("click", descargarRespaldo);
    cargarCoordinadores();
    cargarInvitaciones();
    montarSelectorVerComo(document.getElementById("ver-como-box"));
    montarSelectorPrueba(document.getElementById("modo-prueba-box"));
  } else {
    const modBit = document.getElementById("modulo-bitacora");
    if (modBit) modBit.style.display = "none";
    const modInv = document.getElementById("modulo-inventario");
    if (modInv) modInv.style.display = "none";
    document.getElementById("acciones").innerHTML = `
      <div class="panel-hero-banner">
        <div class="panel-hero-content">
          <span class="panel-hero-tag">COORDINACIÓN OPERATIVA</span>
          <h2>Hola, ${esc(sesion.perfil.nombre)}</h2>
          <p>Supervisa las cuadrillas, consulta el tablero de bitácora y monitorea evaluaciones.</p>
        </div>
        <a class="btn-account-pill" href="perfil.html">
          ${ICONS.cuenta}
          <span>Mi cuenta</span>
        </a>
      </div>
      <div class="btn-row btn-row-principal">
        <a class="btn" href="dashboard.html">${ICONS.metricas} Métricas de Gestión de Personal</a>
        <a class="btn" href="bitacora-tablero.html">${ICONS.tablero} Tablero de Bitácora</a>
        <a class="btn" href="reporte-herramientas.html">${ICONS.herramientas} Requerimiento de Herramientas</a>
        <a class="btn secundario" href="inventario.html">${ICONS.inventario} Inventario de Técnicos</a>
      </div>
      <h4 class="btn-row-titulo">Administración</h4>
      <div class="btn-row btn-row-secundaria">
        <a class="btn secundario" href="editor.html">${ICONS.formulario} Editar formulario</a>
        <button class="btn secundario" id="btn-crear-sup">${ICONS.crear} Crear supervisor</button>
        <button class="btn secundario" id="btn-invitar">${ICONS.invitar} Invitar por link</button>
      </div>
      <div id="crear-box"></div>
      <div id="invite-box"></div>
      <div id="invites-list"></div>`;
    document.getElementById("titulo-lista").textContent = "Mis supervisores";

    document.getElementById("btn-crear-sup").addEventListener("click", () => crearUsuarioDirecto("supervisor"));
    document.getElementById("btn-invitar")
      .addEventListener("click", (e) => generarInvitacion("supervisor", e.currentTarget));
    deshabilitarControlesDeEscritura(sesion, ["btn-crear-sup", "btn-invitar"]);
    cargarSupervisores();
    cargarInvitaciones();
  }
});

// ───────── Técnicos (solo supervisor) ─────────
async function cargarTecnicos() {
  const cont = document.getElementById("tecnicos-list");
  try {
    const snap = await getDocs(query(collection(db, "tecnicos"), where("supervisorUid", "==", sesion.uid)));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    if (!items.length) {
      cont.innerHTML = `<div class="lista-vacia">Aún no tienes técnicos en tu cuadrilla. Agrega el primero con el campo de arriba.</div>`;
      return;
    }
    cont.innerHTML = items
      .map((t, i) => {
        const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
        return `
        <div class="srow" data-eval="${t.id}">
          <div class="aa-avatar" style="background:${bg}">${initials(t.nombre)}</div>
          <span class="srow-name">${esc(t.nombre)}</span>
          <div class="srow-actions">
            <button class="srow-x" data-hist="${t.id}" title="Historial" style="color:var(--azul-airtek)">${ICONS.historial}</button>
            <button class="srow-x" data-editar="${t.id}" data-nombre="${esc(t.nombre)}" title="Editar nombre">${ICONS.editar}</button>
            <button class="srow-x" data-del="${t.id}" title="Eliminar técnico">${ICONS.eliminar}</button>
          </div>
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
    // Editar/eliminar técnico: deshabilitados mientras se ve como otra
    // persona (RF-8) — evaluar/historial arriba siguen disponibles, son
    // de solo lectura.
    if (sesion.impersonando) {
      cont.querySelectorAll("[data-editar], [data-del]").forEach((el) => {
        el.disabled = true;
        el.title = "No disponible mientras ves la app como otra persona";
      });
    }
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
  if (bloqueaSiImpersona(sesion)) return;
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
          nombre: sesion.enPrueba ? conPrefijoPrueba(nombre) : nombre,
          supervisorUid: sesion.real.user.uid,
          supervisorNombre: sesion.real.perfil.nombre,
          createdAt: serverTimestamp(),
          ...(sesion.enPrueba ? { esPrueba: true } : {}),
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
  await corregirNombre({
    titulo: "Nuevo nombre del técnico:",
    nombreActual,
    copias: COPIAS_DE_TECNICO,
    valorUid: id,
    // La ficha del técnico y su inventario de herramientas no salen del conteo
    // por consulta: el inventario se identifica por el id del propio técnico.
    extra: 1,
    ejecutar: (nombre) => renombrarTecnico(db, id, nombre),
    alTerminar: cargarTecnicos,
  });
}

/**
 * Flujo compartido para corregir un nombre: valida, dice cuántos registros va
 * a tocar, pide confirmación y al final informa qué se corrigió.
 *
 * Se avisa antes porque esto no es un cambio de una línea: reescribe el nombre
 * dentro de evaluaciones, bitácoras e inventarios ya guardados. Hacerlo en
 * silencio no inspira confianza.
 */
async function corregirNombre({ titulo, nombreActual, copias, valorUid, extra = 1, ejecutar, alTerminar }) {
  if (bloqueaSiImpersona(sesion)) return;
  const escrito = prompt(titulo, nombreActual);
  if (escrito === null) return;

  const val = validarNombre(escrito, nombreActual);
  if (!val.valido) {
    if (val.error !== "El nombre es el mismo.") toast(val.error, { ms: 4000 });
    return;
  }

  let cuantos;
  try {
    const previo = await contarAfectados(db, copias, valorUid);
    cuantos = totalDeResumen(previo) + extra;
  } catch (err) {
    console.error(err);
    toast("No se pudo revisar qué cambiaría: " + err.message, { ms: 5000 });
    return;
  }

  const ok = confirm(
    `Se corregirá el nombre a "${val.nombre}".\n\n` +
    `Esto actualiza ${cuantos} ${cuantos === 1 ? "registro" : "registros"}, ` +
    `incluyendo los que ya estaban guardados, para que el nombre viejo no ` +
    `siga apareciendo en los tableros ni en los reportes.\n\n¿Continuar?`
  );
  if (!ok) return;

  try {
    const { nombre, resumen } = await ejecutar(val.nombre);
    logAudit("nombre_corregido", { de: nombreActual, a: nombre, registros: totalDeResumen(resumen) });
    toast(`Nombre corregido ✓ — ${describirResumen(resumen)}`, { ms: 6000 });
    if (alTerminar) await alTerminar();
  } catch (err) {
    console.error(err);
    toast("No se pudo corregir: " + err.message, { ms: 6000 });
  }
}

async function eliminarTecnico(id) {
  if (bloqueaSiImpersona(sesion)) return;
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

// ───────── Bitácoras ─────────
// Se muestra el DÍA DE LA ACTIVIDAD, no el de carga. Las bitácoras anteriores
// a esta versión no lo traen: ahí la fecha se infiere de createdAt y se marca
// con "~" para no dar por cierto un dato que es aproximado.
function fechaBitacoraLegible(b) {
  const iso = fechaDeBitacora(b);
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${fechaEsInferida(b) ? "~" : ""}${Number(d)}/${Number(m)}/${a}`;
}

function ordenBitacoras(a, b) {
  const clave = (x) => `${fechaDeBitacora(x) || ""}${x.horaInicio || ""}`;
  return clave(b).localeCompare(clave(a));
}

// ───────── Bitácoras recientes del supervisor ─────────
async function cargarBitacorasSupervisorRecientes(uid) {
  const cont = document.getElementById("bitacoras-supervisor-recientes");
  if (!cont) return;
  try {
    const snap = await getDocs(
      query(collection(db, "bitacoras"), where("supervisorUid", "==", uid))
    );
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort(ordenBitacoras);
    const recientes = items.slice(0, 3);

    if (!recientes.length) {
      cont.innerHTML = `<div class="lista-vacia" style="padding:10px;font-size:0.85rem">Aún no has registrado actividades de bitácora.</div>`;
      return;
    }

    cont.innerHTML = `
      <div style="font-size:0.85rem;font-weight:600;color:var(--texto2);margin-bottom:8px">Últimas actividades registradas:</div>
      ${recientes
        .map((b) => {
          const fecha = fechaBitacoraLegible(b);
          const duracion = b.duracionMinutos ? `${Math.floor(b.duracionMinutos / 60)}h ${b.duracionMinutos % 60}m` : "";
          return `
          <div class="lista-item" style="padding:10px 12px;margin-bottom:6px">
            <div>
              <strong>${esc(b.actividadEspecifica || b.tipoMacro)}</strong>
              <div class="meta">${esc(b.zona)} · ${esc(b.areaTrabajo)}<br>${esc(b.horaInicio)} – ${esc(b.horaFin)} ${duracion ? `(${duracion})` : ""}${fecha ? ` · ${fecha}` : ""}</div>
            </div>
            <span class="badge" style="font-size:0.75rem">${esc(b.tipoMacro)}</span>
          </div>`;
        })
        .join("")}
      ${items.length > recientes.length ? `<a class="btn link" href="bitacora-tablero.html" style="font-size:0.85rem">Ver todas →</a>` : ""}`;
  } catch (err) {
    console.error("Error al cargar bitácoras recientes:", err);
    cont.innerHTML = `<div class="meta" style="color:var(--error)">No se pudieron cargar las bitácoras recientes.</div>`;
  }
}

// ───────── Vista del root: sus coordinadores ─────────
async function cargarCoordinadores() {
  const cont = document.getElementById("lista");
  document.getElementById("acciones").style.display = "";
  document.getElementById("titulo-lista").textContent = "Coordinadores";
  cont.innerHTML = "Cargando…";
  try {
    // El root puede leer todos los usuarios: los traemos una vez y armamos el árbol.
    const snap = await getDocs(collection(db, "usuarios"));
    const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const coords = all
      .filter((u) => u.rol === "coordinador" && u.rootUid === sesion.uid)
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    const countSup = (cid) => all.filter((u) => u.rol === "supervisor" && u.coordinadorUid === cid).length;
    if (!coords.length) {
      cont.innerHTML = `<div class="lista-vacia">Aún no tienes coordinadores. Genera un enlace con "Invitar por link".</div>`;
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
  document.getElementById("acciones").style.display = "none";
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
    const perfilC = (await getDoc(doc(db, "usuarios", uid))).data() || {};
    const activo = perfilC.activo !== false;
    let html = `<div class="btn-row">
      <button class="btn secundario" id="btn-volver-coords">${ICONS.back} Volver</button>
      ${htmlBotonEstado(activo, "coordinador")}
      <button class="btn secundario" id="btn-reset-coord">${ICONS.key} Restablecer contraseña</button>
      <button class="btn secundario" id="btn-eliminar-coord" style="color:#c0392b;border-color:#c0392b">${ICONS.trash} Eliminar</button>
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
    document.getElementById("btn-reset-coord").addEventListener("click", () => enviarReset(perfilC.correo, nombre));
    document.getElementById("btn-eliminar-coord").addEventListener("click", () => eliminarUsuario(uid, nombre, cargarCoordinadores));
    cont.querySelectorAll("[data-sup]").forEach((el) =>
      el.addEventListener("click", () => mostrarSupervisor(el.dataset.sup, el.dataset.nombre, () => mostrarCoordinador(uid, nombre)))
    );
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">Error: ${err.message}</div>`;
  }
}

// ───────── Invitaciones (root o coordinador) ─────────
async function generarInvitacion(rol, btn) {
  if (bloqueaSiImpersona(sesion)) return;
  const box = document.getElementById("invite-box");
  if (btn) btn.disabled = true;
  const quien = rol === "coordinador" ? "un coordinador" : "un supervisor";
  box.innerHTML = `<p class="meta" style="margin-top:12px">Generando enlace…</p>`;
  try {
    const ref = await addDoc(collection(db, "invitaciones"), {
      creadorUid: sesion.real.user.uid,
      creadorNombre: sesion.real.perfil.nombre,
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
      query(collection(db, "invitaciones"), where("creadorUid", "==", sesion.uid))
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
            ? `<button class="srow-x" data-copiar="${esc(link)}" title="Copiar enlace" style="color:var(--azul-airtek)">${ICONS.invitar}</button>
               <button class="srow-x btn-delete" data-revocar="${inv.id}" title="Revocar">${ICONS.eliminar}</button>`
            : `<button class="srow-x btn-delete" data-revocar="${inv.id}" title="Eliminar">${ICONS.eliminar}</button>`;
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
    if (sesion.impersonando) {
      cont.querySelectorAll("[data-revocar]").forEach((b) => {
        b.disabled = true;
        b.title = "No disponible mientras ves la app como otra persona";
      });
    }
    cont.querySelectorAll("[data-revocar]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (bloqueaSiImpersona(sesion)) return;
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
  document.getElementById("acciones").style.display = "";
  document.getElementById("titulo-lista").textContent = "Mis supervisores";
  cont.innerHTML = "Cargando…";
  try {
    const uSnap = await getDocs(query(collection(db, "usuarios"), where("coordinadorUid", "==", sesion.uid)));
    const sups = uSnap.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .filter((u) => u.rol === "supervisor")
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    // Contar técnicos SOLO de mis supervisores (consulta acotada, por lotes de 10).
    const tecs = [];
    const supUids = sups.map((s) => s.uid);
    for (let i = 0; i < supUids.length; i += 10) {
      const chunk = supUids.slice(i, i + 10);
      const t = await getDocs(query(collection(db, "tecnicos"), where("supervisorUid", "in", chunk)));
      t.forEach((d) => tecs.push(d.data()));
    }
    const countTec = (sid) => tecs.filter((t) => t.supervisorUid === sid).length;

    if (!sups.length) {
      cont.innerHTML = `<div class="lista-vacia">Aún no tienes supervisores. Genera un enlace con "Invitar por link" y compártelo.</div>`;
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

async function mostrarSupervisor(uid, nombre, volverFn) {
  const volver = volverFn || cargarSupervisores;
  const cont = document.getElementById("lista");
  document.getElementById("acciones").style.display = "none"; // ocultar saludo/acciones al entrar
  document.getElementById("titulo-lista").textContent = `Supervisor: ${nombre}`;
  cont.innerHTML = "Cargando…";
  try {
    const [tSnap, eSnap, sSnap, bSnap] = await Promise.all([
      getDocs(query(collection(db, "tecnicos"), where("supervisorUid", "==", uid))),
      getDocs(query(collection(db, "evaluaciones"), where("supervisorUid", "==", uid))),
      getDocs(query(collection(db, "evaluacionesSupervisor"), where("supervisorUid", "==", uid))),
      getDocs(query(collection(db, "bitacoras"), where("supervisorUid", "==", uid))),
    ]);
    const tecnicos = tSnap.docs.map((d) => d.data()).sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    const evals = eSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const evalSup = sSnap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const bitacoras = bSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(ordenBitacoras);

    const perfilSup = (await getDoc(doc(db, "usuarios", uid))).data() || {};
    const activo = perfilSup.activo !== false;
    let hermanos = [];
    if (perfilSup.coordinadorUid) {
      const hSnap = await getDocs(query(collection(db, "usuarios"), where("coordinadorUid", "==", perfilSup.coordinadorUid)));
      hermanos = hSnap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => u.rol === "supervisor" && u.uid !== uid)
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    }
    let html = `<div class="btn-row">
      <button class="btn secundario" id="btn-volver-sups">${ICONS.back} Volver</button>
      <button class="btn secundario" id="btn-renombrar-sup">${ICONS.editar} Corregir nombre</button>
      ${htmlBotonEstado(activo, "supervisor")}
      <button class="btn secundario" id="btn-reset">${ICONS.key} Restablecer contraseña</button>
      <button class="btn secundario" id="btn-eliminar-sup" style="color:#c0392b;border-color:#c0392b">${ICONS.trash} Eliminar</button>
    </div>`;

    let tecnicosHtml = tecnicos.length
      ? tecnicos
          .map((t, i) => {
            const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
            return `<div class="srow" style="cursor:default">
              <div class="aa-avatar sm" style="background:${bg}">${initials(t.nombre)}</div>
              <span class="srow-name">${esc(t.nombre)}</span></div>`;
          })
          .join("")
      : `<div class="lista-vacia">Sin técnicos.</div>`;

    // Reasignar todos sus técnicos a otro supervisor del mismo coordinador.
    if (tecnicos.length && hermanos.length) {
      tecnicosHtml += `<div class="add-row" style="margin-top:8px">
        <select id="sel-reasignar"><option value="">Reasignar sus técnicos a…</option>
          ${hermanos.map((h) => `<option value="${h.uid}" data-nombre="${esc(h.nombre)}">${esc(h.nombre)}</option>`).join("")}
        </select>
        <button class="btn secundario" id="btn-reasignar">Reasignar</button>
      </div>`;
    }

    const planillasHtml = htmlListaConVerMas(evals, (e) => {
      const fecha = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleString("es-VE") : "";
      const prom = e.puntajes?.promedioGeneral;
      const badge = prom != null ? `${prom.toFixed(2)} / 10` : "—";
      return `<div class="lista-item" data-id="${e.id}" style="cursor:pointer">
        <div><strong>${esc(e.tecnicoNombre) || "(sin nombre)"}</strong>
          <div class="meta">${esc(e.area) || ""} · ${esc(e.motivo) || "s/motivo"}<br>${fecha}</div>
        </div>
        <span class="badge">${badge}</span></div>`;
    }) || `<div class="lista-vacia">Aún no ha llenado planillas.</div>`;

    // Registro de actividades / Bitácoras del supervisor — colapsadas por defecto (<details>).
    const bitacorasHtml = htmlListaConVerMas(bitacoras, (b) => {
      const fecha = fechaBitacoraLegible(b);
      const duracion = b.duracionMinutos ? `${Math.floor(b.duracionMinutos / 60)}h ${b.duracionMinutos % 60}m` : "";
      // numFotos vive en el documento padre justamente para poder contar
      // sin bajarse las imágenes. `imagenes` es el campo viejo, de antes
      // de la migración: se consulta de respaldo por si queda alguna.
      const n = b.numFotos ?? (b.imagenes ? b.imagenes.length : 0);
      const tieneFotos = n ? ` · 📷 ${n} foto${n > 1 ? "s" : ""}` : "";
      return `<details class="lista-item bitacora-item">
        <summary>
          <strong>${esc(b.actividadEspecifica || b.tipoMacro)}</strong>
          <span class="badge" style="font-size:0.75rem">${esc(b.tipoMacro)}</span>
        </summary>
        <div class="meta" style="margin-top:4px">
          ${esc(b.zona)} · ${esc(b.areaTrabajo)}<br>
          🕒 ${esc(b.horaInicio)} – ${esc(b.horaFin)} ${duracion ? `(${duracion})` : ""}${fecha ? ` · 📅 ${fecha}` : ""}${tieneFotos}
        </div>
        ${b.descripcion ? `<div class="bitacora-desc">${esc(b.descripcion)}</div>` : ""}
      </details>`;
    }) || `<div class="lista-vacia">Aún no ha registrado actividades en su bitácora.</div>`;

    // Evaluaciones que los técnicos le hicieron a ESTE supervisor (link público).
    let evaluacionesHtml;
    if (evalSup.length) {
      const proms = evalSup.map((e) => e.puntajes?.promedioGeneral).filter((p) => p != null);
      const avg = proms.length ? (proms.reduce((a, b) => a + b, 0) / proms.length).toFixed(2) : "—";
      evaluacionesHtml =
        `<div class="meta" style="margin-bottom:8px">Promedio recibido: <strong>${avg} / 10</strong></div>` +
        htmlListaConVerMas(evalSup, (e) => {
          const fecha = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString("es-VE") : "";
          const prom = e.puntajes?.promedioGeneral;
          const badge = prom != null ? `${prom.toFixed(2)} / 10` : "—";
          return `<div class="lista-item"><div><strong>${esc(e.tecnicoNombre) || "Anónimo"}</strong><div class="meta">${fecha}</div></div><span class="badge">${badge}</span></div>`;
        });
    } else {
      evaluacionesHtml = `<div class="lista-vacia">Aún no hay evaluaciones de técnicos.</div>`;
    }

    // (Solo el coordinador) genera el link público para evaluar a este supervisor.
    if (sesion.perfil.rol === "coordinador") {
      evaluacionesHtml += `<div style="margin-top:16px">
        <button class="btn" id="btn-link-sup">${ICONS.link} Link para que técnicos lo evalúen</button>
        <div id="link-box"></div></div>`;
    }

    html += htmlTabs([
      { id: "tecnicos", label: `${ICONS.users} Técnicos`, count: tecnicos.length, contentHtml: tecnicosHtml },
      { id: "planillas", label: `${ICONS.bitacora} Planillas`, count: evals.length, contentHtml: planillasHtml },
      { id: "bitacora", label: `${ICONS.tablero} Bitácora`, count: bitacoras.length, contentHtml: bitacorasHtml },
      { id: "evaluaciones", label: `${ICONS.star} Evaluaciones`, count: evalSup.length, contentHtml: evaluacionesHtml },
    ]);

    cont.innerHTML = html;
    wireTabs(cont);
    wireVerMas(cont);
    deshabilitarControlesDeEscritura(sesion, [
      "btn-renombrar-sup", "btn-reset", "btn-eliminar-sup", "btn-reasignar", "sel-reasignar", "btn-link-sup",
    ]);
    document.getElementById("btn-volver-sups").addEventListener("click", volver);
    document.getElementById("btn-renombrar-sup").addEventListener("click", () =>
      corregirNombre({
        titulo: "Nombre correcto del supervisor:",
        nombreActual: nombre,
        copias: COPIAS_DE_SUPERVISOR,
        valorUid: uid,
        extra: 1, // su propio perfil, que no sale de las consultas por supervisorUid
        ejecutar: (nuevo) => renombrarSupervisor(db, uid, nuevo),
        // Se recarga la vista con el nombre nuevo, si no el encabezado
        // seguiría mostrando el viejo y parecería que no pasó nada.
        alTerminar: async () => {
          const actualizado = (await getDoc(doc(db, "usuarios", uid))).data();
          mostrarSupervisor(uid, actualizado?.nombre || nombre, volverFn);
        },
      })
    );
    const btnLink = document.getElementById("btn-link-sup");
    if (btnLink) btnLink.addEventListener("click", () => generarLinkSupervisor(uid, nombre));
    wireBotonEstado(uid, nombre, activo, "Supervisor", () => mostrarSupervisor(uid, nombre, volverFn));
    document.getElementById("btn-reset").addEventListener("click", () => enviarReset(perfilSup.correo, nombre));
    document.getElementById("btn-eliminar-sup").addEventListener("click", () => eliminarUsuario(uid, nombre, volver));
    cont.querySelectorAll("[data-id]").forEach((el) =>
      el.addEventListener("click", () => (window.location.href = `detalle.html?id=${el.dataset.id}`))
    );
    const btnR = document.getElementById("btn-reasignar");
    if (btnR) btnR.addEventListener("click", async () => {
      if (bloqueaSiImpersona(sesion)) return;
      const sel = document.getElementById("sel-reasignar");
      const destino = sel.value;
      if (!destino) return;
      const destinoNombre = sel.options[sel.selectedIndex].dataset.nombre;
      if (!confirm(`¿Reasignar los ${tSnap.docs.length} técnicos de ${nombre} a ${destinoNombre}?`)) return;
      try {
        await Promise.all(
          tSnap.docs.map((d) => updateDoc(doc(db, "tecnicos", d.id), { supervisorUid: destino, supervisorNombre: destinoNombre }))
        );
        logAudit("tecnicos_reasignados", { de: uid, a: destino, cantidad: tSnap.docs.length });
        toast(`${tSnap.docs.length} técnicos reasignados ✓`);
        mostrarSupervisor(uid, nombre);
      } catch (err) {
        toast("No se pudo reasignar: " + err.message, { ms: 5000 });
      }
    });
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">Error: ${err.message}</div>`;
  }
}

// ───────── Link público para evaluar a un supervisor (coordinador) ─────────
async function generarLinkSupervisor(supUid, supNombre) {
  if (bloqueaSiImpersona(sesion)) return;
  const box = document.getElementById("link-box");
  box.innerHTML = `<p class="meta" style="margin-top:8px">Cargando tus formularios…</p>`;
  try {
    const forms = (await cargarPlantillasDeCoordinador(db, sesion.uid)).filter((f) => f.tipo === "supervisor");
    if (!forms.length) {
      box.innerHTML = `<div class="msg error" style="margin-top:8px">Primero crea un formulario de tipo <strong>"Para evaluar supervisores"</strong> en "Editar formulario".</div>`;
      return;
    }
    box.innerHTML = `<div class="add-row" style="margin-top:8px">
      <select id="sel-form-sup">${forms.map((f) => `<option value="${f.id}">${esc(f.nombre)}</option>`).join("")}</select>
      <button class="btn" id="btn-gen-link">Generar</button>
    </div><div id="link-result"></div>`;
    document.getElementById("btn-gen-link").addEventListener("click", async () => {
      const sel = document.getElementById("sel-form-sup");
      const form = forms.find((f) => f.id === sel.value);
      const snapshot = {
        nombre: form.nombre,
        siNo: form.siNo,
        secciones: (form.secciones || []).map((s) => ({
          id: s.id, titulo: s.titulo, preguntas: s.preguntas, opciones: opcionesDeSeccion(s),
        })),
      };
      try {
        const ref = await addDoc(collection(db, "enlaces"), {
          tipo: "evalSupervisor",
          supervisorUid: supUid,
          supervisorNombre: supNombre,
          creadorUid: sesion.real.user.uid,
          activo: true,
          plantillaSnapshot: snapshot,
          createdAt: serverTimestamp(),
          ...(sesion.enPrueba ? { esPrueba: true } : {}),
        });
        const link = new URL(`evaluar.html?e=${ref.id}`, location.href).href;
        logAudit("link_evaluacion_creado", { supervisorUid: supUid });
        document.getElementById("link-result").innerHTML = `
          <div class="msg ok" style="margin-top:8px">Comparte este link con los técnicos (no necesitan cuenta ni iniciar sesión):</div>
          <div class="add-row"><input id="link-sup" type="text" readonly value="${esc(link)}"><button class="btn" id="btn-copy-link">Copiar</button></div>`;
        document.getElementById("btn-copy-link").addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(link); document.getElementById("btn-copy-link").textContent = "¡Copiado!"; } catch {}
        });
      } catch (err) {
        document.getElementById("link-result").innerHTML = `<div class="msg error">No se pudo generar: ${err.message}</div>`;
      }
    });
  } catch (err) {
    box.innerHTML = `<div class="msg error">No se pudo: ${err.message}</div>`;
  }
}

// ───────── Crear usuario directamente (root→coordinador, coordinador→supervisor) ─────────
function crearUsuarioDirecto(rol) {
  if (bloqueaSiImpersona(sesion)) return;
  const box = document.getElementById("crear-box");
  const quien = rol === "coordinador" ? "coordinador" : "supervisor";
  box.innerHTML = `
    <div class="card">
      <h3 style="margin-top:0">Crear ${quien}</h3>
      <div class="campo"><label>Nombre y apellido</label><input type="text" id="c-nombre"></div>
      <div class="campo"><label>Correo</label><input type="email" id="c-correo"></div>
      <div class="campo"><label>Contraseña (mínimo 6)</label><input type="text" id="c-pass" placeholder="La verás para entregársela"></div>
      <button class="btn" id="c-guardar">Crear cuenta</button>
      <div id="c-msg"></div>
    </div>`;
  document.getElementById("c-guardar").addEventListener("click", async () => {
    if (bloqueaSiImpersona(sesion)) return;
    const nombre = document.getElementById("c-nombre").value.trim();
    const correo = document.getElementById("c-correo").value.trim();
    const pass = document.getElementById("c-pass").value;
    const msg = document.getElementById("c-msg");
    msg.innerHTML = "";
    if (!nombre) return (msg.innerHTML = `<div class="msg error">Falta el nombre.</div>`);
    if (pass.length < 6) return (msg.innerHTML = `<div class="msg error">La contraseña debe tener al menos 6 caracteres.</div>`);
    const btn = document.getElementById("c-guardar");
    btn.disabled = true;
    btn.textContent = "Creando…";
    try {
      const uid = await crearCuentaAux(correo, pass);
      const perfilDoc = {
        nombre: sesion.enPrueba ? conPrefijoPrueba(nombre) : nombre,
        correo, rol, activo: true, createdAt: serverTimestamp(),
      };
      if (rol === "coordinador") perfilDoc.rootUid = sesion.real.user.uid;
      else perfilDoc.coordinadorUid = sesion.real.user.uid;
      if (sesion.enPrueba) perfilDoc.esPrueba = true;
      await setDoc(doc(db, "usuarios", uid), perfilDoc);
      logAudit("usuario_creado_directo", { rol, correo });
      toast(`${quien} creado ✓`);
      box.innerHTML = `<div class="card"><div class="msg ok">✔ ${quien} creado. Entrégale estos datos:<br>
        <strong>Correo:</strong> ${esc(correo)}<br><strong>Contraseña:</strong> ${esc(pass)}</div></div>`;
      if (rol === "coordinador") cargarCoordinadores(); else cargarSupervisores();
    } catch (err) {
      let t = err.message;
      if (err.code === "auth/email-already-in-use") t = "Ese correo ya tiene una cuenta.";
      else if (err.code === "auth/invalid-email") t = "Correo inválido.";
      else if (err.code === "auth/weak-password") t = "Contraseña muy débil.";
      msg.innerHTML = `<div class="msg error">${t}</div>`;
      btn.disabled = false;
      btn.textContent = "Crear cuenta";
    }
  });
}

// ───────── Respaldo descargable (root) ─────────
// Colecciones que entran al respaldo. Esta lista se quedó atrás una vez: se
// escribió antes de que existieran las bitácoras y los inventarios, y nadie la
// actualizó. Si agregas una colección al sistema, AGRÉGALA AQUÍ TAMBIÉN, o el
// respaldo va a dar una falsa sensación de seguridad.
const COLECCIONES_RESPALDO = [
  "usuarios",
  "tecnicos",
  "evaluaciones",
  "evaluacionesSupervisor",
  "invitaciones",
  "plantillas",
  "enlaces",
  "bitacoras",
  "inventario_herramientas",
  "inventario_materiales",
];

function pesoLegible(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function descargarRespaldo() {
  // Las fotos son el grueso del peso. Se pregunta porque las dos respuestas
  // son legítimas: para respaldar antes de tocar las fotos hacen falta; para
  // un respaldo de rutina, solo estorban.
  const conFotos = confirm(
    "¿Incluir las fotos de las bitácoras?\n\n" +
    "SÍ — el respaldo queda completo, pero puede pesar decenas de megas y " +
    "tardar varios minutos. Es lo que necesitas antes de mover o migrar fotos.\n\n" +
    "NO — respaldo liviano y rápido, con todo lo demás."
  );

  const aviso = toast("Generando respaldo…", { ms: 0 });
  const paso = (t) => { aviso.innerHTML = t; };

  try {
    const data = { generadoEn: new Date().toISOString(), incluyeFotos: conFotos };

    for (let i = 0; i < COLECCIONES_RESPALDO.length; i++) {
      const c = COLECCIONES_RESPALDO[i];
      paso(`Respaldando ${c}… (${i + 1}/${COLECCIONES_RESPALDO.length})`);
      const snap = await getDocs(collection(db, c));
      data[c] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    // Las fotos viven en una subcolección por bitácora, así que hay que
    // recorrerlas una por una: no hay forma de traerlas de un solo tirón.
    // (Las bitácoras anteriores a v2.0.0 las llevan dentro, en `imagenes`,
    // y esas ya vinieron con el documento.)
    if (conFotos) {
      data.bitacorasFotos = {};
      const total = data.bitacoras.length;
      for (let i = 0; i < total; i++) {
        const b = data.bitacoras[i];
        if (i % 5 === 0) paso(`Respaldando fotos… (${i}/${total} bitácoras)`);
        const fsnap = await getDocs(collection(db, "bitacoras", b.id, "fotos"));
        if (!fsnap.empty) {
          data.bitacorasFotos[b.id] = fsnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
      }
    }

    paso("Armando el archivo…");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airtek-respaldo${conFotos ? "-con-fotos" : ""}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    aviso.remove();
    const cuantas = COLECCIONES_RESPALDO.reduce((n, c) => n + (data[c]?.length || 0), 0);
    toast(`Respaldo descargado ✓ — ${cuantas} registros, ${pesoLegible(blob.size)}`, { ms: 7000 });
  } catch (err) {
    console.error(err);
    aviso.remove();
    toast("No se pudo el respaldo: " + err.message, { ms: 6000 });
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

    const html = htmlListaConVerMas(items, (e) => {
      const fecha = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleString("es-VE") : "";
      const prom = e.puntajes?.promedioGeneral;
      const badge = prom != null ? `${prom.toFixed(2)} / 10` : "—";
      return `
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
    wireVerMas(cont);
    cont.querySelectorAll("[data-id]").forEach((el) =>
      el.addEventListener("click", () => (window.location.href = `detalle.html?id=${el.dataset.id}`))
    );
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">Error al cargar. Revisa la consola (F12).</div>`;
  }
}
