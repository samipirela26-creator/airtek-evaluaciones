// seed.js — Datos de ejemplo para la PREVISUALIZACIÓN LOCAL (no toca Firebase real).
// Estructura: { coleccion: { docId: {campos...} } }. Los timestamps imitan a
// Firestore con un método .toDate().

// Un día del mes en curso, para que el filtro por defecto del tablero
// (mes actual) siempre encuentre datos sin importar cuándo se abra.
const diaDeEsteMes = (dia) => {
  const h = new Date();
  return [h.getFullYear(), String(h.getMonth() + 1).padStart(2, "0"), String(dia).padStart(2, "0")].join("-");
};

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
    siNo: { id: "conoceCanales", label: "¿Conoce los canales de atención de GESTO?" },
    secciones: [
      { id: "personales", titulo: "Aspectos Personales", opciones: CAL,
        preguntas: ["Presencia personal (uniforme, carnet)", "Puntualidad y responsabilidad", "Resolución de problemas"] },
      { id: "tecnicos", titulo: "Aspectos Técnicos", opciones: CAL,
        preguntas: ["Estándar de calidad GESTO", "Documentación de órdenes", "Uso de materiales"] },
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


// Bitácoras de ejemplo (fecha real de la actividad + duración ya calculada).
function bitacora({ id, sup, fecha, zona, nodo, macro, act, ini, fin, min, desc }) {
  return {
    id, supervisorUid: sup,
    supervisorNombre: sup === "u_sup1" ? "Supervisor Uno" : "Supervisor Dos",
    coordinadorUid: "u_coord",
    fecha, zona, areaTrabajo: nodo, tipoMacro: macro, actividadEspecifica: act,
    horaInicio: ini, horaFin: fin, diaSiguiente: false, duracionMinutos: min,
    descripcion: desc, imagenes: [], numFotos: 0, createdAt: ts(0),
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

  bitacoras: {
    b_1: bitacora({ id: "b_1", sup: "u_sup1", fecha: diaDeEsteMes(2), zona: "ZONA 1", nodo: "NODO CABIMAS",
      macro: "GESTIÓN OPERATIVA (EN CAMPO)", act: "INSPECCIÓN EN TRONCAL", ini: "08:00", fin: "12:30", min: 270,
      desc: "Inspección de troncal principal, se detectó reserva mal asegurada." }),
    b_2: bitacora({ id: "b_2", sup: "u_sup1", fecha: diaDeEsteMes(4), zona: "ZONA 1", nodo: "NODO CABIMAS",
      macro: "GESTIÓN ADMINISTRATIVA", act: "REUNIÓN VIA MEET O PRESENCIAL", ini: "09:00", fin: "10:00", min: 60,
      desc: "Reunión semanal de coordinación con el analista de CyS." }),
    b_3: bitacora({ id: "b_3", sup: "u_sup1", fecha: diaDeEsteMes(6), zona: "ZONA 3", nodo: "NODO POMONA",
      macro: "CERTIFICACION EN CAMPO", act: "MEDICIÓN CON OTDR", ini: "13:00", fin: "17:00", min: 240,
      desc: "Certificación de 12 hilos en el tramo nuevo. Todo dentro de norma." }),
    b_4: bitacora({ id: "b_4", sup: "u_sup2", fecha: diaDeEsteMes(1), zona: "ZONA 6", nodo: "NODO MACHIQUES",
      macro: "GESTIÓN OPERATIVA (EN CAMPO)", act: "APOYO A CUADRILLA EN CAMPO (PLANTA EXTERNA AVERIA MAYOR)",
      ini: "06:00", fin: "14:00", min: 480, desc: "Avería mayor por poste tumbado. Se repuso el tramo completo." }),
    b_5: bitacora({ id: "b_5", sup: "u_sup2", fecha: diaDeEsteMes(8), zona: "ZONA 6", nodo: "NODO MACHIQUES",
      macro: "GESTIÓN ADMINISTRATIVA", act: "CAPACITACIÓN ADIESTRAMIENTO AL PERSONAL", ini: "08:00", fin: "11:00", min: 180,
      desc: "Capacitación de fusión a dos técnicos nuevos." }),
    // Jornada nocturna: arranca a las 22:00 y termina a las 02:00 del día
    // siguiente. Sirve para ver el aviso de cómo se cuentan en el tablero.
    b_7: (() => { const b = bitacora({ id: "b_7", sup: "u_sup2", fecha: diaDeEsteMes(5), zona: "ZONA 6", nodo: "NODO MACHIQUES",
      macro: "GESTIÓN OPERATIVA (EN CAMPO)", act: "VENTANA DE MANTENIMIENTO", ini: "22:00", fin: "02:00", min: 240,
      desc: "Ventana de mantenimiento nocturna en la troncal." }); b.diaSiguiente = true; return b; })(),
    // Bitácora vieja: sin campo `fecha`, para probar el aviso de fecha estimada.
    b_6: (() => { const b = bitacora({ id: "b_6", sup: "u_sup1", fecha: "", zona: "ZONA 1", nodo: "NODO BELLA VISTA",
      macro: "GESTIÓN ADMINISTRATIVA", act: "APOYO EN ALMACÉN", ini: "10:00", fin: "11:30", min: 90,
      desc: "Registro anterior a que el formulario pidiera la fecha." }); delete b.fecha; return b; })(),
  },

  // Fotos de una bitácora, en su subcolección (así se guardan desde v2.0.0).
  // Sirve para comprobar que el respaldo del root las recoge.
  "bitacoras/b_1/fotos": {
    "0": { orden: 0, dataUrl: "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", formato: "webp", bytes: 26, createdAt: ts(2) },
    "1": { orden: 1, dataUrl: "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", formato: "webp", bytes: 26, createdAt: ts(2) },
  },

  inventario_herramientas: {
    t_1: {
      tecnicoId: "t_1", tecnicoNombre: "Juan Pérez", supervisorUid: "u_sup1", supervisorNombre: "Supervisor Uno",
      coordinadorUid: "u_coord", actualizadoEn: ts(1),
      items: [
        { id: "herramientas-basic--alicate-de-5-posiciones", bueno: 1, regular: 0, malo: 1, cantidad: 2, serial: "", observacion: "Uno con el mango partido" },
        { id: "herramientas-basic--destornillador-de-estria", bueno: 0, regular: 1, malo: 2, cantidad: 3, serial: "", observacion: "Puntas gastadas" },
        { id: "herramientas-basic--martillo-saca-clavo-16-onzas", bueno: 1, regular: 0, malo: 0, cantidad: 1, serial: "", observacion: "" },
        { id: "equipos-de-prueba--otdr-con-puerto-sc-upc-con-power-meter-y-vfl", bueno: 1, regular: 0, malo: 0, cantidad: 1, serial: "OTDR-4471", observacion: "" },
      ],
    },
    t_2: {
      tecnicoId: "t_2", tecnicoNombre: "María Gómez", supervisorUid: "u_sup1", supervisorNombre: "Supervisor Uno",
      coordinadorUid: "u_coord", actualizadoEn: ts(3),
      items: [
        { id: "herramientas-basic--alicate-de-5-posiciones", bueno: 2, regular: 1, malo: 0, cantidad: 3, serial: "", observacion: "" },
        { id: "herramientas-basic--destornillador-de-estria", bueno: 1, regular: 0, malo: 1, cantidad: 2, serial: "", observacion: "" },
        { id: "equipos-de-protecc--casco-de-seguridad-con-barbiquejo", bueno: 0, regular: 0, malo: 1, cantidad: 1, serial: "", observacion: "Barbiquejo roto" },
      ],
    },
    t_3: {
      tecnicoId: "t_3", tecnicoNombre: "Luis Rodríguez", supervisorUid: "u_sup2", supervisorNombre: "Supervisor Dos",
      coordinadorUid: "u_coord", actualizadoEn: ts(2),
      items: [
        { id: "kit-de-fusion-de-f--cleaver", bueno: 1, regular: 0, malo: 2, cantidad: 3, serial: "", observacion: "Dos con la cuchilla vencida" },
        { id: "kit-de-empalme-gpo--cleaver", bueno: 0, regular: 0, malo: 1, cantidad: 1, serial: "", observacion: "" },
        { id: "herramientas-basic--exacto-para-cortar", bueno: 0, regular: 0, malo: 0, cantidad: 0, serial: "", observacion: "Revisado: no tiene" },
        { id: "herramientas-basic--alicate-de-5-posiciones", bueno: 0, regular: 2, malo: 0, cantidad: 2, serial: "", observacion: "Desgaste normal" },
      ],
    },
  },

  inventario_materiales: {
    m_1: {
      tecnicoId: "t_1", tecnicoNombre: "Juan Pérez", supervisorUid: "u_sup1", supervisorNombre: "Supervisor Uno",
      coordinadorUid: "u_coord", fecha: diaDeEsteMes(3), nota: "Reposición semanal", createdAt: ts(3),
      items: [
        { id: "GOP-CON-FAS-002", nombre: "FAST CONECTOR SC/APC (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA", cantidad: 25 },
        { id: "GPO-GRA-DRO-002", nombre: "GRAPA PARA CABLE DROP (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA", cantidad: 100 },
      ],
    },
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
