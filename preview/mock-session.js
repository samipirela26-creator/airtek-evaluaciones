// mock-session.js — reemplaza js/session.js en la previsualización local.
// Elige el "usuario logueado" según el parámetro ?u= de la URL (coordinador por
// defecto) y entrega la sesión sin pedir login. Ignora el rol requerido para que
// puedas ver cualquier pantalla.
import { SEED } from "./seed.js";
// El modo "Ver como" (spec 003) es lógica pura sin Firebase: se reutiliza tal
// cual, sobre el sessionStorage real del navegador.
import { leerVerComo, escribirVerComo, borrarVerComo, contextoEfectivo } from "/js/ver-como-data.js";
import { logAudit } from "./mock-firebase.js";

const MAP = { coordinador: "u_coord", supervisor: "u_sup1", root: "u_root" };

function uidActual() {
  const u = new URLSearchParams(location.search).get("u") || "coordinador";
  return MAP[u] || "u_coord";
}

export async function cargarPerfil(uid) {
  return SEED.usuarios[uid] || null;
}

export function protegerPagina(_rolRequerido, callback) {
  const uid = uidActual();
  const perfil = SEED.usuarios[uid];
  // Igual que el session.js real: si hay "Ver como" activo, pinta el aviso.
  // Ruta absoluta porque este archivo vive en /preview, no en /js.
  const verComo = leerVerComo(sessionStorage);
  if (verComo) {
    import("/js/ver-como.js").then(({ montarAvisoVerComo }) => montarAvisoVerComo(verComo));
  }
  // Pequeño aviso visual de que estás en modo previsualización.
  queueMicrotask(() => callback({ user: { uid }, perfil }));
}

export async function cerrarSesion() {
  location.href = "/preview/index.html";
}

// ── Modo "Ver como" (spec 003) — mismos exports que el session.js real,
// para que el módulo que los usa (ver-como.js) cargue igual en preview. ──
export async function activarVerComo(uidObjetivo, perfilObjetivo) {
  escribirVerComo(sessionStorage, uidObjetivo, perfilObjetivo);
  await logAudit("ver_como_inicio", {
    objetivoUid: uidObjetivo,
    objetivoNombre: perfilObjetivo.nombre,
    objetivoRol: perfilObjetivo.rol,
  });
}

export async function salirDeVerComo() {
  const verComo = leerVerComo(sessionStorage);
  borrarVerComo(sessionStorage);
  if (verComo) {
    await logAudit("ver_como_fin", {
      objetivoUid: verComo.uid,
      objetivoNombre: verComo.nombre,
      objetivoRol: verComo.rol,
    });
  }
}

export function contextoActual(real) {
  return contextoEfectivo(real, leerVerComo(sessionStorage));
}
