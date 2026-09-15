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

test('renglonesConDatos descarta los renglones vacíos', async () => {
    const { renglonesConDatos } = await carga();
    const filas = renglonesConDatos([
        { id: 'a', bueno: 1 },
        { id: 'b' },
        { id: 'c', malo: '0' },
        { id: 'd', regular: 2 },
    ]);
    assert.deepStrictEqual(filas.map((f) => f.id), ['a', 'd']);
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
    // Renglones sin id o en cero no entran al reporte.
    assert.deepStrictEqual(resumirHerramientas([{ items: [{ bueno: 5 }, { id: 'z', bueno: 0 }] }]), []);
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
