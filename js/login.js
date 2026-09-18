// login.js — maneja el formulario de acceso.
import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
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

// Ver / ocultar contraseña
const btnToggle = document.getElementById("btn-toggle-password");
if (btnToggle) {
  const pwdInput = document.getElementById("password");
  const iconEye = btnToggle.querySelector(".icon-eye");
  const iconEyeOff = btnToggle.querySelector(".icon-eye-off");

  btnToggle.addEventListener("click", () => {
    const isPassword = pwdInput.type === "password";
    pwdInput.type = isPassword ? "text" : "password";
    if (iconEye && iconEyeOff) {
      iconEye.style.display = isPassword ? "none" : "block";
      iconEyeOff.style.display = isPassword ? "block" : "none";
    }
  });
}

// Inicio de sesión con Google
const btnGoogle = document.getElementById("btn-google");
if (btnGoogle) {
  btnGoogle.addEventListener("click", async () => {
    msg.innerHTML = "";
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      window.location.href = "panel.html";
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
      msg.innerHTML = `<div class="msg error">No se pudo iniciar sesión con Google: ${err.message}</div>`;
    }
  });
}
