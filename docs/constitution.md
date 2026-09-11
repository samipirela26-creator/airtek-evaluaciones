# Constitución — Airtek Evaluaciones

Principios innegociables del proyecto. Toda spec, plan y tarea debe cumplirlos:

1. **Stack sin compilación**: Código fuente exclusivamente en HTML5, CSS3 nativo y JavaScript ES Modules vanilla sin bundlers ni transpiladores.
2. **Backend Serverless**: Toda persistencia y autenticación debe implementarse únicamente con Firebase Auth y Firestore vía CDN modular oficial.
3. **Compatibilidad estática**: La aplicación debe ejecutarse directamente en GitHub Pages y mediante `python3 -m http.server` sin servidor backend propio.
4. **Seguridad delegada**: Ninguna operación con datos puede omitir o eludir las reglas de seguridad de Firestore (`firestore.rules`).
5. **Verificación obligatoria**: Cada cambio debe mantener `npm test` en verde (sintaxis JS, JSON válidos y referencias HTML íntegras).
6. **Contrato de trazabilidad**: Toda nueva funcionalidad o modificación debe originarse en un RF de una spec aprobada antes de tocar código.
7. **Control de dependencias**: Prohibido agregar librerías externas en runtime sin aprobación explícita y justificación documentada.
