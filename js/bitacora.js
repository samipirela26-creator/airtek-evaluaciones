// bitacora.js — Controlador de Bitácora de Supervisión (Paso 1 y Paso 2).
import { db, toast, logAudit } from "./firebase.js";
import { protegerPagina } from "./session.js";
import {
  ZONAS,
  NODOS,
  ACTIVIDADES_MACRO,
  SUBACTIVIDADES,
  validarHorario,
  hoyISO,
} from "./bitacora-data.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let sesion = null;
let fotosBase64 = []; // Guarda las imágenes comprimidas en Base64

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setMsg(elemId, tipo, texto) {
  const el = document.getElementById(elemId);
  if (!el) return;
  el.innerHTML = texto ? `<div class="msg ${tipo}">${texto}</div>` : "";
}

// ── Inicialización y protección de sesión ──
protegerPagina("supervisor", (s) => {
  sesion = s;
  document.getElementById("sup-info").textContent = `Supervisor: ${sesion.perfil.nombre || sesion.user.email}`;
  document.getElementById("campo-supervisor").value = sesion.perfil.nombre || sesion.user.email;

  poblarSelectores();
  inicializarFecha();
  vincularEventos();
});

// ── Fecha de la actividad: hoy por defecto, sin permitir futuro ──
function inicializarFecha() {
  const campo = document.getElementById("fecha-actividad");
  if (!campo) return;
  const hoy = hoyISO();
  campo.value = hoy;
  campo.max = hoy;
}

// El tope se fija al cargar la página. Si el supervisor deja la pestaña abierta
// y cruza la medianoche, "hoy" cambia y el tope queda viejo: se recalcula cada
// vez que vuelve a la pestaña.
function refrescarTopeFecha() {
  const campo = document.getElementById("fecha-actividad");
  if (!campo) return;
  campo.max = hoyISO();
}

// ── Poblar catálogos en el DOM ──
function poblarSelectores() {
  // 1. Zonas (Radio inputs)
  const contZonas = document.getElementById("zona-opciones");
  contZonas.innerHTML = ZONAS.map(
    (z, i) => `
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:400">
        <input type="radio" name="zona" value="${esc(z)}" ${i === 0 ? "checked" : ""} required />
        <span>${esc(z)}</span>
      </label>`
  ).join("");

  // 2. Tipo Macro
  const selTipo = document.getElementById("tipo-macro");
  ACTIVIDADES_MACRO.forEach((macro) => {
    const opt = document.createElement("option");
    opt.value = macro;
    opt.textContent = macro;
    selTipo.appendChild(opt);
  });

  // 3. Área de trabajo (Nodos)
  const selNodo = document.getElementById("area-trabajo");
  NODOS.forEach((nodo) => {
    const opt = document.createElement("option");
    opt.value = nodo;
    opt.textContent = nodo;
    selNodo.appendChild(opt);
  });
}

// ── Actualizar opciones del Paso 2 según el Tipo Macro ──
function actualizarSubactividades(tipoMacro) {
  const selSub = document.getElementById("actividad-especifica");
  selSub.innerHTML = `<option value="">-- Selecciona la actividad específica --</option>`;

  const lista = SUBACTIVIDADES[tipoMacro] || [];
  lista.forEach((sub) => {
    const opt = document.createElement("option");
    opt.value = sub;
    opt.textContent = sub;
    selSub.appendChild(opt);
  });
}

// ── Compresión de imágenes en el cliente mediante Canvas nativo ──
async function comprimirImagen(file, maxDimension = 1200, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        // Formato JPEG optimizado
        const dataUrl = canvas.toDataURL("image/jpeg", calidad);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderPreviewFotos() {
  const cont = document.getElementById("preview-fotos");
  if (!cont) return;
  cont.innerHTML = fotosBase64
    .map(
      (src, index) => `
        <div style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--borde);box-shadow:var(--sombra)">
          <img src="${src}" style="width:100%;height:100%;object-fit:cover" alt="Evidencia ${index + 1}" />
          <button type="button" data-del-foto="${index}" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.65);color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">✕</button>
        </div>`
    )
    .join("");

  cont.querySelectorAll("[data-del-foto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.delFoto, 10);
      fotosBase64.splice(idx, 1);
      renderPreviewFotos();
    });
  });
}

function actualizarDuracionHint() {
  const ini = document.getElementById("hora-inicio").value;
  const fin = document.getElementById("hora-fin").value;
  const diaSig = document.getElementById("dia-siguiente").checked;
  const hint = document.getElementById("duracion-hint");

  if (!ini || !fin) {
    hint.textContent = "";
    return;
  }
  const res = validarHorario(ini, fin, diaSig);
  if (res.valido) {
    const horas = Math.floor(res.minutos / 60);
    const mins = res.minutos % 60;
    hint.textContent = `⏱ Duración estimada: ${horas > 0 ? `${horas}h ` : ""}${mins}m (${res.minutos} minutos)`;
    hint.style.color = "var(--azul)";
  } else {
    hint.textContent = `⚠ ${res.error}`;
    hint.style.color = "var(--error)";
  }
}

// ── Manejo de eventos del formulario ──
function vincularEventos() {
  const selTipo = document.getElementById("tipo-macro");
  selTipo.addEventListener("change", (e) => {
    actualizarSubactividades(e.target.value);
  });

  // Paso 1 -> Siguiente
  document.getElementById("btn-siguiente").addEventListener("click", () => {
    setMsg("msg-paso-1", "", "");
    const zonaChecked = document.querySelector("input[name='zona']:checked");
    const tipoMacro = selTipo.value;
    const area = document.getElementById("area-trabajo").value;

    if (!zonaChecked) {
      setMsg("msg-paso-1", "error", "Debes seleccionar una zona.");
      return;
    }
    if (!tipoMacro) {
      setMsg("msg-paso-1", "error", "Debes seleccionar el Tipo de Actividad macro.");
      selTipo.focus();
      return;
    }
    if (!area) {
      setMsg("msg-paso-1", "error", "Debes seleccionar el Área de Trabajo (nodo).");
      document.getElementById("area-trabajo").focus();
      return;
    }

    // Transición a Paso 2
    document.getElementById("titulo-paso-2").textContent = tipoMacro;
    document.getElementById("paso-1").style.display = "none";
    document.getElementById("paso-2").style.display = "block";
    document.getElementById("paso-indicador").textContent = "Paso 2 de 2: Detalle Operativo y Horario";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Paso 2 -> Atrás
  document.getElementById("btn-atras").addEventListener("click", () => {
    setMsg("msg-paso-2", "", "");
    document.getElementById("paso-2").style.display = "none";
    document.getElementById("paso-1").style.display = "block";
    document.getElementById("paso-indicador").textContent = "Paso 1 de 2: Ubicación y Clasificación Macro";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refrescarTopeFecha();
  });

  // Monitoreo de horarios para cálculo reactivo
  document.getElementById("hora-inicio").addEventListener("input", actualizarDuracionHint);
  document.getElementById("hora-fin").addEventListener("input", actualizarDuracionHint);
  document.getElementById("dia-siguiente").addEventListener("change", actualizarDuracionHint);

  // Carga de imágenes con compresión
  document.getElementById("fotos").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (fotosBase64.length + files.length > 5) {
      toast("Solo puedes adjuntar hasta 5 imágenes en total.", { ms: 4000 });
      e.target.value = "";
      return;
    }

    toast("Optimizando imágenes…", { ms: 2000 });
    for (const f of files) {
      if (!f.type.startsWith("image/")) {
        toast(`El archivo "${f.name}" no es una imagen válida.`, { ms: 4000 });
        continue;
      }
      try {
        const base64 = await comprimirImagen(f);
        fotosBase64.push(base64);
      } catch (err) {
        console.error("Error al comprimir foto:", err);
        toast(`No se pudo procesar ${f.name}`, { ms: 4000 });
      }
    }
    e.target.value = "";
    renderPreviewFotos();
  });

  // Envío del formulario
  document.getElementById("form-bitacora").addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("msg-paso-2", "", "");

    const zonaChecked = document.querySelector("input[name='zona']:checked");
    const tipoMacro = selTipo.value;
    const area = document.getElementById("area-trabajo").value;
    const subActividad = document.getElementById("actividad-especifica").value;
    const horaInicio = document.getElementById("hora-inicio").value;
    const horaFin = document.getElementById("hora-fin").value;
    const diaSiguiente = document.getElementById("dia-siguiente").checked;
    const descripcion = document.getElementById("descripcion").value.trim();
    const fecha = document.getElementById("fecha-actividad").value;

    if (!fecha) {
      setMsg("msg-paso-2", "error", "Debes indicar la fecha de la actividad.");
      document.getElementById("fecha-actividad").focus();
      return;
    }
    if (fecha > hoyISO()) {
      setMsg("msg-paso-2", "error", "La fecha de la actividad no puede ser futura.");
      document.getElementById("fecha-actividad").focus();
      return;
    }
    if (!subActividad) {
      setMsg("msg-paso-2", "error", "Debes seleccionar la actividad específica.");
      document.getElementById("actividad-especifica").focus();
      return;
    }
    const valHorario = validarHorario(horaInicio, horaFin, diaSiguiente);
    if (!valHorario.valido) {
      setMsg("msg-paso-2", "error", valHorario.error);
      return;
    }
    if (!descripcion) {
      setMsg("msg-paso-2", "error", "Debes ingresar una descripción detallada de la actividad.");
      document.getElementById("descripcion").focus();
      return;
    }

    // Persistencia en Firestore
    const btnEnviar = document.getElementById("btn-enviar");
    btnEnviar.disabled = true;
    btnEnviar.textContent = "Guardando bitácora…";

    try {
      const docData = {
        supervisorUid: sesion.user.uid,
        supervisorNombre: sesion.perfil.nombre || sesion.user.email,
        coordinadorUid: sesion.perfil.coordinadorUid || null,
        fecha,
        zona: zonaChecked ? zonaChecked.value : "",
        tipoMacro,
        areaTrabajo: area,
        actividadEspecifica: subActividad,
        horaInicio,
        horaFin,
        diaSiguiente,
        duracionMinutos: valHorario.minutos,
        descripcion,
        imagenes: fotosBase64,
        numFotos: fotosBase64.length,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "bitacoras"), docData);
      logAudit("bitacora_creada", {
        tipoMacro,
        actividadEspecifica: subActividad,
        supervisor: sesion.perfil.nombre,
      });

      toast("Bitácora guardada con éxito ✓");

      // Mostrar pantalla de éxito
      document.getElementById("form-bitacora").style.display = "none";
      document.getElementById("paso-indicador").style.display = "none";
      document.getElementById("box-exito").style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error al guardar bitácora:", err);
      setMsg("msg-paso-2", "error", `No se pudo guardar la bitácora: ${err.message}`);
      btnEnviar.disabled = false;
      btnEnviar.textContent = "Enviar bitácora ✓";
    }
  });

  // Botón "Registrar otra actividad"
  document.getElementById("btn-otra").addEventListener("click", () => {
    // Reset de campos de paso 2
    document.getElementById("actividad-especifica").value = "";
    document.getElementById("hora-inicio").value = "";
    document.getElementById("hora-fin").value = "";
    document.getElementById("dia-siguiente").checked = false;
    document.getElementById("duracion-hint").textContent = "";
    document.getElementById("descripcion").value = "";
    inicializarFecha();
    fotosBase64 = [];
    renderPreviewFotos();

    const btnEnviar = document.getElementById("btn-enviar");
    btnEnviar.disabled = false;
    btnEnviar.textContent = "Enviar bitácora ✓";

    setMsg("msg-paso-1", "", "");
    setMsg("msg-paso-2", "", "");

    // Volver a Paso 1
    document.getElementById("box-exito").style.display = "none";
    document.getElementById("paso-indicador").style.display = "block";
    document.getElementById("paso-indicador").textContent = "Paso 1 de 2: Ubicación y Clasificación Macro";
    document.getElementById("paso-2").style.display = "none";
    document.getElementById("paso-1").style.display = "block";
    document.getElementById("form-bitacora").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
