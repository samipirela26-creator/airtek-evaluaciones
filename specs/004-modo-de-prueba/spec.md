# Spec 004 — Modo de prueba (root crea y prueba con datos inventados)

## Contexto y objetivo

Carlos (coordinador) reportó que el link público para que sus técnicos
evalúen a un supervisor "no funciona". Para reproducir el bug, root
necesitaría generar ese link él mismo — pero hacerlo con la cuenta de Carlos
significaría pedirle su contraseña, y hacerlo como root directamente es
imposible hoy: las reglas de creación de `usuarios` (rol supervisor),
`plantillas` y `enlaces` solo aceptan a un coordinador real escribiendo a su
propio nombre.

La spec 003 ("Ver como") resuelve el caso opuesto — mirar datos REALES sin
poder tocarlos. Este módulo resuelve el caso complementario: **root necesita
escribir**, pero solo debe poder hacerlo sobre datos inventados por él mismo,
nunca sobre los de un coordinador o supervisor real. "Modo de prueba" deja
que root navegue la app prestándose el rol de coordinador o de supervisor,
con su propia sesión real (su propio uid), para crear un supervisor de
mentira, un formulario de mentira, técnicos de mentira, bitácoras y
evaluaciones de mentira, y así reproducir cualquier flujo completo —
incluyendo abrir el link de evaluación como un técnico anónimo, sin cuenta,
tal como llegaría a un técnico real.

A diferencia de "Ver como" (que sustituye la identidad completa por la de OTRA
persona real, de solo lectura), "Modo de prueba" conserva siempre el **uid
real de root** y solo cambia el **rol** con el que la interfaz lo trata. Por
eso las escrituras atribuidas a "coordinadorUid"/"creadorUid"/"supervisorUid"
terminan apuntando al propio root — nunca a un coordinador o supervisor real
— y por eso puede escribir sin bloqueo (al revés de "Ver como", donde la
escritura está totalmente prohibida).

Ambos modos son excluyentes entre sí: activar uno apaga el otro. Son dos
"disfraces" distintos que root se pone sobre su misma sesión real, nunca a la
vez.

## Usuarios / actores

- **root**: único rol que puede activar "Modo de prueba", eligiendo prestarse
  el rol `coordinador` o `supervisor`.
- **Coordinador / Supervisor reales**: no participan; sus datos NUNCA son
  alcanzables por este modo (ver RF-11/RF-12 y el análisis de aislamiento en
  plan.md).
- El **supervisor de prueba**, los **técnicos de prueba** y el **técnico
  anónimo** que abre el link público son ficticios: los primeros son
  documentos más en las colecciones de siempre, creados por root con datos
  inventados; el técnico anónimo no tiene cuenta, como cualquier técnico real
  que evalúa por el link.

## Historias de usuario

- **H1**: Como root, quiero activar un modo en el que la app me trate como
  coordinador o como supervisor (con mis propios datos, separados de los
  reales), para poder crear un supervisor de prueba, técnicos de prueba o
  formularios de prueba sin usar la cuenta de nadie.
- **H2**: Como root en modo de prueba (coordinador), quiero crear un
  formulario "para evaluar supervisores" y generar el link público para un
  supervisor de prueba, exactamente como lo haría un coordinador real, para
  reproducir el flujo íntegro que reportó Carlos.
- **H3**: Como root, quiero abrir ese link como lo abriría un técnico (sin
  iniciar sesión) para confirmar de punta a punta si el problema está en la
  generación del link, en el formulario público o en el guardado.
- **H4**: Como root en modo de prueba (supervisor), quiero poder registrar
  técnicos, bitácoras, inventario y evaluaciones de prueba, para reproducir
  también problemas del lado del supervisor sin usar una cuenta real.
- **H5**: Como root en modo de prueba, quiero un aviso permanente y
  claramente distinto del de "Ver como" (otro color, otro texto), para nunca
  confundir "estoy viendo datos reales de alguien" con "estoy jugando con
  datos inventados que puedo romper sin miedo".
- **H6**: Como root, quiero salir del modo con un clic y volver a mi vista
  normal de administrador.
- **H7**: Como root, quiero que activar y salir del modo de prueba quede
  registrado en `auditoria`, igual que "Ver como".
- **H8**: Como root, quiero la garantía de que nada de lo que haga en este
  modo pueda tocar, ni por accidente, los datos reales de un coordinador o
  supervisor existente — la base de esa garantía debe estar en
  `firestore.rules`, no solo en la interfaz.
- **H9**: Como root, quiero que lo que cree en este modo se reconozca a
  simple vista como "de prueba" en cualquier lista donde aparezca (dentro de
  mi propio sandbox), para no confundirlo después con algo real.

## Requisitos funcionales (en notación EARS)

### Activación

- **RF-1 (UBICUO)**: EL SISTEMA mostrará los controles de "🧪 Modo de prueba"
  únicamente a usuarios con rol `root`.
- **RF-2 (DIRIGIDO POR EVENTO)**: CUANDO root active "Modo de prueba"
  eligiendo `coordinador` o `supervisor`, EL SISTEMA le prestará ese rol en
  toda la interfaz, conservando su propio uid real (nunca inventa ni asume el
  uid de un coordinador o supervisor existente).
- **RF-3 (COMPORTAMIENTO NO DESEADO)**: SI "Ver como" está activo y root
  activa "Modo de prueba" (o viceversa), ENTONCES EL SISTEMA desactivará el
  modo que estaba activo antes de activar el nuevo — los dos nunca conviven
  en la misma pestaña.

### Aviso y salida

- **RF-4 (DIRIGIDO POR ESTADO)**: MIENTRAS "Modo de prueba" esté activo, EL
  SISTEMA mostrará en toda página un aviso fijo, visualmente distinto del
  banner de "Ver como" (otro color, otro texto), indicando qué rol se está
  prestando, con un control para salir.
- **RF-5 (DIRIGIDO POR EVENTO)**: CUANDO root pulse el control de salida, EL
  SISTEMA terminará "Modo de prueba" y volverá a la vista normal de root.
- **RF-6 (DIRIGIDO POR EVENTO)**: CUANDO root recargue cualquier página con
  "Modo de prueba" activo, EL SISTEMA mantendrá el modo activo, igual que
  "Ver como" (RF-6 de la spec 003).
- **RF-7 (COMPORTAMIENTO NO DESEADO)**: SI root cierra la pestaña o el
  navegador con "Modo de prueba" activo, ENTONCES EL SISTEMA no conservará
  ese estado en una pestaña nueva (vive en `sessionStorage`, igual que "Ver
  como").

### Escritura habilitada, pero aislada (el corazón de esta spec)

- **RF-8 (DIRIGIDO POR ESTADO)**: MIENTRAS "Modo de prueba" esté activo, EL
  SISTEMA permitirá crear/editar en las pantallas alcanzadas por el rol
  prestado: como coordinador, crear un supervisor, crear/editar una plantilla,
  generar el link público; como supervisor, crear técnicos, registrar
  bitácoras, inventario y evaluaciones. Los controles de escritura NO se
  deshabilitan (a diferencia de "Ver como").
- **RF-9 (UBICUO)**: `firestore.rules` permitirá a `root` crear un documento
  en `usuarios` (rol `supervisor`), `plantillas`, `enlaces` o `invitaciones`
  (rol `supervisor`) SOLO si el campo de propiedad correspondiente
  (`coordinadorUid`/`creadorUid`) es igual a su PROPIO uid; para `usuarios`,
  `plantillas` y `enlaces`, además exigirá que el documento traiga
  `esPrueba == true`.
- **RF-10 (COMPORTAMIENTO NO DESEADO)**: SI root intenta crear cualquiera de
  esos documentos con `coordinadorUid`/`creadorUid` de un coordinador real (o,
  para `usuarios`/`plantillas`/`enlaces`, sin `esPrueba: true`), ENTONCES
  `firestore.rules` rechazará la escritura, esté o no activo "Modo de prueba"
  en la interfaz — la barrera real vive en las reglas, no en la UI.
- **RF-11 (UBICUO)**: Todo documento `usuarios`/`plantillas`/`enlaces`/
  `tecnicos` creado a través de "Modo de prueba" se guardará con el campo
  `esPrueba: true` y con su `nombre` prefijado "🧪 " (si quien lo crea no puso
  ya ese prefijo).
- **RF-12 (UBICUO)**: Ningún coordinador o supervisor real podrá leer, listar
  ni ver como propio el `usuarios`/`tecnicos`/`evaluaciones`/`bitacoras`/
  `inventario_*` que root cree en "Modo de prueba" (se deduce de que
  `coordinadorUid`/`supervisorUid` siempre es el uid de root, y las reglas de
  lectura de esas colecciones ya filtran por `coordinadorUid ==
  request.auth.uid`, `supervisorUid == request.auth.uid` o
  `esMiSupervisor()`) — no requiere cambio de reglas de lectura, se verifica
  con una prueba dedicada. **No aplica a `plantillas` ni a `enlaces`**: sus
  reglas de lectura ya eran abiertas a cualquier autenticado (`plantillas`) o
  públicas (`enlaces`) desde antes de esta spec, para cualquier documento
  real — no es una fuga nueva de "Modo de prueba" (ver plan.md).

### Auditoría

- **RF-13 (DIRIGIDO POR EVENTO)**: CUANDO root active "Modo de prueba", EL
  SISTEMA registrará en `auditoria` un evento `modo_prueba_inicio` con el rol
  elegido.
- **RF-14 (DIRIGIDO POR EVENTO)**: CUANDO "Modo de prueba" termine (salida
  manual o cierre de pestaña detectado en la siguiente carga), EL SISTEMA
  registrará `modo_prueba_fin`.

## Requisitos no funcionales

- **Sin dependencias nuevas** (Constitución art. 7).
- **Seguridad delegada real** (Constitución art. 4): el aislamiento de datos
  de prueba no puede depender solo de que la UI se comporte bien; tiene que
  sostenerse en `firestore.rules`, verificado con `tests-reglas/`.
- **Responsive** e **idioma español**, igual que el resto de la app.

## Alcance de v1

**Dentro de alcance**:
- root prestándose el rol `coordinador`: crear un supervisor de prueba, crear
  o reutilizar una plantilla `tipo: "supervisor"`, generar el link público del
  supervisor de prueba, e invitar un supervisor de prueba por link (además de
  la creación directa).
- root prestándose el rol `supervisor`: crear técnicos de prueba, registrar
  bitácoras, inventario y evaluaciones de prueba, usando las plantillas que
  el propio root haya creado como "coordinador de prueba".
- Abrir el link generado como técnico anónimo en `evaluar.html` (ya público,
  sin cambios) y confirmar que la evaluación llega.

**Fuera de alcance de v1 (diferido, con justificación)**:
- Extender el modo a otros roles que no sean `root`.
- Un botón de "borrar todos mis datos de prueba de una sola vez": v1 reutiliza
  los controles de eliminar ya existentes; un barrido automático queda para
  una iteración futura si hace falta.
- **Cerrar el hueco pre-existente de `invitaciones`**: el alta por invitación
  en `usuarios` no cruza hoy el `coordinadorUid` que el nuevo supervisor se
  asigna contra quién generó la invitación (`invitaciones.creadorUid`) — esto
  es anterior a esta spec y afecta también a invitaciones reales, no solo a
  las de prueba. Se documenta como limitación heredada (ver plan.md) y se
  deja para una decisión aparte, no bloqueante para esta spec.

## Casos límite

- root activa "Modo de prueba" con "Ver como" ya activo (o al revés): el modo
  nuevo apaga al anterior (RF-3); nunca hay ambigüedad sobre cuál manda.
- root, en modo de prueba, intenta ver un supervisor REAL: no debería poder —
  `cargarSupervisores()` filtra por su propio uid como `coordinadorUid`, que
  nunca coincide con uno real — cubierto por aislamiento de datos, no por
  bloqueo de UI.
- root activa "prueba: supervisor" sin haber creado antes ninguna plantilla
  como "prueba: coordinador": `evaluacion.js` cae al formulario oficial por
  defecto, igual que le pasaría a un supervisor real sin formularios
  personalizados de su coordinador — comportamiento ya existente, no requiere
  caso especial.
- root cierra la pestaña con el modo activo a mitad de crear un supervisor de
  prueba: el supervisor ya creado queda igual (es una escritura ya
  confirmada); el modo simplemente no sobrevive a la pestaña nueva (RF-7).
- El supervisor de prueba no tiene coordinador "hermano" real: la
  reasignación de técnicos entre supervisores hermanos (`mostrarSupervisor`)
  simplemente no ofrece hermanos, porque no hay otro supervisor con
  `coordinadorUid` igual al de root — comportamiento normal, no requiere caso
  especial.

## Criterios de finalización

- root puede, sin salir de su propia sesión, activar "Modo de prueba" como
  coordinador, crear un supervisor de prueba, crear/reutilizar una plantilla
  `tipo: supervisor`, generar el link público y abrirlo como técnico anónimo,
  completando una evaluación de prueba de punta a punta.
- root puede activar "Modo de prueba" como supervisor y registrar un técnico,
  una bitácora y una evaluación de prueba.
- El aviso de "Modo de prueba" es visualmente distinto del de "Ver como" y
  está presente en toda página mientras el modo está activo.
- Todo lo creado en este modo trae `esPrueba: true` y el prefijo "🧪 " en su
  nombre.
- `tests-reglas/modo-prueba.test.js` prueba, contra el emulador, que root
  SOLO puede crear `usuarios`(supervisor)/`plantillas`/`enlaces`/
  `invitaciones`(supervisor) con `coordinadorUid`/`creadorUid` igual a su
  propio uid (y, salvo `invitaciones`, con `esPrueba: true`), y que
  intentarlo con el uid de un coordinador real falla siempre — incluyendo una
  prueba de que un coordinador real no puede leer nada de lo creado por root
  en este modo.
- Cada activación y cada cierre quedan en `auditoria`.
- `npm test` y `npm run test:rules` en verde.
- Recorrido manual completo en `preview/`, sin errores de consola.

## Dudas abiertas

*Ninguna pendiente para arrancar.* Resueltas con el usuario antes de esta
spec: alcance incluye coordinador Y supervisor; `invitaciones` se extiende
(con la limitación heredada documentada arriba); se agrega el prefijo visual
🧪 además del campo `esPrueba`. El color/copy exacto del banner y de los
botones de activación queda propuesto en plan.md, ajustable sin bloquear el
resto.
