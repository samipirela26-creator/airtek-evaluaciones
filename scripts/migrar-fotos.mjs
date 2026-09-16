// scripts/migrar-fotos.mjs
// Mueve las fotos que hoy viven DENTRO del documento de la bitácora (campo
// `imagenes`, en Base64) a la subcolección `bitacoras/{id}/fotos`.
//
// Por qué: un documento de Firestore no puede pasar de 1 MiB, y el tablero del
// coordinador se descargaba las fotos enteras solo para graficar horas.
//
// Se corre UNA vez, a mano. Es idempotente: si una bitácora ya tiene su
// subcolección, la salta, así que volver a correrlo no duplica nada.
//
//   # 1. Prueba en seco (no escribe nada):
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/clave.json \
//     node scripts/migrar-fotos.mjs --proyecto airtek-evaluaciones
//
//   # 2. De verdad:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/clave.json \
//     node scripts/migrar-fotos.mjs --proyecto airtek-evaluaciones --aplicar
//
// La clave se baja de: Firebase → ⚙ Configuración → Cuentas de servicio →
// Generar nueva clave privada. NO la metas en el repo.
//
// ANTES DE CORRERLO CON --aplicar: saca un respaldo desde el panel del root
// (botón "⬇️ Respaldo").

import admin from 'firebase-admin';
import { existsSync, statSync } from 'node:fs';

const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
const PROYECTO = (args.find((a) => a.startsWith('--proyecto=')) || '').split('=')[1]
  || args[args.indexOf('--proyecto') + 1]
  || process.env.GCLOUD_PROJECT;

function morir(titulo, ...lineas) {
  console.error(`\n✗ ${titulo}\n`);
  lineas.forEach((l) => console.error(`  ${l}`));
  console.error('');
  process.exit(1);
}

const COMO_SACAR_LA_CLAVE = [
  'Para correr esto necesitas una clave de cuenta de servicio:',
  '',
  '  Firebase → ⚙ Configuración del proyecto → Cuentas de servicio',
  '  → "Generar nueva clave privada". Te baja un archivo .json.',
  '',
  'Después corre el script apuntando a ESE archivo, con su ruta real:',
  '',
  '  GOOGLE_APPLICATION_CREDENTIALS=~/Descargas/loque-bajaste.json \\',
  '    node scripts/migrar-fotos.mjs --proyecto ' + (process.env.GCLOUD_PROJECT || '<id-del-proyecto>'),
  '',
  'Esa clave da acceso total a tu base de datos: guárdala fuera del repo',
  'y no la compartas.',
];

if (!PROYECTO) {
  morir('Falta el proyecto.', 'Usa --proyecto <id> o define GCLOUD_PROJECT.');
}

// Se comprueba ANTES de conectar, para no soltar un rastro de 30 líneas por
// algo que cabe en una frase. Este script se corre justo antes de una
// migración: no es el momento de descifrar mensajes de librería.
const CLAVE = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!CLAVE) {
  morir('No indicaste la clave de acceso (GOOGLE_APPLICATION_CREDENTIALS).', ...COMO_SACAR_LA_CLAVE);
}
if (CLAVE.includes('/ruta/') || CLAVE.endsWith('/clave.json')) {
  morir(
    `Esa ruta es un ejemplo, no un archivo de verdad: ${CLAVE}`,
    'Hay que reemplazarla por la ruta del .json que bajaste de Firebase.',
    '',
    ...COMO_SACAR_LA_CLAVE
  );
}
if (!existsSync(CLAVE) || !statSync(CLAVE).isFile()) {
  morir(`No existe el archivo de clave: ${CLAVE}`, 'Revisa la ruta.', '', ...COMO_SACAR_LA_CLAVE);
}

const LOTE = 25; // bitácoras por tanda: las fotos pesan, no conviene traer más

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

admin.initializeApp({ projectId: PROYECTO });
const db = admin.firestore();

async function migrar() {
  console.log(APLICAR
    ? `▶ Migrando fotos del proyecto "${PROYECTO}". ESTO ESCRIBE EN LA BASE.`
    : `▶ Prueba en seco del proyecto "${PROYECTO}". No se escribe nada. Agrega --aplicar para hacerlo de verdad.`);

  let ultimo = null;
  let revisadas = 0, migradas = 0, saltadas = 0, fotosMovidas = 0, bytes = 0, conError = 0;

  for (;;) {
    let q = db.collection('bitacoras').orderBy('__name__').limit(LOTE);
    if (ultimo) q = q.startAfter(ultimo);
    const snap = await q.get();
    if (snap.empty) break;
    ultimo = snap.docs[snap.docs.length - 1];

    for (const doc of snap.docs) {
      revisadas++;
      const datos = doc.data();
      const imagenes = Array.isArray(datos.imagenes) ? datos.imagenes : [];
      if (!imagenes.length) continue;

      // Idempotencia, y rescate de migraciones a medias: si la subcolección ya
      // tiene tantas fotos como el campo viejo, las imágenes ya están a salvo y
      // lo único que falta es soltar el peso del documento padre. (Pasa si el
      // lote se escribió pero el update falló a mitad de camino.)
      const yaTiene = await doc.ref.collection('fotos').get();
      if (yaTiene.size >= imagenes.length) {
        if (!APLICAR) {
          saltadas++;
          console.log(`  · ${doc.id}: las fotos ya están; limpiaría el campo del padre`);
          continue;
        }
        try {
          await doc.ref.update({
            imagenes: admin.firestore.FieldValue.delete(),
            numFotos: yaTiene.size,
          });
          saltadas++;
          console.log(`  ✓ ${doc.id}: ya estaba migrada, se limpió el campo del padre`);
        } catch (err) {
          conError++;
          console.error(`  ✗ ${doc.id}: ${err.message}`);
        }
        continue;
      }
      if (!yaTiene.empty) {
        console.log(`  ! ${doc.id}: tiene ${yaTiene.size} de ${imagenes.length} fotos; se completa`);
      }

      const peso = imagenes.reduce((s, url) => s + Math.round(String(url).length * 0.75), 0);
      bytes += peso;

      if (!APLICAR) {
        migradas++;
        fotosMovidas += imagenes.length;
        console.log(`  · ${doc.id}: movería ${imagenes.length} foto(s), ${mb(peso)}`);
        continue;
      }

      try {
        // Primero se escriben las fotos; solo si TODAS quedaron se borra el
        // campo del padre. Al revés se perderían si algo falla a mitad.
        const lote = db.batch();
        imagenes.forEach((dataUrl, i) => {
          lote.set(doc.ref.collection('fotos').doc(String(i)), {
            orden: i,
            dataUrl,
            // Las que ya existen son JPEG y se mueven tal cual: recomprimir
            // una imagen ya comprimida degrada la calidad sin ganar gran cosa.
            formato: 'jpeg',
            bytes: Math.round(String(dataUrl).length * 0.75),
            migradaEn: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        await lote.commit();

        await doc.ref.update({
          imagenes: admin.firestore.FieldValue.delete(),
          numFotos: imagenes.length,
        });

        migradas++;
        fotosMovidas += imagenes.length;
        console.log(`  ✓ ${doc.id}: ${imagenes.length} foto(s), ${mb(peso)}`);
      } catch (err) {
        conError++;
        console.error(`  ✗ ${doc.id}: ${err.message}`);
      }
    }
  }

  console.log('\n─────────────────────────────');
  console.log(`Bitácoras revisadas:   ${revisadas}`);
  console.log(`Con fotos migradas:    ${migradas}`);
  console.log(`Saltadas (ya estaban): ${saltadas}`);
  console.log(`Fotos movidas:         ${fotosMovidas}`);
  console.log(`Peso sacado del padre: ${mb(bytes)}`);
  if (conError) console.log(`CON ERROR:             ${conError}  ← revisa arriba`);
  if (!APLICAR) console.log('\n(No se escribió nada. Agrega --aplicar cuando estés listo.)');

  process.exit(conError ? 1 : 0);
}

migrar().catch((err) => {
  const m = String(err?.message || err);

  if (/PERMISSION_DENIED|permission/i.test(m)) {
    morir(
      'La clave no tiene permiso para leer o escribir Firestore.',
      'Comprueba que la bajaste del proyecto correcto y que la cuenta de',
      'servicio conserva su rol de editor.'
    );
  }
  if (/NOT_FOUND|does not exist/i.test(m) && /database|project/i.test(m)) {
    morir(
      `No se encontró la base de datos del proyecto "${PROYECTO}".`,
      'Revisa que el id del proyecto esté bien escrito.'
    );
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(m)) {
    morir('No se pudo conectar con Firestore.', 'Revisa tu conexión a internet y vuelve a intentar.');
  }

  // Lo que no reconocemos sí va completo: esconder un error raro es peor.
  console.error('\n✗ Falló la migración por algo que no supe interpretar:\n');
  console.error(err);
  process.exit(1);
});
