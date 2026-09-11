# AGENTS.md — airtek-evaluaciones

## Proyecto
Sistema web de evaluación de técnicos para Airtek. Arquitectura estática (HTML/CSS/JS ES Modules) sin build step, con Firebase (Auth + Firestore) como backend y despliegue en GitHub Pages.

## Metodología
- Metodología activa: **Spec-Driven Development (SDD)** en modalidad **Spec-Anchored**.
- Guía maestra: `docs/sdd-guide.md`.
- Flujo estricto: `Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación → Cambio`.
- Regla inquebrantable: NUNCA escribir código sin spec, clarificación, plan y tareas aprobadas por el usuario.

## Comandos
- Servir localmente: `npm run serve` (python3 -m http.server 8080)
- Tests: `npm test` (`node --test`)
- Sintaxis/Smoke: `node tests/smoke.test.js`

## Estilo y convenciones
- JavaScript moderno (ES Modules vanilla con imports nativos).
- Sin bundlers (Vite/Webpack) ni dependencias pesadas de runtime; Firebase vía CDN modular.
- Interfaz en español (es-VE / es). Código y variables descriptivos.
- Requisitos en notación EARS: UBICUO, DIRIGIDO POR EVENTO, DIRIGIDO POR ESTADO, COMPORTAMIENTO NO DESEADO, CARACTERÍSTICA OPCIONAL.

## Reglas
- Lee `docs/constitution.md` y la spec activa en `specs/` antes de tocar código.
- No asumir requerimientos ni inventar comportamientos no especificados; preguntar ante la duda.
- En fase de implementación: trabajar exactamente una tarea a la vez (T[N]), con tests primero, y detenerse para aprobación.
- Todo cambio de funcionalidad inicia en la spec (`spec.md`), jamás directo en el código.

## Al terminar cualquier tarea
- Ejecutar `npm test` y verificar que la suite completa esté en verde.
- Actualizar el checkbox `[x]` en `tasks.md`.
- Detenerse y solicitar aprobación explícita del usuario.
