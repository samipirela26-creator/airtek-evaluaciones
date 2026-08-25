// panel.js — muestra acciones y lista de evaluaciones según el rol.
import { db } from "./firebase.js";
import { protegerPagina, cerrarSesion } from "./session.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

document.getElementById("btn-salir").addEventListener("click", cerrarSesion);

protegerPagina(null, async ({ user, perfil }) => {
  document.getElementById("usuario-info").textContent =
    `${perfil.nombre} · ${perfil.rol}`;

  const acciones = document.getElementById("acciones");
  if (perfil.rol === "supervisor") {
    acciones.innerHTML = `
      <h2>Hola, ${perfil.nombre}</h2>
      <p>Evalúa a tus técnicos con el formulario vigente.</p>
      <a class="btn" href="evaluacion.html">+ Nueva evaluación</a>`;
    document.getElementById("titulo-lista").textContent = "Mis evaluaciones realizadas";
  } else {
    acciones.innerHTML = `
      <h2>Hola, ${perfil.nombre} (Coordinador)</h2>
      <p>Aquí ves todas las evaluaciones que hacen tus supervisores.</p>
      <a class="btn" href="editor.html">✎ Editar formulario de evaluación</a>`;
    document.getElementById("titulo-lista").textContent = "Todas las evaluaciones";
  }

  cargarLista(perfil, user.uid);
});

async function cargarLista(perfil, uid) {
  const cont = document.getElementById("lista");
  try {
    const ref = collection(db, "evaluaciones");
    // Supervisor: solo las suyas. Coordinador: todas.
    const q =
      perfil.rol === "supervisor"
        ? query(ref, where("supervisorUid", "==", uid), orderBy("createdAt", "desc"))
        : query(ref, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);
    if (snap.empty) {
      cont.innerHTML = "<p>No hay evaluaciones todavía.</p>";
      return;
    }

    let html = "";
    snap.forEach((d) => {
      const e = d.data();
      const fecha = e.createdAt?.toDate
        ? e.createdAt.toDate().toLocaleString("es-VE")
        : "";
      const prom = e.puntajes?.promedioGeneral;
      const badge = prom != null ? `${prom.toFixed(2)} / 4` : "—";
      html += `
        <div class="lista-item">
          <div>
            <strong>${e.tecnicoNombre || "(sin nombre)"}</strong>
            <div class="meta">
              ${e.area || ""} · ${e.motivo || "s/motivo"}<br>
              Supervisor: ${e.supervisorNombre || ""} · ${fecha}
            </div>
          </div>
          <span class="badge" title="Promedio general">${badge}</span>
        </div>`;
    });
    cont.innerHTML = html;
  } catch (err) {
    console.error(err);
    // Firestore pide un índice cuando combinas where + orderBy: el error trae un enlace.
    cont.innerHTML = `<div class="msg error">Error al cargar. Revisa la consola (F12).
      Si menciona un "index", abre el enlace que aparece ahí para crearlo.</div>`;
  }
}
