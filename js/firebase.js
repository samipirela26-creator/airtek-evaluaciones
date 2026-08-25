// firebase.js
// Punto único donde se inicializa Firebase. Todo lo demás importa desde aquí.
//
// IMPORTANTE (Samuel): reemplaza el objeto firebaseConfig por el de TU proyecto.
// Lo consigues en: consola de Firebase -> Configuración del proyecto (⚙️)
// -> "Tus apps" -> app Web -> "Configuración del SDK" -> Config.
//
// Estas claves son públicas por diseño (van en el navegador). La seguridad real
// se hace con las Reglas de Firestore (ver README.md), no ocultando estas claves.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwyEN5JCV0Ps5xkp9iwln9CkA2c-GC0ag",
  authDomain: "airtek-evaluaciones.firebaseapp.com",
  projectId: "airtek-evaluaciones",
  storageBucket: "airtek-evaluaciones.firebasestorage.app",
  messagingSenderId: "889371807026",
  appId: "1:889371807026:web:7220c1c3711910be9c9b2b",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ── PWA: manifiesto + service worker (instalable, offline, siempre lo más nuevo) ──
// Se inyecta desde aquí porque todas las páginas importan este módulo.
if (typeof document !== "undefined") {
  const add = (tag, attrs) => {
    const sel = Object.entries(attrs).map(([k, v]) => `[${k}="${v}"]`).join("");
    if (document.querySelector(tag + sel)) return;
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => (el[k] = v));
    document.head.appendChild(el);
  };
  add("link", { rel: "manifest", href: "manifest.json" });
  add("meta", { name: "theme-color", content: "#0066ff" });
  add("link", { rel: "apple-touch-icon", href: "icons/apple-touch-icon.png" });
  // iOS/Safari: abrir a pantalla completa como app
  add("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
  add("meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" });
  add("meta", { name: "apple-mobile-web-app-title", content: "Airtek Eval" });
  add("meta", { name: "mobile-web-app-capable", content: "yes" });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((e) => console.warn("SW:", e));
    });
  }
}
