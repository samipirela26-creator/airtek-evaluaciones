// tests-reglas/fotos.test.js
// Las fotos de bitácora viven en una subcolección y heredan los permisos del
// documento padre. Estas pruebas comprueban que esa herencia funciona de
// verdad: que quien no puede ver la bitácora tampoco puede ver sus fotos.

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import * as rut from '@firebase/rules-unit-testing';
import * as fs from 'firebase/firestore';

const PROYECTO = 'demo-airtek-fotos';

const UIDS = { coordA: 'coord-a', supA1: 'sup-a1', supA2: 'sup-a2', coordB: 'coord-b' };

const PERFILES = {
  [UIDS.coordA]: { nombre: 'Coordinador A', rol: 'coordinador', activo: true },
  [UIDS.coordB]: { nombre: 'Coordinador B', rol: 'coordinador', activo: true },
  [UIDS.supA1]: { nombre: 'Sup A1', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coordA },
  [UIDS.supA2]: { nombre: 'Sup A2', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coordA },
};

const BITACORA = 'bit-de-a1';
const FOTO = { orden: 0, dataUrl: 'data:image/webp;base64,AAAA', formato: 'webp', bytes: 1234 };

let entorno = null;

const rutaFotos = (db) => fs.collection(db, 'bitacoras', BITACORA, 'fotos');
const rutaFoto = (db, id = 'f1') => fs.doc(db, 'bitacoras', BITACORA, 'fotos', id);
const como = (uid) => entorno.authenticatedContext(uid).firestore();

async function sembrar() {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, perfil] of Object.entries(PERFILES)) {
      await fs.setDoc(fs.doc(db, 'usuarios', uid), perfil);
    }
    await fs.setDoc(fs.doc(db, 'bitacoras', BITACORA), {
      supervisorUid: UIDS.supA1,
      coordinadorUid: UIDS.coordA,
      fecha: '2026-09-16',
      numFotos: 1,
    });
    await fs.setDoc(rutaFoto(db), FOTO);
  });
}

test.before(async () => {
  entorno = await rut.initializeTestEnvironment({
    projectId: PROYECTO,
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8085,
    },
  });
});

test.beforeEach(async () => {
  await entorno.clearFirestore();
  await sembrar();
});

test.after(async () => {
  if (entorno) await entorno.cleanup();
});

test('el supervisor dueño ve y adjunta fotos de su bitácora', async () => {
  const db = como(UIDS.supA1);
  await rut.assertSucceeds(fs.getDoc(rutaFoto(db)));
  await rut.assertSucceeds(fs.addDoc(rutaFotos(db), { ...FOTO, orden: 1 }));
});

test('el coordinador ve las fotos de las bitácoras de sus supervisores', async () => {
  const db = como(UIDS.coordA);
  await rut.assertSucceeds(fs.getDoc(rutaFoto(db)));
  await rut.assertSucceeds(fs.getDocs(rutaFotos(db)));
});

test('otro supervisor del mismo coordinador NO ve las fotos ajenas', async () => {
  const db = como(UIDS.supA2);
  await rut.assertFails(fs.getDoc(rutaFoto(db)));
  await rut.assertFails(fs.addDoc(rutaFotos(db), FOTO));
});

test('un coordinador de otro árbol no ve nada', async () => {
  const db = como(UIDS.coordB);
  await rut.assertFails(fs.getDoc(rutaFoto(db)));
  await rut.assertFails(fs.getDocs(rutaFotos(db)));
});

test('sin sesión no se accede a las fotos', async () => {
  const db = entorno.unauthenticatedContext().firestore();
  await rut.assertFails(fs.getDoc(rutaFoto(db)));
  await rut.assertFails(fs.addDoc(rutaFotos(db), FOTO));
});

test('el documento padre ya no carga las fotos', async () => {
  // Lo que motivó la subcolección: leer la bitácora para el tablero no debe
  // arrastrar las imágenes.
  const db = como(UIDS.coordA);
  const snap = await rut.assertSucceeds(fs.getDoc(fs.doc(db, 'bitacoras', BITACORA)));
  const datos = snap.data();
  assert.strictEqual(datos.imagenes, undefined, 'la bitácora no debe traer el campo imagenes');
  assert.strictEqual(datos.numFotos, 1, 'pero sí debe saber cuántas fotos tiene');
});
