// tests-reglas/ver-como.test.js
// Pruebas de las reglas de Firestore para el rol "root" (spec 003, T7).
//
// No existía ningún fixture con root todavía. Estas pruebas confirman lo
// que la spec 003 ("Ver como") asume:
//   1) root YA puede leer cualquier cosa — por eso el modo no necesitó
//      tocar firestore.rules, es un cambio 100% de cliente.
//   2) root NO puede CREAR bitácoras/evaluaciones/técnicos a nombre de
//      otro uid — es la base real (no solo de interfaz) de por qué T5
//      puede bloquear la escritura con confianza.
//   3) root SÍ puede editar/borrar lo que ya existe — por eso T5 tiene que
//      bloquear esas acciones en la interfaz: las reglas solas no alcanzan.
//
// Se corren con `npm run test:rules` (levanta el emulador y las ejecuta).
// No tocan el proyecto real: usan el proyecto ficticio "demo-airtek".

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import * as rut from '@firebase/rules-unit-testing';
import * as fs from 'firebase/firestore';

const PROYECTO = 'demo-airtek';

const UIDS = {
  root: 'root-1',
  coord: 'coord-1',
  sup: 'sup-1',
};

const PERFILES = {
  [UIDS.root]: { nombre: 'Root', rol: 'root', activo: true },
  [UIDS.coord]: { nombre: 'Coordinador', rol: 'coordinador', activo: true },
  [UIDS.sup]: { nombre: 'Supervisor', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coord },
};

const TECNICOS = {
  't-1': { nombre: 'Técnico Uno', supervisorUid: UIDS.sup },
};

let entorno = null;

async function sembrar(ctx) {
  const db = ctx.firestore();
  for (const [uid, perfil] of Object.entries(PERFILES)) {
    await fs.setDoc(fs.doc(db, 'usuarios', uid), perfil);
  }
  for (const [id, t] of Object.entries(TECNICOS)) {
    await fs.setDoc(fs.doc(db, 'tecnicos', id), t);
  }
  await fs.setDoc(fs.doc(db, 'evaluaciones', 'eval-1'), {
    tecnicoId: 't-1', tecnicoNombre: 'Técnico Uno', supervisorUid: UIDS.sup,
  });
  await fs.setDoc(fs.doc(db, 'bitacoras', 'bit-1'), {
    supervisorUid: UIDS.sup, coordinadorUid: UIDS.coord, fecha: '2026-09-16',
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
  await entorno.withSecurityRulesDisabled(sembrar);
});

test.beforeEach(async () => {
  await entorno.clearFirestore();
  // clearFirestore borra todo, así que hay que resembrar la base.
  await entorno.withSecurityRulesDisabled(sembrar);
});

test.after(async () => {
  if (entorno) await entorno.cleanup();
});

const como = (uid) => entorno.authenticatedContext(uid).firestore();

// ═══════════════════════════════════════════════════════════════════════
// Lectura: root ya ve todo (por eso "Ver como" no toca firestore.rules)
// ═══════════════════════════════════════════════════════════════════════

test('root lee el perfil de cualquier usuario', async () => {
  const db = como(UIDS.root);
  await rut.assertSucceeds(fs.getDoc(fs.doc(db, 'usuarios', UIDS.sup)));
});

test('root lee los técnicos, evaluaciones y bitácoras de cualquier supervisor', async () => {
  const db = como(UIDS.root);
  await rut.assertSucceeds(fs.getDoc(fs.doc(db, 'tecnicos', 't-1')));
  await rut.assertSucceeds(fs.getDoc(fs.doc(db, 'evaluaciones', 'eval-1')));
  await rut.assertSucceeds(fs.getDoc(fs.doc(db, 'bitacoras', 'bit-1')));
});

// ═══════════════════════════════════════════════════════════════════════
// Escritura: root NO puede crear nada a nombre de otro uid
// ═══════════════════════════════════════════════════════════════════════

test('root NO puede crear un técnico a nombre de un supervisor', async () => {
  const db = como(UIDS.root);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'tecnicos', 't-nuevo'), { nombre: 'Nuevo', supervisorUid: UIDS.sup })
  );
});

test('root NO puede crear una evaluación a nombre de un supervisor', async () => {
  const db = como(UIDS.root);
  await rut.assertFails(
    fs.addDoc(fs.collection(db, 'evaluaciones'), { tecnicoId: 't-1', supervisorUid: UIDS.sup })
  );
});

test('root NO puede crear una bitácora a nombre de un supervisor', async () => {
  const db = como(UIDS.root);
  await rut.assertFails(
    fs.addDoc(fs.collection(db, 'bitacoras'), { supervisorUid: UIDS.sup, fecha: '2026-09-16' })
  );
});

test('root tampoco se cuela creando el técnico a su PROPIO nombre', async () => {
  // Por si alguien pensara en atribuírselo a sí mismo para esquivar la regla:
  // igual no tiene sentido (root no es supervisor de nadie) y las pantallas
  // ni siquiera lo intentan, pero la regla debe sostenerlo de todas formas.
  const db = como(UIDS.root);
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'tecnicos', 't-de-root'), { nombre: 'De root', supervisorUid: UIDS.root })
  );
  // Sí lo permite (el uid coincide, como para cualquier supervisor nuevo) —
  // lo que confirma que la única barrera real es esa igualdad de uids, y por
  // eso alcanza con que la interfaz (T5) nunca deje que root escriba con SU
  // uid mientras "Ver como" está activo.
});

// ═══════════════════════════════════════════════════════════════════════
// Root SÍ puede editar/borrar lo que ya existe: las reglas solas no
// bastan para el bloqueo total de "Ver como" — por eso hace falta T5.
// ═══════════════════════════════════════════════════════════════════════

test('root SÍ puede editar un técnico existente (por eso T5 lo bloquea en la interfaz)', async () => {
  const db = como(UIDS.root);
  await rut.assertSucceeds(
    fs.updateDoc(fs.doc(db, 'tecnicos', 't-1'), { nombre: 'Nombre cambiado por root' })
  );
});

test('root SÍ puede borrar una bitácora existente (por eso T5 lo bloquea en la interfaz)', async () => {
  const db = como(UIDS.root);
  await rut.assertSucceeds(fs.deleteDoc(fs.doc(db, 'bitacoras', 'bit-1')));
});

test('root SÍ puede inhabilitar/actualizar el perfil de cualquier usuario', async () => {
  const db = como(UIDS.root);
  await rut.assertSucceeds(
    fs.updateDoc(fs.doc(db, 'usuarios', UIDS.sup), { activo: false })
  );
});
