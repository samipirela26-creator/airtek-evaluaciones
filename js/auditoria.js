// auditoria.js — el root ve el registro de actividad.
import { db } from "./firebase.js";
import { protegerPagina, cargarPerfil, contextoActual } from "./session.js";
import { montarShell } from "./shell.js";
import { renderLista, TOPE } from "./ui/listas.js";
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
  ver_como_inicio: "Ver como: inicio",
  ver_como_fin: "Ver como: fin",
  modo_prueba_inicio: "Modo de prueba: inicio",
  modo_prueba_fin: "Modo de prueba: fin",
};

protegerPagina("root", async (s) => {
  montarShell(contextoActual(s));
  const cont = document.getElementById("lista-audit");
  try {
    const snap = await getDocs(query(collection(db, "auditoria"), orderBy("en", "desc"), limit(200)));
    if (snap.empty) {
      cont.innerHTML = `<div class="lista-vacia">Aún no hay actividad registrada.</div>`;
      return;
    }
    // Cache de nombres de usuario para mostrar quién hizo cada acción.
    // Se recorta ANTES del bucle a propósito: resolver el nombre de cada uno
    // de los 200 movimientos son 200 lecturas a Firestore para filas que
    // igual no se van a pintar.
    const nombres = {};
    const filas = [];
    for (const d of snap.docs.slice(0, TOPE)) {
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
    // `items` son todos los documentos traídos, pero sólo se pintan los
    // primeros: así el aviso puede decir "25 de 200" con el total de verdad.
    renderLista({
      nodo: cont,
      items: snap.docs,
      tope: TOPE,
      unidad: "movimiento",
      comoAfinar: "Son los más recientes. La auditoría guarda todo, pero se lee de a poco.",
      pintar: (_d, i) => filas[i],
    });
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">No se pudo cargar. Si menciona un "index", abre el enlace de la consola (F12) para crearlo.</div>`;
  }
});
