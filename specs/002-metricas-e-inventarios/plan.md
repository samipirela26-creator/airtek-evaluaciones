# Plan técnico — Spec 002

## Decisiones y por qué

| Decisión | Razón |
|---|---|
| **CSV con BOM UTF-8**, no `.xlsx` | La Constitución (art. 7) prohíbe librerías nuevas en runtime. El BOM hace que Excel abra el archivo en UTF-8: sin él, los acentos y la ñ salen rotos. Además funciona sin internet. |
| **Tablero de bitácora aparte** | Mide actividad de campo; el dashboard existente mide calidad de evaluación. Mezclarlos confunde y obliga a cargar las dos cosas siempre. |
| **Herramientas = cantidad por estado**, no un estado por herramienta | Lo manda la planilla del cliente (`CANTIDAD / BUENO / REGULAR / MALO`) y es lo único que responde "cuántos destornilladores malos tengo". |
| **Materiales = historial de entregas** | El material se consume; el estado "actual" no significa nada. La fecha permite ver el ritmo de consumo. |
| **Campo `fecha` en la bitácora** | Sin él solo existía `createdAt`. Filtrar por período reportaba cuándo se tecleó, no cuándo se trabajó. |
| **Lectura de bitácoras por `coordinadorUid`** | Evita un `get()` de reglas por documento. El campo ya se escribía. |

## Módulos compartidos (base)

- `js/exportar-csv.js` — escape, BOM, nombre de archivo, descarga.
- `js/consultas.js` — `enLotesDe` (límite de 10 del operador `in`),
  `misSupervisores`, `traerPorLotes`. Extraído de `js/dashboard.js`, que ahora
  lo consume en vez de repetirlo.
- `js/graficas.js` — `barChart`, `donaChart`, paleta. Extraído de
  `js/dashboard.js`.
- `js/session.js` — `protegerPagina` acepta rol, lista de roles o `null`.

La lógica de negocio vive en `bitacora-data.js` e `inventario-data.js` como
funciones puras, sin DOM ni Firebase, para poder probarla con `node --test`.

## Modelo de datos

```
bitacoras/{auto}
  + fecha: "YYYY-MM-DD"    // día de la actividad (nuevo)
  + numFotos: number       // permite listar sin bajar las imágenes

inventario_herramientas/{tecnicoId}        // estado vigente, se sobrescribe
  { tecnicoId, tecnicoNombre, supervisorUid, supervisorNombre, coordinadorUid,
    items: [{ id, bueno, regular, malo, cantidad, serial, observacion }],
    actualizadoPor, actualizadoEn }

inventario_materiales/{auto}               // historial de entregas
  { tecnicoId, tecnicoNombre, supervisorUid, supervisorNombre, coordinadorUid,
    fecha, nota, items: [{ id, nombre, categoria, cantidad }],
    registradoPor, createdAt }
```

Solo se guardan los renglones con al menos una unidad: el catálogo tiene 79
herramientas y 47 materiales, y guardar ceros infla el documento sin aportar.

## Riesgos

- **Peso de las fotos.** `imagenes` va en Base64 dentro del documento y el SDK
  web no permite traer campos sueltos, así que el tablero se las descarga. Se
  mitiga con el rango por defecto de un mes. La solución real es sacarlas del
  documento (fuera de alcance).
- **Reglas de Firestore.** Hay que publicarlas antes de usar el inventario en
  producción, o las escrituras fallarán con permisos insuficientes.
- **Índices.** Alguna consulta puede pedir índice la primera vez; el error en
  consola trae el enlace para crearlo.
