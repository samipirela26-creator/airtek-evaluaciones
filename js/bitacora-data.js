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
