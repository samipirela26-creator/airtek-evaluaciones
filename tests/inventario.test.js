// tests/inventario.test.js
// Consolidado de herramientas y catálogos de inventario. Sin red ni Firebase.

const test = require('node:test');
const assert = require('node:assert');

const carga = () => import('../js/inventario-data.js');

test('los catálogos están completos y sin ids repetidos', async () => {
    const {
        HERRAMIENTAS, CATEGORIAS_HERRAMIENTAS,
        MATERIALES_USO_DIARIO, CATEGORIAS_MATERIALES,
        ESTADOS_HERRAMIENTA,
    } = await carga();

    assert.deepStrictEqual(ESTADOS_HERRAMIENTA, ['bueno', 'regular', 'malo']);
    assert.ok(HERRAMIENTAS.length > 50, 'el catálogo de herramientas debería traer la lista del cliente');
    assert.ok(MATERIALES_USO_DIARIO.length > 20, 'el catálogo de materiales debería traer la lista del cliente');

    const idsH = HERRAMIENTAS.map((h) => h.id);
    assert.strictEqual(new Set(idsH).size, idsH.length, 'hay ids de herramienta repetidos');
    const idsM = MATERIALES_USO_DIARIO.map((m) => m.id);
    assert.strictEqual(new Set(idsM).size, idsM.length, 'hay ids de material repetidos');

    // Toda herramienta y material pertenece a una categoría declarada.
    for (const h of HERRAMIENTAS) {
        assert.ok(CATEGORIAS_HERRAMIENTAS.includes(h.categoria), `categoría desconocida: ${h.categoria}`);
        assert.ok(h.nombre && h.id, 'toda herramienta necesita id y nombre');
    }
    for (const m of MATERIALES_USO_DIARIO) {
        assert.ok(CATEGORIAS_MATERIALES.includes(m.categoria), `categoría desconocida: ${m.categoria}`);
    }
});

test('aEntero descarta basura y negativos', async () => {
    const { aEntero } = await carga();
    assert.strictEqual(aEntero(3), 3);
    assert.strictEqual(aEntero('7'), 7);
    assert.strictEqual(aEntero('2.9'), 2);
    assert.strictEqual(aEntero(-4), 0);
    assert.strictEqual(aEntero(''), 0);
    assert.strictEqual(aEntero(null), 0);
    assert.strictEqual(aEntero('hola'), 0);
    assert.strictEqual(aEntero(undefined), 0);
});

test('normalizarRenglon calcula la cantidad como la suma de los estados', async () => {
    const { normalizarRenglon } = await carga();
    const r = normalizarRenglon({ id: 'x', bueno: '2', regular: 1, malo: '3', observacion: '  gastado ' });
    assert.strictEqual(r.cantidad, 6);
    assert.strictEqual(r.observacion, 'gastado');
    assert.strictEqual(normalizarRenglon({ id: 'y' }).cantidad, 0);
});

test('renglonesConDatos guarda lo que el supervisor escribió, incluido el cero', async () => {
    const { renglonesConDatos } = await carga();
    const filas = renglonesConDatos([
        { id: 'a', bueno: 1 },
        { id: 'b' },                        // en blanco: no se revisó
        { id: 'c', malo: '0' },             // cero escrito: SÍ se revisó, no tiene
        { id: 'd', regular: 2 },
        { id: 'e', observacion: 'prestada' }, // solo observación: también cuenta
        { id: 'f', bueno: '  ' },           // espacios en blanco: no cuenta
    ]);
    assert.deepStrictEqual(filas.map((f) => f.id), ['a', 'c', 'd', 'e']);

    // El cero escrito queda como cantidad 0, no desaparece.
    const c = filas.find((f) => f.id === 'c');
    assert.strictEqual(c.cantidad, 0);
});

test('fueEscrito distingue el cero del campo en blanco', async () => {
    const { fueEscrito } = await carga();
    assert.strictEqual(fueEscrito({ bueno: 0 }), true, 'un cero es un dato');
    assert.strictEqual(fueEscrito({ bueno: '0' }), true);
    assert.strictEqual(fueEscrito({ bueno: '' }), false);
    assert.strictEqual(fueEscrito({ bueno: null }), false);
    assert.strictEqual(fueEscrito({}), false);
    assert.strictEqual(fueEscrito({ serial: 'ABC-1' }), true, 'un serial sin cantidades también');
});

test('valorParaCampo devuelve el cero guardado, no un campo vacío', async () => {
    const { valorParaCampo } = await carga();
    assert.strictEqual(valorParaCampo(0), 0, 'un 0 guardado debe volver a verse como 0');
    assert.strictEqual(valorParaCampo('0'), 0);
    assert.strictEqual(valorParaCampo(3), 3);
    assert.strictEqual(valorParaCampo(undefined), '');
    assert.strictEqual(valorParaCampo(null), '');
    assert.strictEqual(valorParaCampo(''), '');
});

test('resumirHerramientas suma unidades de varios técnicos', async () => {
    const { resumirHerramientas, HERRAMIENTAS } = await carga();
    const [h1, h2] = HERRAMIENTAS;

    const resumen = resumirHerramientas([
        { items: [{ id: h1.id, bueno: 1, malo: 2 }, { id: h2.id, regular: 1 }] },
        { items: [{ id: h1.id, bueno: 3, regular: 1 }] },
    ]);

    const fila1 = resumen.find((f) => f.id === h1.id);
    assert.strictEqual(fila1.bueno, 4);
    assert.strictEqual(fila1.regular, 1);
    assert.strictEqual(fila1.malo, 2);
    assert.strictEqual(fila1.total, 7);
    assert.strictEqual(fila1.tecnicos, 2, 'debe contar los dos técnicos que la tienen');
    assert.strictEqual(fila1.nombre, h1.nombre, 'debe resolver el nombre desde el catálogo');

    // Lo más urgente (más unidades malas) va primero.
    assert.strictEqual(resumen[0].id, h1.id);
});

test('resumirHerramientas aguanta entradas vacías y ruidosas', async () => {
    const { resumirHerramientas } = await carga();
    assert.deepStrictEqual(resumirHerramientas([]), []);
    assert.deepStrictEqual(resumirHerramientas(null), []);
    assert.deepStrictEqual(resumirHerramientas([{ items: [] }, {}, { items: null }]), []);
    // Un renglón sin id no se puede atribuir a ninguna herramienta: se descarta.
    assert.deepStrictEqual(resumirHerramientas([{ items: [{ bueno: 5 }] }]), []);
});

test('una herramienta auditada en cero aparece en el reporte, con total cero', async () => {
    const { resumirHerramientas, HERRAMIENTAS } = await carga();
    const [h1] = HERRAMIENTAS;
    // Dos técnicos revisados: uno tiene 2, el otro confirmó que no tiene ninguna.
    const resumen = resumirHerramientas([
        { items: [{ id: h1.id, bueno: 2 }] },
        { items: [{ id: h1.id, bueno: 0, regular: 0, malo: 0 }] },
    ]);
    assert.strictEqual(resumen.length, 1);
    assert.strictEqual(resumen[0].total, 2);
    assert.strictEqual(resumen[0].tecnicos, 1, 'solo uno la tiene');
    assert.strictEqual(resumen[0].auditados, 2, 'pero a los dos se les revisó');

    // Nadie la tiene, pero a todos se les revisó: la fila NO desaparece.
    const enCero = resumirHerramientas([
        { items: [{ id: h1.id, bueno: 0 }] },
        { items: [{ id: h1.id, bueno: 0 }] },
    ]);
    assert.strictEqual(enCero.length, 1, 'el coordinador debe poder ver que se revisó y no hay');
    assert.strictEqual(enCero[0].total, 0);
    assert.strictEqual(enCero[0].tecnicos, 0);
    assert.strictEqual(enCero[0].auditados, 2);
});

test('una herramienta que ya no está en el catálogo no se pierde del reporte', async () => {
    const { resumirHerramientas } = await carga();
    const resumen = resumirHerramientas([{ items: [{ id: 'herramienta-que-ya-no-existe', malo: 2 }] }]);
    assert.strictEqual(resumen.length, 1);
    assert.strictEqual(resumen[0].nombre, 'herramienta-que-ya-no-existe');
    assert.strictEqual(resumen[0].categoria, 'SIN CATEGORÍA');
    assert.strictEqual(resumen[0].malo, 2);
});

test('totalesHerramientas y porReponer', async () => {
    const { resumirHerramientas, totalesHerramientas, porReponer, HERRAMIENTAS } = await carga();
    const [h1, h2] = HERRAMIENTAS;
    const resumen = resumirHerramientas([
        { items: [{ id: h1.id, bueno: 2, malo: 1 }, { id: h2.id, bueno: 4 }] },
    ]);

    assert.deepStrictEqual(totalesHerramientas(resumen), { total: 7, bueno: 6, regular: 0, malo: 1 });
    assert.deepStrictEqual(totalesHerramientas([]), { total: 0, bueno: 0, regular: 0, malo: 0 });

    const reponer = porReponer(resumen);
    assert.strictEqual(reponer.length, 1);
    assert.strictEqual(reponer[0].id, h1.id, 'solo lo que tiene unidades malas');
});

test('aplanarEntregas genera una fila por material con cantidad', async () => {
    const { aplanarEntregas } = await carga();
    const filas = aplanarEntregas([
        {
            fecha: '2026-09-15', tecnicoNombre: 'Luis', supervisorNombre: 'Ana', nota: 'semanal',
            items: [
                { id: 'SKU-1', nombre: 'Conector', categoria: 'GPON', cantidad: 10 },
                { id: 'SKU-2', nombre: 'Grapa', categoria: 'GPON', cantidad: 0 },
            ],
        },
    ]);
    assert.strictEqual(filas.length, 1, 'los materiales en cero no se exportan');
    assert.strictEqual(filas[0].codigo, 'SKU-1');
    assert.strictEqual(filas[0].cantidad, 10);
    assert.strictEqual(filas[0].tecnicoNombre, 'Luis');
    assert.deepStrictEqual(aplanarEntregas([]), []);
});
