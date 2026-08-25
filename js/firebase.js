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
