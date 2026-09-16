// tests/bitacora.test.js
// Pruebas unitarias de la lógica de horarios y catálogos de Bitácora de Supervisión.

const test = require('node:test');
const assert = require('node:assert');

test('lógica de catálogos y horarios de bitácora', async () => {
    // Import dinámico de ES Module desde CommonJS
    const {
        ZONAS,
        NODOS,
        ACTIVIDADES_MACRO,
        SUBACTIVIDADES,
        aMinutos,
        calcularDuracionMinutos,
        validarHorario,
    } = await import('../js/bitacora-data.js');

    // 1. Verificación de catálogos
    assert.strictEqual(ZONAS.length, 4, 'Deben existir 4 zonas');
    assert.ok(ZONAS.includes('ZONA 1'));
    assert.ok(ZONAS.includes('ZONA 2 Y 5'));

    assert.strictEqual(NODOS.length, 21, 'Deben existir 21 nodos');
    assert.ok(NODOS.includes('NODO POMONA'));
    assert.ok(NODOS.includes('NODO BELLA VISTA'));

    assert.strictEqual(ACTIVIDADES_MACRO.length, 3, 'Deben existir 3 macro-actividades');
    for (const macro of ACTIVIDADES_MACRO) {
        assert.ok(Array.isArray(SUBACTIVIDADES[macro]), `Debe haber subactividades para ${macro}`);
        assert.ok(SUBACTIVIDADES[macro].length > 0, `${macro} debe tener opciones`);
    }

    // 2. Conversión a minutos
    assert.strictEqual(aMinutos('08:30'), 510);
    assert.strictEqual(aMinutos('00:00'), 0);
    assert.strictEqual(aMinutos('23:59'), 1439);
    assert.strictEqual(aMinutos('24:00'), null, '24:00 debe ser inválido');
    assert.strictEqual(aMinutos('abc'), null);

    // 3. Duración normal en el mismo día
    assert.strictEqual(calcularDuracionMinutos('08:00', '12:30', false), 270);
    assert.strictEqual(calcularDuracionMinutos('14:15', '16:45', false), 150);

    // 4. Rechazo si fin <= inicio en el mismo día
    assert.strictEqual(calcularDuracionMinutos('10:00', '10:00', false), null);
    assert.strictEqual(calcularDuracionMinutos('17:00', '16:00', false), null);

    // 5. Cruce de medianoche (diaSiguiente = true)
    // 22:00 a 02:00 son 2 horas de noche + 2 horas de madrugada = 4 horas (240 min)
    assert.strictEqual(calcularDuracionMinutos('22:00', '02:00', true), 240);
    // 23:30 a 00:30 = 60 min
    assert.strictEqual(calcularDuracionMinutos('23:30', '00:30', true), 60);

    // 6. Función validarHorario
    const errMismoHorario = validarHorario('15:00', '14:00', false);
    assert.strictEqual(errMismoHorario.valido, false);
    assert.ok(errMismoHorario.error.includes('posterior'));

    const okNormal = validarHorario('09:00', '11:30', false);
    assert.strictEqual(okNormal.valido, true);
    assert.strictEqual(okNormal.minutos, 150);

    const okMedianoche = validarHorario('22:00', '01:30', true);
    assert.strictEqual(okMedianoche.valido, true);
    assert.strictEqual(okMedianoche.minutos, 210);
});

// ── Fechas, filtros y resumen (Tablero de Bitácora) ────────────────────

test('fechaDeBitacora prefiere el campo fecha y cae a createdAt', async () => {
    const { fechaDeBitacora, fechaEsInferida } = await import('../js/bitacora-data.js');

    assert.strictEqual(fechaDeBitacora({ fecha: '2026-09-15' }), '2026-09-15');
    assert.strictEqual(fechaEsInferida({ fecha: '2026-09-15' }), false);

    // Bitácora vieja: sin campo fecha, se infiere de createdAt.
    const d = new Date(2026, 8, 10, 14, 30);
    const vieja = { createdAt: { seconds: Math.floor(d.getTime() / 1000) } };
    assert.strictEqual(fechaDeBitacora(vieja), '2026-09-10');
    assert.strictEqual(fechaEsInferida(vieja), true, 'hay que poder avisar que la fecha es estimada');

    // Timestamp de Firestore con toDate().
    assert.strictEqual(fechaDeBitacora({ createdAt: { toDate: () => d } }), '2026-09-10');

    // Basura y ausencias no revientan.
    assert.strictEqual(fechaDeBitacora({}), null);
    assert.strictEqual(fechaDeBitacora(null), null);
    assert.strictEqual(fechaDeBitacora({ fecha: '15/09/2026' }), null, 'solo se acepta YYYY-MM-DD');
});

test('filtrarBitacoras combina rango, supervisor y zona', async () => {
    const { filtrarBitacoras } = await import('../js/bitacora-data.js');
    const lista = [
        { fecha: '2026-09-01', supervisorUid: 'a', zona: 'ZONA 1' },
        { fecha: '2026-09-15', supervisorUid: 'a', zona: 'ZONA 3' },
        { fecha: '2026-09-30', supervisorUid: 'b', zona: 'ZONA 1' },
        { supervisorUid: 'b', zona: 'ZONA 1' }, // sin fecha determinable
    ];

    assert.strictEqual(filtrarBitacoras(lista, {}).length, 4, 'sin filtros no se descarta nada');
    assert.strictEqual(filtrarBitacoras(lista, { supervisorUid: 'a' }).length, 2);
    assert.strictEqual(filtrarBitacoras(lista, { zona: 'ZONA 1' }).length, 3);

    // El rango es inclusivo en ambos extremos.
    const rango = filtrarBitacoras(lista, { desde: '2026-09-01', hasta: '2026-09-15' });
    assert.deepStrictEqual(rango.map((b) => b.fecha), ['2026-09-01', '2026-09-15']);

    // Con filtro de fechas, lo que no tiene fecha queda fuera (no se puede ubicar).
    assert.strictEqual(filtrarBitacoras(lista, { desde: '2026-01-01' }).length, 3);

    assert.strictEqual(filtrarBitacoras(lista, { supervisorUid: 'b', zona: 'ZONA 3' }).length, 0);
});

test('resumirBitacoras agrupa minutos y cuenta sin repetir', async () => {
    const { resumirBitacoras } = await import('../js/bitacora-data.js');
    const lista = [
        { supervisorUid: 'a', supervisorNombre: 'Ana', tipoMacro: 'GESTIÓN ADMINISTRATIVA', actividadEspecifica: 'REUNIÓN VIA MEET O PRESENCIAL', areaTrabajo: 'NODO CABIMAS', zona: 'ZONA 1', duracionMinutos: 60 },
        { supervisorUid: 'a', supervisorNombre: 'Ana', tipoMacro: 'GESTIÓN ADMINISTRATIVA', actividadEspecifica: 'APOYO EN ALMACÉN', areaTrabajo: 'NODO CABIMAS', zona: 'ZONA 1', duracionMinutos: 30 },
        { supervisorUid: 'b', supervisorNombre: 'Beto', tipoMacro: 'CERTIFICACION EN CAMPO', actividadEspecifica: 'MEDICIÓN CON OTDR', areaTrabajo: 'NODO POMONA', zona: 'ZONA 3', duracionMinutos: 90 },
    ];

    const r = resumirBitacoras(lista);
    assert.strictEqual(r.cantidad, 3);
    assert.strictEqual(r.minutosTotales, 180);
    assert.strictEqual(r.supervisores, 2);
    assert.strictEqual(r.nodos, 2, 'NODO CABIMAS aparece dos veces pero es un solo nodo');
    assert.deepStrictEqual(r.porTipoMacro['GESTIÓN ADMINISTRATIVA'], { minutos: 90, cantidad: 2 });
    assert.deepStrictEqual(r.porSupervisor['Beto'], { minutos: 90, cantidad: 1 });

    const vacio = resumirBitacoras([]);
    assert.strictEqual(vacio.cantidad, 0);
    assert.strictEqual(vacio.minutosTotales, 0);
    assert.strictEqual(vacio.supervisores, 0);
});

test('ordenarPorMinutos pone primero lo que más tiempo consume', async () => {
    const { ordenarPorMinutos } = await import('../js/bitacora-data.js');
    const orden = ordenarPorMinutos({ A: { minutos: 30, cantidad: 1 }, B: { minutos: 120, cantidad: 2 } });
    assert.deepStrictEqual(orden.map((x) => x.clave), ['B', 'A']);
    assert.deepStrictEqual(ordenarPorMinutos({}), []);
});

test('formatoDuracion muestra horas y minutos legibles', async () => {
    const { formatoDuracion } = await import('../js/bitacora-data.js');
    assert.strictEqual(formatoDuracion(45), '45m');
    assert.strictEqual(formatoDuracion(60), '1h 0m');
    assert.strictEqual(formatoDuracion(150), '2h 30m');
    assert.strictEqual(formatoDuracion(0), '0m');
    assert.strictEqual(formatoDuracion(null), '0m');
});

test('las columnas del CSV de bitácora cubren lo que pidió el cliente', async () => {
    const { COLUMNAS_CSV_BITACORA, fechaDeBitacora } = await import('../js/bitacora-data.js');
    const titulos = COLUMNAS_CSV_BITACORA.map((c) => c.titulo);
    for (const esperado of ['Fecha', 'Supervisor', 'Zona', 'Área / Nodo', 'Tipo de actividad', 'Actividad específica', 'Minutos', 'Horas', 'Descripción']) {
        assert.ok(titulos.includes(esperado), `falta la columna ${esperado}`);
    }

    const fila = { fecha: '2026-09-15', duracionMinutos: 90, imagenes: ['a', 'b'] };
    const col = (t) => COLUMNAS_CSV_BITACORA.find((c) => c.titulo === t);
    assert.strictEqual(col('Horas').valor(fila), '1.50');
    assert.strictEqual(col('Fotos').valor(fila), 2, 'debe contar las imágenes de las bitácoras viejas');
    assert.strictEqual(col('Fecha').valor(fila), fechaDeBitacora(fila));
});
