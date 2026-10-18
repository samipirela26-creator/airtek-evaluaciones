// login.js — maneja el formulario de acceso.
import { auth } from "./firebase.js";
import { cargarPerfil } from "./session.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
  signOut,
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
      // El resolvedor va acá y no en la inicialización: así la infraestructura
      // de Google Sign-In se baja recién ahora, al tocar el botón, y no en
      // cada carga de página. Ver el comentario de js/firebase.js.
      const cred = await signInWithPopup(auth, provider, browserPopupRedirectResolver);

      // Entrar con Google AUTENTICA, pero no da de alta a nadie: el alta es
      // por invitación (registro.html) o la hace un coordinador. Si esta
      // cuenta no tiene perfil en "usuarios", no es de GESTO.
      //
      // Sin esta comprobación, cualquiera con una cuenta de Google entraba,
      // se le creaba un usuario en Firebase Auth y recién en el panel se
      // topaba con un alerta de "no tenés perfil" que no explica nada.
      let perfil = null;
      try {
        perfil = await cargarPerfil(cred.user.uid);
      } catch (e) {
        // No se pudo comprobar (sin señal, permisos). NO se asume que no
        // existe: se cierra sesión y se avisa, nada más.
        console.warn("No se pudo leer el perfil:", e);
        await signOut(auth).catch(() => {});
        msg.innerHTML = `<div class="msg error">No se pudo comprobar tu cuenta. Revisá tu conexión y probá de nuevo.</div>`;
        return;
      }

      if (!perfil) {
        // A propósito NO se borra la cuenta de Firebase Auth que acaba de
        // crearse: borrar la cuenta de alguien es irreversible y no es algo
        // que deba pasar solo. Queda huérfana y sin poder hacer nada —las
        // reglas de Firestore no le permiten leer ni escribir— y Samuel la
        // puede eliminar desde la consola si le molesta.
        await signOut(auth).catch(() => {});
        msg.innerHTML = `<div class="msg error">Esa cuenta de Google no está registrada en GESTO. Pedile a tu coordinador el enlace de invitación.</div>`;
        return;
      }

      window.location.href = "panel.html";
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
      if (err.code === "auth/account-exists-with-different-credential") {
        msg.innerHTML = `<div class="msg error">Ese correo ya tiene cuenta con contraseña. Entrá con correo y contraseña.</div>`;
        return;
      }
      if (err.code === "auth/operation-not-allowed") {
        msg.innerHTML = `<div class="msg error">El acceso con Google no está habilitado en este momento. Entrá con tu correo y contraseña.</div>`;
        return;
      }
      msg.innerHTML = `<div class="msg error">No se pudo iniciar sesión con Google: ${err.message}</div>`;
    }
  });
}
