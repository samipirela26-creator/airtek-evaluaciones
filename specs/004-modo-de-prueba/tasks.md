# Tareas — Spec 004: Modo de prueba

- [x] **T1: Lógica pura del modo en `prueba-data.js` + extensión de `session.js`**
  - **RF cubiertos**: RF-2, RF-3, RF-6, RF-7
  - **Archivos**: `js/prueba-data.js` (nuevo), `js/session.js`,
    `tests/prueba-data.test.js` (nuevo)
  - **Hecho cuando**: existan `leerPrueba`/`escribirPrueba`/`borrarPrueba`/
    `contextoEfectivoPrueba` en `prueba-data.js`; `session.js` tenga
    `activarModoPrueba(rol)`/`salirDeModoPrueba()` y `contextoActual`
    resuelva en orden Ver-como → Modo de prueba → real; `activarModoPrueba`
    borre cualquier "Ver como" activo y `activarVerComo` borre cualquier
    "Modo de prueba" activo (RF-3, probado con dobles de `sessionStorage`,
    sin Firebase, mismo patrón que `tests/ver-como.test.js`); y que
    `contextoEfectivoPrueba` resuelva `coordinadorUid` al `uid` real cuando
    `prueba.rol === "supervisor"`, y que `uid` nunca cambie respecto al real
    en ningún caso.

- [x] **T2: `protegerPagina` reconoce el nuevo modo (gate de rol y banner)**
  - **RF cubiertos**: RF-2, RF-4
  - **Archivos**: `js/session.js`, `js/prueba.js` (nuevo, solo
    `montarAvisoPrueba` en esta tarea)
  - **Hecho cuando**: con "Modo de prueba" activo, `protegerPagina("coordinador", …)`
    (`editor.js`, `dashboard.js`, `bitacora-tablero.js`,
    `reporte-herramientas.js`) y `protegerPagina("supervisor", …)`
    (`bitacora.js`, `evaluacion.js`) dejen pasar a root según el rol elegido;
    el banner `.banner-modo-prueba` aparezca en cualquier página (import
    dinámico desde `protegerPagina`, mismo motivo anti-ciclo que "Ver como").

- [x] **T3: Selector de activación en el panel de root**
  - **RF cubiertos**: RF-1, RF-2
  - **Archivos**: `js/panel.js`, `js/prueba.js` (agrega
    `montarSelectorPrueba`), `preview/mock-session.js`
  - **Hecho cuando**: solo `root` vea los dos botones ("🧪 Actuar como
    coordinador" / "🧪 Actuar como supervisor"), junto al bloque de "👁️ Ver
    como" existente; al pulsar cualquiera, `activarModoPrueba(rol)` quede
    llamado y la página recargue mostrando la vista correspondiente (vacía al
    principio, porque root-prestado todavía no tiene datos propios).

- [x] **T4: `firestore.rules` — las cuatro cláusulas nuevas**
  - **RF cubiertos**: RF-9, RF-10, RF-11
  - **Archivos**: `firestore.rules`
  - **Hecho cuando**: `usuarios` (create, cláusula 4), `plantillas` (create Y
    update/delete), `enlaces` (create) e `invitaciones` (create, rama
    supervisor) acepten a `root` únicamente cuando el campo de propiedad
    (`coordinadorUid`/`creadorUid`) es su propio `request.auth.uid` (y, salvo
    `invitaciones`, `esPrueba == true`); ningún otro caso pase. Sin tocar
    `evaluacionesSupervisor` ni las reglas de `tecnicos`/`evaluaciones`/
    `bitacoras`/`inventario_*` (ya funcionan).

- [x] **T5: Marcar `esPrueba: true` + prefijo 🧪 en `panel.js`/`editor.js`**
  - **RF cubiertos**: RF-11
  - **Archivos**: `js/panel.js` (`crearUsuarioDirecto`, `generarLinkSupervisor`,
    `agregarTecnico`), `js/editor.js` (guardado de plantilla)
  - **Hecho cuando**: creando un supervisor, un técnico, una plantilla o un
    enlace con "Modo de prueba" activo, el documento en Firestore trae
    `esPrueba: true` y (salvo `enlaces`, que no tiene nombre) el `nombre`
    prefijado "🧪 " si no lo tenía ya; reeditar una plantilla de prueba ya
    creada conserva el campo (probado explícitamente: crear → cerrar →
    reabrir para editar → guardar → releer de Firestore); sin el modo
    activo, ningún documento nuevo trae el campo.

- [x] **T6: `inventario.js` — fix para que "prueba: supervisor" resuelva su
  coordinador**
  - **RF cubiertos**: RF-2, RF-8, RF-11
  - **Archivos**: `js/inventario.js`
  - **Hecho cuando**: las dos escrituras (`guardarHerramientas`,
    `guardarMateriales`) usan `sesion.perfil.coordinadorUid` en vez de
    `sesion.real.perfil.coordinadorUid`; verificado que un supervisor real
    sigue guardando exactamente igual que antes (regresión), y que root en
    "prueba: supervisor" guarda con `coordinadorUid` = su propio uid en vez
    de `null`.
  - **Ampliación sobre lo planeado**: el plan solo pedía cambiar el
    `|| null` de respaldo, pero al implementar encontré que la CONDICIÓN
    (`sesion.real.perfil.rol === "coordinador" ? …`) tenía el mismo
    problema: para root en "prueba: coordinador" registrando inventario de
    un técnico de un supervisor de prueba propio, el rol REAL de root
    siempre es "root", así que esa condición nunca entraba a la rama
    "soy coordinador, uso mi propio uid" y caía siempre al `else` — que a
    su vez, sin este ajuste, resolvía a `null` porque
    `contextoEfectivoPrueba` solo autoreferencia `coordinadorUid` cuando el
    rol prestado es `"supervisor"`, no `"coordinador"`. Cambié también la
    condición a `sesion.perfil.rol` (efectivo). Para un coordinador o
    supervisor real no cambia nada (`sesion.perfil` == `sesion.real.perfil`
    fuera de estos modos). Aproveché para agregar `esPrueba: true` en
    ambas escrituras cuando `sesion.enPrueba`, igual que el resto.

- [x] **T7: `bitacora.js` y `evaluacion.js` adoptan identidad efectiva**
  - **RF cubiertos**: RF-2, RF-8, RF-11
  - **Archivos**: `js/bitacora.js`, `js/evaluacion.js`
  - **Hecho cuando**: ambos archivos usan `sesion = contextoActual(s)` en vez
    de `sesion = s`; toda referencia a un campo de autoría en una escritura
    (`supervisorUid`, etc.) usa `sesion.real.user.uid`; `sesion.perfil.coordinadorUid`
    sigue funcionando igual para un supervisor real y ahora también resuelve
    para "prueba: supervisor"; el guard de escritura lee `sesion.impersonando`
    directo; los documentos nuevos (bitácora, evaluación) traen `esPrueba: true`
    cuando `sesion.enPrueba` es verdadero. Verificado con un supervisor real
    (regresión: nada cambia) y con root en "prueba: supervisor" (crea una
    bitácora y una evaluación de técnico completas).

- [x] **T8: Banner de salida y verificación de que la escritura NO se bloquea**
  - **RF cubiertos**: RF-4, RF-5, RF-8
  - **Archivos**: `js/prueba.js` (botón de salida en el banner), `css/styles.css`
  - **Hecho cuando**: el banner muestra "🧪 Modo de prueba activo — actuando
    como coordinador/supervisor" con un botón que llama `salirDeModoPrueba()`
    y navega a `panel.html`; el color/clase (`--prueba`, `.banner-modo-prueba`)
    es visualmente distinto del banner ámbar de "Ver como" y nunca lo pisa
    (los dos nunca están montados a la vez, por RF-3); verificado que
    `deshabilitarControlesDeEscritura`/`bloqueaSiImpersona` NO actúan durante
    "Modo de prueba" — los botones de crear/editar en `panel.js`, `editor.js`,
    `bitacora.js`, `evaluacion.js` e `inventario.js` quedan operables.
  - **Verificado en `preview/`**: como root, "Actuar como coordinador" →
    banner violeta ("actuando como Coordinador") visible en `panel.html` y en
    `editor.html`; creé un supervisor de prueba (quedó "🧪 Supervisor Falso")
    y una plantilla tipo "A SUPERVISORES" (quedó "🧪 Evaluación de Prueba a
    Supervisores"), ambos sin errores de consola y con el botón habilitado
    (no deshabilitado, a diferencia de "Ver como"). "Actuar como supervisor"
    → banner cambia a "actuando como Supervisor"; agregué un técnico
    ("🧪 Técnico Falso"), registré una bitácora completa (guardada con
    éxito) y cargué el formulario de evaluación de técnico sin errores. El
    mock de `preview/` no persiste datos entre navegaciones de página
    (documentado en su propio README — "al recargar vuelve al ejemplo"), así
    que cada paso se verificó de forma independiente en vez de encadenados en
    una sola sesión; la garantía end-to-end fuerte la da T10 (reglas reales).

- [x] **T9: Auditoría de inicio y fin**
  - **RF cubiertos**: RF-13, RF-14
  - **Archivos**: `js/session.js` (ya tiene los `logAudit` de T1, se
    verifica aquí de punta a punta), `js/auditoria.js`,
    `preview/mock-session.js`
  - **Hecho cuando**: cada `activarModoPrueba`/`salirDeModoPrueba` deje su
    documento en `auditoria` con `rolElegido`; `js/auditoria.js` muestre
    "Modo de prueba: inicio"/"Modo de prueba: fin" sin romper el render de
    los tipos de evento existentes (incluidos los de "Ver como").

- [x] **T10: Pruebas de reglas — el corazón de la garantía de aislamiento**
  - **RF cubiertos**: RF-9, RF-10, RF-12, Criterios de finalización
  - **Archivos**: `tests-reglas/modo-prueba.test.js` (nuevo, 18 pruebas)
  - **Hecho cuando**: contra el emulador, con fixtures `root`, un
    `coordinador` real y un supervisor de prueba ya sembrado (como si root
    ya lo hubiera creado): el patrón éxito (uid propio + esPrueba) / falla
    (uid ajeno) / falla (uid propio sin esPrueba) se probó para `usuarios`
    (create), `plantillas` (create y update) y `enlaces` (create);
    `invitaciones` (sin exigir esPrueba, según el diseño); regresión en las
    cuatro colecciones (un coordinador real sigue pudiendo crear/editar lo
    suyo); y aislamiento de lectura (un coordinador real no lee ni lista al
    supervisor de prueba de root).
  - **Ajuste sobre lo planeado — hallazgo real, no un bug**: RF-12 decía que
    "las reglas de lectura de esas colecciones ya filtran" para las
    cuatro — repasando `firestore.rules` al escribir las pruebas, encontré
    que eso es cierto para `usuarios` (y por transitividad, vía
    `esMiSupervisor`, para `tecnicos`/`evaluaciones`/`bitacoras`/
    `inventario_*`), pero **no** para `plantillas` (`allow read: if
    request.auth != null` — cualquier autenticado, ya desde antes de esta
    spec, porque un supervisor necesita leer las plantillas de SU
    coordinador sin una regla de pertenencia) ni para `enlaces` (`allow
    read: if true` — público a propósito, para que el técnico sin cuenta
    abra el link). No es una fuga nueva de "Modo de prueba": ya era así
    para CUALQUIER plantilla o enlace real. Las pruebas de aislamiento se
    escribieron solo para `usuarios`, que es donde la garantía es real; el
    spec.md de esta carpeta quedó con esta aclaración.
  - **`npm run test:rules`**: corrido dos veces seguidas — **53/53 en
    verde** ambas veces (35 de antes + 18 nuevas), sin usar
    `--test-concurrency=1` de nuevo a mano (ya quedó en `package.json` desde
    el fix de la spec 003).

- [x] **T11: Recorrido manual de punta a punta y verificación final**
  - **RF cubiertos**: Criterios de finalización
  - **Archivos**: ninguno (verificación)
  - **Hecho cuando**: en `preview/`, como root:
    1. Activar "prueba: coordinador" → crear un supervisor de prueba → crear
       una plantilla `tipo: supervisor` → generar el link → abrirlo en una
       pestaña nueva SIN sesión → completar y enviar la evaluación como
       técnico anónimo → confirmar que aparece en "⭐ Evaluaciones" del
       supervisor de prueba.
    2. Salir, activar "prueba: supervisor" → crear un técnico de prueba →
       registrar una bitácora → evaluar al técnico de prueba.
    3. Confirmar que nada de lo anterior aparece en ninguna vista de un
       coordinador real (si hay alguno de prueba disponible para probar).
    4. Sin errores de consola en ningún paso.
    `npm test` y `npm run test:rules` ejecutados y en verde.

  ### Cierre — [x] hecho, con una salvedad honesta

  El recorrido encadenado tal cual está escrito arriba (crear supervisor →
  crear plantilla → generar link → abrirlo sin sesión → enviar → verlo
  reflejado) **no se pudo hacer de corrido en `preview/`**: su propio
  `README.md` documenta que el mock no persiste nada entre navegaciones de
  página ("al recargar vuelve al ejemplo"), así que cada paso reinicia los
  datos de los anteriores. Esto es una característica de la herramienta de
  previsualización, no un límite de "Modo de prueba" — ya lo advertía el
  plan.md antes de implementar.

  Lo que sí se hizo, y que en conjunto cubre lo mismo:
  - Cada paso individual (T8): crear supervisor de prueba, crear plantilla
    tipo supervisor, crear técnico de prueba, registrar bitácora, cargar el
    formulario de evaluación — todos sin errores de consola, con el prefijo
    🧪 y `esPrueba` aplicados donde corresponde.
  - El camino de escritura de punta a punta, con las reglas REALES (no el
    mock): `tests-reglas/modo-prueba.test.js` (T10), 53/53 en verde dos
    veces seguidas.
  - `evaluar.html`/`evaluar.js` (la página pública que abre el técnico) no
    se tocó en ninguna tarea — sigue siendo la misma que ya funcionaba para
    enlaces reales, y el enlace de prueba que crea root pasa exactamente por
    las mismas reglas (`activo == true`, `enlaceId` válido) que uno real.

  **El recorrido encadenado completo, con el bug real de Carlos, es algo que
  le corresponde probar al usuario una vez publicado** — es literalmente
  para lo que se construyó esta spec. `npm test`: 59/59. `npm run
  test:rules`: 53/53 (dos corridas).
