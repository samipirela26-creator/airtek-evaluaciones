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
import { leerPrueba, escribirPrueba, borrarPrueba, contextoEfectivoPrueba } from "./prueba-data.js";

// ── Caché del perfil ────────────────────────────────────────────────────
// Cada página pedía el perfil a Firestore al cargar: una ida y vuelta al
// servidor antes de pintar nada, en CADA clic de la navegación. Como el perfil
// casi nunca cambia, se guarda unos minutos en sessionStorage.
//
// Por qué unos minutos y no toda la sesión: si un coordinador inhabilita a
// alguien o le cambia el rol, el cambio tiene que llegar pronto. Las reglas de
// Firestore mandan igual —un perfil viejo en el navegador no habilita a
// escribir nada que el servidor no permita— pero no queremos que la interfaz
// mienta más de la cuenta.
const CLAVE_PERFIL = "airtek_perfil";
const VIGENCIA_PERFIL = 5 * 60 * 1000; // 5 minutos

function perfilGuardado(uid) {
  try {
    const crudo = sessionStorage.getItem(CLAVE_PERFIL);
    if (!crudo) return null;
    const { uid: guardadoUid, perfil, ts } = JSON.parse(crudo);
    if (guardadoUid !== uid) return null;
    if (Date.now() - ts > VIGENCIA_PERFIL) return null;
    return perfil;
  } catch {
    return null; // almacenamiento no disponible o valor corrupto: se pide de nuevo
  }
}

function guardarPerfil(uid, perfil) {
  try {
    sessionStorage.setItem(CLAVE_PERFIL, JSON.stringify({ uid, perfil, ts: Date.now() }));
  } catch {
    /* sin almacenamiento se sigue sin caché, nada más */
  }
}

/** Borra el perfil guardado. Se llama al cerrar sesión y cuando el propio
 *  usuario edita su nombre, para no quedar mostrando el anterior. */
export function olvidarPerfil() {
  try {
    sessionStorage.removeItem(CLAVE_PERFIL);
  } catch {
    /* nada que borrar */
  }
}

// Lee el perfil del usuario (nombre y rol) desde la colección "usuarios".
// Cada documento tiene id = uid y campos: { nombre, rol }.
// rol es "root", "coordinador" o "supervisor".
export async function cargarPerfil(uid, { usarCache = false } = {}) {
  if (usarCache) {
    const guardado = perfilGuardado(uid);
    if (guardado) return guardado;
  }
  const snap = await getDoc(doc(db, "usuarios", uid));
  const perfil = snap.exists() ? snap.data() : null;
  if (perfil) guardarPerfil(uid, perfil);
  return perfil;
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
    const perfil = await cargarPerfil(user.uid, { usarCache: true });
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
    // Con "Ver como" o "Modo de prueba" activos, el acceso a páginas
    // restringidas por rol se evalúa contra el rol prestado, no el real de
    // root — si no, root no podría siquiera entrar a una pantalla de
    // solo-supervisor mientras la ve "como" (o prueba como) un supervisor.
    // Los dos modos son excluyentes (activar uno borra el otro), así que
    // nunca hay que decidir cuál gana si ambos estuvieran guardados.
    const verComo = leerVerComo(sessionStorage);
    const prueba = verComo ? null : leerPrueba(sessionStorage);
    const rolEfectivo = verComo ? verComo.rol : (prueba ? prueba.rol : perfil.rol);
    if (rolesPermitidos && !rolesPermitidos.includes(rolEfectivo)) {
      window.location.href = "panel.html";
      return;
    }
    // Import dinámico a propósito en ambos casos: ver-como.js/prueba.js ya
    // importan de este archivo (activarVerComo/activarModoPrueba, etc.) para
    // sus selectores, así que un import estático en sentido contrario
    // crearía un ciclo — y firebase.js exporta `db`/`auth` como `const`, así
    // que un ciclo real podría intentar leerlos antes de que terminen de
    // inicializarse.
    if (verComo) {
      import("./ver-como.js").then(({ montarAvisoVerComo }) => montarAvisoVerComo(verComo));
    } else if (prueba) {
      import("./prueba.js").then(({ montarAvisoPrueba }) => montarAvisoPrueba(prueba));
    }
    callback({ user, perfil });
  });
}

export async function cerrarSesion() {
  olvidarPerfil();
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
  borrarPrueba(sessionStorage); // los dos modos son excluyentes (spec 004, RF-3)
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

// Identidad efectiva para leer datos: la de "Ver como" si está activo; si
// no, la de "Modo de prueba" si está activo; si no, la real de la sesión.
// `real` es el `{ user, perfil }` que ya entrega protegerPagina.
export function contextoActual(real) {
  const verComo = leerVerComo(sessionStorage);
  if (verComo) return contextoEfectivo(real, verComo);
  const prueba = leerPrueba(sessionStorage);
  if (prueba) return contextoEfectivoPrueba(real, prueba);
  return contextoEfectivo(real, null);
}

// ── Modo de prueba (spec 004) ───────────────────────────────────────────
// Le permite a root navegar la app prestándose el rol de coordinador o
// supervisor, con su propia sesión real (mismo uid), para crear datos
// inventados sin tocar cuentas reales. A diferencia de "Ver como", la
// escritura queda habilitada — ver js/ver-como.js: bloqueaSiImpersona /
// deshabilitarControlesDeEscritura solo miran `impersonando`, que aquí
// siempre es `false`.

// Activa el modo con el rol elegido ("coordinador" o "supervisor"). Deja
// registro en `auditoria` (RF-13) con el rol elegido, vía logAudit (siempre
// con la identidad real de quien está autenticado).
export async function activarModoPrueba(rol) {
  borrarVerComo(sessionStorage); // los dos modos son excluyentes (RF-3)
  escribirPrueba(sessionStorage, rol);
  await logAudit("modo_prueba_inicio", { rolElegido: rol });
}

// Termina "Modo de prueba". Deja registro del cierre (RF-14) con el rol que
// se estaba probando, leído ANTES de borrar el estado.
export async function salirDeModoPrueba() {
  const prueba = leerPrueba(sessionStorage);
  borrarPrueba(sessionStorage);
  if (prueba) {
    await logAudit("modo_prueba_fin", { rolElegido: prueba.rol });
  }
}
