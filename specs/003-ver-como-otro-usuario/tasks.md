# Tareas — Spec 003: Modo "Ver como" (impersonación de solo lectura para root)

- [x] **T1: Identidad efectiva en `session.js`**
  - **RF cubiertos**: RF-3, RF-4, RF-6, RF-7
  - **Archivos**: `js/session.js`, `js/ver-como-data.js` (nuevo),
    `tests/ver-como.test.js` (nuevo)
  - **Hecho cuando**: existan `activarVerComo`, `salirDeVerComo` y
    `contextoActual`; `contextoActual()` devuelva el uid/perfil reales sin
    modo activo y los del usuario elegido con el modo activo (incluyendo
    `real` con la identidad verdadera de root); y una prueba pura confirme
    ese comportamiento sin depender de Firebase.
  - **Nota**: `session.js` importa Firebase a nivel de módulo, así que no se
    puede probar directo con `node --test` (mismo motivo por el que
    `bitacora.js`/`inventario.js` tampoco se prueban directo — ver
    `plan.md` de la spec 002). La lógica quedó en `js/ver-como-data.js`
    (sin DOM ni Firebase, siguiendo el patrón de `bitacora-data.js`), y
    `session.js` solo la conecta a `sessionStorage` real.

- [x] **T2: Selector "Ver como" en el panel de root**
  - **RF cubiertos**: RF-1, RF-2, RF-3
  - **Archivos**: `js/panel.js`, `js/ver-como.js` (nuevo),
    `preview/mock-session.js` (agrega los exports nuevos de sesión para que
    la previsualización local no se rompa)
  - **Hecho cuando**: solo `root` vea el selector; al abrirlo liste
    coordinadores y supervisores reales (nombre + rol, sin incluir a root); y
    al elegir uno, `activarVerComo` quede llamado y la vista se actualice con
    sus datos.
  - **Nota**: no hizo falta tocar `panel.html` — el selector se monta dentro
    de la tarjeta `#acciones` que ya existe. Verificado en `preview/`
    (`?u=root`): el combo lista a Carlos, Supervisor Uno y Supervisor Dos;
    "Entrar" sin elegir nada avisa con un toast; al elegir a Supervisor Uno,
    `sessionStorage` queda con `{"uid":"u_sup1","nombre":"Supervisor
    Uno","rol":"supervisor"}` y la página recarga sin errores de consola. El
    panel **todavía muestra la vista de root** tras recargar — eso es
    esperado: `panel.js` sigue leyendo la identidad real de
    `protegerPagina` en vez de `contextoActual()`, que es justamente lo que
    hace T4.

- [x] **T3: Banner de aviso y "Volver a mi cuenta"**
  - **RF cubiertos**: RF-4, RF-5
  - **Archivos**: `js/ver-como.js`, `css/styles.css`, `js/session.js`,
    `preview/mock-session.js`
  - **Hecho cuando**: con el modo activo, cualquier página muestre el banner
    con nombre y rol correctos, y "Volver a mi cuenta" llame a
    `salirDeVerComo` y regrese a los datos reales de root.
  - **Nota 1 — por qué se tocó `session.js`**: para que el banner salga en
    "cualquier página" sin agregar una línea a cada una de las ~13 páginas
    protegidas, `protegerPagina` lo monta él solo (`montarAvisoVerComo`),
    con un **import dinámico** de `ver-como.js` — uno estático habría creado
    un ciclo (`ver-como.js` ya importa de `session.js` para el selector), y
    `firebase.js` exporta `db`/`auth` como `const`, así que un ciclo real
    arriesgaba un error de inicialización.
  - **Nota 2 — bug encontrado y corregido de paso**: `protegerPagina` también
    decide si dejas entrar a una página según el rol (p. ej. `bitacora.html`
    exige `"supervisor"`). Antes de este cambio comparaba contra el rol
    **real** de root, así que "Ver como" habría dejado a root fuera de
    cualquier pantalla exclusiva de otro rol. Ahora compara contra el rol de
    la persona vista mientras el modo está activo.
  - Verificado en `preview/`: el banner aparece igual en `panel.html` e
    `inventario.html` (páginas no tocadas) sin errores de consola; "Volver a
    mi cuenta" limpia `sessionStorage` y regresa a `panel.html`. El gate de
    rol no se pudo probar en `preview/` porque el mock lo ignora a propósito
    (dice "para que puedas ver cualquier pantalla"); se verificó leyendo el
    código de `protegerPagina`.

- [x] **T4: Propagar el uid efectivo a las consultas de lectura**
  - **RF cubiertos**: RF-3, RF-6
  - **Archivos**: `js/panel.js`, `js/inventario.js`, `js/dashboard.js`,
    `js/bitacora-tablero.js`, `js/reporte-herramientas.js`, `js/editor.js`
  - **Hecho cuando**: cada consulta que hoy filtra por `sesion.user.uid` use
    el uid de `contextoActual()`, verificado viendo con "Ver como" los datos
    reales de un supervisor y un coordinador de prueba.
  - **Regla aplicada en todos estos archivos**: `sesion = contextoActual(...)`
    da la identidad EFECTIVA (`sesion.uid`/`sesion.perfil`) — se usa para
    toda LECTURA (consultas, y qué rama de la interfaz se pinta). Toda
    ESCRITURA que registre "quién hizo esto" (`supervisorUid`, `creadorUid`,
    `coordinadorUid`, `actualizadoPor`, `rootUid`, ...) usa en cambio
    `sesion.real` (la identidad verdadera) — nunca hay que atribuirle una
    escritura a la persona vista. Cuando no hay "Ver como" activo,
    `sesion.uid === sesion.real.user.uid`, así que el comportamiento normal
    no cambia.
  - **`js/consultas.js` no necesitó tocarse**: ya era puro (recibe el uid
    como parámetro, no toca `sesion`); bastaba con que cada llamador le
    pasara el uid efectivo.
  - **`js/perfil.js` y `js/detalle.js` se dejaron fuera a propósito**:
    - `perfil.js` es "Mi cuenta": edita el correo/contraseña reales de
      Firebase Auth (`auth.currentUser`, que siempre es la sesión real).
      Usar ahí la identidad efectiva habría sido peligroso — se habría
      podido guardar un cambio de cuenta a nombre de la persona equivocada.
      Sigue mostrando y editando siempre a quien de verdad inició sesión.
    - `detalle.js` no filtra nada por uid (carga una evaluación por id de la
      URL); su único uso de identidad es decidir si mostrar "Editar", y se
      dejó con la identidad real a propósito (es un control de escritura).
  - Verificado en `preview/`: "Ver como Supervisor Uno" → `panel.html`
    muestra sus propios técnicos (Juan Pérez, María Gómez), no los de root.
    "Ver como Carlos (Coordinador)" → `dashboard.html` (2 supervisores, 5
    evaluaciones), `bitacora-tablero.html` (2 supervisores, 6 actividades),
    `reporte-herramientas.html` (3 técnicos), `editor.html` (sus
    formularios) e `inventario.html` (sus 3 técnicos) muestran todos los
    datos reales de Carlos. `perfil.html` sigue mostrando "Samuel (Root)"
    aunque el banner diga "Viendo como Carlos" — confirma que Mi Cuenta no
    se ve afectada. Sin errores de consola en ningún caso.

- [x] **T5: Bloqueo total de escritura durante "Ver como"**
  - **RF cubiertos**: RF-8, RF-9
  - **Archivos**: `js/ver-como.js` (los dos guards nuevos), `js/panel.js`,
    `js/inventario.js`, `js/perfil.js`, `js/editor.js`, `js/bitacora.js`,
    `js/evaluacion.js`, `js/detalle.js` (no estaba en la lista original —
    tiene un botón "Eliminar evaluación", también se guardó)
  - **Hecho cuando**: ningún control de crear/editar/borrar quede operable
    con el modo activo, y cada función de guardado rechace la escritura si
    `contextoActual().impersonando` es verdadero, incluso si se la invoca sin
    pasar por el botón (p. ej. desde la consola).
  - **Dos funciones nuevas en `js/ver-como.js`**:
    - `bloqueaSiImpersona(sesion)`: se llama al PRINCIPIO de cada función
      que escribe en Firestore — es la protección real de RF-9, no depende
      de que el botón estuviera deshabilitado.
    - `deshabilitarControlesDeEscritura(sesion, [ids])`: deshabilita de una
      vez los controles estáticos de una pantalla (RF-8), llamada una sola
      vez después de pintarlos. Para botones que se generan por fila (un
      supervisor, una invitación, un técnico...) se deshabilitan con un
      `querySelectorAll` puntual en el propio archivo en vez de por id.
  - **`js/bitacora.js`, `js/evaluacion.js`, `js/detalle.js` no tienen
    `sesion = contextoActual(...)`** (siguen con la identidad real, como
    decidió T4 que debían quedar bitacora.js/evaluacion.js): se les agregó
    solo un flag local `impersonando` para el bloqueo, sin tocar cómo
    escriben sus datos.
  - **Cobertura**: se guardó CADA función que llama a `addDoc`/`setDoc`/
    `updateDoc`/`deleteDoc` en estos archivos (confirmado con
    `grep -n "await addDoc\|await setDoc\|await updateDoc\|await deleteDoc"`
    en los ocho archivos). Las pantallas de solo lectura
    (`dashboard.js`, `bitacora-tablero.js`, `reporte-herramientas.js`,
    `consultas.js`, `historial.js`, `auditoria.js`) no tienen ninguna
    escritura y no necesitaron cambios.
  - Verificado en `preview/` (viendo como Supervisor Uno): "+ Agregar" y
    los íconos ✏️/✕ de cada técnico quedan deshabilitados (el de 📋
    Historial, de solo lectura, sigue activo). Reactivé `btn-add-tecnico`
    a mano por consola, lo llené y lo pulsé igual: no se creó ningún
    técnico nuevo (la lista siguió con Juan Pérez y María Gómez), y salió
    el aviso "No puedes hacer cambios mientras ves la app como otra
    persona" — confirma que el bloqueo real está en el código, no solo en
    la interfaz. En `evaluacion.html`, `btn-guardar` también queda
    deshabilitado.

- [x] **T6: Auditoría de inicio y fin**
  - **RF cubiertos**: RF-10, RF-11, RF-12
  - **Archivos**: `js/session.js`, `js/auditoria.js`, `js/ver-como.js`
    (había que esperar el registro antes de recargar/navegar),
    `preview/mock-session.js`
  - **Hecho cuando**: cada `activarVerComo`/`salirDeVerComo` cree su
    documento en `auditoria` con actor, objetivo y fecha; y
    `js/auditoria.js` muestre los nuevos tipos de evento sin romper el
    render de los que ya existían.
  - **Cómo quedó**: reutiliza el `logAudit(accion, detalle)` que ya existía
    en `firebase.js` (no una escritura nueva a mano) —
    `logAudit("ver_como_inicio"/"ver_como_fin", { objetivoUid,
    objetivoNombre, objetivoRol })`. El actor (`uid`) lo pone `logAudit`
    solo, con `auth.currentUser.uid` — siempre la identidad real, nunca la
    impersonada. `salirDeVerComo` lee el `verComo` guardado ANTES de
    borrarlo, para poder loguear a quién se dejó de ver.
    `activarVerComo`/`salirDeVerComo` pasaron a ser `async`, y sus dos
    únicos llamadores (`ver-como.js`, selector y banner) ahora hacen
    `await` antes de `location.reload()`/`location.href` — si no, la
    recarga podía cancelar la escritura a mitad de camino.
    `auditoria.js` solo necesitó dos líneas nuevas en su mapa `ACCIONES`
    ("Ver como: inicio" / "Ver como: fin"); ya mostraba `detalle` de forma
    genérica.
  - Verificado: llamando `activarVerComo`/`salirDeVerComo` directo desde la
    consola del navegador contra `preview/` (para no perder el estado en
    memoria con la recarga de página), aparecieron ambos documentos en
    `SEED.auditoria` con el `objetivoUid`/`objetivoNombre`/`objetivoRol`
    correctos. Aparte, el flujo real por clic (selector → banner → "Volver
    a mi cuenta") se probó completo sin errores de consola.

- [x] **T7: Pruebas y verificación final**
  - **RF cubiertos**: Criterios de finalización
  - **Archivos**: `tests-reglas/ver-como.test.js` (nuevo, fixture `root`)
  - **Hecho cuando**: `npm test` pase completo; una prueba contra el
    emulador confirme que `root` no puede crear bitácoras, evaluaciones ni
    técnicos con `supervisorUid` distinto al suyo; y el recorrido manual del
    flujo completo en `preview/` (activar, navegar, intentar escribir,
    volver) no muestre errores de consola.
  - **`npm test`**: 52/52 en verde (incluye los 5 casos de T1 y ningún caso
    roto por T2-T6).
  - **`npm run test:rules`**: nuevo `tests-reglas/ver-como.test.js` con el
    primer fixture `root` del proyecto — 9 pruebas, todas en verde contra
    el emulador real:
    - root **lee** cualquier perfil/técnico/evaluación/bitácora (2 pruebas)
      — confirma por qué "Ver como" no tuvo que tocar `firestore.rules`.
    - root **NO puede crear** un técnico, evaluación ni bitácora con
      `supervisorUid` de otra persona (3 pruebas) — la base real (no solo
      de interfaz) de T5.
    - root sí puede crear algo a su PROPIO nombre (1 prueba, documenta que
      la única barrera real es esa igualdad de uid, no un chequeo de rol).
    - root **SÍ puede editar/borrar** documentos ya existentes y
      actualizar cualquier perfil (3 pruebas) — documenta por qué T5 tiene
      que bloquear esas acciones en la interfaz: las reglas solas no
      alcanzan ahí.
    - **Nota de entorno**: el puerto 8085 (el de siempre para el emulador,
      en `firebase.json` y los demás `tests-reglas/*.test.js`) estaba
      ocupado por un proceso ajeno a este proyecto en esta máquina (un
      `python3 -m http.server` de otra herramienta). Para no tocar ese
      proceso, corrí esta prueba una vez de forma temporal contra el
      puerto 8095 (cambiando `firebase.json` y el puerto del archivo, y
      revirtiendo ambos apenas terminó) — confirmado con `git diff
      firebase.json` sin cambios al terminar. El archivo que queda en el
      repo usa el puerto 8085 estándar, igual que `fotos.test.js`,
      `inventarios.test.js` y `renombrar.test.js`; correrá normal con
      `npm run test:rules` en cuanto ese puerto esté libre.
  - **Recorrido manual en `preview/`** (root → Ver como Carlos
    (Coordinador) → navegar a `editor.html` → confirmar botones
    deshabilitados → forzar un click igual → toast de rechazo, sin crear
    nada → "Volver a mi cuenta" → de regreso en `panel.html` con
    `sessionStorage` limpio): sin errores de consola en ningún paso.
