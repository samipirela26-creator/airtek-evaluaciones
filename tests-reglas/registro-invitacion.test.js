// tests-reglas/registro-invitacion.test.js
// Pruebas de las reglas de Firestore para el auto-registro por invitación
// (spec 005): confirma que el coordinadorUid/rootUid que el nuevo perfil
// declara como suyo tiene que ser quien de verdad generó la invitación que
// se reclama — no cualquier coordinador o root que exista.
//
// Se corren con `npm run test:rules` (levanta el emulador y las ejecuta,
// con --test-concurrency=1 desde el fix de la spec 003). No tocan el
// proyecto real: usan el proyecto ficticio "demo-airtek".

import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as rut from '@firebase/rules-unit-testing';
import * as fs from 'firebase/firestore';

const PROYECTO = 'demo-airtek';

const UIDS = {
  root: 'root-1',
  coord1: 'coord-1',
  coord2: 'coord-2',
  nuevoSup: 'nuevo-sup-1',
  nuevoCoord: 'nuevo-coord-1',
};

const PERFILES = {
  [UIDS.root]: { nombre: 'Root', rol: 'root', activo: true },
  [UIDS.coord1]: { nombre: 'Coordinador Uno', rol: 'coordinador', activo: true },
  [UIDS.coord2]: { nombre: 'Coordinador Dos', rol: 'coordinador', activo: true },
};

// Invitaciones ya "reclamadas" — así queda el documento justo antes de que
// registro.js escriba el usuarios/{uid} (el reclamo atómico es un paso
// aparte, ya probado por sus propias reglas de `update`; no hace falta
// repetirlo aquí).
const INVITACIONES = {
  'inv-sup-de-coord1': {
    creadorUid: UIDS.coord1, rol: 'supervisor', usado: true, usadoPor: UIDS.nuevoSup,
  },
  'inv-coord-de-root': {
    creadorUid: UIDS.root, rol: 'coordinador', usado: true, usadoPor: UIDS.nuevoCoord,
  },
};

let entorno = null;

async function sembrar(ctx) {
  const db = ctx.firestore();
  for (const [uid, perfil] of Object.entries(PERFILES)) {
    await fs.setDoc(fs.doc(db, 'usuarios', uid), perfil);
  }
  for (const [token, inv] of Object.entries(INVITACIONES)) {
    await fs.setDoc(fs.doc(db, 'invitaciones', token), inv);
  }
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
  await entorno.withSecurityRulesDisabled(sembrar);
});

test.after(async () => {
  if (entorno) await entorno.cleanup();
});

const como = (uid) => entorno.authenticatedContext(uid).firestore();

// ═══════════════════════════════════════════════════════════════════════
// El registro legítimo sigue funcionando (regresión)
// ═══════════════════════════════════════════════════════════════════════

test('alta de supervisor con coordinadorUid = quien lo invitó: SÍ funciona', async () => {
  const db = como(UIDS.nuevoSup);
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'usuarios', UIDS.nuevoSup), {
      nombre: 'Supervisor Nuevo', rol: 'supervisor',
      coordinadorUid: UIDS.coord1, // igual a inv-sup-de-coord1.creadorUid
      inviteToken: 'inv-sup-de-coord1', createdAt: new Date(),
    })
  );
});

test('alta de coordinador con rootUid = quien lo invitó: SÍ funciona', async () => {
  const db = como(UIDS.nuevoCoord);
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'usuarios', UIDS.nuevoCoord), {
      nombre: 'Coordinador Nuevo', rol: 'coordinador',
      rootUid: UIDS.root, // igual a inv-coord-de-root.creadorUid
      inviteToken: 'inv-coord-de-root', createdAt: new Date(),
    })
  );
});

// ═══════════════════════════════════════════════════════════════════════
// El bug que se cierra: adjuntarse a un coordinador/root que NO invitó
// ═══════════════════════════════════════════════════════════════════════

test('alta de supervisor con coordinadorUid de OTRO coordinador: NO funciona', async () => {
  const db = como(UIDS.nuevoSup);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'usuarios', UIDS.nuevoSup), {
      nombre: 'Supervisor Nuevo', rol: 'supervisor',
      coordinadorUid: UIDS.coord2, // NO es quien generó "inv-sup-de-coord1"
      inviteToken: 'inv-sup-de-coord1', createdAt: new Date(),
    })
  );
});

test('alta de coordinador con rootUid que no es el root real: NO funciona', async () => {
  const db = como(UIDS.nuevoCoord);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'usuarios', UIDS.nuevoCoord), {
      nombre: 'Coordinador Nuevo', rol: 'coordinador',
      rootUid: UIDS.coord1, // no es root, ni generó la invitación
      inviteToken: 'inv-coord-de-root', createdAt: new Date(),
    })
  );
});
