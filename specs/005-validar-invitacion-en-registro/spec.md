# Spec 005 — Validar a quién pertenece el alta por invitación

## Contexto y objetivo

Al diseñar la spec 004 (Modo de prueba) se encontró un hueco real en
`firestore.rules`: cuando alguien se auto-registra con un link de invitación
(`usuarios/{uid}`, rama 1 de `allow create`), la regla comprueba que el token
exista, esté reclamado por quien se registra y que el rol coincida — pero
**nunca cruza** el `coordinadorUid` (o `rootUid`, para un alta de coordinador)
que el cliente escribe contra `creadorUid` de la propia invitación, es decir,
contra quién la generó de verdad.

`js/registro.js` (el flujo real de la app) siempre lo hace bien: lee
`invitacion.creadorUid` del documento y lo copia tal cual al perfil nuevo. El
problema es que eso es lógica de **cliente**, no una regla. Cualquiera con un
token de invitación de rol `supervisor` válido y sin usar —incluida su propia
invitación legítima— podría, llamando al SDK directamente (sin pasar por
`registro.js`), declararse supervisor de **cualquier coordinador que exista**,
no solo del que lo invitó. Ese coordinador, sin saberlo, pasaría a "verlo"
como su propio supervisor (`esMiSupervisor()`) — con lectura y escritura sobre
los técnicos, evaluaciones, bitácoras e inventario que esa cuenta cree.

El mismo problema existe, en menor medida, para `rootUid` en el alta de un
coordinador: hoy ningún otro lugar de `firestore.rules` lee ese campo para
autorizar nada, así que no abre una puerta de acceso — pero conviene cerrarlo
igual, por simetría y porque es la misma clase de error.

Esta spec cierra ambos casos: la regla exige que el `coordinadorUid`/`rootUid`
declarado coincida con quien generó la invitación que se está reclamando.

## Usuarios / actores

- **Cualquier persona con un link de invitación válido** (supervisor o
  coordinador): sigue registrándose exactamente igual que hoy si usa
  `registro.js` sin manipular la petición.
- **Coordinador / root reales**: ganan la garantía de que un alta por
  invitación ajena nunca puede adjuntárseles sin que ellos mismos la hayan
  generado.

## Historias de usuario

- **H1**: Como coordinador, quiero que un supervisor solo pueda quedar ligado
  a mí si YO generé la invitación que usó, para que nadie pueda aparecer en
  "Mis supervisores" sin que yo lo haya invitado.
- **H2**: Como root, quiero la misma garantía para las invitaciones de
  coordinador que genero.
- **H3**: Como desarrollador, quiero que esto se sostenga en
  `firestore.rules`, no en que `registro.js` se porte bien — para que ni un
  error futuro en el cliente, ni una llamada directa al SDK, puedan abrir esa
  puerta.

## Requisitos funcionales (en notación EARS)

- **RF-1 (UBICUO)**: `firestore.rules` exigirá, en el alta por invitación de
  `usuarios/{uid}`, que `coordinadorUid` (si el rol es `supervisor`) o
  `rootUid` (si el rol es `coordinador`) sea igual al `creadorUid` del
  documento `invitaciones/{token}` que se está reclamando.
- **RF-2 (COMPORTAMIENTO NO DESEADO)**: SI el `coordinadorUid`/`rootUid`
  declarado no coincide con `creadorUid` de la invitación, ENTONCES la
  escritura se rechazará, sin importar que el token sea válido, esté sin usar
  y el rol coincida.
- **RF-3 (UBICUO)**: El flujo real (`js/registro.js`) seguirá funcionando sin
  cambios — ya escribe `coordinadorUid`/`rootUid` a partir de
  `invitacion.creadorUid`.

## Requisitos no funcionales

- **Sin dependencias nuevas** (Constitución art. 7).
- **Sin tocar el cliente**: el fix es enteramente de `firestore.rules`
  (Constitución art. 4, "seguridad delegada" — la garantía vive en las
  reglas). `js/registro.js` no necesita ningún cambio porque ya calcula bien
  el valor.

## Casos límite

- Una invitación real, generada por `generarInvitacion` en `panel.js`, con
  `creadorUid` correctamente puesto: el registro legítimo sigue funcionando
  exactamente igual (regresión a cubrir con test).
- Un intento de registrarse con el `coordinadorUid`/`rootUid` de OTRO
  coordinador/root, usando una invitación propia válida: debe fallar (es el
  caso que hoy no fallaba).

## Fuera de alcance

- Cualquier limpieza de invitaciones viejas o ya usadas.
- Cambiar el modelo de datos de `invitaciones` (el campo sigue llamándose
  `creadorUid`).

## Criterios de finalización

- `tests-reglas/registro-invitacion.test.js` (nuevo) prueba, contra el
  emulador: el alta legítima sigue funcionando; un alta con
  `coordinadorUid`/`rootUid` distinto al `creadorUid` de la invitación
  falla; ninguna prueba existente se rompe.
- `npm test` y `npm run test:rules` en verde.

## Dudas abiertas

*Ninguna pendiente para arrancar.*
