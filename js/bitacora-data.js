// bitacora-data.js
// Catálogos y funciones puras de validación y cálculo para la Bitácora de Supervisión.

export const ZONAS = [
  "ZONA 1",
  "ZONA 2 Y 5",
  "ZONA 3",
  "ZONA 6",
];

export const NODOS = [
  "NODO CALLAO SUR",
  "NODO CAÑADA",
  "NODO LOS PUERTOS DE ALTAGRACIA",
  "NODO CABIMAS",
  "NODO CIUDAD OJEDA",
  "NODO MENE GRANDE",
  "NODO BACHAQUERO",
  "NODO BELLA VISTA",
  "NODO POMONA",
  "NODO SAN JOSE",
  "NODO MACHIQUES",
  "NODO LAGO CARIBE",
  "NODO MARITE",
  "NODO SANTA CRUZ",
  "NODO MOJAN",
  "NODO PARAGUAIPOA",
  "NODO SAN RAFAEL",
  "NODO LAS TUNAS",
  "NODO VILLA DEL ROSARIO",
  "NODO LA CONCEPCION",
  "NODO BARRANQUITAS",
];

export const ACTIVIDADES_MACRO = [
  "GESTIÓN ADMINISTRATIVA",
  "GESTIÓN OPERATIVA (EN CAMPO)",
  "CERTIFICACION EN CAMPO",
];

export const SUBACTIVIDADES = {
  "GESTIÓN ADMINISTRATIVA": [
    "APOYO EN ALMACÉN",
    "GESTIÓN EN OZMAP",
    "GESTIÓN CON ANALISTA DE CYS",
    "GESTIÓN DE EVALUACIONES O RENOVACIÓN DE CONTRATO",
    "REUNIÓN VIA MEET O PRESENCIAL",
    "APOYO A OTRA UNIDAD",
    "GESTIÓN DE PROYECTOS ESPECIALES",
    "CAPACITACIÓN ADIESTRAMIENTO AL PERSONAL",
    "JORNADA EXTENDIDA",
    "GESTIÓN DE ACTIVIDADES ADMINISTRATIVAS",
  ],
  "GESTIÓN OPERATIVA (EN CAMPO)": [
    "INSPECCIÓN EN TRONCAL",
    "INSPECCIÓN EN SUBTRONCAL",
    "INSPECCIÓN EN MDT",
    "INSPECCIÓN DE PROYECTO ESPECIAL",
    "SUPERVISIÓN EN CAMPO",
    "APOYO A CUADRILLA EN CAMPO (PLANTA EXTERNA AVERIA MAYOR)",
    "APOYO A CUADRILLA (PLANTA INTERNA)",
    "VENTANA DE MANTENIMIENTO",
    "REUNIÓN CON PERSONAL DEL CONDOMINIO",
    "GESTIÓN DE APOYO A OTRAS UNIDADES",
  ],
  "CERTIFICACION EN CAMPO": [
    "CERTIFICACIÓN DE OBRA EN CAMPO",
    "INSPECCIÓN DE CONSTRUCCIÓN",
    "LEVANTAMIENTO DE KML",
    "LECTURA Y ANÁLISIS DE UNIFILARES",
    "ARMADO DE ODF",
    "MEDICIÓN CON OTDR",
    "FUSIÓN DE FIBRA ÓPTICA",
    "OTRO",
  ],
};

/**
 * Convierte "HH:MM" a minutos desde las 00:00.
 */
export function aMinutos(horaStr) {
  if (!horaStr || typeof horaStr !== "string") return null;
  const match = horaStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Calcula la duración en minutos de una actividad.
 * Devuelve null si el horario es inconsistente.
 */
export function calcularDuracionMinutos(inicioStr, finStr, diaSiguiente = false) {
  const ini = aMinutos(inicioStr);
  const fin = aMinutos(finStr);
  if (ini === null || fin === null) return null;

  if (diaSiguiente) {
    // Si cruza medianoche (ej: 22:00 a 02:00 -> 120 min de hoy + 120 min de mañana = 240 min)
    return (24 * 60 - ini) + fin;
  }

  if (fin <= ini) return null;
  return fin - ini;
}

/**
 * Valida consistencia y retorna mensaje amigable.
 */
export function validarHorario(inicioStr, finStr, diaSiguiente = false) {
  if (!inicioStr || !finStr) {
    return { valido: false, error: "Debes indicar tanto la hora de inicio como la de fin." };
  }
  const minutos = calcularDuracionMinutos(inicioStr, finStr, diaSiguiente);
  if (minutos === null) {
    return {
      valido: false,
      error: "La hora de fin debe ser posterior a la de inicio (o marca 'Culminó al día siguiente' si cruzó medianoche).",
    };
  }
  return { valido: true, minutos };
}

// ───────────────────────────────────────────────────────────────
// Fechas, filtros y resumen (usados por el Tablero de Bitácora)
// ───────────────────────────────────────────────────────────────

/** Fecha de hoy en formato YYYY-MM-DD, en hora local. */
export function hoyISO(fecha = new Date()) {
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Día en que ocurrió la actividad, como YYYY-MM-DD.
 * Usa el campo `fecha`; si no existe (bitácoras anteriores a esta versión),
 * cae de vuelta a `createdAt`, que es cuándo se registró, no cuándo se trabajó.
 */
export function fechaDeBitacora(b) {
  if (!b) return null;
  if (typeof b.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.fecha)) return b.fecha;

  const ts = b.createdAt;
  if (!ts) return null;
  let d = null;
  if (typeof ts.toDate === "function") d = ts.toDate();
  else if (typeof ts.seconds === "number") d = new Date(ts.seconds * 1000);
  else if (ts instanceof Date) d = ts;
  return d && !isNaN(d) ? hoyISO(d) : null;
}

/** true si la bitácora no trae fecha propia y se está infiriendo de createdAt. */
export function fechaEsInferida(b) {
  return !(b && typeof b.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.fecha));
}

/**
 * Filtra por rango de fechas (inclusivo), supervisor y zona.
 * Cualquier criterio vacío no filtra. Las bitácoras sin fecha determinable
 * se descartan solo si hay filtro de fechas.
 */
export function filtrarBitacoras(lista, { desde, hasta, supervisorUid, zona } = {}) {
  return (lista || []).filter((b) => {
    if (supervisorUid && b.supervisorUid !== supervisorUid) return false;
    if (zona && b.zona !== zona) return false;
    if (desde || hasta) {
      const f = fechaDeBitacora(b);
      if (!f) return false;
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
    }
    return true;
  });
}

/** Suma minutos y cuenta actividades agrupando por la clave que devuelva `claveFn`. */
export function agruparMinutos(lista, claveFn) {
  const acc = {};
  (lista || []).forEach((b) => {
    const clave = claveFn(b);
    if (clave === null || clave === undefined || clave === "") return;
    acc[clave] = acc[clave] || { minutos: 0, cantidad: 0 };
    acc[clave].minutos += Number(b.duracionMinutos) || 0;
    acc[clave].cantidad += 1;
  });
  return acc;
}

/** Convierte un agrupado a lista ordenada de mayor a menor por minutos. */
export function ordenarPorMinutos(agrupado) {
  return Object.entries(agrupado || {})
    .map(([clave, v]) => ({ clave, ...v }))
    .sort((a, b) => b.minutos - a.minutos || a.clave.localeCompare(b.clave));
}

/** Resumen completo para el tablero. */
export function resumirBitacoras(lista) {
  const items = lista || [];
  const minutosTotales = items.reduce((s, b) => s + (Number(b.duracionMinutos) || 0), 0);
  return {
    cantidad: items.length,
    minutosTotales,
    supervisores: new Set(items.map((b) => b.supervisorUid).filter(Boolean)).size,
    nodos: new Set(items.map((b) => b.areaTrabajo).filter(Boolean)).size,
    porTipoMacro: agruparMinutos(items, (b) => b.tipoMacro),
    porActividad: agruparMinutos(items, (b) => b.actividadEspecifica),
    porSupervisor: agruparMinutos(items, (b) => b.supervisorNombre),
    porNodo: agruparMinutos(items, (b) => b.areaTrabajo),
    porZona: agruparMinutos(items, (b) => b.zona),
  };
}

/** "2h 30m" a partir de minutos. */
export function formatoDuracion(minutos) {
  const m = Math.max(0, Math.round(Number(minutos) || 0));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

/** Columnas de la exportación a CSV de bitácoras. */
export const COLUMNAS_CSV_BITACORA = [
  { clave: "fecha", titulo: "Fecha", valor: (b) => fechaDeBitacora(b) || "" },
  { clave: "fechaInferida", titulo: "Fecha estimada", valor: (b) => (fechaEsInferida(b) ? "Sí" : "No") },
  { clave: "supervisorNombre", titulo: "Supervisor" },
  { clave: "zona", titulo: "Zona" },
  { clave: "areaTrabajo", titulo: "Área / Nodo" },
  { clave: "tipoMacro", titulo: "Tipo de actividad" },
  { clave: "actividadEspecifica", titulo: "Actividad específica" },
  { clave: "horaInicio", titulo: "Hora inicio" },
  { clave: "horaFin", titulo: "Hora fin" },
  { clave: "diaSiguiente", titulo: "Cruzó medianoche", valor: (b) => (b.diaSiguiente ? "Sí" : "No") },
  { clave: "duracionMinutos", titulo: "Minutos", valor: (b) => Number(b.duracionMinutos) || 0 },
  { clave: "horas", titulo: "Horas", valor: (b) => ((Number(b.duracionMinutos) || 0) / 60).toFixed(2) },
  { clave: "descripcion", titulo: "Descripción" },
  { clave: "numFotos", titulo: "Fotos", valor: (b) => b.numFotos ?? (b.imagenes ? b.imagenes.length : 0) },
];
