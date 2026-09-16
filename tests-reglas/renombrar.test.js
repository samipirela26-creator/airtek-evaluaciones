// tests-reglas/renombrar.test.js
// Corregir un nombre escribe en SIETE colecciones. Estas pruebas comprueban,
// contra el emulador, que quien corrige tiene permiso en todas — y que no lo
// tiene sobre lo ajeno.
//
// Sin esto, el fallo aparecería a mitad del renombrado en producción: el perfil
// corregido y los registros a medias.

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import * as rut from '@firebase/rules-unit-testing';
import * as fs from 'firebase/firestore';

const PROYECTO = 'demo-renombrar';

const UIDS = { coordA: 'coord-a', supA1: 'sup-a1', supA2: 'sup-a2', coordB: 'coord-b', supB1: 'sup-b1' };

const PERFILES = {
  [UIDS.coordA]: { nombre: 'Coordinador A', rol: 'coordinador', activo: true },
  [UIDS.coordB]: { nombre: 'Coordinador B', rol: 'coordinador', activo: true },
  [UIDS.supA1]: { nombre: 'Bertin Jose', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coordA },
  [UIDS.supA2]: { nombre: 'Sup A2', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coordA },
  [UIDS.supB1]: { nombre: 'Sup B1', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coordB },
};

let entorno = null;
const como = (uid) => entorno.authenticatedContext(uid).firestore();

/** Siembra el escenario de Carlos: un supervisor con historial en todas partes. */
async function sembrar() {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, p] of Object.entries(PERFILES)) await fs.setDoc(fs.doc(db, 'usuarios', uid), p);

    const deA1 = { supervisorUid: UIDS.supA1, supervisorNombre: 'Bertin Jose' };
    await fs.setDoc(fs.doc(db, 'tecnicos', 't-a1'), { ...deA1, nombre: 'Tecnico de A1' });
    await fs.setDoc(fs.doc(db, 'evaluaciones', 'e-a1'), { ...deA1, tecnicoId: 't-a1', tecnicoNombre: 'Tecnico de A1' });
    await fs.setDoc(fs.doc(db, 'bitacoras', 'b-a1'), { ...deA1, coordinadorUid: UIDS.coordA, fecha: '2026-09-16' });
    await fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-a1'), { ...deA1, tecnicoId: 't-a1', tecnicoNombre: 'Tecnico de A1', items: [] });
    await fs.setDoc(fs.doc(db, 'inventario_materiales', 'm-a1'), { ...deA1, tecnicoId: 't-a1', tecnicoNombre: 'Tecnico de A1', items: [] });
    await fs.setDoc(fs.doc(db, 'enlaces', 'l-a1'), { ...deA1, creadorUid: UIDS.coordA, activo: true });

    // Un supervisor de OTRO coordinador, para probar los límites.
    await fs.setDoc(fs.doc(db, 'tecnicos', 't-b1'), { supervisorUid: UIDS.supB1, supervisorNombre: 'Sup B1', nombre: 'Tecnico de B1' });
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
test.beforeEach(async () => { await entorno.clearFirestore(); await sembrar(); });
test.after(async () => { if (entorno) await entorno.cleanup(); });

// ═══ El caso de Carlos ═══

test('el coordinador corrige el nombre de su supervisor en TODAS las colecciones', async () => {
  const db = como(UIDS.coordA);
  const nombre = 'Bertín José López Boscán';

  await rut.assertSucceeds(fs.updateDoc(fs.doc(db, 'usuarios', UIDS.supA1), { nombre }));

  // Cada una es una colección distinta con su propia regla: si a alguna le
  // faltara el permiso, el renombrado quedaría a medias en producción.
  for (const [col, id] of [
    ['tecnicos', 't-a1'], ['evaluaciones', 'e-a1'], ['bitacoras', 'b-a1'],
    ['inventario_herramientas', 't-a1'], ['inventario_materiales', 'm-a1'], ['enlaces', 'l-a1'],
  ]) {
    await rut.assertSucceeds(
      fs.updateDoc(fs.doc(db, col, id), { supervisorNombre: nombre }),
      `el coordinador debería poder corregir el nombre en ${col}`
    );
  }
});

test('el coordinador encuentra los registros por identificador, no por nombre', async () => {
  // El renombrado busca por supervisorUid porque el nombre es justo el dato
  // malo. Estas consultas son las que hace js/renombrar.js.
  const db = como(UIDS.coordA);
  for (const col of ['tecnicos', 'evaluaciones', 'bitacoras', 'inventario_herramientas', 'inventario_materiales', 'enlaces']) {
    const snap = await rut.assertSucceeds(
      fs.getDocs(fs.query(fs.collection(db, col), fs.where('supervisorUid', '==', UIDS.supA1))),
      `el coordinador debería poder consultar ${col} por supervisorUid`
    );
    assert.strictEqual(snap.size, 1, `esperaba un registro en ${col}`);
  }
});

// ═══ Los límites ═══

test('un supervisor no puede corregir los registros de otro supervisor', async () => {
  const db = como(UIDS.supA2);
  await rut.assertFails(fs.updateDoc(fs.doc(db, 'tecnicos', 't-a1'), { supervisorNombre: 'pirata' }));
  await rut.assertFails(fs.updateDoc(fs.doc(db, 'bitacoras', 'b-a1'), { supervisorNombre: 'pirata' }));
});

test('un coordinador de otro árbol no puede tocar registros ajenos', async () => {
  const db = como(UIDS.coordB);
  await rut.assertFails(fs.updateDoc(fs.doc(db, 'tecnicos', 't-a1'), { supervisorNombre: 'pirata' }));
  await rut.assertFails(fs.updateDoc(fs.doc(db, 'bitacoras', 'b-a1'), { supervisorNombre: 'pirata' }));
  await rut.assertFails(fs.updateDoc(fs.doc(db, 'enlaces', 'l-a1'), { supervisorNombre: 'pirata' }));
});

test('HUECO CONOCIDO: cualquier coordinador puede renombrar cualquier perfil', async () => {
  // La regla de `usuarios` dice `esCoordinador()` a secas, sin comprobar que
  // sea SU supervisor. Se deja documentado aquí, con la prueba en positivo,
  // para que el día que se cierre esta prueba falle y haya que actualizarla
  // a propósito — en vez de que el hueco se olvide.
  const db = como(UIDS.coordB);
  await rut.assertSucceeds(
    fs.updateDoc(fs.doc(db, 'usuarios', UIDS.supA1), { nombre: 'nombre puesto por otro coordinador' })
  );
  // El daño está acotado: solo puede tocar el perfil, no el historial.
  await rut.assertFails(fs.updateDoc(fs.doc(db, 'tecnicos', 't-a1'), { supervisorNombre: 'x' }));
});

// ═══ Renombrar un técnico ═══

test('el supervisor corrige el nombre de su técnico y lo propaga', async () => {
  const db = como(UIDS.supA1);
  const nombre = 'Técnico Corregido';
  await rut.assertSucceeds(fs.updateDoc(fs.doc(db, 'tecnicos', 't-a1'), { nombre }));
  await rut.assertSucceeds(fs.updateDoc(fs.doc(db, 'evaluaciones', 'e-a1'), { tecnicoNombre: nombre }));
  await rut.assertSucceeds(fs.updateDoc(fs.doc(db, 'inventario_herramientas', 't-a1'), { tecnicoNombre: nombre }));
  await rut.assertSucceeds(fs.updateDoc(fs.doc(db, 'inventario_materiales', 'm-a1'), { tecnicoNombre: nombre }));
});

test('un supervisor no puede renombrar al técnico de otro', async () => {
  const db = como(UIDS.supA1);
  await rut.assertFails(fs.updateDoc(fs.doc(db, 'tecnicos', 't-b1'), { nombre: 'pirata' }));
});

test('las evaluaciones recibidas siguen siendo inmutables', async () => {
  // Por eso evaluacionesSupervisor está en NO_SE_CORRIGEN: su regla lo prohíbe
  // a todos, incluido el root.
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    await fs.setDoc(fs.doc(ctx.firestore(), 'evaluacionesSupervisor', 'es-1'), {
      supervisorUid: UIDS.supA1, supervisorNombre: 'Bertin Jose', enlaceId: 'l-a1',
    });
  });
  const db = como(UIDS.coordA);
  await rut.assertFails(fs.updateDoc(fs.doc(db, 'evaluacionesSupervisor', 'es-1'), { supervisorNombre: 'x' }));
});
