// renombrar.js — Escribe la corrección de un nombre en Firestore.
//
// La lógica pura (qué colecciones copian el nombre, validación, resúmenes) vive
// en renombrar-data.js, para que se pueda probar sin red. Aquí queda solo lo
// que toca la base de datos.

import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { COPIAS_DE_SUPERVISOR, COPIAS_DE_TECNICO, validarNombre } from "./renombrar-data.js";

// Firestore admite hasta 500 operaciones por lote. Se deja margen.
const POR_LOTE = 400;

/**
 * Cuenta cuántos registros cambiarían, SIN escribir nada.
 * Sirve para decirle al usuario qué va a pasar antes de que confirme.
 */
export async function contarAfectados(db, copias, valorUid) {
  const resumen = {};
  for (const { coleccion, campoUid } of copias) {
    const snap = await getDocs(query(collection(db, coleccion), where(campoUid, "==", valorUid)));
    if (snap.size) resumen[coleccion] = snap.size;
  }
  return resumen;
}

/** Aplica el nombre nuevo a todas las copias. Devuelve cuántas tocó por colección. */
async function propagar(db, copias, valorUid, nombre) {
  const resumen = {};
  for (const { coleccion, campoUid, campoNombre } of copias) {
    const snap = await getDocs(query(collection(db, coleccion), where(campoUid, "==", valorUid)));
    if (snap.empty) continue;

    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += POR_LOTE) {
      const lote = writeBatch(db);
      docs.slice(i, i + POR_LOTE).forEach((d) => lote.update(d.ref, { [campoNombre]: nombre }));
      await lote.commit();
    }
    resumen[coleccion] = docs.length;
  }
  return resumen;
}

/**
 * Corrige el nombre de un supervisor en su perfil y en todas las copias.
 * @returns {Promise<{nombre: string, resumen: Object}>}
 */
export async function renombrarSupervisor(db, uid, nombreNuevo) {
  const perfil = await getDoc(doc(db, "usuarios", uid));
  if (!perfil.exists()) throw new Error("Ese supervisor ya no existe.");

  const val = validarNombre(nombreNuevo, perfil.data().nombre);
  if (!val.valido) throw new Error(val.error);

  // El perfil primero: es el origen de la verdad. Si algo falla después, el
  // nombre bueno ya quedó y se puede volver a correr para terminar de propagar.
  const lote = writeBatch(db);
  lote.update(doc(db, "usuarios", uid), { nombre: val.nombre });
  await lote.commit();

  const resumen = { usuarios: 1, ...(await propagar(db, COPIAS_DE_SUPERVISOR, uid, val.nombre)) };
  return { nombre: val.nombre, resumen };
}

/** Corrige el nombre de un técnico en su ficha y en todas las copias. */
export async function renombrarTecnico(db, tecnicoId, nombreNuevo) {
  const ficha = await getDoc(doc(db, "tecnicos", tecnicoId));
  if (!ficha.exists()) throw new Error("Ese técnico ya no existe.");

  const val = validarNombre(nombreNuevo, ficha.data().nombre);
  if (!val.valido) throw new Error(val.error);

  const lote = writeBatch(db);
  lote.update(doc(db, "tecnicos", tecnicoId), { nombre: val.nombre });
  // El inventario de herramientas se identifica POR el técnico: el id del
  // documento es el tecnicoId, así que no hay que consultarlo, se toca directo.
  const inv = await getDoc(doc(db, "inventario_herramientas", tecnicoId));
  if (inv.exists()) lote.update(inv.ref, { tecnicoNombre: val.nombre });
  await lote.commit();

  const resumen = { tecnicos: 1 };
  if (inv.exists()) resumen.inventario_herramientas = 1;
  Object.assign(resumen, await propagar(db, COPIAS_DE_TECNICO, tecnicoId, val.nombre));
  return { nombre: val.nombre, resumen };
}
