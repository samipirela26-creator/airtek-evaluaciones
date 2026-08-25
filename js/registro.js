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
  updateDoc,
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
      estado.innerHTML = `<div class="msg error">Esta invitación ya fue usada. Pídele al coordinador un nuevo enlace.</div>`;
      return;
    }
    // Invitación válida → mostrar formulario
    estado.innerHTML = `<div class="msg ok">Invitación de <strong>${invitacion.coordinadorNombre || "tu coordinador"}</strong>. Completa tus datos.</div>`;
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

    // Crea su perfil de supervisor, ligado al coordinador que lo invitó.
    await setDoc(doc(db, "usuarios", uid), {
      nombre,
      rol: "supervisor",
      coordinadorUid: invitacion.coordinadorUid,
      inviteToken: token,
      createdAt: serverTimestamp(),
    });

    // Marca la invitación como usada (un solo uso).
    await updateDoc(doc(db, "invitaciones", token), { usado: true, usadoPor: uid });

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
