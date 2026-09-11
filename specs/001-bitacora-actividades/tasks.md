# Tareas — Spec 001: Formulario de Bitácora de Supervisión

Plan de implementación desglosado en tareas atómicas (< 30 min cada una), ordenadas por dependencia técnica estricta.

- [x] **T1: Reglas de seguridad en Firestore para colección `bitacoras`**
  - **RF cubiertos**: RF-1, RF-14
  - **Archivos**: `firestore.rules`
  - **Hecho cuando**: Las reglas de Firestore contengan la colección `bitacoras` con permisos de creación para supervisores autenticados/activos y lectura para el dueño, su coordinador y root.

- [x] **T2: Pruebas unitarias de lógica horaria y diccionarios de actividades**
  - **RF cubiertos**: RF-6, RF-9, RF-10
  - **Archivos**: `tests/bitacora.test.js`, `package.json`
  - **Hecho cuando**: `npm test` ejecute y pase en verde las pruebas que validan el cálculo de duración de jornada (mismo día y cruce de medianoche) y las subactividades válidas por tipo macro.

- [x] **T3: Estructura HTML y estilos del formulario de bitácora**
  - **RF cubiertos**: RF-3, RF-4, RF-5, RF-8, RF-11, RF-12
  - **Archivos**: `bitacora.html`
  - **Hecho cuando**: Exista `bitacora.html` con topbar corporativa, tarjeta de dos pasos (`#paso-1` y `#paso-2`), selectores de zona, nodo y tipo macro, e inputs de horarios, descripción y carga de fotos.

- [x] **T4: Lógica de cliente, validación en dos pasos, compresión de fotos y persistencia**
  - **RF cubiertos**: RF-1, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-13, RF-14
  - **Archivos**: `js/bitacora.js`
  - **Hecho cuando**: `js/bitacora.js` valide la sesión con `protegerPagina("supervisor")`, alterne entre pasos sin recarga, comprima fotos en cliente con canvas nativo a Base64 ligero y guarde el documento en la colección `bitacoras` de Firestore.

- [x] **T5: Módulo de Bitácora en el panel del supervisor**
  - **RF cubiertos**: H5, RF-2
  - **Archivos**: `panel.html`, `js/panel.js`
  - **Hecho cuando**: En la vista del supervisor de `panel.html` se renderice en el centro (entre técnicos y evaluaciones) una tarjeta destacada con botón directo "📝 Registrar Bitácora de Actividades".

- [x] **T6: Sección de Bitácoras en la vista de supervisión del coordinador**
  - **RF cubiertos**: H6, RF-15
  - **Archivos**: `js/panel.js`
  - **Hecho cuando**: Al hacer clic en "ver ›" sobre un supervisor, el coordinador visualice la sección "Registro de actividades (Bitácoras)" listando las bitácoras registradas por ese supervisor con fecha, nodo, tipo y detalle.

- [x] **T7: Verificación final de integración y smoke test suite**
  - **RF cubiertos**: Criterios de finalización
  - **Archivos**: `tests/smoke.test.js`
  - **Hecho cuando**: `npm test` corra y apruebe todas las pruebas de humo y unitarias sin errores de sintaxis ni enlaces rotos.
