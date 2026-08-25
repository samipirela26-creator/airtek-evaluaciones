// auditoria.js — el root ve el registro de actividad.
import { db } from "./firebase.js";
import { protegerPagina, cargarPerfil } from "./session.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

// Textos amigables por tipo de evento.
const ACCIONES = {
  invitacion_creada: "Invitación creada",
  invitacion_revocada: "Invitación revocada",
  usuario_inhabilitado: "Usuario inhabilitado",
  usuario_reactivado: "Usuario reactivado",
  formulario_guardado: "Formulario guardado",
  formulario_eliminado: "Formulario eliminado",
  evaluacion_eliminada: "Evaluación eliminada",
  tecnicos_reasignados: "Técnicos reasignados",
  link_evaluacion_creado: "Link de evaluación creado",
  reset_contrasena_enviado: "Restablecimiento de contraseña enviado",
  usuario_eliminado: "Usuario eliminado",
  usuario_creado_directo: "Usuario creado directamente",
};

protegerPagina("root", async () => {
  const cont = document.getElementById("lista-audit");
  try {
    const snap = await getDocs(query(collection(db, "auditoria"), orderBy("en", "desc"), limit(200)));
    if (snap.empty) {
      cont.innerHTML = `<div class="lista-vacia">Aún no hay actividad registrada.</div>`;
      return;
    }
    // Cache de nombres de usuario para mostrar quién hizo cada acción.
    const nombres = {};
    const filas = [];
    for (const d of snap.docs) {
      const a = d.data();
      let quien = "—";
      if (a.uid) {
        if (!(a.uid in nombres)) {
          const p = await cargarPerfil(a.uid).catch(() => null);
          nombres[a.uid] = p ? p.nombre : a.uid.slice(0, 6);
        }
        quien = nombres[a.uid];
      }
      const fecha = a.en?.toDate ? a.en.toDate().toLocaleString("es-VE") : "";
      const detalle = a.detalle ? Object.entries(a.detalle).map(([k, v]) => `${k}: ${esc(v)}`).join(" · ") : "";
      filas.push(`<div class="lista-item">
        <div><strong>${ACCIONES[a.accion] || esc(a.accion)}</strong>
          <div class="meta">${esc(quien)} · ${fecha}${detalle ? "<br>" + detalle : ""}</div>
        </div></div>`);
    }
    cont.innerHTML = filas.join("");
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">No se pudo cargar. Si menciona un "index", abre el enlace de la consola (F12) para crearlo.</div>`;
  }
});
