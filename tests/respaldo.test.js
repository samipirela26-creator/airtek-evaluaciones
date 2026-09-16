// tests/respaldo.test.js
// El respaldo del root debe cubrir TODAS las colecciones del sistema.
//
// Esta prueba existe porque la lista se quedó atrás: se escribió antes de que
// existieran las bitácoras y los inventarios, y durante meses el respaldo dio
// una falsa sensación de seguridad. Si alguien agrega una colección y olvida
// meterla en el respaldo, esta prueba lo agarra.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');

/** Colecciones que el código realmente usa: collection(db, "nombre"). */
function coleccionesUsadas() {
    const encontradas = new Set();
    for (const archivo of fs.readdirSync(path.join(RAIZ, 'js'))) {
        if (!archivo.endsWith('.js')) continue;
        const txt = fs.readFileSync(path.join(RAIZ, 'js', archivo), 'utf8');
        // collection(db, "x")  y  doc(db, "x", id)
        for (const m of txt.matchAll(/\b(?:collection|doc)\s*\(\s*db\s*,\s*"([^"]+)"/g)) {
            encontradas.add(m[1]);
        }
    }
    return encontradas;
}

/** La lista declarada en js/panel.js. */
function coleccionesRespaldadas() {
    const txt = fs.readFileSync(path.join(RAIZ, 'js', 'panel.js'), 'utf8');
    const bloque = txt.match(/const COLECCIONES_RESPALDO = \[([\s\S]*?)\]/);
    assert.ok(bloque, 'no se encontró COLECCIONES_RESPALDO en js/panel.js');
    return new Set([...bloque[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
}

test('el respaldo cubre todas las colecciones que usa la app', () => {
    const usadas = coleccionesUsadas();
    const respaldadas = coleccionesRespaldadas();

    // `auditoria` queda fuera a propósito: es una bitácora de eventos que se
    // reconstruye sola y no es dato de negocio que haya que poder restaurar.
    const fueraAProposito = new Set(['auditoria']);

    const olvidadas = [...usadas].filter((c) => !respaldadas.has(c) && !fueraAProposito.has(c));
    assert.deepStrictEqual(
        olvidadas, [],
        `estas colecciones se usan pero NO entran al respaldo: ${olvidadas.join(', ')}. ` +
        `Agrégalas a COLECCIONES_RESPALDO en js/panel.js.`
    );
});

test('el respaldo no promete colecciones que no existen', () => {
    const usadas = coleccionesUsadas();
    const respaldadas = coleccionesRespaldadas();
    const fantasmas = [...respaldadas].filter((c) => !usadas.has(c));
    assert.deepStrictEqual(
        fantasmas, [],
        `el respaldo lista colecciones que nadie usa: ${fantasmas.join(', ')}`
    );
});

test('el respaldo incluye las dos colecciones nuevas y las bitácoras', () => {
    const respaldadas = coleccionesRespaldadas();
    for (const c of ['bitacoras', 'inventario_herramientas', 'inventario_materiales']) {
        assert.ok(respaldadas.has(c), `falta ${c} en el respaldo`);
    }
});

test('las fotos de las bitácoras se respaldan aparte, por subcolección', () => {
    // Las fotos no están en la colección raíz: viven en bitacoras/{id}/fotos y
    // hay que recorrerlas una por una. Si alguien quita ese recorrido, el
    // respaldo vuelve a perder la evidencia sin avisar.
    const txt = fs.readFileSync(path.join(RAIZ, 'js', 'panel.js'), 'utf8');
    assert.match(txt, /collection\(db, "bitacoras", [^,]+, "fotos"\)/,
        'el respaldo debe recorrer la subcolección de fotos de cada bitácora');
    assert.match(txt, /bitacorasFotos/,
        'las fotos deben guardarse en el archivo de respaldo');
});
