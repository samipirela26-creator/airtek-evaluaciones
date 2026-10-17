// consultas.js
// Consultas a Firestore compartidas por el tablero, la bitácora y los inventarios.
// El patrón de "lotes de 10" nació en dashboard.js: Firestore limita el
// operador `in` a 10 valores, así que las consultas se parten.

import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export const LIMITE_IN = 10;

/** Parte un arreglo en trozos de tamaño n. Función pura. */
export function enLotesDe(arr, n = LIMITE_IN) {
  const lotes = [];
  for (let i = 0; i < (arr || []).length; i += n) lotes.push(arr.slice(i, i + n));
  return lotes;
}

/** Supervisores del coordinador: [{ uid, nombre, ...perfil }]. */
export async function misSupervisores(db, coordUid) {
  const snap = await getDocs(query(collection(db, "usuarios"), where("coordinadorUid", "==", coordUid)));
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => u.rol === "supervisor")
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
}

/**
 * Trae los documentos de `col` cuyo `campo` esté en `valores`, partiendo la
 * consulta en lotes de 10 y corriéndolos en paralelo.
 *
 * `desde` acota por fecha EN EL SERVIDOR, que es lo importante. Antes esto se
 * traía la colección entera y el filtro de fechas se aplicaba después, en el
 * navegador: el tablero bajaba todas las bitácoras de la historia para
 * mostrar las de este mes. Con el tiempo eso sólo empeora.
 *
 * @param {object}   [rango]
 * @param {string}   [rango.campoFecha] campo por el que acotar ("fecha", "createdAt"…).
 * @param {*}        [rango.desde]      valor mínimo: un "YYYY-MM-DD" para campos
 *                                      de texto, un Date para marcas de tiempo.
 *
 * OJO: combinar `in` con un rango sobre otro campo necesita un índice
 * compuesto (ver firestore.indexes.json). Si el índice todavía no está
 * desplegado, Firestore responde "failed-precondition" y aquí se cae de vuelta
 * a la consulta sin acotar: más lenta, pero la pantalla funciona igual.
 */
export async function traerPorLotes(db, col, campo, valores, rango = {}) {
  if (!valores || !valores.length) return [];
  const { campoFecha, desde } = rango;
  const acotar = Boolean(campoFecha && desde != null);

  const correr = (conFecha) =>
    Promise.all(
      enLotesDe(valores).map((lote) => {
        const partes = [where(campo, "in", lote)];
        if (conFecha) partes.push(where(campoFecha, ">=", desde));
        return getDocs(query(collection(db, col), ...partes));
      })
    );

  let resultados;
  try {
    resultados = await correr(acotar);
  } catch (err) {
    if (acotar && err && err.code === "failed-precondition") {
      console.warn(
        `[consultas] Falta el índice compuesto de ${col} (${campo} + ${campoFecha}). ` +
          "Se trae sin acotar, que es más lento. Desplegalo con: firebase deploy --only firestore:indexes"
      );
      resultados = await correr(false);
    } else {
      throw err;
    }
  }

  const docs = [];
  resultados.forEach((snap) => snap.forEach((d) => docs.push({ id: d.id, ...d.data() })));
  return docs;
}

/** El "YYYY-MM-DD" de hace `meses` meses. Para acotar por defecto sin tener
 *  que elegir una fecha a mano en cada pantalla. */
export function haceMeses(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return d.toISOString().slice(0, 10);
}
