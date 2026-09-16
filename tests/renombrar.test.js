// tests/renombrar.test.js
// Corregir un nombre no es un updateDoc: el nombre está copiado dentro de
// varias colecciones, y los tableros agrupan POR nombre. Si una copia se queda
// sin corregir, el coordinador ve dos supervisores donde hay uno.
//
// Estas pruebas leen el código para detectar copias nuevas sin propagar, que es
// el mismo tipo de olvido que ya se coló una vez con el respaldo.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const carga = () => import('../js/renombrar-data.js');

/**
 * Colecciones donde el código ESCRIBE una copia del campo dado.
 *
 * Se mira DENTRO de cada addDoc/setDoc: buscar el campo en el archivo entero y
 * atribuírselo a todas sus colecciones daba falsos positivos (panel.js escribe
 * en `usuarios` y en `invitaciones`, que no copian ningún nombre).
 */
function coleccionesQueCopian(campo) {
    const encontradas = new Set();
    const RE_ESCRITURA = /\b(?:addDoc|setDoc)\s*\(\s*(?:collection|doc)\s*\(\s*db\s*,\s*"([^"]+)"/g;

    for (const archivo of fs.readdirSync(path.join(RAIZ, 'js'))) {
        if (!archivo.endsWith('.js') || archivo.startsWith('renombrar')) continue;
        const txt = fs.readFileSync(path.join(RAIZ, 'js', archivo), 'utf8');

        for (const m of txt.matchAll(RE_ESCRITURA)) {
            if (objetoQueSeEscribe(txt, m.index).includes(`${campo}:`)) encontradas.add(m[1]);
        }
    }
    return encontradas;
}

/**
 * Devuelve el objeto literal que se está escribiendo, contando llaves desde la
 * llamada. Hace falta ser exacto: mirar "hasta la siguiente escritura" atribuía
 * campos de otras partes del archivo a la colección equivocada (invitaciones
 * guarda creadorNombre, no supervisorNombre, y salía marcada).
 */
function objetoQueSeEscribe(txt, desde) {
    const inicio = txt.indexOf('{', desde);
    if (inicio === -1) return '';
    let nivel = 0;
    for (let i = inicio; i < txt.length; i++) {
        if (txt[i] === '{') nivel++;
        else if (txt[i] === '}') {
            nivel--;
            if (nivel === 0) return txt.slice(inicio, i + 1);
        }
    }
    return txt.slice(inicio);
}

test('los catálogos de copias están bien formados', async () => {
    const { COPIAS_DE_SUPERVISOR, COPIAS_DE_TECNICO } = await carga();
    for (const lista of [COPIAS_DE_SUPERVISOR, COPIAS_DE_TECNICO]) {
        assert.ok(lista.length > 0);
        for (const c of lista) {
            assert.ok(c.coleccion && c.campoUid && c.campoNombre,
                `entrada incompleta: ${JSON.stringify(c)}`);
        }
    }
});

test('toda colección que copia supervisorNombre se corrige o está justificada', async () => {
    const { COPIAS_DE_SUPERVISOR, NO_SE_CORRIGEN } = await carga();
    const copian = coleccionesQueCopian('supervisorNombre');
    const corregidas = new Set(COPIAS_DE_SUPERVISOR.map((c) => c.coleccion));

    const olvidadas = [...copian].filter((c) => !corregidas.has(c) && !(c in NO_SE_CORRIGEN));
    assert.deepStrictEqual(olvidadas, [],
        `estas colecciones guardan supervisorNombre pero NO se corrigen: ${olvidadas.join(', ')}. ` +
        `Agrégalas a COPIAS_DE_SUPERVISOR en js/renombrar.js, o a NO_SE_CORRIGEN con su razón.`);
});

test('toda colección que copia tecnicoNombre se corrige o está justificada', async () => {
    const { COPIAS_DE_TECNICO, NO_SE_CORRIGEN } = await carga();
    const copian = coleccionesQueCopian('tecnicoNombre');
    // El inventario de herramientas se corrige aparte: su id de documento ES el
    // técnico, así que no hace falta consultarlo.
    const corregidas = new Set([...COPIAS_DE_TECNICO.map((c) => c.coleccion), 'inventario_herramientas', 'tecnicos']);

    const olvidadas = [...copian].filter((c) => !corregidas.has(c) && !(c in NO_SE_CORRIGEN));
    assert.deepStrictEqual(olvidadas, [],
        `estas colecciones guardan tecnicoNombre pero NO se corrigen: ${olvidadas.join(', ')}`);
});

test('las excepciones están declaradas con su razón, no sueltas', async () => {
    const { NO_SE_CORRIGEN } = await carga();
    assert.ok(Object.keys(NO_SE_CORRIGEN).length > 0);
    for (const [coleccion, razon] of Object.entries(NO_SE_CORRIGEN)) {
        assert.ok(razon && razon.length > 40,
            `${coleccion} está excluida sin explicar por qué; una excepción sin razón es un olvido disfrazado`);
    }
});

test('se corrigen las colecciones que de verdad importan', async () => {
    const { COPIAS_DE_SUPERVISOR } = await carga();
    const cols = COPIAS_DE_SUPERVISOR.map((c) => c.coleccion);
    // bitacoras y evaluaciones alimentan los tableros, que agrupan POR NOMBRE.
    // enlaces se muestra en la página pública que abre el técnico.
    for (const c of ['tecnicos', 'evaluaciones', 'bitacoras', 'enlaces',
                     'inventario_herramientas', 'inventario_materiales']) {
        assert.ok(cols.includes(c), `falta ${c} en la propagación del nombre de supervisor`);
    }
});

test('validarNombre limpia y rechaza lo que no sirve', async () => {
    const { validarNombre } = await carga();
    assert.deepStrictEqual(validarNombre('  Juan   Pérez  ', 'Otro'), { valido: true, nombre: 'Juan Pérez' },
        'debe recortar y colapsar espacios');
    assert.strictEqual(validarNombre('', 'Juan').valido, false);
    assert.strictEqual(validarNombre('   ', 'Juan').valido, false);
    assert.strictEqual(validarNombre('J', 'Juan').valido, false, 'una letra no es un nombre');
    assert.strictEqual(validarNombre('Juan', 'Juan').valido, false, 'el mismo nombre no es una corrección');
    // Un cambio de espacios sí cuenta: "JuanPérez" → "Juan Pérez" es corregir.
    assert.strictEqual(validarNombre('Juan Pérez', 'JuanPérez').valido, true);
    assert.strictEqual(validarNombre(null, 'Juan').valido, false);
});

test('totalDeResumen y describirResumen cuentan lo que se tocó', async () => {
    const { totalDeResumen, describirResumen } = await carga();
    const resumen = { usuarios: 1, tecnicos: 4, bitacoras: 12 };
    assert.strictEqual(totalDeResumen(resumen), 17);
    assert.strictEqual(totalDeResumen({}), 0);
    assert.strictEqual(totalDeResumen(null), 0);

    const texto = describirResumen(resumen);
    assert.match(texto, /1 perfil/);
    assert.match(texto, /4 técnicos/);
    assert.match(texto, /12 bitácoras/);
    assert.strictEqual(describirResumen({}), 'ningún registro');
    // Las colecciones en cero no se nombran: decir "0 bitácoras" es ruido.
    assert.strictEqual(describirResumen({ tecnicos: 2, bitacoras: 0 }), '2 técnicos');

    // Singular y plural: este texto lo lee el usuario, y "1 entregas de
    // material" delata que nadie lo revisó.
    assert.strictEqual(describirResumen({ inventario_materiales: 1 }), '1 entrega de material');
    assert.strictEqual(describirResumen({ inventario_materiales: 3 }), '3 entregas de material');
    assert.strictEqual(describirResumen({ tecnicos: 1 }), '1 técnico');
    assert.strictEqual(describirResumen({ evaluaciones: 1 }), '1 evaluación');
    assert.strictEqual(describirResumen({ bitacoras: 1 }), '1 bitácora');
    assert.strictEqual(describirResumen({ enlaces: 1 }), '1 enlace de evaluación');
});
