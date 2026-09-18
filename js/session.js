// session.js
// Helpers de sesión y roles usados por todas las páginas.

import { auth, db, logAudit } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { leerVerComo, escribirVerComo, borrarVerComo, contextoEfectivo } from "./ver-como-data.js";

// Lee el perfil del usuario (nombre y rol) desde la colección "usuarios".
// Cada documento tiene id = uid y campos: { nombre, rol }.
// rol es "root", "coordinador" o "supervisor".
export async function cargarPerfil(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? snap.data() : null;
}

// Protege una página: si no hay sesión, redirige al login.
// Devuelve { user, perfil } cuando hay sesión válida.
// `rolRequerido` admite un rol ("supervisor"), una lista de roles
// (["supervisor", "coordinador"]) o null para cualquiera con sesión.
// Si el rol no coincide, redirige al panel.
export function protegerPagina(rolRequerido, callback) {
  const rolesPermitidos = rolRequerido == null
    ? null
    : (Array.isArray(rolRequerido) ? rolRequerido : [rolRequerido]);
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    const perfil = await cargarPerfil(user.uid);
    if (!perfil) {
      alert(
        "Tu usuario existe pero no tiene perfil (nombre/rol) en la base de datos. Avisa al coordinador."
      );
      await signOut(auth);
      window.location.href = "index.html";
      return;
    }
    if (perfil.activo === false) {
      alert("Tu cuenta fue inhabilitada. Contacta a tu coordinador o administrador.");
      await signOut(auth);
      window.location.href = "index.html";
      return;
    }
    // Con "Ver como" activo, el acceso a páginas restringidas por rol se
    // evalúa contra el rol de la persona vista, no el de root — si no, root
    // no podría siquiera entrar a una pantalla de solo-supervisor mientras
    // la ve "como" un supervisor.
    const verComo = leerVerComo(sessionStorage);
    const rolEfectivo = verComo ? verComo.rol : perfil.rol;
    if (rolesPermitidos && !rolesPermitidos.includes(rolEfectivo)) {
      window.location.href = "panel.html";
      return;
    }
    if (verComo) {
      // Import dinámico a propósito: ver-como.js ya importa de este archivo
      // (activarVerComo/salirDeVerComo) para el selector, así que un import
      // estático en sentido contrario crearía un ciclo — y firebase.js
      // exporta `db`/`auth` como `const`, así que un ciclo real podría
      // intentar leerlos antes de que terminen de inicializarse.
      import("./ver-como.js").then(({ montarAvisoVerComo }) => montarAvisoVerComo(verComo));
    }
    callback({ user, perfil });
  });
}

export async function cerrarSesion() {
  await signOut(auth);
  window.location.href = "index.html";
}

// ── Modo "Ver como" (spec 003) ──────────────────────────────────────────
// Le permite a root navegar la app con los datos reales de otro usuario,
// sin tocar su sesión de Firebase Auth. El estado vive en sessionStorage
// (una pestaña, hasta salir manualmente); la lógica pura está en
// ver-como-data.js para poder probarla sin Firebase.

// Activa el modo: desde ahora, contextoActual() devuelve la identidad de
// `perfilObjetivo` en vez de la real, hasta salirDeVerComo() o cerrar la
// pestaña. Deja registro en `auditoria` (RF-10) con quién lo activó
// (siempre la identidad real, via logAudit) y a quién eligió.
export async function activarVerComo(uidObjetivo, perfilObjetivo) {
  escribirVerComo(sessionStorage, uidObjetivo, perfilObjetivo);
  await logAudit("ver_como_inicio", {
    objetivoUid: uidObjetivo,
    objetivoNombre: perfilObjetivo.nombre,
    objetivoRol: perfilObjetivo.rol,
  });
}

// Termina el modo "Ver como". Deja registro del cierre (RF-11) con la
// misma persona que se estaba viendo, leída ANTES de borrar el estado.
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

// Identidad efectiva para leer datos: la de "Ver como" si está activo, o si
// no la real de la sesión. `real` es el `{ user, perfil }` que ya entrega
// protegerPagina.
export function contextoActual(real) {
  return contextoEfectivo(real, leerVerComo(sessionStorage));
}
