# Plan técnico — Spec 003

## Decisiones y por qué

| Decisión | Razón |
|---|---|
| Cambio 100% de cliente, sin tocar `firestore.rules` | Todas las reglas de lectura ya terminan en `\|\| esRoot()`; con su sesión real, `root` ya puede leer exactamente lo mismo que vería cualquier coordinador o supervisor. No hay nada que abrir en las reglas. |
| Identidad efectiva centralizada en `session.js`, no repetida por página | `session.js` (`protegerPagina`/`cargarPerfil`) es hoy el único punto de entrada de identidad. Cada página guarda `{ user, perfil }` en una variable local; centralizar evita duplicar la lógica de "Ver como" en los ~10 archivos que hoy leen `sesion.user.uid`. |
| Bloqueo de escritura en la interfaz, reforzado en el propio JS — no en `firestore.rules` | Las reglas de `create` ya impiden que `root` escriba bitácoras/evaluaciones/técnicos a nombre de otro (`supervisorUid == request.auth.uid`, y ese `uid` real siempre es el de `root`). Lo que sí permiten es `update`/`delete` vía `\|\| esRoot()`, que `root` necesita conservar para su uso normal (fuera de "Ver como"). Por eso el bloqueo no puede ir en las reglas; va en la UI y se refuerza con una comprobación en el propio código antes de cualquier llamada de escritura. |
| `sessionStorage`, no `localStorage` | Decisión ya confirmada con el usuario: el modo debe terminar solo al cerrar la pestaña, no persistir entre reinicios del navegador. |
| Nuevo tipo de evento en la colección `auditoria` ya existente | Ya existen la colección, sus reglas (`create` abierto a cualquier autenticado, `read` solo `root`) y la página `js/auditoria.js` que la muestra. No hace falta una colección nueva. |

## Módulos

- **`js/ver-como-data.js`** (nuevo) — lógica pura del modo, sin DOM ni
  Firebase, siguiendo el mismo patrón que `bitacora-data.js`/
  `inventario-data.js` (necesario porque `session.js` importa Firebase a
  nivel de módulo y por eso no se puede probar directo con `node --test`):
  `leerVerComo`/`escribirVerComo`/`borrarVerComo` (contrato de
  `sessionStorage`, recibido como parámetro para poder probarlas con un
  doble) y `contextoEfectivo(real, verComo)`, que combina la identidad real
  con lo guardado.

- **`js/session.js`** — se agrega, como envoltorio delgado sobre
  `ver-como-data.js` conectado a `sessionStorage` real:
  - `activarVerComo(uidObjetivo, perfilObjetivo)`: guarda la elección. (T6
    le agrega el registro del evento `ver_como_inicio` en `auditoria`, vía
    `logAudit` de `firebase.js` — ya existe ese helper, reutilizado en vez
    de escribir en `auditoria` a mano.)
  - `salirDeVerComo()`: borra el estado guardado. (T6 le agrega el registro
    de `ver_como_fin`.)
  - `contextoActual(real)`: `real` es el `{ user, perfil }` que ya entrega
    `protegerPagina`; devuelve `{ uid, perfil, impersonando, real }` —
    efectivos sin modo activo, o los del usuario elegido con el modo
    activo, conservando siempre `real` con la identidad verdadera de
    `root`.
  - `protegerPagina` no cambia su forma de autenticar (sigue usando la
    identidad real de Firebase Auth); las páginas combinan su resultado con
    `contextoActual()` para obtener el uid/perfil **efectivos** a mostrar.

- **`js/ver-como.js`** (nuevo) — UI reutilizable en un solo import:
  - Construye el selector de "Ver como" (solo se monta si `perfil.rol === "root"`).
  - Construye y monta el banner de aviso ("Viendo como **<nombre>** (<rol>) · Volver a mi cuenta") cuando `contextoActual().impersonando` es verdadero.
  - Expone un helper, p. ej. `bloquearEscrituraSiImpersona(contenedor)`, que cada página llama tras pintar sus botones de crear/editar/borrar para deshabilitarlos.

- **`css/styles.css`** — agrega un color de advertencia (hoy solo existen `--ok` verde y `--error` rojo en `:root`) y la clase del banner, siguiendo el mismo criterio de cascada por número de hoja que ya usa el proyecto.

- **Páginas con lecturas filtradas por uid** (usan hoy `sesion.user.uid` para consultar Firestore): `js/panel.js`, `js/inventario.js`, `js/perfil.js`, `js/consultas.js`, `js/dashboard.js`, `js/bitacora-tablero.js`, `js/reporte-herramientas.js`, `js/editor.js`, `js/detalle.js`. Cada una cambia esa lectura por el uid efectivo de `contextoActual()`.

- **Páginas con acciones de escritura** (`js/bitacora.js`, `js/evaluacion.js`, `js/inventario.js`, `js/panel.js` al crear/invitar, `js/perfil.js` al inhabilitar, etc.): llaman a `bloquearEscrituraSiImpersona(...)` tras pintar sus controles, y cada función de guardado comprueba `contextoActual().impersonando` antes de tocar Firestore.

- **`panel.html` / `js/panel.js`** — agrega el selector "Ver como" en la vista de `root`.

- **`js/auditoria.js`** — agrega el render de los nuevos tipos de evento `ver_como_inicio` / `ver_como_fin` junto a los que ya muestra.

## Modelo de datos

`firebase.js` ya tiene `logAudit(accion, detalle)` — escribe en `auditoria`
con `{ accion, detalle, uid: auth.currentUser.uid, en: serverTimestamp() }`,
usando siempre el uid real de quien está autenticado (nunca el impersonado).
T6 lo reutiliza en vez de escribir a mano en la colección:

```
logAudit("ver_como_inicio", { objetivoUid, objetivoNombre, objetivoRol })
logAudit("ver_como_fin",    { objetivoUid, objetivoNombre, objetivoRol })
```

`js/auditoria.js` ya renderiza cualquier `accion`/`detalle` de forma
genérica (T6 solo le agrega una etiqueta legible en su mapa `ACCIONES`).

`sessionStorage` (por pestaña, nunca se manda a Firestore; clave
`airtek_ver_como`, ver `js/ver-como-data.js`):
```
{ uid, nombre, rol }
```

## Riesgos

- **Sitios de lectura olvidados.** Si algún archivo sigue leyendo
  `sesion.user.uid` directamente en vez del uid efectivo, mostraría los datos
  de `root` en vez de los del usuario elegido, sin error visible. Hay que
  revisar los ~15 sitios ya localizados en la exploración, no solo los de
  `panel.js`.
- **Bloqueo de escritura incompleto.** Si una pantalla nueva o poco usada
  (p. ej. `editor.js`) no llama a `bloquearEscrituraSiImpersona`, sus botones
  seguirían operables durante "Ver como". La tarea de pruebas (T7) debe
  recorrer cada pantalla con controles de escritura, no solo las principales.
- **`js/auditoria.js` con un tipo de evento nuevo.** Debe seguir mostrando
  correctamente los tipos de evento que ya existan, sin asumir que todos
  tienen la misma forma de campos.
- **`tests-reglas/` no tiene fixture `root`.** Ninguna prueba hoy cubre el
  comportamiento de `esRoot()`; T7 agrega uno y un caso que confirme que
  `root` no puede crear bitácoras/evaluaciones/técnicos con `supervisorUid`
  distinto al suyo — es la base real (no solo de interfaz) de por qué el
  bloqueo de escritura es seguro.
