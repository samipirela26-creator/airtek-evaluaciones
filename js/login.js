// login.js — maneja el formulario de acceso.
import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const form = document.getElementById("form-login");
const msg = document.getElementById("mensaje");

// Si ya hay sesión activa, salta directo al panel.
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "panel.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.innerHTML = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "panel.html";
  } catch (err) {
    let texto = "No se pudo iniciar sesión.";
    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password")
      texto = "Correo o contraseña incorrectos.";
    else if (err.code === "auth/user-not-found") texto = "Ese usuario no existe.";
    else if (err.code === "auth/invalid-email") texto = "Correo inválido.";
    else if (err.code === "auth/too-many-requests")
      texto = "Demasiados intentos. Espera un momento.";
    msg.innerHTML = `<div class="msg error">${texto}</div>`;
  }
});

// Restablecer contraseña por correo.
document.getElementById("link-olvide").addEventListener("click", async (e) => {
  e.preventDefault();
  msg.innerHTML = "";
  const email = document.getElementById("email").value.trim();
  if (!email) {
    msg.innerHTML = `<div class="msg error">Escribe tu correo arriba y vuelve a tocar el enlace.</div>`;
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    msg.innerHTML = `<div class="msg ok">Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja (y la carpeta de spam).</div>`;
  } catch (err) {
    const t = err.code === "auth/invalid-email" ? "Correo inválido." : err.message;
    msg.innerHTML = `<div class="msg error">No se pudo enviar: ${t}</div>`;
  }
});
