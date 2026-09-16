// tests/novedades.test.js
// El aviso de "qué cambió". Se prueba la lógica pura: qué le toca a cada rol
// y cómo se recuerda que ya lo vieron. El pintado necesita DOM y se verifica
// a mano en el navegador.

const test = require('node:test');
const assert = require('node:assert');

const carga = () => import('../js/novedades.js');

test('hay al menos una versión declarada y está bien formada', async () => {
    const { VERSIONES, ultimaVersion } = await carga();
    assert.ok(VERSIONES.length > 0, 'debería haber al menos una entrega declarada');

    for (const v of VERSIONES) {
        assert.match(v.version, /^\d+\.\d+\.\d+$/, `versión mal formada: ${v.version}`);
        assert.match(v.fecha, /^\d{4}-\d{2}-\d{2}$/, `fecha mal formada en ${v.version}`);
        assert.ok(v.titulo && v.titulo.length > 5, `falta título en ${v.version}`);
        assert.ok(v.cambios && Object.keys(v.cambios).length, `falta lista de cambios en ${v.version}`);
    }

    // La más nueva va primero: el aviso muestra VERSIONES[0].
    assert.strictEqual(ultimaVersion(), VERSIONES[0]);
});

test('las versiones van de la más nueva a la más vieja', async () => {
    const { VERSIONES } = await carga();
    const aNumero = (v) => v.version.split('.').map(Number);
    for (let i = 1; i < VERSIONES.length; i++) {
        const [a, b] = [aNumero(VERSIONES[i - 1]), aNumero(VERSIONES[i])];
        const mayor = a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];
        assert.ok(mayor, `${VERSIONES[i - 1].version} debería ir después de ${VERSIONES[i].version}`);
    }
});

test('cada rol ve lo suyo más lo de todos', async () => {
    const { cambiosPara } = await carga();
    const v = {
        cambios: {
            todos: ['común 1', 'común 2'],
            supervisor: ['solo sup'],
            coordinador: ['solo coord'],
        },
    };
    assert.deepStrictEqual(cambiosPara(v, 'supervisor'), ['común 1', 'común 2', 'solo sup']);
    assert.deepStrictEqual(cambiosPara(v, 'coordinador'), ['común 1', 'común 2', 'solo coord']);
    // Un rol sin entrada propia igual ve lo común.
    assert.deepStrictEqual(cambiosPara(v, 'root'), ['común 1', 'común 2']);
    assert.deepStrictEqual(cambiosPara(null, 'supervisor'), []);
});

test('la versión actual le dice algo útil a supervisor y a coordinador', async () => {
    // Al menos UN punto por rol. Exigir dos era arbitrario: hay entregas que
    // solo cambian una cosa para un rol, y forzar un segundo punto solo lleva a
    // inflar el texto con relleno que nadie lee.
    const { ultimaVersion, cambiosPara } = await carga();
    const v = ultimaVersion();
    for (const rol of ['supervisor', 'coordinador']) {
        const cambios = cambiosPara(v, rol);
        assert.ok(cambios.length >= 1, `${rol} no vería ningún cambio en la versión ${v.version}`);
    }
});

test('el aviso no menciona archivos ni jerga de programador', async () => {
    // Esto lo lee un supervisor en su teléfono. Si se cuela un nombre de
    // archivo o de función, el aviso deja de servirle.
    const { VERSIONES, cambiosPara } = await carga();
    const jerga = /\.js\b|firestore|subcolecci|localStorage|querySelector|commit|\bAPI\b/i;
    for (const v of VERSIONES) {
        for (const rol of ['todos', 'supervisor', 'coordinador', 'root']) {
            for (const texto of cambiosPara(v, rol)) {
                assert.ok(!jerga.test(texto), `jerga técnica en ${v.version} (${rol}): "${texto}"`);
            }
        }
    }
});

test('sin almacenamiento disponible, no se molesta al usuario', async () => {
    const { yaLaVio, marcarComoVista } = await carga();
    const original = globalThis.localStorage;
    // Navegación privada o almacenamiento bloqueado: leer lanza.
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() { throw new Error('bloqueado'); },
    });
    try {
        assert.strictEqual(yaLaVio({ version: '1.0.0' }), true,
            'si no se puede recordar, es mejor no mostrarlo en cada carga');
        assert.doesNotThrow(() => marcarComoVista({ version: '1.0.0' }));
    } finally {
        if (original === undefined) delete globalThis.localStorage;
        else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
    }
});

test('sin versión declarada no se muestra nada', async () => {
    const { yaLaVio } = await carga();
    assert.strictEqual(yaLaVio(null), true);
});
