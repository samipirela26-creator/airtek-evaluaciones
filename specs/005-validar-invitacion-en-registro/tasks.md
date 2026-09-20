# Tareas — Spec 005: Validar a quién pertenece el alta por invitación

- [x] **T1: `firestore.rules` — exigir que coordinadorUid/rootUid coincida con quien invitó**
  - **RF cubiertos**: RF-1, RF-2, RF-3
  - **Archivos**: `firestore.rules`
  - **Hecho cuando**: la rama 1 (auto-registro) de `allow create` en
    `usuarios/{uid}` exige, además de lo que ya exige hoy, que
    `coordinadorUid` (rol supervisor) o `rootUid` (rol coordinador) sea
    igual a `invit(inviteToken).creadorUid`. Ninguna otra rama ni colección
    cambia.

- [x] **T2: Pruebas de reglas — regresión y el caso que se cierra**
  - **RF cubiertos**: Criterios de finalización
  - **Archivos**: `tests-reglas/registro-invitacion.test.js` (nuevo, 4 pruebas)
  - **Hecho cuando**: contra el emulador, con dos coordinadores reales y un
    root: (1) alta de supervisor con `coordinadorUid` correcto → éxito
    (regresión); (2) alta de supervisor con `coordinadorUid` de OTRO
    coordinador → falla (el bug, cerrado); (3) alta de coordinador con
    `rootUid` correcto → éxito; (4) alta de coordinador con `rootUid`
    incorrecto → falla. `npm run test:rules` completo sigue en verde
    (incluye `ver-como.test.js`, `modo-prueba.test.js`, `fotos.test.js`,
    `inventarios.test.js`, `renombrar.test.js`, sin regresiones).
  - **`npm run test:rules`**: 57/57 en verde (53 de antes + 4 nuevas), dos
    corridas seguidas.
