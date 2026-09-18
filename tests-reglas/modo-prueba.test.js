// tests-reglas/modo-prueba.test.js
// Pruebas de las reglas de Firestore para el "Modo de prueba" (spec 004, T10).
//
// Confirman la garantía central de la spec: root SOLO puede escribir
// usuarios(supervisor)/plantillas/enlaces cuando el campo de propiedad
// (coordinadorUid/creadorUid) es su PROPIO uid, y (salvo invitaciones)
// cuando el documento trae esPrueba: true. Cualquier otra combinación falla
// — la garantía de aislamiento vive en las reglas, no en la interfaz.
//
// Se corren con `npm run test:rules` (levanta el emulador y las ejecuta,
// con --test-concurrency=1 desde el fix de la spec 003). No tocan el
// proyecto real: usan el proyecto ficticio "demo-airtek".

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import * as rut from '@firebase/rules-unit-testing';
import * as fs from 'firebase/firestore';

const PROYECTO = 'demo-airtek';

const UIDS = {
  root: 'root-1',
  coord: 'coord-1',
  coord2: 'coord2-1',
  sup: 'sup-1',
  supPrueba: 'sup-prueba-1',
};

const PERFILES = {
  [UIDS.root]: { nombre: 'Root', rol: 'root', activo: true },
  [UIDS.coord]: { nombre: 'Coordinador', rol: 'coordinador', activo: true },
  [UIDS.coord2]: { nombre: 'Coordinador Dos', rol: 'coordinador', activo: true },
  [UIDS.sup]: { nombre: 'Supervisor', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coord },
  // Ya existe, sembrado como si root ya lo hubiera creado en "Modo de prueba".
  [UIDS.supPrueba]: {
    nombre: '🧪 Supervisor de prueba', rol: 'supervisor', activo: true,
    coordinadorUid: UIDS.root, esPrueba: true,
  },
};

const PLANTILLAS = {
  'plant-real': { nombre: 'Real', tipo: 'tecnico', coordinadorUid: UIDS.coord },
  'plant-prueba': { nombre: '🧪 Prueba', tipo: 'supervisor', coordinadorUid: UIDS.root, esPrueba: true },
};

let entorno = null;

async function sembrar(ctx) {
  const db = ctx.firestore();
  for (const [uid, perfil] of Object.entries(PERFILES)) {
    await fs.setDoc(fs.doc(db, 'usuarios', uid), perfil);
  }
  for (const [id, p] of Object.entries(PLANTILLAS)) {
    await fs.setDoc(fs.doc(db, 'plantillas', id), p);
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
// usuarios (rol supervisor) — crear un supervisor DE PRUEBA
// ═══════════════════════════════════════════════════════════════════════

test('root SÍ puede crear un supervisor de prueba ligado a sí mismo', async () => {
  const db = como(UIDS.root);
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'usuarios', 'nuevo-sup'), {
      nombre: '🧪 Nuevo', rol: 'supervisor', activo: true,
      coordinadorUid: UIDS.root, esPrueba: true,
    })
  );
});

test('root NO puede crear un supervisor ligado a un coordinador real', async () => {
  const db = como(UIDS.root);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'usuarios', 'nuevo-sup'), {
      nombre: '🧪 Nuevo', rol: 'supervisor', activo: true,
      coordinadorUid: UIDS.coord, esPrueba: true,
    })
  );
});

test('root NO puede crear un supervisor a su propio nombre SIN marcarlo esPrueba', async () => {
  const db = como(UIDS.root);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'usuarios', 'nuevo-sup'), {
      nombre: 'Nuevo', rol: 'supervisor', activo: true, coordinadorUid: UIDS.root,
    })
  );
});

test('un coordinador real SIGUE pudiendo crear su propio supervisor (regresión)', async () => {
  const db = como(UIDS.coord);
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'usuarios', 'nuevo-sup-real'), {
      nombre: 'Real', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coord,
    })
  );
});

// ═══════════════════════════════════════════════════════════════════════
// plantillas — crear y editar una DE PRUEBA
// ═══════════════════════════════════════════════════════════════════════

test('root SÍ puede crear una plantilla de prueba ligada a sí mismo', async () => {
  const db = como(UIDS.root);
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'plantillas', 'nueva-plant'), {
      nombre: '🧪 Nueva', tipo: 'supervisor', coordinadorUid: UIDS.root, esPrueba: true,
    })
  );
});

test('root NO puede crear una plantilla ligada a un coordinador real', async () => {
  const db = como(UIDS.root);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'plantillas', 'nueva-plant'), {
      nombre: '🧪 Nueva', tipo: 'supervisor', coordinadorUid: UIDS.coord, esPrueba: true,
    })
  );
});

test('root NO puede crear una plantilla a su propio nombre SIN marcarla esPrueba', async () => {
  const db = como(UIDS.root);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'plantillas', 'nueva-plant'), {
      nombre: 'Nueva', tipo: 'supervisor', coordinadorUid: UIDS.root,
    })
  );
});

test('root SÍ puede editar su propia plantilla de prueba ya existente', async () => {
  const db = como(UIDS.root);
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'plantillas', 'plant-prueba'), {
      nombre: '🧪 Prueba editada', tipo: 'supervisor', coordinadorUid: UIDS.root, esPrueba: true,
    })
  );
});

test('root NO puede editar la plantilla real de un coordinador', async () => {
  const db = como(UIDS.root);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'plantillas', 'plant-real'), {
      nombre: 'Hackeada', tipo: 'tecnico', coordinadorUid: UIDS.coord,
    })
  );
});

test('un coordinador real SIGUE pudiendo crear/editar sus propias plantillas (regresión)', async () => {
  const db = como(UIDS.coord);
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'plantillas', 'otra-real'), {
      nombre: 'Otra', tipo: 'tecnico', coordinadorUid: UIDS.coord,
    })
  );
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'plantillas', 'plant-real'), {
      nombre: 'Real editada', tipo: 'tecnico', coordinadorUid: UIDS.coord,
    })
  );
});

// ═══════════════════════════════════════════════════════════════════════
// enlaces — crear uno DE PRUEBA (el corazón del bug de Carlos)
// ═══════════════════════════════════════════════════════════════════════

test('root SÍ puede generar un enlace de prueba ligado a sí mismo', async () => {
  const db = como(UIDS.root);
  await rut.assertSucceeds(
    fs.addDoc(fs.collection(db, 'enlaces'), {
      tipo: 'evalSupervisor', supervisorUid: UIDS.supPrueba,
      creadorUid: UIDS.root, activo: true, esPrueba: true,
    })
  );
});

test('root NO puede generar un enlace a nombre de un coordinador real', async () => {
  const db = como(UIDS.root);
  await rut.assertFails(
    fs.addDoc(fs.collection(db, 'enlaces'), {
      tipo: 'evalSupervisor', supervisorUid: UIDS.sup,
      creadorUid: UIDS.coord, activo: true, esPrueba: true,
    })
  );
});

test('root NO puede generar un enlace a su propio nombre SIN marcarlo esPrueba', async () => {
  const db = como(UIDS.root);
  await rut.assertFails(
    fs.addDoc(fs.collection(db, 'enlaces'), {
      tipo: 'evalSupervisor', supervisorUid: UIDS.supPrueba, creadorUid: UIDS.root, activo: true,
    })
  );
});

test('un coordinador real SIGUE pudiendo generar sus propios enlaces (regresión)', async () => {
  const db = como(UIDS.coord);
  await rut.assertSucceeds(
    fs.addDoc(fs.collection(db, 'enlaces'), {
      tipo: 'evalSupervisor', supervisorUid: UIDS.sup, creadorUid: UIDS.coord, activo: true,
    })
  );
});

// ═══════════════════════════════════════════════════════════════════════
// invitaciones — invitar un supervisor DE PRUEBA (no exige esPrueba: el
// usuarios resultante del auto-registro sí lo exige, ver arriba)
// ═══════════════════════════════════════════════════════════════════════

test('root SÍ puede invitar a un supervisor de prueba por link', async () => {
  const db = como(UIDS.root);
  await rut.assertSucceeds(
    fs.addDoc(fs.collection(db, 'invitaciones'), {
      creadorUid: UIDS.root, rol: 'supervisor', usado: false,
    })
  );
});

test('un coordinador real SIGUE pudiendo invitar a sus supervisores (regresión)', async () => {
  const db = como(UIDS.coord);
  await rut.assertSucceeds(
    fs.addDoc(fs.collection(db, 'invitaciones'), {
      creadorUid: UIDS.coord, rol: 'supervisor', usado: false,
    })
  );
});

// ═══════════════════════════════════════════════════════════════════════
// Aislamiento de lectura (RF-12): un coordinador real no ve lo de root
// ═══════════════════════════════════════════════════════════════════════
//
// Esto se cumple de punta a punta para "usuarios" (y, por transitividad vía
// esMiSupervisor, para tecnicos/evaluaciones/bitacoras/inventario_*): su
// regla de lectura ya filtra por coordinadorUid == request.auth.uid, y el
// supervisor de prueba de root tiene coordinadorUid = root, nunca el del
// coordinador real. OJO: esto NO aplica a "plantillas" (su lectura es
// "cualquier autenticado", ya de antes de esta spec — un supervisor
// necesita poder leer las plantillas de SU coordinador sin una regla de
// pertenencia) ni a "enlaces" (lectura pública, para que el técnico sin
// cuenta pueda abrir el link) — ambas ya eran así para CUALQUIER plantilla o
// enlace real, no es una fuga nueva de "Modo de prueba".

test('un coordinador real NO puede leer el perfil del supervisor de prueba de root', async () => {
  const db = como(UIDS.coord);
  await rut.assertFails(fs.getDoc(fs.doc(db, 'usuarios', UIDS.supPrueba)));
});

test('un coordinador real NO ve al supervisor de prueba de root en "sus" supervisores', async () => {
  const db = como(UIDS.coord);
  const snap = await fs.getDocs(
    fs.query(fs.collection(db, 'usuarios'), fs.where('coordinadorUid', '==', UIDS.coord))
  );
  assert.ok(
    snap.docs.every((d) => d.id !== UIDS.supPrueba),
    'el supervisor de prueba de root no debería aparecer en la lista de un coordinador real'
  );
});
