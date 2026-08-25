// registro.js — el supervisor crea su cuenta a partir de un link de invitación.
// El link trae ?invite=TOKEN (el id del documento en la colección "invitaciones").
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const estado = document.getElementById("estado");
const form = document.getElementById("form-registro");
const msg = document.getElementById("mensaje");

const token = new URLSearchParams(location.search).get("invite");
let invitacion = null;

// 1) Validar la invitación antes de mostrar el formulario.
(async function validar() {
  if (!token) {
    estado.innerHTML = `<div class="msg error">Falta el código de invitación en el enlace.</div>`;
    return;
  }
  try {
    const snap = await getDoc(doc(db, "invitaciones", token));
    if (!snap.exists()) {
      estado.innerHTML = `<div class="msg error">Invitación no encontrada. Pídele al coordinador un nuevo enlace.</div>`;
      return;
    }
    invitacion = snap.data();
    if (invitacion.usado) {
      estado.innerHTML = `<div class="msg error">Esta invitación ya fue usada. Pide un nuevo enlace.</div>`;
      return;
    }
    if (invitacion.expiraEnMs && Date.now() > invitacion.expiraEnMs) {
      estado.innerHTML = `<div class="msg error">Este enlace venció (dura 7 días). Pide uno nuevo.</div>`;
      return;
    }
    // Invitación válida → mostrar formulario, con el rol que corresponde.
    const rol = invitacion.rol || "supervisor";
    const rolTexto = rol === "coordinador" ? "Coordinador" : "Supervisor";
    document.getElementById("sub-registro").textContent = `Crear cuenta de ${rolTexto}`;
    estado.innerHTML = `<div class="msg ok">Invitación de <strong>${invitacion.creadorNombre || invitacion.coordinadorNombre || "Airtek"}</strong> para <strong>${rolTexto}</strong>. Completa tus datos.</div>`;
    form.style.display = "block";
  } catch (err) {
    console.error(err);
    estado.innerHTML = `<div class="msg error">No se pudo validar la invitación: ${err.message}</div>`;
  }
})();

// 2) Crear la cuenta + el perfil, y marcar la invitación como usada.
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.innerHTML = "";
  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!nombre) return error("Escribe tu nombre.");

  const btn = form.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Creando cuenta…";
  try {
    // Crea el usuario en Authentication (queda con sesión iniciada).
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    // Reclama la invitación de forma ATÓMICA (a prueba de que el link se
    // comparta en un grupo y varios lo abran a la vez): solo UNO gana.
    try {
      await runTransaction(db, async (tx) => {
        const invRef = doc(db, "invitaciones", token);
        const s = await tx.get(invRef);
        if (!s.exists()) throw new Error("NO_EXISTE");
        if (s.data().usado) throw new Error("USADA");
        tx.update(invRef, { usado: true, usadoPor: uid });
      });
    } catch (txErr) {
      // Otra persona ganó el enlace → borramos esta cuenta para no dejarla huérfana.
      await cred.user.delete().catch(() => {});
      throw new Error(
        txErr.message === "USADA"
          ? "Otra persona acaba de usar este enlace. Pídele al coordinador un enlace NUEVO."
          : "La invitación ya no es válida. Pide un enlace nuevo."
      );
    }

    // Ya reclamada: crea su perfil con el rol de la invitación.
    const rol = invitacion.rol || "supervisor";
    const creadorUid = invitacion.creadorUid || invitacion.coordinadorUid;
    const perfilDoc = { nombre, correo: email, rol, inviteToken: token, createdAt: serverTimestamp() };
    if (rol === "supervisor") perfilDoc.coordinadorUid = creadorUid;
    else if (rol === "coordinador") perfilDoc.rootUid = creadorUid;
    await setDoc(doc(db, "usuarios", uid), perfilDoc);

    window.location.href = "panel.html";
  } catch (err) {
    console.error(err);
    let texto = err.message;
    if (err.code === "auth/email-already-in-use") texto = "Ese correo ya tiene una cuenta. Inicia sesión.";
    else if (err.code === "auth/weak-password") texto = "La contraseña es muy corta (mínimo 6).";
    else if (err.code === "auth/invalid-email") texto = "Correo inválido.";
    error(texto);
    btn.disabled = false;
    btn.textContent = "Crear mi cuenta";
  }
});

function error(t) {
  msg.innerHTML = `<div class="msg error">${t}</div>`;
}
