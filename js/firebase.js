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
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
