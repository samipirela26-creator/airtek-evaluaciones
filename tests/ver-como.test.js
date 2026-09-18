// tests/ver-como.test.js
// Lógica pura del modo "Ver como" (spec 003). session.js conecta esto a
// sessionStorage real; aquí se prueba con un almacenamiento de mentira para
// no depender de Firebase ni del navegador.

const test = require('node:test');
const assert = require('node:assert');

const carga = () => import('../js/ver-como-data.js');

// Doble mínimo de sessionStorage: mismo contrato (getItem/setItem/removeItem).
function storageFalso(inicial = {}) {
  const datos = { ...inicial };
  return {
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => { datos[k] = v; },
    removeItem: (k) => { delete datos[k]; },
  };
}

test('sin "Ver como" activo, el contexto efectivo es el real', async () => {
  const { contextoEfectivo, leerVerComo } = await carga();
  const storage = storageFalso();
  const real = { user: { uid: 'root-1' }, perfil: { nombre: 'Root', rol: 'root' } };

  assert.strictEqual(leerVerComo(storage), null);
  const ctx = contextoEfectivo(real, leerVerComo(storage));
  assert.strictEqual(ctx.uid, 'root-1');
  assert.deepStrictEqual(ctx.perfil, { nombre: 'Root', rol: 'root' });
  assert.strictEqual(ctx.impersonando, false);
  assert.strictEqual(ctx.real, real);
});

test('activar "Ver como" cambia el uid/perfil efectivos sin perder la identidad real', async () => {
  const { escribirVerComo, leerVerComo, contextoEfectivo } = await carga();
  const storage = storageFalso();
  const real = { user: { uid: 'root-1' }, perfil: { nombre: 'Root', rol: 'root' } };
  const objetivo = { nombre: 'Juan Pérez', rol: 'supervisor' };

  escribirVerComo(storage, 'sup-9', objetivo);
  const ctx = contextoEfectivo(real, leerVerComo(storage));

  assert.strictEqual(ctx.uid, 'sup-9');
  assert.deepStrictEqual(ctx.perfil, { nombre: 'Juan Pérez', rol: 'supervisor' });
  assert.strictEqual(ctx.impersonando, true);
  // La identidad real de root se conserva para auditoría y para no atribuir
  // mal ninguna escritura.
  assert.strictEqual(ctx.real, real);
  assert.strictEqual(ctx.real.user.uid, 'root-1');
});

test('borrar "Ver como" vuelve a la identidad real', async () => {
  const { escribirVerComo, borrarVerComo, leerVerComo, contextoEfectivo } = await carga();
  const storage = storageFalso();
  const real = { user: { uid: 'root-1' }, perfil: { nombre: 'Root', rol: 'root' } };

  escribirVerComo(storage, 'sup-9', { nombre: 'Juan Pérez', rol: 'supervisor' });
  borrarVerComo(storage);

  const ctx = contextoEfectivo(real, leerVerComo(storage));
  assert.strictEqual(ctx.impersonando, false);
  assert.strictEqual(ctx.uid, 'root-1');
});

test('un valor corrupto en el almacenamiento se trata como "sin Ver como"', async () => {
  const { leerVerComo } = await carga();
  const storage = storageFalso({ airtek_ver_como: '{ esto no es JSON válido' });
  assert.strictEqual(leerVerComo(storage), null);
});

test('sin almacenamiento disponible, no se rompe: se trata como "sin Ver como"', async () => {
  const { leerVerComo } = await carga();
  const storageBloqueado = {
    getItem() { throw new Error('bloqueado'); },
  };
  assert.strictEqual(leerVerComo(storageBloqueado), null);
});
