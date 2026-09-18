// tests/prueba-data.test.js
// Lógica pura del "Modo de prueba" (spec 004). session.js conecta esto a
// sessionStorage real; aquí se prueba con un almacenamiento de mentira para
// no depender de Firebase ni del navegador.

const test = require('node:test');
const assert = require('node:assert');

const carga = () => import('../js/prueba-data.js');

// Doble mínimo de sessionStorage: mismo contrato (getItem/setItem/removeItem).
function storageFalso(inicial = {}) {
  const datos = { ...inicial };
  return {
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => { datos[k] = v; },
    removeItem: (k) => { delete datos[k]; },
  };
}

test('sin "Modo de prueba" activo, leerPrueba devuelve null', async () => {
  const { leerPrueba } = await carga();
  assert.strictEqual(leerPrueba(storageFalso()), null);
});

test('activar como coordinador: uid NUNCA cambia, solo el rol', async () => {
  const { escribirPrueba, leerPrueba, contextoEfectivoPrueba } = await carga();
  const storage = storageFalso();
  const real = { user: { uid: 'root-1' }, perfil: { nombre: 'Samuel (Root)', rol: 'root' } };

  escribirPrueba(storage, 'coordinador');
  const ctx = contextoEfectivoPrueba(real, leerPrueba(storage));

  assert.strictEqual(ctx.uid, 'root-1'); // el uid real, no uno inventado
  assert.strictEqual(ctx.perfil.rol, 'coordinador');
  assert.strictEqual(ctx.perfil.nombre, 'Samuel (Root)');
  assert.strictEqual(ctx.impersonando, false); // "Modo de prueba" nunca bloquea escritura
  assert.strictEqual(ctx.enPrueba, true);
  assert.strictEqual(ctx.real, real);
});

test('actuar como supervisor: coordinadorUid resuelve al propio uid real', async () => {
  const { escribirPrueba, leerPrueba, contextoEfectivoPrueba } = await carga();
  const storage = storageFalso();
  const real = { user: { uid: 'root-1' }, perfil: { nombre: 'Samuel (Root)', rol: 'root' } };

  escribirPrueba(storage, 'supervisor');
  const ctx = contextoEfectivoPrueba(real, leerPrueba(storage));

  assert.strictEqual(ctx.uid, 'root-1');
  assert.strictEqual(ctx.perfil.rol, 'supervisor');
  // No existe un coordinador de prueba aparte: root es su propio coordinador.
  assert.strictEqual(ctx.perfil.coordinadorUid, 'root-1');
});

test('actuar como coordinador: coordinadorUid no se inventa (root no tiene uno propio)', async () => {
  const { escribirPrueba, leerPrueba, contextoEfectivoPrueba } = await carga();
  const storage = storageFalso();
  const real = { user: { uid: 'root-1' }, perfil: { nombre: 'Samuel (Root)', rol: 'root' } };

  escribirPrueba(storage, 'coordinador');
  const ctx = contextoEfectivoPrueba(real, leerPrueba(storage));

  assert.strictEqual(ctx.perfil.coordinadorUid, null);
});

test('borrar "Modo de prueba" vuelve a "sin modo"', async () => {
  const { escribirPrueba, borrarPrueba, leerPrueba } = await carga();
  const storage = storageFalso();

  escribirPrueba(storage, 'supervisor');
  borrarPrueba(storage);

  assert.strictEqual(leerPrueba(storage), null);
});

test('un valor corrupto en el almacenamiento se trata como "sin modo"', async () => {
  const { leerPrueba } = await carga();
  const storage = storageFalso({ airtek_modo_prueba: '{ esto no es JSON válido' });
  assert.strictEqual(leerPrueba(storage), null);
});

test('sin almacenamiento disponible, no se rompe: se trata como "sin modo"', async () => {
  const { leerPrueba } = await carga();
  const storageBloqueado = {
    getItem() { throw new Error('bloqueado'); },
  };
  assert.strictEqual(leerPrueba(storageBloqueado), null);
});
