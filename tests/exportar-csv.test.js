// tests/exportar-csv.test.js
// Generación de CSV compatible con Excel. Sin DOM: solo las funciones puras.

const test = require('node:test');
const assert = require('node:assert');

const carga = () => import('../js/exportar-csv.js');

test('escaparCampo entrecomilla solo cuando hace falta', async () => {
    const { escaparCampo } = await carga();
    assert.strictEqual(escaparCampo('simple'), 'simple');
    assert.strictEqual(escaparCampo('con, coma'), '"con, coma"');
    assert.strictEqual(escaparCampo('con; punto y coma'), '"con; punto y coma"');
    assert.strictEqual(escaparCampo('salto\nde línea'), '"salto\nde línea"');
    assert.strictEqual(escaparCampo('dijo "hola"'), '"dijo ""hola"""');
    assert.strictEqual(escaparCampo(null), '');
    assert.strictEqual(escaparCampo(undefined), '');
    assert.strictEqual(escaparCampo(0), '0');
    assert.strictEqual(escaparCampo(false), 'false');
});

test('filasACSV respeta columnas, valores calculados y filas vacías', async () => {
    const { filasACSV } = await carga();
    const columnas = [
        { clave: 'nombre', titulo: 'Nombre' },
        { clave: 'total', titulo: 'Total' },
        { clave: 'doble', titulo: 'Doble', valor: (f) => f.total * 2 },
    ];

    const csv = filasACSV(columnas, [{ nombre: 'Alicate', total: 3 }]);
    const lineas = csv.split('\r\n');
    assert.strictEqual(lineas[0], 'Nombre,Total,Doble');
    assert.strictEqual(lineas[1], 'Alicate,3,6');

    // Sin filas queda solo la cabecera: el archivo abre igual en Excel.
    assert.strictEqual(filasACSV(columnas, []), 'Nombre,Total,Doble');
    assert.strictEqual(filasACSV(columnas, null), 'Nombre,Total,Doble');
});

test('una descripción con comas y comillas no descuadra las columnas', async () => {
    const { filasACSV } = await carga();
    const columnas = [
        { clave: 'a', titulo: 'A' },
        { clave: 'desc', titulo: 'Descripción' },
        { clave: 'b', titulo: 'B' },
    ];
    const csv = filasACSV(columnas, [{ a: 1, desc: 'Se revisó el "nodo", sin novedad', b: 2 }]);
    const fila = csv.split('\r\n')[1];
    assert.strictEqual(fila, '1,"Se revisó el ""nodo"", sin novedad",2');
});

test('conBOM antepone el BOM UTF-8 que Excel necesita', async () => {
    const { conBOM } = await carga();
    const salida = conBOM('Ñoño,Área');
    assert.strictEqual(salida.charCodeAt(0), 0xfeff, 'falta el BOM: Excel rompería los acentos');
    assert.strictEqual(salida.slice(1), 'Ñoño,Área');
});

test('nombreConFecha arma un nombre de archivo limpio', async () => {
    const { nombreConFecha } = await carga();
    assert.strictEqual(nombreConFecha('bitacoras gesto', new Date(2026, 8, 15)), 'bitacoras_gesto_2026-09-15.csv');
    assert.strictEqual(nombreConFecha('reporte/raro:1', new Date(2026, 0, 5)), 'reporte_raro_1_2026-01-05.csv');
});
