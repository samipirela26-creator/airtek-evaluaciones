// seed.js — Datos de ejemplo para la PREVISUALIZACIÓN LOCAL (no toca Firebase real).
// Estructura: { coleccion: { docId: {campos...} } }. Los timestamps imitan a
// Firestore con un método .toDate().

const ts = (diasAtras = 0) => {
  const d = new Date(2026, 7, 26 - diasAtras, 10, 0, 0); // agosto = mes 7
  return { toDate: () => d, seconds: Math.floor(d.getTime() / 1000) };
};

// Firma de ejemplo (PNG 1x1 transparente): suficiente para que el detalle/PDF no falle.
const FIRMA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC";

// Escala nueva reutilizable para snapshots.
const CAL = [
  { label: "Mala", valor: 0 }, { label: "Regular", valor: 6 },
  { label: "Buena", valor: 8 }, { label: "Excelente", valor: 10 },
];

function snapshot(nombre) {
  return {
    nombre,
    siNo: { id: "conoceCanales", label: "¿Conoce los canales de atención de Airtek?" },
    secciones: [
      { id: "personales", titulo: "Aspectos Personales", opciones: CAL,
        preguntas: ["Presencia personal (uniforme, carnet)", "Puntualidad y responsabilidad", "Resolución de problemas"] },
      { id: "tecnicos", titulo: "Aspectos Técnicos", opciones: CAL,
        preguntas: ["Estándar de calidad Airtek", "Documentación de órdenes", "Uso de materiales"] },
    ],
  };
}

function evaluacion({ id, tecnico, tid, sup, dias, gen, sec }) {
  return {
    id, tecnicoNombre: tecnico, tecnicoId: tid,
    supervisorUid: sup, supervisorNombre: sup === "u_sup1" ? "Supervisor Uno" : "Supervisor Dos",
    fechaHora: "2026-08-" + String(26 - dias).padStart(2, "0") + "T10:00",
    ordenTrabajo: "OT-" + (1000 + Number(id.replace(/\D/g, "") || 0)),
    area: "Nodo Bella Vista", motivo: "Periódica",
    respuestas: { personales: ["Buena", "Excelente", "Buena"], tecnicos: ["Buena", "Regular", "Excelente"] },
    observaciones: { personales: "Buen desempeño general.", tecnicos: "Mejorar documentación." },
    conoceCanales: "Si",
    puntajes: { promedioGeneral: gen, porSeccion: sec },
    firmaSupervisor: FIRMA, firmaTecnico: FIRMA,
    plantillaId: "default", plantillaVersion: 1,
    plantillaSnapshot: snapshot("Evaluación de Aspectos Generales (Inspección Técnica en Campo)"),
    createdAt: ts(dias),
  };
}

export const SEED = {
  usuarios: {
    u_root: { nombre: "Samuel (Root)", rol: "root", activo: true, correo: "samuel@demo.airtek" },
    u_coord: { nombre: "Carlos (Coordinador)", rol: "coordinador", activo: true, rootUid: "u_root", correo: "carlos@demo.airtek" },
    u_sup1: { nombre: "Supervisor Uno", rol: "supervisor", activo: true, coordinadorUid: "u_coord", correo: "sup1@demo.airtek" },
    u_sup2: { nombre: "Supervisor Dos", rol: "supervisor", activo: true, coordinadorUid: "u_coord", correo: "sup2@demo.airtek" },
  },

  tecnicos: {
    t_1: { nombre: "Juan Pérez", supervisorUid: "u_sup1", coordinadorUid: "u_coord", activo: true },
    t_2: { nombre: "María Gómez", supervisorUid: "u_sup1", coordinadorUid: "u_coord", activo: true },
    t_3: { nombre: "Luis Rodríguez", supervisorUid: "u_sup2", coordinadorUid: "u_coord", activo: true },
  },

  plantillas: {
    // Formulario personalizado con la ESCALA VIEJA (1/4/7/10), para probar la migración.
    p_old: {
      nombre: "Evaluación Express (escala vieja)", tipo: "tecnico", version: 2,
      coordinadorUid: "u_coord", actualizadaPor: "Carlos (Coordinador)", actualizadaEn: ts(20),
      datos: [], siNo: { id: "conoceCanales", label: "" },
      secciones: [
        { id: "s1", titulo: "Desempeño", opciones: [
          { label: "Mala", valor: 1 }, { label: "Regular", valor: 4 },
          { label: "Buena", valor: 7 }, { label: "Excelente", valor: 10 },
        ], preguntas: ["Cumple metas", "Actitud"] },
      ],
    },
    // Formulario personalizado ya con la escala nueva.
    p_new: {
      nombre: "Evaluación de Seguridad", tipo: "tecnico", version: 1,
      coordinadorUid: "u_coord", actualizadaPor: "Carlos (Coordinador)", actualizadaEn: ts(3),
      datos: [], siNo: { id: "conoceCanales", label: "" },
      secciones: [
        { id: "s1", titulo: "Seguridad", opciones: CAL, preguntas: ["Uso de EPP", "Manejo de alturas"] },
      ],
    },
  },

  evaluaciones: {
    e_1: evaluacion({ id: "e_1", tecnico: "Juan Pérez", tid: "t_1", sup: "u_sup1", dias: 20, gen: 6.4, sec: { personales: 7.3, tecnicos: 5.5 } }),
    e_2: evaluacion({ id: "e_2", tecnico: "Juan Pérez", tid: "t_1", sup: "u_sup1", dias: 10, gen: 7.6, sec: { personales: 8.0, tecnicos: 7.2 } }),
    e_3: evaluacion({ id: "e_3", tecnico: "Juan Pérez", tid: "t_1", sup: "u_sup1", dias: 2, gen: 8.4, sec: { personales: 8.7, tecnicos: 8.0 } }),
    e_4: evaluacion({ id: "e_4", tecnico: "María Gómez", tid: "t_2", sup: "u_sup1", dias: 5, gen: 7.0, sec: { personales: 7.3, tecnicos: 6.7 } }),
    e_5: evaluacion({ id: "e_5", tecnico: "Luis Rodríguez", tid: "t_3", sup: "u_sup2", dias: 4, gen: 9.0, sec: { personales: 9.3, tecnicos: 8.7 } }),
  },

  invitaciones: {
    inv_1: { correo: "", rol: "supervisor", creadorUid: "u_coord", creadorNombre: "Carlos (Coordinador)",
      usada: false, expiraEnMs: 2026 * 0 + new Date(2026, 8, 30).getTime(), createdAt: ts(1) },
  },

  auditoria: {
    a_1: { accion: "formulario_guardado", uid: "u_coord", nombre: "Carlos (Coordinador)",
      detalle: { nombre: "Evaluación de Seguridad" }, en: ts(3) },
    a_2: { accion: "evaluacion_creada", uid: "u_sup1", nombre: "Supervisor Uno",
      detalle: { tecnico: "Juan Pérez" }, en: ts(2) },
  },
};
