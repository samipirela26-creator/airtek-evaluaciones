# Plan técnico — Spec 004

## Decisiones y por qué

| Decisión | Razón |
|---|---|
| root conserva su **uid real**; solo se le presta el **rol** (`perfil.rol`) | Diferencia estructural con "Ver como" (que sustituye uid Y perfil por los de otra persona). Con el uid real, toda escritura que ya usa `sesion.real.user.uid` (patrón T4 de la spec 003, presente en `panel.js` y `editor.js`) termina atribuyéndose a root mismo — sin tocar esos archivos para el caso "coordinador". |
| `coordinadorUid` de un "prueba: supervisor" resuelve al **propio uid de root** | No existe una cuenta de coordinador separada — root ES el coordinador de prueba y el supervisor de prueba a la vez, solo cambiando de disfraz. Así, lo que root cree como "supervisor" encuentra las plantillas que el propio root creó como "coordinador", sin inventar una segunda identidad. |
| Nuevo archivo `js/prueba-data.js`, no ampliar `js/ver-como-data.js` | Mismo criterio que ya usa el proyecto (`bitacora-data.js`, `inventario-data.js`, `renombrar-data.js`, `ver-como-data.js`: un archivo de lógica pura por función). Los dos modos tienen forma distinta (Ver-como sustituye identidad completa; Modo de prueba solo el rol y deriva `coordinadorUid`) — mezclarlos arriesga que una se use para el modo equivocado. |
| El flag de bloqueo de escritura (`impersonando`) NO se reutiliza | Está sobrecargado hoy para "el rol mostrado es prestado" y "bloquear toda escritura" a la vez (`bloqueaSiImpersona`/`deshabilitarControlesDeEscritura` en `ver-como.js` miran ese único flag). "Modo de prueba" necesita lo primero sin lo segundo. Se agrega un flag propio, `enPrueba`, que esos dos guards jamás miran. |
| Aislamiento real en `firestore.rules`, reforzado con `esPrueba: true` obligatorio | Constitución art. 4: la garantía de "nunca toca datos reales" no puede depender solo de que la interfaz se porte bien. Exigir `esPrueba == true` en la propia regla (no solo como convención de la UI) es una capa extra: aunque algún código futuro reutilizara mal la cláusula, no podría crear un documento "real" disfrazado sin marcarlo. |
| `invitaciones` NO exige `esPrueba` en su regla (solo `usuarios`/`plantillas`/`enlaces` la exigen) | La invitación en sí no es un dato sensible (token de un solo uso), y el `usuarios` resultante del auto-registro SÍ trae su propio `esPrueba` (puesto por quien se registra, siguiendo el mismo flujo de `crearUsuarioDirecto`/registro). Ver más abajo la limitación heredada que esto no resuelve del todo. |
| `sessionStorage`, mismo contrato que "Ver como" | Consistencia con el "slot" único de modo de sesión; activar uno borra el otro (RF-3), ambos viven y mueren con la pestaña. |
| Limpieza: reutilizar los controles de eliminar ya existentes | `usuarios` ya permite `delete` a `esRoot()` sin condición; `enlaces` ya permite `update, delete` a quien sea `creadorUid` (sin condición de rol). El botón "🗑 Eliminar" de `mostrarSupervisor`/`eliminarTecnico` en `panel.js` ya funciona tal cual con "Modo de prueba" activo, porque `bloqueaSiImpersona`/`deshabilitarControlesDeEscritura` miran `impersonando` (falso en este modo). No hace falta UI nueva para borrar. |

## Módulos

- **`js/prueba-data.js`** (nuevo) — lógica pura, sin DOM ni Firebase, mismo
  patrón que `ver-como-data.js`:
  - `leerPrueba(storage)` / `escribirPrueba(storage, rol)` /
    `borrarPrueba(storage)` — contrato de `sessionStorage`, clave
    `airtek_modo_prueba`, valor `{ rol }` (`rol` es `"coordinador"` o
    `"supervisor"`).
  - `contextoEfectivoPrueba(real, prueba)`: dado `real = { user, perfil }`
    (lo que entrega `protegerPagina`) y el `prueba` guardado, devuelve:
    ```js
    {
      uid: real.user.uid,               // NUNCA cambia respecto al real
      perfil: {
        ...real.perfil,
        rol: prueba.rol,
        coordinadorUid: prueba.rol === "supervisor"
          ? real.user.uid
          : (real.perfil.coordinadorUid ?? null),
      },
      impersonando: false,
      enPrueba: true,
      real,
    }
    ```

- **`js/session.js`** — envoltorio delgado, igual que ya hace con
  `ver-como-data.js`:
  - `activarModoPrueba(rol)`: `borrarVerComo(sessionStorage)` primero (RF-3:
    un modo apaga al otro), luego `escribirPrueba(sessionStorage, rol)`;
    `await logAudit("modo_prueba_inicio", { rolElegido: rol })`.
  - `salirDeModoPrueba()`: lee el `prueba` guardado ANTES de borrarlo (para
    poder loguear qué rol se estaba probando), `borrarPrueba(sessionStorage)`;
    `await logAudit("modo_prueba_fin", { rolElegido: prueba.rol })`.
  - `activarVerComo(...)` se le agrega `borrarPrueba(sessionStorage)` al
    principio (mutuamente excluyente en ambos sentidos).
  - `contextoActual(real)` resuelve en orden — Ver-como primero (si hay,
    gana), si no Modo de prueba, si no la identidad real:
    ```js
    export function contextoActual(real) {
      const verComo = leerVerComo(sessionStorage);
      if (verComo) return contextoEfectivo(real, verComo);
      const prueba = leerPrueba(sessionStorage);
      if (prueba) return contextoEfectivoPrueba(real, prueba);
      return contextoEfectivo(real, null);
    }
    ```
  - `protegerPagina`: el cálculo de `rolEfectivo` se extiende igual —
    `verComo ? verComo.rol : (prueba ? prueba.rol : perfil.rol)` — para que
    `bitacora.html`/`evaluacion.html` (`protegerPagina("supervisor", …)`) y
    `editor.html`/`dashboard.html`/etc. (`protegerPagina("coordinador", …)`)
    dejen pasar a root prestado. El montaje de banner pasa a ser
    `if (verComo) { …ver-como.js… } else if (prueba) { …prueba.js… }`
    (import dinámico también para `prueba.js`, mismo motivo anti-ciclo
    documentado en spec 003: `prueba.js` importará de `session.js` para
    `activarModoPrueba`/`salirDeModoPrueba`).

- **`js/prueba.js`** (nuevo) — UI, mismo patrón que `ver-como.js`:
  - `montarSelectorPrueba(contenedor)`: pinta dos botones — "🧪 Actuar como
    coordinador" y "🧪 Actuar como supervisor" (solo se monta si
    `perfil.rol === "root"`, igual que el selector de "Ver como"). Cada uno
    llama `activarModoPrueba(rol)` y recarga.
  - `montarAvisoPrueba(prueba)`: pinta el banner fijo debajo de `.topbar`,
    con su PROPIA clase (`.banner-modo-prueba`, dedupe con
    `document.querySelector(".banner-modo-prueba")` — nunca colisiona con
    `.banner-ver-como`). Texto: `"🧪 Modo de prueba activo — actuando como
    ${etiqueta(prueba.rol)} · Salir"`. El botón de salida llama
    `salirDeModoPrueba()` y navega a `panel.html`.
  - **NO** exporta ni toca `bloqueaSiImpersona`/
    `deshabilitarControlesDeEscritura` — esos siguen viviendo en
    `ver-como.js`, sin cambios, mirando solo `impersonando`. Esto es lo que
    garantiza RF-8 (escritura habilitada).

- **`css/styles.css`** — nueva variable de color y clase del banner:
  ```css
  --prueba: #7c3aed;   /* violeta — distinto del ámbar de "Ver como" */
  ```
  ```css
  .banner-modo-prueba { color: var(--prueba); border-bottom: 2px solid var(--prueba); /* mismo layout que .banner-ver-como */ }
  .banner-modo-prueba button { background: var(--prueba); }
  ```

- **`panel.html` / `js/panel.js`** — en la rama `root`, junto al bloque de
  "👁️ Ver como" ya existente:
  ```html
  <h4 class="btn-row-titulo">🧪 Modo de prueba</h4>
  <p class="meta">Actúa como coordinador o supervisor con datos 100%
     inventados — nunca toca cuentas ni datos reales — para reproducir
     problemas de punta a punta.</p>
  <div id="modo-prueba-box"></div>
  ```
  y `montarSelectorPrueba(document.getElementById("modo-prueba-box"))`.

- **Marcado `esPrueba` + prefijo 🧪** (RF-11), en los puntos que ya escriben
  hoy (sin cambiar su lógica de real/efectivo, solo agregando el marcado
  condicional a `sesion.enPrueba`):
  - `js/panel.js`, `crearUsuarioDirecto`: si `sesion.enPrueba`,
    `perfilDoc.esPrueba = true` y prefijar `nombre` con "🧪 " si no lo tiene ya.
  - `js/panel.js`, `generarLinkSupervisor` (el `addDoc` a `enlaces`): si
    `sesion.enPrueba`, agregar `esPrueba: true`.
  - `js/panel.js`, `agregarTecnico`: si `sesion.enPrueba`, cada técnico nuevo
    trae `esPrueba: true` y su nombre prefijado.
  - `js/editor.js`, guardado de plantilla: si `sesion.enPrueba` **o**
    `P.esPrueba` (para no perder el campo al reeditar, porque `setDoc`
    reemplaza el documento entero), agregar `esPrueba: true`; prefijar
    `nombre` al crear una nueva.
  - `js/prueba-data.js` no necesita saber nada de esto — es puramente lógica
    de sesión; el marcado vive en el punto de escritura de cada archivo,
    igual que hoy vive ahí la lógica de real/efectivo (T4 de la spec 003).

- **`js/inventario.js`** (fix puntual, no nueva funcionalidad): en las dos
  escrituras (`guardarHerramientas`/`guardarMateriales`), cambiar
  `sesion.real.perfil.coordinadorUid` por `sesion.perfil.coordinadorUid`.
  Con un supervisor real, ambos valores son idénticos (no cambia nada). Con
  root en "prueba: supervisor", `sesion.real.perfil.coordinadorUid` es
  siempre `null` (el perfil real de root no tiene ese campo), mientras que
  `sesion.perfil.coordinadorUid` ya viene resuelto por
  `contextoEfectivoPrueba` al propio uid de root. Sin este fix, el inventario
  de prueba quedaría sin coordinador asociado.

- **`js/bitacora.js`, `js/evaluacion.js`** — adoptan `contextoActual(s)` como
  `sesion`, mismo patrón que ya tiene `inventario.js` desde la spec 003:
  - `sesion = contextoActual(s)` en vez de `sesion = s`.
  - Cualquier referencia `sesion.user.*` (ya no existe ese campo en la forma
    de `contextoActual`) pasa a `sesion.real.user.*` si es de autoría
    (escritura: `supervisorUid`, etc.) — mismo criterio ya establecido: leer
    con lo efectivo, escribir "quién lo hizo" con lo real.
  - `sesion.perfil.coordinadorUid` (usado para el `coordinadorUid` de la
    bitácora y para `cargarPlantillasDeCoordinador(db, sesion.perfil.coordinadorUid)`
    en `evaluacion.js`) sigue leyéndose igual, pero ahora resuelve
    correctamente para un supervisor real (sin cambios) y para "prueba:
    supervisor" (vía `contextoEfectivoPrueba`).
  - El flag `impersonando` (usado por `bloqueaSiImpersona`) pasa a leerse
    directo de `sesion.impersonando` en vez de una variable de módulo aparte
    — simplificación menor, mismo comportamiento.
  - Marcado `esPrueba`/prefijo 🧪 en sus respectivos `addDoc`, igual criterio
    que en `panel.js`/`editor.js`.

- **`js/auditoria.js`** — agrega dos entradas al mapa `ACCIONES`:
  `modo_prueba_inicio: "Modo de prueba: inicio"`,
  `modo_prueba_fin: "Modo de prueba: fin"`.

- **`preview/mock-session.js`** — agrega los exports nuevos
  (`activarModoPrueba`/`salirDeModoPrueba`) reexportando `prueba-data.js`,
  igual que ya hace con `ver-como-data.js`.

## Modelo de datos

`sessionStorage` (por pestaña, clave `airtek_modo_prueba`):
```json
{ "rol": "coordinador" }
```

Campo nuevo en documentos existentes (mismas colecciones de siempre):
- `usuarios/{uid}` (rol `supervisor`): `esPrueba: true`, `nombre` con
  prefijo "🧪 ".
- `plantillas/{id}`: `esPrueba: true`, `nombre` con prefijo "🧪 ".
- `enlaces/{token}`: `esPrueba: true`.
- `tecnicos/{id}`: `esPrueba: true`, `nombre` con prefijo "🧪 ".
- `bitacoras/{id}`, `evaluaciones/{id}`, `inventario_*`: `esPrueba: true`
  (sin campo de nombre propio que prefijar).

`auditoria`, reutilizando `logAudit` igual que la spec 003:
```
logAudit("modo_prueba_inicio", { rolElegido: "coordinador" | "supervisor" })
logAudit("modo_prueba_fin",    { rolElegido: "coordinador" | "supervisor" })
```

## Cambios en `firestore.rules`

### `usuarios` — nueva cláusula 4 en `create`
```
// 4) root crea un supervisor DE PRUEBA, ligado a sí mismo (spec 004)
|| (esRoot() && request.resource.data.rol == 'supervisor'
    && request.resource.data.coordinadorUid == request.auth.uid
    && request.resource.data.esPrueba == true)
```
(`update`/`delete` de `usuarios` YA tienen `esRoot()` sin condición — sin
cambios.)

### `plantillas` — `create` Y `update`/`delete` (única colección donde root
hoy no tiene ningún atajo, ni siquiera `esRoot()` a secas)
```
allow create: if (esCoordinador() && activo()
                  && request.resource.data.coordinadorUid == request.auth.uid)
              || (esRoot() && request.resource.data.coordinadorUid == request.auth.uid
                  && request.resource.data.esPrueba == true);
allow update, delete: if (esCoordinador() && activo()
                          && resource.data.coordinadorUid == request.auth.uid)
                      || (esRoot() && resource.data.coordinadorUid == request.auth.uid
                          && resource.data.esPrueba == true);
```

### `enlaces` — solo `create` (su `update`/`delete` ya no exige rol)
```
allow create: if (esCoordinador() && activo() && request.resource.data.creadorUid == request.auth.uid)
              || (esRoot() && request.resource.data.creadorUid == request.auth.uid
                  && request.resource.data.esPrueba == true);
```

### `invitaciones` — rama supervisor
```
allow create: if ((esRoot() && request.resource.data.rol == 'coordinador')
              || (esCoordinador() && request.resource.data.rol == 'supervisor')
              || (esRoot() && request.resource.data.rol == 'supervisor'))   // NUEVO
              && activo();
```

### `tecnicos`, `evaluaciones`, `bitacoras`, `inventario_*` — SIN CAMBIO
Ya funcionan para root escribiendo a su propio uid (sin chequeo de rol en su
`create`, confirmado con una prueba que ya existe hoy en
`tests-reglas/ver-como.test.js`). El campo `esPrueba` se agrega igual desde
el cliente, pero la regla no lo exige — no hace falta, porque estas cuatro
colecciones ya validan ownership contra el uid real de quien escribe.

### `evaluacionesSupervisor` — SIN CAMBIO
Ya es de creación pública (sin auth), gated solo por el `enlace` real y
activo — el que root creó con `esPrueba: true` cuenta como "real y activo"
igual que cualquier otro.

## Limitación heredada de `invitaciones` (no se corrige en esta spec)

Al diseñar la extensión de `invitaciones` encontré que el alta por invitación
en `usuarios` (cláusula 1 de su `create`) valida que el token exista, esté
sin usar y el rol coincida, pero **nunca cruza** el `coordinadorUid` que el
nuevo supervisor se asigna a sí mismo contra `invit(token).creadorUid`. Esto
es así hoy para **cualquier** invitación, real o de prueba — quien se
auto-registra con un token válido podría, en teoría, escribir cualquier
`coordinadorUid`, no necesariamente el de quien lo invitó. No es un problema
nuevo de esta spec ni algo que "Modo de prueba" empeore (root ya podía crear
directo un supervisor de prueba sin pasar por invitaciones); es una grieta
del flujo real que ya existía. Cerrarla implicaría cambiar la regla de
`usuarios` de forma que afecte también a coordinadores reales, y merece su
propia decisión — quedó anotada aparte para que el usuario la vea cuando
quiera, sin bloquear esta spec.

## Marcado de datos de prueba y limpieza

**`esPrueba: true` + prefijo "🧪 "** en los documentos nuevos — no es solo
cosmético: `firestore.rules` EXIGE el campo en `usuarios`/`plantillas`/
`enlaces`, así que no puede olvidarse por accidente. Motivo concreto más allá
del aislamiento: `descargarRespaldo()` en `panel.js` (botón "⬇️ Respaldo")
baja TODAS las colecciones sin distinguir prueba de real — sin este campo, un
respaldo de producción mezclaría los datos de prueba de root con datos
reales, sin forma de diferenciarlos después.

**Limpieza en v1**: se reutilizan los controles de eliminar que YA EXISTEN —
"🗑 Eliminar" de `mostrarSupervisor` y de la lista de técnicos en `panel.js` —
sin construir nada nuevo. No hay borrado en cascada automático (tampoco lo
hay hoy para datos reales). Un "borrar todo mi rastro de prueba de una vez"
queda fuera de alcance de v1.

## Riesgos

- **Reutilizar sin querer `impersonando` en algún guard nuevo** — sería el
  bug más fácil de introducir por accidente (copiar-pegar de "Ver como"). La
  tarea de verificación manual debe confirmar explícitamente que los
  controles de escritura NO quedan deshabilitados en "Modo de prueba".
- **`registro.esPrueba` perdido al reeditar una plantilla de prueba** (por el
  `setDoc` sin merge) — mitigado con `|| P.esPrueba`; hay que probarlo
  puntualmente.
- **`plantillas` no tenía ningún atajo para root** (a diferencia de casi
  todas las demás colecciones) — agregar la cláusula completa de `create` Y
  de `update/delete`, no solo una.
- **Confusión visual entre los dos banners** si el color/copy final quedan
  parecidos al ámbar de "Ver como" — mitigado con un color de otra familia
  (violeta) y textos que no comparten ninguna palabra clave.
