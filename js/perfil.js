// perfil.js — editar el propio nombre y correo, y (coordinador) el nombre de los supervisores.
import { auth, db } from "./firebase.js";
import { protegerPagina } from "./session.js";
import {
  updateEmail,
  updatePassword,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
const set = (id, tipo, txt) =>
  (document.getElementById(id).innerHTML = `<div class="msg ${tipo}">${txt}</div>`);

let sesion = null;

protegerPagina(null, async ({ user, perfil }) => {
  sesion = { user, perfil };
  document.getElementById("mi-nombre").value = perfil.nombre || "";
  document.getElementById("mi-correo").value = user.email || "";

  document.getElementById("btn-nombre").addEventListener("click", guardarNombre);
  document.getElementById("btn-correo").addEventListener("click", cambiarCorreo);
  document.getElementById("btn-pass").addEventListener("click", cambiarPassword);
  document.getElementById("btn-verificar").addEventListener("click", verificarCorreo);

  if (perfil.rol === "coordinador") {
    document.getElementById("card-sups").style.display = "block";
    cargarSupervisores();
  }
});

// ── Mi nombre ──
async function guardarNombre() {
  const nombre = document.getElementById("mi-nombre").value.trim();
  if (!nombre) return set("msg-nombre", "error", "El nombre no puede quedar vacío.");
  try {
    await updateDoc(doc(db, "usuarios", sesion.user.uid), { nombre });
    set("msg-nombre", "ok", "✔ Nombre actualizado.");
  } catch (err) {
    set("msg-nombre", "error", "No se pudo: " + err.message);
  }
}

// ── Mi correo ──
async function cambiarCorreo() {
  const email = document.getElementById("mi-correo").value.trim();
  if (!email) return set("msg-correo", "error", "Escribe el nuevo correo.");
  try {
    await updateEmail(auth.currentUser, email);
    set("msg-correo", "ok", "✔ Correo actualizado. Úsalo la próxima vez que inicies sesión.");
  } catch (err) {
    let t = err.message;
    if (err.code === "auth/requires-recent-login")
      t = "Por seguridad, cierra sesión y vuelve a entrar antes de cambiar el correo.";
    else if (err.code === "auth/email-already-in-use") t = "Ese correo ya está en uso.";
    else if (err.code === "auth/invalid-email") t = "Correo inválido.";
    else if (err.code === "auth/operation-not-allowed")
      t = "Firebase pide verificar el correo nuevo primero. Actívalo en Authentication → Configuración.";
    set("msg-correo", "error", t);
  }
}

// ── Cambiar contraseña ──
async function cambiarPassword() {
  const pass = document.getElementById("mi-pass").value;
  if (pass.length < 6) return set("msg-pass", "error", "La contraseña debe tener al menos 6 caracteres.");
  try {
    await updatePassword(auth.currentUser, pass);
    document.getElementById("mi-pass").value = "";
    set("msg-pass", "ok", "✔ Contraseña actualizada.");
  } catch (err) {
    let t = err.message;
    if (err.code === "auth/requires-recent-login")
      t = "Por seguridad, cierra sesión y vuelve a entrar antes de cambiar la contraseña.";
    else if (err.code === "auth/weak-password") t = "La contraseña es muy débil.";
    set("msg-pass", "error", t);
  }
}

// ── Verificar correo ──
async function verificarCorreo() {
  try {
    if (auth.currentUser.emailVerified) return set("msg-verificar", "ok", "Tu correo ya está verificado ✓");
    await sendEmailVerification(auth.currentUser);
    set("msg-verificar", "ok", "Te enviamos un correo de verificación. Revisa tu bandeja (y spam).");
  } catch (err) {
    set("msg-verificar", "error", "No se pudo enviar: " + err.message);
  }
}

// ── Nombres de supervisores (coordinador) ──
async function cargarSupervisores() {
  const cont = document.getElementById("sups-editar");
  try {
    const snap = await getDocs(
      query(collection(db, "usuarios"), where("coordinadorUid", "==", sesion.user.uid))
    );
    const sups = snap.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .filter((u) => u.rol === "supervisor")
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    if (!sups.length) {
      cont.innerHTML = `<div class="lista-vacia">Aún no tienes supervisores.</div>`;
      return;
    }
    cont.innerHTML = sups
      .map(
        (s) => `
      <div class="add-row">
        <input type="text" data-uid="${s.uid}" value="${esc(s.nombre)}">
        <button class="btn secundario" data-guardar="${s.uid}">Guardar</button>
      </div>
      <div id="msg-sup-${s.uid}" style="margin:-8px 0 10px"></div>`
      )
      .join("");
    cont.querySelectorAll("[data-guardar]").forEach((btn) =>
      btn.addEventListener("click", () => guardarSupervisor(btn.dataset.guardar, cont))
    );
  } catch (err) {
    cont.innerHTML = `<div class="msg error">No se pudo cargar: ${err.message}</div>`;
  }
}

async function guardarSupervisor(uid, cont) {
  const input = cont.querySelector(`input[data-uid="${uid}"]`);
  const nombre = input.value.trim();
  if (!nombre) return set(`msg-sup-${uid}`, "error", "El nombre no puede quedar vacío.");
  try {
    await updateDoc(doc(db, "usuarios", uid), { nombre });
    set(`msg-sup-${uid}`, "ok", "✔ Guardado.");
  } catch (err) {
    set(`msg-sup-${uid}`, "error", "No se pudo: " + err.message);
  }
}
