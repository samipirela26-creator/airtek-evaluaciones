# Spec 003 — Modo "Ver como" (impersonación de solo lectura para root)

## Contexto y objetivo

Cuando un coordinador o supervisor reporta un problema o una duda sobre lo que
ve en la app, hoy `root` no tiene forma de comprobarlo sin pedirle sus
credenciales. Este módulo le permite a `root` elegir a cualquier coordinador o
supervisor de una lista y navegar la aplicación con los datos reales de esa
persona, con un aviso permanente en pantalla y sin poder crear, editar ni
borrar nada mientras dura.

Es un cambio puramente de cliente: todas las reglas de lectura de
`firestore.rules` (`usuarios`, `tecnicos`, `evaluaciones`, `bitacoras`,
`inventario_herramientas`, `inventario_materiales`) ya terminan en
`|| esRoot()`, así que `root`, con su propia sesión real, ya puede leer lo
mismo que vería cualquier coordinador o supervisor. Lo que falta es que la
interfaz filtre y muestre esos datos como si fuera esa persona, sin permitir
escribir por error.

## Usuarios / actores

- **root**: único rol que puede activar "Ver como". Ve la aplicación con los
  datos de otro usuario, sin escritura.
- **Coordinador / Supervisor**: usuarios que pueden ser elegidos como
  "objetivo" de "Ver como". No participan activamente en esta funcionalidad;
  sus datos son solo leídos.
- Los **técnicos** no tienen cuenta ni rol propio (son datos gestionados por
  su supervisor) y por lo tanto no pueden ser elegidos.

## Historias de usuario

- **H1**: Como root, quiero elegir a un coordinador o supervisor de una lista
  y ver la aplicación con sus datos reales, para diagnosticar sus problemas
  sin pedirle credenciales.
- **H2**: Como root, mientras estoy viendo como otra persona, quiero un aviso
  permanente y visible que me recuerde en qué modo estoy y me deje volver a mi
  cuenta con un clic.
- **H3**: Como root, quiero que mientras veo como otra persona no se pueda
  crear, editar ni borrar nada por accidente, para no alterar datos reales
  creyendo que actúo en un entorno de prueba.
- **H4**: Como root, quiero que cada uso de "Ver como" quede registrado (quién,
  a quién, cuándo), para poder auditar el uso de una función tan sensible.

## Requisitos funcionales (en notación EARS)

### Activación

- **RF-1 (UBICUO)**: EL SISTEMA mostrará el control "Ver como" únicamente a
  usuarios con rol `root`.
- **RF-2 (DIRIGIDO POR EVENTO)**: CUANDO root abra el selector "Ver como", EL
  SISTEMA listará los usuarios con rol `coordinador` o `supervisor` (nombre y
  rol), excluyendo a `root` mismo.
- **RF-3 (DIRIGIDO POR EVENTO)**: CUANDO root elija un usuario de la lista, EL
  SISTEMA activará el modo "Ver como" para ese usuario y mostrará en las
  pantallas correspondientes (panel, bitácoras, técnicos, evaluaciones,
  inventario) los datos reales de esa persona en vez de los de `root`.

### Aviso y salida

- **RF-4 (DIRIGIDO POR ESTADO)**: MIENTRAS el modo "Ver como" esté activo, EL
  SISTEMA mostrará en toda página un aviso fijo y visible con el nombre y rol
  del usuario visto, y un control "Volver a mi cuenta".
- **RF-5 (DIRIGIDO POR EVENTO)**: CUANDO root pulse "Volver a mi cuenta", EL
  SISTEMA terminará el modo "Ver como" y volverá a mostrar los datos reales de
  `root`.
- **RF-6 (DIRIGIDO POR EVENTO)**: CUANDO root recargue cualquier página con el
  modo "Ver como" activo, EL SISTEMA mantendrá el modo activo y seguirá
  mostrando los datos del usuario elegido, sin requerir elegirlo de nuevo.
- **RF-7 (COMPORTAMIENTO NO DESEADO)**: SI root cierra la pestaña o el
  navegador con el modo "Ver como" activo, ENTONCES EL SISTEMA no conservará
  ese estado al abrir una sesión nueva (el modo no sobrevive más allá de la
  pestaña).

### Bloqueo de escritura

- **RF-8 (DIRIGIDO POR ESTADO)**: MIENTRAS el modo "Ver como" esté activo, EL
  SISTEMA ocultará o deshabilitará todo control de crear, editar o borrar en
  cualquier pantalla de la aplicación.
- **RF-9 (COMPORTAMIENTO NO DESEADO)**: SI, pese al bloqueo de interfaz, se
  intenta ejecutar una acción de escritura mientras el modo "Ver como" está
  activo, ENTONCES EL SISTEMA la rechazará también en el código, antes de
  contactar a Firestore.

### Auditoría

- **RF-10 (DIRIGIDO POR EVENTO)**: CUANDO root active el modo "Ver como", EL
  SISTEMA registrará en la colección `auditoria` un evento con quién lo activó,
  a quién eligió y cuándo.
- **RF-11 (DIRIGIDO POR EVENTO)**: CUANDO el modo "Ver como" termine (por
  "Volver a mi cuenta" o cierre de pestaña detectado en la siguiente carga), EL
  SISTEMA registrará en `auditoria` el evento de cierre correspondiente.
- **RF-12 (UBICUO)**: La colección `auditoria` seguirá siendo legible
  únicamente por `root`, igual que hoy.

## Requisitos no funcionales

- **Sin dependencias nuevas**: implementado con lo ya disponible (Firebase
  Auth/Firestore vía CDN, `sessionStorage`), sin librerías nuevas en runtime
  (Constitución art. 7).
- **Sin backend propio**: el modo funciona íntegramente en el cliente; no
  requiere servidor ni cambios en `firestore.rules` (Constitución art. 2, 3).
- **Responsive**: el selector y el aviso deben verse y usarse bien también en
  móvil, igual que el resto de la app.
- **Idioma**: interfaz y mensajes en español (es-VE / es).

## Casos límite

- root intenta activar "Ver como" sin elegir a nadie: el selector debe exigir
  una selección antes de activar el modo.
- El usuario elegido fue borrado o inhabilitado entre que se cargó la lista y
  que se activó el modo: el sistema debe avisar y no activar el modo con datos
  inválidos.
- root abre dos pestañas: como el estado vive en `sessionStorage`, cada
  pestaña mantiene su propio modo "Ver como" de forma independiente (activar
  el modo en una no afecta a la otra).
- El usuario elegido es un coordinador con sus propios supervisores: root debe
  ver el panel de coordinador tal cual lo vería esa persona, incluyendo sus
  supervisores reales.

## Fuera de alcance (para esta iteración)

- Extender "Ver como" a otros roles (p. ej. que un coordinador "vea como" a
  sus supervisores). Solo `root` puede usarlo.
- Expiración automática por inactividad. El modo dura hasta que root salga
  manualmente o cierre la pestaña.
- Cerrar el modo automáticamente si el usuario visto es inhabilitado o
  borrado *mientras* el modo ya está activo (el caso cubierto es solo el de
  activación, ver Casos límite).
- Permitir alguna escritura durante el modo, aunque sea limitada: el bloqueo
  es total.

## Criterios de finalización

- root puede elegir un coordinador o supervisor real y ver sus datos genuinos
  en cada pantalla relevante (bitácora, técnicos, evaluaciones, inventario).
- El aviso y "Volver a mi cuenta" están presentes en toda página mientras el
  modo está activo.
- Ningún control de crear/editar/borrar queda operable durante el modo,
  verificado tanto en la interfaz como con una prueba de reglas que confirme
  que `root` no puede crear documentos a nombre de otro `uid`.
- Cada activación y cada cierre del modo quedan en `auditoria`.
- `npm test` ejecutado y en verde.
- Recorrido manual completo del flujo en `preview/`, sin errores de consola.

## Dudas abiertas

*Ninguna pendiente.* Resueltas con el usuario antes de esta spec: bloqueo de
escritura total (no parcial), sí se registra en `auditoria`, y la duración del
modo es manual vía `sessionStorage` (sin expiración automática por
inactividad).
