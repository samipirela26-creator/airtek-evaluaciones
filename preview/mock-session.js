// mock-session.js — reemplaza js/session.js en la previsualización local.
// Elige el "usuario logueado" según el parámetro ?u= de la URL (coordinador por
// defecto) y entrega la sesión sin pedir login. Ignora el rol requerido para que
// puedas ver cualquier pantalla.
import { SEED } from "./seed.js";

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
  // Pequeño aviso visual de que estás en modo previsualización.
  queueMicrotask(() => callback({ user: { uid }, perfil }));
}

export async function cerrarSesion() {
  location.href = "/preview/index.html";
}
