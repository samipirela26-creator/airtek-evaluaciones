// plantilla.js
// El formulario NO está fijo en el HTML: se describe aquí como datos.
// PLANTILLA_DEFAULT es el punto de partida. El coordinador puede guardar su
// propia versión en Firebase (plantillas/activa) y la app la lee de ahí.

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Escalas reutilizables. Cada opción tiene una etiqueta y un valor numérico
// (para poder calcular puntajes). "No Aplica" usa valor null: no cuenta.
export const ESCALAS = {
  calidad: [
    { label: "Mala", valor: 1 },
    { label: "Regular", valor: 4 },
    { label: "Buena", valor: 7 },
    { label: "Excelente", valor: 10 },
  ],
  nivel: [
    { label: "Ninguno", valor: 1 },
    { label: "Basico", valor: 4 },
    { label: "Intermedio", valor: 7 },
    { label: "Avanzado", valor: 10 },
  ],
  calidadNA: [
    { label: "Mala", valor: 1 },
    { label: "Regular", valor: 4 },
    { label: "Buena", valor: 7 },
    { label: "Excelente", valor: 10 },
    { label: "No Aplica", valor: null },
  ],
};

export const PLANTILLA_DEFAULT = {
  id: "default",
  nombre: "Evaluación de Desempeño Técnico - Airtek",
  version: 1,

  // 1) Datos generales del encabezado
  datos: [
    { id: "tecnicoNombre", label: "Nombre del Técnico a Evaluar", tipo: "text", requerido: true },
    { id: "fechaHora", label: "Fecha y Hora", tipo: "datetime-local", requerido: true },
    { id: "ordenTrabajo", label: "Orden de Trabajo", tipo: "text", requerido: true },
    {
      id: "area",
      label: "Área de Trabajo (Centro donde desempeña sus labores)",
      tipo: "select",
      requerido: true,
      opciones: ["Nodo Bella Vista", "Nodo Pomona", "Nodo Machiques y San José"],
    },
    {
      id: "motivo",
      label: "Motivo de evaluación del Colaborador",
      tipo: "select",
      requerido: false,
      opciones: [
        "Periodo 3 Meses",
        "Periodo 6 Meses",
        "Contrato Indeterminado",
        "Promoción de Cargo",
        "Periódica",
      ],
    },
  ],

  // 2) Secciones con preguntas puntuadas por escala
  secciones: [
    {
      id: "personales",
      titulo: "Aspectos Personales (Disciplina y Meritocracia)",
      escala: "calidad",
      preguntas: [
        "Presencia Personal (Uso de Botas, Uniforme y Carnet)",
        "Cumple con las Normativas de la Empresa (Puntualidad, Respeto, Responsabilidad y Trabajo en Equipo)",
        "Capacidad para Resolución de Problemas (Técnicos y de Atención al Cliente)",
        "Disposición para el uso correcto de las Aplicaciones Administrativas (Sigo, Odoo, Ozsurvey, Ozmap, Google Earth)",
        "Meritocracia (Productividad, Iniciativa, Cumplimiento de Metas, Actitud y Participación)",
      ],
    },
    {
      id: "tecnicos",
      titulo: "Aspectos Técnicos (Conocimiento, Administración de Recursos, Cantidad y Calidad del Trabajo)",
      escala: "calidad",
      preguntas: [
        "Uso de los implementos de seguridad (Manejo adecuado)",
        "Cumplen con el estándar de calidad de Airtek (Rango de Potencia, Estética, Ubicación y Configuración de equipos)",
        "Documentación correcta de las ordenes (Odoo y Sigo)",
        "Solicitud de Materiales (Realiza la solicitud en los tiempos establecidos)",
        "Utiliza los Materiales y Equipos de Manera adecuada (Administración de Recursos)",
        "Cumplimiento de las asignaciones diarias en los tiempos previstos",
        "Conocimiento en la Red Primaria (Nodo, Torpedo, MDT y NAP - Troncales, Sub Troncales y Cables de Distribución)",
        "Conocimiento en la Red Secundaria (Ultima Milla)",
        "Conocimiento de Dispositivos de Red (Router, Repetidores, Switch)",
      ],
    },
    {
      id: "avanzados",
      titulo: "Aspectos Técnicos Avanzados (Equipo y Análisis)",
      escala: "nivel",
      preguntas: [
        "Conocimiento del OTDR y Análisis de los Gráficos de Medición",
        "Conocimiento del uso de la Maquina fusionadora",
        "Lectura y Análisis de Unifilares",
        "Armados de ODF",
      ],
    },
    {
      id: "atencion",
      titulo: "Aspectos de Atención y Servicio al Cliente",
      escala: "calidadNA",
      preguntas: [
        "Protocolo de Comunicación con el cliente (Desde la llamada de contacto hasta el cierre de la orden)",
        "Atiende las inquietudes del cliente de forma respetuosa y amable",
        "Solicita al cliente de manera atenta y respetuosa los motivos del requerimiento de la visita",
      ],
    },
  ],

  // 3) Pregunta Sí/No
  siNo: {
    id: "conoceCanales",
    label:
      "Conoce el técnico nuestros canales de Atención (Solicitud de Servicio, Métodos de Pago, Tlf de Atención, Horarios y Ubicación nuestras Sedes)",
  },
};

// Devuelve las columnas de calificación de una sección.
// Soporta el formato nuevo (sec.opciones: [{label, valor}]) y el viejo
// (sec.escala: "calidad" que apunta a ESCALAS), para no romper lo ya guardado.
export function opcionesDeSeccion(sec) {
  if (Array.isArray(sec.opciones) && sec.opciones.length) return sec.opciones;
  if (sec.escala && ESCALAS[sec.escala]) return ESCALAS[sec.escala];
  return ESCALAS.calidad;
}

// Lee la plantilla vigente desde Firebase (documento plantillas/activa).
// Si el coordinador aún no ha guardado ninguna, usa PLANTILLA_DEFAULT.
export async function cargarPlantillaActiva(db) {
  try {
    const snap = await getDoc(doc(db, "plantillas", "activa"));
    if (snap.exists()) return snap.data();
  } catch (err) {
    console.warn("No se pudo leer la plantilla activa, usando la de por defecto:", err);
  }
  return PLANTILLA_DEFAULT;
}

// Todos los formularios que un coordinador creó.
export async function cargarPlantillasDeCoordinador(db, coordinadorUid) {
  if (!coordinadorUid) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "plantillas"), where("coordinadorUid", "==", coordinadorUid))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  } catch (err) {
    console.warn("No se pudieron cargar los formularios:", err);
    return [];
  }
}
