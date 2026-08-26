// mock-firebase.js — reemplaza js/firebase.js en la previsualización local.
// Mismos exports (db, auth, toast, logAudit, crearCuentaAux) pero sin Firebase real.
import { SEED } from "./seed.js";

export const db = { __mock: true };
export const auth = { __mock: true, currentUser: null };

// toast idéntico al real (para que los avisos se vean igual).
export function toast(msg, { ms = 3000, tappable = false, onClick } = {}) {
  const t = document.createElement("div");
  t.className = "toast-airtek" + (tappable ? " tappable" : "");
  t.innerHTML = msg;
  if (onClick) t.addEventListener("click", onClick);
  document.body.appendChild(t);
  if (ms) setTimeout(() => t.remove(), ms);
  return t;
}

// Auditoría: guarda en el store en memoria (para que auditoria.html muestre algo).
export async function logAudit(accion, detalle = {}) {
  try {
    const d = new Date();
    SEED.auditoria["gen_" + d.getTime()] = {
      accion, uid: "u_coord", nombre: "Carlos (Coordinador)", detalle,
      en: { toDate: () => d, seconds: Math.floor(d / 1000) },
    };
  } catch {}
}

// Crear cuenta auxiliar: en preview devuelve un uid falso, no crea nada.
export async function crearCuentaAux(correo) {
  return { uid: "gen_" + Date.now(), correo };
}
