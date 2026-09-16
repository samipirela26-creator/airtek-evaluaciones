// renombrar-data.js
// Catálogos y funciones puras para corregir nombres. Sin DOM ni Firebase, para
// poder probarlo con `node --test` igual que bitacora-data.js e inventario-data.js.
//
// POR QUÉ HACE FALTA UN CATÁLOGO:
// el nombre no vive solo en el perfil. Cada vez que alguien guarda una
// evaluación, una bitácora, un técnico, un enlace o un inventario, se escribe
// una COPIA del nombre dentro de ese documento. Y los dos tableros agrupan por
// nombre, no por identificador.
//
// Si solo se corrige el perfil, el coordinador termina viendo DOS supervisores:
// el mal escrito con todo lo viejo y el corregido con lo nuevo. Que es justo lo
// que quería evitar al corregir.
//
// SI AGREGAS UNA COLECCIÓN QUE COPIE EL NOMBRE, decláralas aquí. Hay una prueba
// que lee el código y falla si te olvidas.

/**
 * Colecciones que guardan una copia de `supervisorNombre`.
 * Se buscan por `supervisorUid`: nunca por nombre, que es justo el dato malo.
 */
export const COPIAS_DE_SUPERVISOR = [
  { coleccion: "tecnicos", campoUid: "supervisorUid", campoNombre: "supervisorNombre" },
  { coleccion: "evaluaciones", campoUid: "supervisorUid", campoNombre: "supervisorNombre" },
  { coleccion: "bitacoras", campoUid: "supervisorUid", campoNombre: "supervisorNombre" },
  { coleccion: "inventario_herramientas", campoUid: "supervisorUid", campoNombre: "supervisorNombre" },
  { coleccion: "inventario_materiales", campoUid: "supervisorUid", campoNombre: "supervisorNombre" },
  { coleccion: "enlaces", campoUid: "supervisorUid", campoNombre: "supervisorNombre" },
];

/** Colecciones que guardan una copia de `tecnicoNombre`, buscables por `tecnicoId`. */
export const COPIAS_DE_TECNICO = [
  { coleccion: "evaluaciones", campoUid: "tecnicoId", campoNombre: "tecnicoNombre" },
  { coleccion: "inventario_materiales", campoUid: "tecnicoId", campoNombre: "tecnicoNombre" },
];

/**
 * Colecciones que copian un nombre y NO se corrigen, con su razón.
 * Van declaradas para que se vea que son decisión y no olvido.
 */
export const NO_SE_CORRIGEN = {
  evaluacionesSupervisor:
    "Su regla de Firestore es `allow update: if false`. Además, el nombre del " +
    "supervisor nunca se muestra en esa lista, y el `tecnicoNombre` que guarda " +
    "es lo que el técnico escribió de sí mismo en el formulario público: no es " +
    "una referencia a su ficha.",
};

/** Valida el nombre nuevo. Devuelve { valido, error?, nombre? }. */
export function validarNombre(nombreNuevo, nombreActual) {
  const nombre = String(nombreNuevo ?? "").trim().replace(/\s+/g, " ");
  if (!nombre) return { valido: false, error: "El nombre no puede quedar vacío." };
  if (nombre.length < 2) return { valido: false, error: "El nombre es demasiado corto." };
  if (nombre === nombreActual) return { valido: false, error: "El nombre es el mismo." };
  return { valido: true, nombre };
}

/** Suma los valores de un resumen: cuántos registros se tocaron en total. */
export function totalDeResumen(resumen) {
  return Object.values(resumen || {}).reduce((s, n) => s + (Number(n) || 0), 0);
}

// [singular, plural]. El resumen se le muestra al usuario, y "1 entregas de
// material" delata que nadie leyó el mensaje antes de soltarlo.
const NOMBRES = {
  usuarios: ["perfil", "perfiles"],
  tecnicos: ["técnico", "técnicos"],
  evaluaciones: ["evaluación", "evaluaciones"],
  bitacoras: ["bitácora", "bitácoras"],
  inventario_herramientas: ["inventario de herramientas", "inventarios de herramientas"],
  inventario_materiales: ["entrega de material", "entregas de material"],
  enlaces: ["enlace de evaluación", "enlaces de evaluación"],
};

/** Texto legible de un resumen, para mostrárselo al usuario. */
export function describirResumen(resumen) {
  const partes = Object.entries(resumen || {})
    .filter(([, n]) => n > 0)
    .map(([c, n]) => {
      const par = NOMBRES[c] || [c, c];
      return `${n} ${n === 1 ? par[0] : par[1]}`;
    });
  return partes.length ? partes.join(", ") : "ningún registro";
}
