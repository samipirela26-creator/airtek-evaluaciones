// session.js
// Helpers de sesión y roles usados por todas las páginas.

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Lee el perfil del usuario (nombre y rol) desde la colección "usuarios".
// Cada documento tiene id = uid y campos: { nombre, rol }.
// rol es "coordinador" o "supervisor".
export async function cargarPerfil(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? snap.data() : null;
}

// Protege una página: si no hay sesión, redirige al login.
// Devuelve { user, perfil } cuando hay sesión válida.
// Si se pasa rolRequerido y no coincide, redirige al panel.
export function protegerPagina(rolRequerido, callback) {
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
    if (rolRequerido && perfil.rol !== rolRequerido) {
      window.location.href = "panel.html";
      return;
    }
    callback({ user, perfil });
  });
}

export async function cerrarSesion() {
  await signOut(auth);
  window.location.href = "index.html";
}
