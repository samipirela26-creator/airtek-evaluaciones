# Plan técnico — Spec 005

## Decisiones y por qué

| Decisión | Razón |
|---|---|
| El fix va SOLO en `firestore.rules` | `js/registro.js` ya calcula bien `coordinadorUid`/`rootUid` (los lee de `invitacion.creadorUid`) — el hueco es que nada lo obliga a nivel de regla. Tocar el cliente no cerraría el hueco (alguien podría seguir llamando al SDK directo). |
| Se corrige `rootUid` a la vez, no solo `coordinadorUid` | Mismo tipo de error, mismo lugar del código, mismo costo de arreglarlo ahora. Hoy `rootUid` no gatea nada (no es una puerta de acceso abierta), pero dejarlo así es una inconsistencia que no cuesta nada cerrar. |
| No se agrega compatibilidad con el nombre de campo viejo `invitacion.coordinadorUid` | `registro.js` tiene un `\|\| invitacion.coordinadorUid` de compatibilidad con una invitación de una versión anterior (antes de que el campo se llamara `creadorUid`, ver `git log -S`). Toda invitación real generada hoy por `generarInvitacion` en `panel.js` escribe `creadorUid`. Las invitaciones vencen a los 7 días — cualquier invitación con el nombre de campo viejo está, con certeza práctica, vencida o ya usada. Agregar el fallback a la regla es complejidad sin beneficio real; si algún día aparece un caso, se agrega entonces con el caso real en la mano. |
| Prueba nueva y separada (`tests-reglas/registro-invitacion.test.js`), no ampliar `ver-como.test.js` ni `modo-prueba.test.js` | Este fix no tiene relación con root ni con los modos de las specs 003/004 — es sobre el alta normal de cualquier coordinador/supervisor. Mezclarlo en esos archivos confundiría de qué protege cada suite. |

## Cambio en `firestore.rules`

En `match /usuarios/{uid}`, rama 1 de `allow create` (auto-registro por
invitación), se agrega una comprobación más al final:

```
allow create: if
  // 1) Auto-registro por invitación (link)
  (request.auth != null && request.auth.uid == uid
    && (request.resource.data.rol == 'supervisor' || request.resource.data.rol == 'coordinador')
    && exists(/databases/$(database)/documents/invitaciones/$(request.resource.data.inviteToken))
    && invit(request.resource.data.inviteToken).usadoPor == request.auth.uid
    && invit(request.resource.data.inviteToken).rol == request.resource.data.rol
    // El coordinador/root que el perfil nuevo declara como suyo tiene que
    // ser quien de verdad generó la invitación — si no, cualquier
    // invitación válida serviría para adjuntarse a cualquier coordinador o
    // root que exista, no solo al que invitó.
    && (
      (request.resource.data.rol == 'supervisor'
        && request.resource.data.coordinadorUid == invit(request.resource.data.inviteToken).creadorUid)
      || (request.resource.data.rol == 'coordinador'
        && request.resource.data.rootUid == invit(request.resource.data.inviteToken).creadorUid)
    ))
  // 2), 3), 4): sin cambios
  || ...
```

No se toca ninguna otra rama de la regla, ni `allow read/update/delete`, ni
ninguna otra colección.

## Pruebas (`tests-reglas/registro-invitacion.test.js`)

Mismo patrón que `ver-como.test.js`/`modo-prueba.test.js`
(`@firebase/rules-unit-testing`, `entorno.authenticatedContext(uid)`,
`assertSucceeds`/`assertFails`). Fixtures: dos coordinadores reales
(`coord-1`, `coord-2`) y un root, más invitaciones ya "reclamadas"
(`usado: true, usadoPor: <uid-que-se-registra>`) — así se simula el estado en
que queda la invitación justo antes de que `registro.js` escriba el
`usuarios/{uid}` (el reclamo atómico ya sucedió en un paso previo, que sus
propias reglas de `update` ya prueban en otro lado y no hace falta repetir
aquí).

Casos:
1. Alta de supervisor con `coordinadorUid` == `creadorUid` de su invitación
   → `assertSucceeds` (el camino real, regresión).
2. Alta de supervisor con `coordinadorUid` de OTRO coordinador (no quien lo
   invitó) → `assertFails` (el caso que hoy fallaba en pasar y ahora sí
   falla — el bug cerrado).
3. Alta de coordinador con `rootUid` == `creadorUid` de su invitación →
   `assertSucceeds`.
4. Alta de coordinador con `rootUid` que no es el root real → `assertFails`.

## Riesgos

- **Romper el registro legítimo por una diferencia de tipo/formato entre
  `coordinadorUid` y `creadorUid`.** Mitigado: ambos son siempre un uid de
  Firebase Auth (string), y `registro.js` ya los iguala explícitamente
  (`coordinadorUid: creadorUid`). El test de regresión (caso 1 arriba) lo
  confirma contra el emulador, no solo por lectura de código.
