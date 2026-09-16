// tests-reglas/inventarios.test.js
// Pruebas de las REGLAS de Firestore contra el emulador.
//
// Estas pruebas existen porque la ronda anterior publicó reglas que nadie había
// ejecutado nunca, y una de ellas tenía un hueco de permisos. Se corren con:
//     npm run test:rules
// que levanta el emulador, ejecuta esto y lo apaga.
//
// No tocan el proyecto real: el emulador usa el proyecto ficticio "demo-airtek".

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import * as rut from '@firebase/rules-unit-testing';
import * as fs from 'firebase/firestore';

const PROYECTO = 'demo-airtek';

// ── Árbol de usuarios de prueba ──────────────────────────────────────────
// coordA manda a supA1 y supA2.   coordB manda a supB1 (otro árbol).
const UIDS = {
  coordA: 'coord-a', supA1: 'sup-a1', supA2: 'sup-a2',
  coordB: 'coord-b', supB1: 'sup-b1',
  supInactivo: 'sup-inactivo',
};

const PERFILES = {
  [UIDS.coordA]: { nombre: 'Coordinador A', rol: 'coordinador', activo: true },
  [UIDS.coordB]: { nombre: 'Coordinador B', rol: 'coordinador', activo: true },
  [UIDS.supA1]: { nombre: 'Sup A1', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coordA },
  [UIDS.supA2]: { nombre: 'Sup A2', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coordA },
  [UIDS.supB1]: { nombre: 'Sup B1', rol: 'supervisor', activo: true, coordinadorUid: UIDS.coordB },
  [UIDS.supInactivo]: { nombre: 'Sup inactivo', rol: 'supervisor', activo: false, coordinadorUid: UIDS.coordA },
};

// Cada técnico pertenece a UN supervisor. Es justo lo que las reglas deben mirar.
const TECNICOS = {
  't-de-a1': { nombre: 'Técnico de A1', supervisorUid: UIDS.supA1 },
  't-de-a2': { nombre: 'Técnico de A2', supervisorUid: UIDS.supA2 },
  't-de-b1': { nombre: 'Técnico de B1', supervisorUid: UIDS.supB1 },
};

let entorno = null;

function inventario(tecnicoId, supervisorUid, extra = {}) {
  return {
    tecnicoId,
    tecnicoNombre: TECNICOS[tecnicoId]?.nombre || '',
    supervisorUid,
    coordinadorUid: PERFILES[supervisorUid]?.coordinadorUid || null,
    items: [{ id: 'x', bueno: 1, regular: 0, malo: 0, cantidad: 1, serial: '', observacion: '' }],
    ...extra,
  };
}

function entrega(tecnicoId, supervisorUid, extra = {}) {
  return {
    tecnicoId,
    tecnicoNombre: TECNICOS[tecnicoId]?.nombre || '',
    supervisorUid,
    coordinadorUid: PERFILES[supervisorUid]?.coordinadorUid || null,
    fecha: '2026-09-16',
    nota: '',
    items: [{ id: 'SKU-1', nombre: 'Conector', categoria: 'ULTIMA MILLA', cantidad: 5 }],
    ...extra,
  };
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

  // Los perfiles y técnicos se siembran SIN reglas: son el punto de partida.
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, perfil] of Object.entries(PERFILES)) {
      await fs.setDoc(fs.doc(db, 'usuarios', uid), perfil);
    }
    for (const [id, t] of Object.entries(TECNICOS)) {
      await fs.setDoc(fs.doc(db, 'tecnicos', id), t);
    }
  });
});

test.beforeEach(async () => {
  await entorno.clearFirestore();
  // clearFirestore borra todo, así que hay que resembrar la base.
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, perfil] of Object.entries(PERFILES)) {
      await fs.setDoc(fs.doc(db, 'usuarios', uid), perfil);
    }
    for (const [id, t] of Object.entries(TECNICOS)) {
      await fs.setDoc(fs.doc(db, 'tecnicos', id), t);
    }
  });
});

test.after(async () => {
  if (entorno) await entorno.cleanup();
});

const como = (uid) => entorno.authenticatedContext(uid).firestore();

// ═══════════════════════════════════════════════════════════════════════
// El hallazgo H4: escribir el inventario de un técnico ajeno
// ═══════════════════════════════════════════════════════════════════════

test('un supervisor guarda el inventario de SU técnico', async () => {
  const db = como(UIDS.supA1);
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-de-a1'), inventario('t-de-a1', UIDS.supA1))
  );
});

test('un supervisor NO puede guardar el inventario de un técnico ajeno', async () => {
  // Este es el hueco que encontró QA: A1 escribe sobre el técnico de A2
  // poniendo su PROPIO uid, y la regla lo daba por bueno sin mirar de quién
  // es realmente el técnico.
  const db = como(UIDS.supA1);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-de-a2'), inventario('t-de-a2', UIDS.supA1))
  );
});

test('un supervisor no puede hacerse pasar por otro supervisor', async () => {
  const db = como(UIDS.supA1);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-de-a2'), inventario('t-de-a2', UIDS.supA2))
  );
});

test('tampoco puede pisar el inventario ajeno que ya existe', async () => {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    await fs.setDoc(
      fs.doc(ctx.firestore(), 'inventario_herramientas', 't-de-a2'),
      inventario('t-de-a2', UIDS.supA2)
    );
  });
  const db = como(UIDS.supA1);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-de-a2'), inventario('t-de-a2', UIDS.supA1))
  );
});

test('en las entregas de material tampoco vale un técnico ajeno', async () => {
  const db = como(UIDS.supA1);
  await rut.assertSucceeds(fs.addDoc(fs.collection(db, 'inventario_materiales'), entrega('t-de-a1', UIDS.supA1)));
  await rut.assertFails(fs.addDoc(fs.collection(db, 'inventario_materiales'), entrega('t-de-a2', UIDS.supA1)));
});

// ═══════════════════════════════════════════════════════════════════════
// Lectura: quién ve qué
// ═══════════════════════════════════════════════════════════════════════

test('un supervisor no lee el inventario de otro supervisor', async () => {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    await fs.setDoc(
      fs.doc(ctx.firestore(), 'inventario_herramientas', 't-de-a2'),
      inventario('t-de-a2', UIDS.supA2)
    );
  });
  const db = como(UIDS.supA1);
  await rut.assertFails(fs.getDoc(fs.doc(db, 'inventario_herramientas', 't-de-a2')));
});

test('el coordinador lee los inventarios de sus supervisores por lotes de "in"', async () => {
  // Esta es la consulta REAL de js/reporte-herramientas.js. La hipótesis 1 de
  // QA decía que las reglas podían rechazarla entera por usar un get().
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-de-a1'), inventario('t-de-a1', UIDS.supA1));
    await fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-de-a2'), inventario('t-de-a2', UIDS.supA2));
  });

  const db = como(UIDS.coordA);
  const q = fs.query(
    fs.collection(db, 'inventario_herramientas'),
    fs.where('supervisorUid', 'in', [UIDS.supA1, UIDS.supA2])
  );
  const snap = await rut.assertSucceeds(fs.getDocs(q));
  assert.strictEqual(snap.size, 2, 'el coordinador debe ver los dos inventarios');
});

test('un coordinador de otro árbol no ve nada', async () => {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    await fs.setDoc(
      fs.doc(ctx.firestore(), 'inventario_herramientas', 't-de-a1'),
      inventario('t-de-a1', UIDS.supA1)
    );
  });
  const db = como(UIDS.coordB);
  await rut.assertFails(fs.getDoc(fs.doc(db, 'inventario_herramientas', 't-de-a1')));
  await rut.assertFails(
    fs.getDocs(fs.query(
      fs.collection(db, 'inventario_herramientas'),
      fs.where('supervisorUid', 'in', [UIDS.supA1])
    ))
  );
});

// ═══════════════════════════════════════════════════════════════════════
// Cuentas inhabilitadas y sesión
// ═══════════════════════════════════════════════════════════════════════

test('un supervisor inhabilitado no puede escribir', async () => {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    await fs.setDoc(fs.doc(ctx.firestore(), 'tecnicos', 't-del-inactivo'), {
      nombre: 'Técnico', supervisorUid: UIDS.supInactivo,
    });
  });
  const db = como(UIDS.supInactivo);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-del-inactivo'), inventario('t-del-inactivo', UIDS.supInactivo))
  );
});

test('sin sesión no se lee ni se escribe nada', async () => {
  const db = entorno.unauthenticatedContext().firestore();
  await rut.assertFails(fs.getDoc(fs.doc(db, 'inventario_herramientas', 't-de-a1')));
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-de-a1'), inventario('t-de-a1', UIDS.supA1))
  );
});

// ═══════════════════════════════════════════════════════════════════════
// El coordinador también puede registrar por sus supervisores
// ═══════════════════════════════════════════════════════════════════════

test('el coordinador guarda el inventario de un técnico de su supervisor', async () => {
  const db = como(UIDS.coordA);
  await rut.assertSucceeds(
    fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-de-a1'), inventario('t-de-a1', UIDS.supA1))
  );
});

test('el coordinador no puede tocar el inventario de otro árbol', async () => {
  const db = como(UIDS.coordA);
  await rut.assertFails(
    fs.setDoc(fs.doc(db, 'inventario_herramientas', 't-de-b1'), inventario('t-de-b1', UIDS.supB1))
  );
});
