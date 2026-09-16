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
 * Trae todos los documentos de `col` cuyo `campo` esté en `valores`,
 * partiendo la consulta en lotes de 10 y corriéndolos en paralelo.
 */
export async function traerPorLotes(db, col, campo, valores) {
  if (!valores || !valores.length) return [];
  const resultados = await Promise.all(
    enLotesDe(valores).map((lote) => getDocs(query(collection(db, col), where(campo, "in", lote))))
  );
  const docs = [];
  resultados.forEach((snap) => snap.forEach((d) => docs.push({ id: d.id, ...d.data() })));
  return docs;
}
