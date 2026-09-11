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
