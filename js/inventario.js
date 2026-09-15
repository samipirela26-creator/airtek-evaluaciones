// inventario.js — Inventario de herramientas y materiales por técnico.
// Lo usan el supervisor (sus técnicos) y el coordinador (los de sus supervisores).
//
// Dos modelos distintos a propósito:
//  · Herramientas → un documento por técnico que se ACTUALIZA (estado de hoy).
//  · Materiales   → un documento por ENTREGA (historial de consumo).

import { db, toast, logAudit } from "./firebase.js";
import { protegerPagina } from "./session.js";
import { misSupervisores, traerPorLotes } from "./consultas.js";
import {
  HERRAMIENTAS,
  CATEGORIAS_HERRAMIENTAS,
  MATERIALES_USO_DIARIO,
  CATEGORIAS_MATERIALES,
  renglonesConDatos,
  aEntero,
} from "./inventario-data.js";
import { hoyISO } from "./bitacora-data.js";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let sesion = null;
let tecnicos = [];
let tecnicoActual = null;

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function setMsg(id, tipo, texto) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = texto ? `<div class="msg ${tipo}">${texto}</div>` : "";
}

protegerPagina(["supervisor", "coordinador"], async (s) => {
  sesion = s;
  const esCoord = s.perfil.rol === "coordinador";
  document.getElementById("sup-info").textContent = esCoord
    ? `Coordinador: ${s.perfil.nombre || s.user.email} · técnicos de todos tus supervisores`
    : `Supervisor: ${s.perfil.nombre || s.user.email}`;

  document.getElementById("fecha-entrega").value = hoyISO();
  document.getElementById("fecha-entrega").max = hoyISO();

  await cargarTecnicos(esCoord);
  vincularEventos();
});

async function cargarTecnicos(esCoord) {
  const sel = document.getElementById("sel-tecnico");
  try {
    if (esCoord) {
      const uids = (await misSupervisores(db, sesion.user.uid)).map((x) => x.uid);
      tecnicos = await traerPorLotes(db, "tecnicos", "supervisorUid", uids);
    } else {
      const snap = await getDocs(
        query(collection(db, "tecnicos"), where("supervisorUid", "==", sesion.user.uid))
      );
      tecnicos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.error(err);
    document.getElementById("sup-info").innerHTML =
      `<div class="msg error">No se pudieron cargar los técnicos: ${esc(err.message)}</div>`;
    return;
  }

  tecnicos.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  if (!tecnicos.length) {
    sel.insertAdjacentHTML("afterend",
      `<div class="lista-vacia" style="margin-top:8px">No hay técnicos registrados todavía.</div>`);
    return;
  }
  tecnicos.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.supervisorNombre && sesion.perfil.rol === "coordinador"
      ? `${t.nombre} — ${t.supervisorNombre}`
      : t.nombre;
    sel.appendChild(opt);
  });
}

// ── Pintado de las dos listas ──
function renderHerramientas(guardado) {
  const previos = new Map((guardado?.items || []).map((r) => [r.id, r]));
  const cont = document.getElementById("lista-herramientas");

  cont.innerHTML = CATEGORIAS_HERRAMIENTAS.map((cat) => {
    const items = HERRAMIENTAS.filter((h) => h.categoria === cat);
    const filas = items.map((h) => {
      const p = previos.get(h.id) || {};
      const campo = (estado, valor) => `
        <input type="number" min="0" step="1" inputmode="numeric"
               data-herr="${esc(h.id)}" data-campo="${estado}"
               value="${aEntero(valor) || ""}" placeholder="0"
               style="width:100%;min-width:56px;text-align:center" />`;
      return `
        <div class="lista-item" style="display:block">
          <div style="font-weight:600;font-size:.92rem">${esc(h.nombre)}</div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:flex-end">
            <label style="flex:1;min-width:64px;font-size:.75rem;color:#059669">Bueno${campo("bueno", p.bueno)}</label>
            <label style="flex:1;min-width:64px;font-size:.75rem;color:#d97706">Regular${campo("regular", p.regular)}</label>
            <label style="flex:1;min-width:64px;font-size:.75rem;color:#dc2626">Malo${campo("malo", p.malo)}</label>
            <div style="flex:1;min-width:64px;font-size:.75rem;color:var(--muted)">
              Total<div data-total="${esc(h.id)}" style="font-weight:700;text-align:center;padding:6px 0">0</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            ${h.serial ? `<input type="text" data-herr="${esc(h.id)}" data-campo="serial"
                 value="${esc(p.serial || "")}" placeholder="Serial"
                 style="flex:1;min-width:130px" />` : ""}
            <input type="text" data-herr="${esc(h.id)}" data-campo="observacion"
                   value="${esc(p.observacion || "")}" placeholder="Observación"
                   style="flex:2;min-width:160px" />
          </div>
        </div>`;
    }).join("");

    return `<div class="card">
      <h3 style="margin-top:0">${esc(cat)}</h3>
      ${filas}
    </div>`;
  }).join("");

  cont.querySelectorAll("input[type=number]").forEach((inp) =>
    inp.addEventListener("input", () => actualizarTotal(inp.dataset.herr))
  );
  HERRAMIENTAS.forEach((h) => actualizarTotal(h.id));

  document.getElementById("ultima-actualizacion").textContent = guardado?.actualizadoEn?.toDate
    ? `Última actualización: ${guardado.actualizadoEn.toDate().toLocaleString("es-VE")}`
    : "Este técnico todavía no tiene inventario registrado.";
  actualizarResumen();
}

function leerRenglonesHerramientas() {
  return HERRAMIENTAS.map((h) => {
    const val = (campo) => {
      const el = document.querySelector(`[data-herr="${CSS.escape(h.id)}"][data-campo="${campo}"]`);
      return el ? el.value : "";
    };
    return {
      id: h.id,
      bueno: val("bueno"),
      regular: val("regular"),
      malo: val("malo"),
      serial: val("serial"),
      observacion: val("observacion"),
    };
  });
}

function actualizarTotal(id) {
  const leer = (campo) => {
    const el = document.querySelector(`[data-herr="${CSS.escape(id)}"][data-campo="${campo}"]`);
    return aEntero(el?.value);
  };
  const total = leer("bueno") + leer("regular") + leer("malo");
  const destino = document.querySelector(`[data-total="${CSS.escape(id)}"]`);
  if (destino) destino.textContent = total;
  actualizarResumen();
}

function actualizarResumen() {
  const filas = renglonesConDatos(leerRenglonesHerramientas());
  const t = filas.reduce(
    (a, r) => ({ total: a.total + r.cantidad, bueno: a.bueno + r.bueno, regular: a.regular + r.regular, malo: a.malo + r.malo }),
    { total: 0, bueno: 0, regular: 0, malo: 0 }
  );
  const chip = (valor, label, color) => `
    <div style="flex:1;min-width:88px;background:${color};color:#fff;border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:1.3rem;font-weight:800">${valor}</div>
      <div style="font-size:.72rem;opacity:.9">${label}</div>
    </div>`;
  document.getElementById("resumen-herramientas").innerHTML =
    `<div style="display:flex;gap:8px;flex-wrap:wrap">
      ${chip(t.total, "Unidades", "#374151")}
      ${chip(t.bueno, "Buenas", "#059669")}
      ${chip(t.regular, "Regulares", "#d97706")}
      ${chip(t.malo, "Malas", "#dc2626")}
    </div>`;
}

function renderMateriales() {
  document.getElementById("lista-materiales").innerHTML = CATEGORIAS_MATERIALES.map((cat) => {
    const items = MATERIALES_USO_DIARIO.filter((m) => m.categoria === cat);
    const filas = items.map((m) => `
      <div class="lista-item" style="display:flex;gap:10px;align-items:center">
        <div style="flex:1">
          <div style="font-weight:600;font-size:.88rem">${esc(m.nombre)}</div>
          <div class="meta" style="font-size:.72rem">${esc(m.id)}</div>
        </div>
        <input type="number" min="0" step="1" inputmode="numeric"
               data-mat="${esc(m.id)}" placeholder="0"
               style="width:86px;text-align:center" />
      </div>`).join("");
    return `<div class="card"><h3 style="margin-top:0">${esc(cat)}</h3>${filas}</div>`;
  }).join("");
}

// ── Carga y guardado ──
async function seleccionarTecnico(id) {
  tecnicoActual = tecnicos.find((t) => t.id === id) || null;
  const hayTecnico = !!tecnicoActual;
  document.getElementById("pestanas").style.display = hayTecnico ? "flex" : "none";
  document.getElementById("panel-herramientas").style.display = "none";
  document.getElementById("panel-materiales").style.display = "none";
  if (!hayTecnico) return;

  let guardado = null;
  try {
    const snap = await getDoc(doc(db, "inventario_herramientas", id));
    guardado = snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error(err);
    setMsg("msg-herramientas", "error", `No se pudo leer el inventario: ${esc(err.message)}`);
  }

  renderHerramientas(guardado);
  renderMateriales();
  await cargarHistorialEntregas(id);
  mostrarPestana("herramientas");
}

async function cargarHistorialEntregas(tecnicoId) {
  const cont = document.getElementById("historial-entregas");
  cont.textContent = "Cargando…";
  try {
    const snap = await getDocs(
      query(collection(db, "inventario_materiales"), where("tecnicoId", "==", tecnicoId))
    );
    const entregas = snap.docs
      .map((d) => d.data())
      .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
      .slice(0, 10);

    cont.innerHTML = entregas.length
      ? entregas.map((e) => {
          const total = (e.items || []).reduce((s, i) => s + aEntero(i.cantidad), 0);
          const detalle = (e.items || [])
            .map((i) => `${esc(i.nombre)} × ${aEntero(i.cantidad)}`)
            .join(" · ");
          return `<div class="lista-item" style="display:block">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <strong>📅 ${esc(e.fecha || "sin fecha")}</strong>
              <span class="badge">${total} und.</span>
            </div>
            <div class="meta" style="margin-top:4px">${detalle}</div>
            ${e.nota ? `<div class="meta" style="margin-top:4px">📝 ${esc(e.nota)}</div>` : ""}
          </div>`;
        }).join("")
      : `<div class="lista-vacia">Sin entregas registradas.</div>`;
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">No se pudo cargar el historial: ${esc(err.message)}</div>`;
  }
}

function mostrarPestana(cual) {
  const esHerr = cual === "herramientas";
  document.getElementById("panel-herramientas").style.display = esHerr ? "block" : "none";
  document.getElementById("panel-materiales").style.display = esHerr ? "none" : "block";
  document.getElementById("tab-herramientas").className = esHerr ? "btn" : "btn secundario";
  document.getElementById("tab-materiales").className = esHerr ? "btn secundario" : "btn";
}

async function guardarHerramientas() {
  if (!tecnicoActual) return;
  const btn = document.getElementById("btn-guardar-herramientas");
  const items = renglonesConDatos(leerRenglonesHerramientas());

  setMsg("msg-herramientas", "", "");
  btn.disabled = true;
  btn.textContent = "Guardando…";
  try {
    await setDoc(doc(db, "inventario_herramientas", tecnicoActual.id), {
      tecnicoId: tecnicoActual.id,
      tecnicoNombre: tecnicoActual.nombre || "",
      supervisorUid: tecnicoActual.supervisorUid,
      supervisorNombre: tecnicoActual.supervisorNombre || "",
      coordinadorUid: sesion.perfil.rol === "coordinador"
        ? sesion.user.uid
        : (sesion.perfil.coordinadorUid || null),
      items,
      actualizadoPor: sesion.user.uid,
      actualizadoEn: serverTimestamp(),
    });
    logAudit("inventario_herramientas_guardado", {
      tecnico: tecnicoActual.nombre,
      renglones: items.length,
    });
    toast("Inventario de herramientas guardado ✓");
    setMsg("msg-herramientas", "ok", `Guardado: ${items.length} ${items.length === 1 ? "renglón" : "renglones"} con unidades.`);
    document.getElementById("ultima-actualizacion").textContent =
      `Última actualización: ${new Date().toLocaleString("es-VE")}`;
  } catch (err) {
    console.error(err);
    setMsg("msg-herramientas", "error", `No se pudo guardar: ${esc(err.message)}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar inventario de herramientas ✓";
  }
}

async function guardarMateriales() {
  if (!tecnicoActual) return;
  const fecha = document.getElementById("fecha-entrega").value;
  const nota = document.getElementById("nota-entrega").value.trim();
  setMsg("msg-materiales", "", "");

  if (!fecha) {
    setMsg("msg-materiales", "error", "Indica la fecha de la entrega.");
    return;
  }
  if (fecha > hoyISO()) {
    setMsg("msg-materiales", "error", "La fecha de entrega no puede ser futura.");
    return;
  }

  const items = MATERIALES_USO_DIARIO
    .map((m) => {
      const el = document.querySelector(`[data-mat="${CSS.escape(m.id)}"]`);
      return { id: m.id, nombre: m.nombre, categoria: m.categoria, cantidad: aEntero(el?.value) };
    })
    .filter((i) => i.cantidad > 0);

  if (!items.length) {
    setMsg("msg-materiales", "error", "Indica la cantidad de al menos un material.");
    return;
  }

  const btn = document.getElementById("btn-guardar-materiales");
  btn.disabled = true;
  btn.textContent = "Registrando…";
  try {
    await addDoc(collection(db, "inventario_materiales"), {
      tecnicoId: tecnicoActual.id,
      tecnicoNombre: tecnicoActual.nombre || "",
      supervisorUid: tecnicoActual.supervisorUid,
      supervisorNombre: tecnicoActual.supervisorNombre || "",
      coordinadorUid: sesion.perfil.rol === "coordinador"
        ? sesion.user.uid
        : (sesion.perfil.coordinadorUid || null),
      fecha,
      nota,
      items,
      registradoPor: sesion.user.uid,
      createdAt: serverTimestamp(),
    });
    logAudit("inventario_material_entregado", { tecnico: tecnicoActual.nombre, renglones: items.length });
    toast("Entrega registrada ✓");
    setMsg("msg-materiales", "ok", "Entrega registrada.");
    document.querySelectorAll("[data-mat]").forEach((el) => { el.value = ""; });
    document.getElementById("nota-entrega").value = "";
    await cargarHistorialEntregas(tecnicoActual.id);
  } catch (err) {
    console.error(err);
    setMsg("msg-materiales", "error", `No se pudo registrar: ${esc(err.message)}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Registrar entrega ✓";
  }
}

function vincularEventos() {
  document.getElementById("sel-tecnico").addEventListener("change", (e) => seleccionarTecnico(e.target.value));
  document.getElementById("tab-herramientas").addEventListener("click", () => mostrarPestana("herramientas"));
  document.getElementById("tab-materiales").addEventListener("click", () => mostrarPestana("materiales"));
  document.getElementById("btn-guardar-herramientas").addEventListener("click", guardarHerramientas);
  document.getElementById("btn-guardar-materiales").addEventListener("click", guardarMateriales);
}
