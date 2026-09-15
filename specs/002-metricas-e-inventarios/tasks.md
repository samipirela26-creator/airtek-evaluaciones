# Tareas — Spec 002: Métricas de Bitácora e Inventario de Técnicos

- [x] **T1: Base compartida (sesión, CSV, consultas, gráficas)**
  - **RF cubiertos**: RF-16, RF-17
  - **Archivos**: `js/session.js`, `js/exportar-csv.js`, `js/consultas.js`, `js/graficas.js`, `js/dashboard.js`
  - **Hecho cuando**: `protegerPagina` acepte una lista de roles, exista la
    generación de CSV con BOM, y `dashboard.js` consuma los módulos compartidos
    en vez de repetir el patrón de lotes de 10 y el helper de gráficas.

- [x] **T2: Fecha de la actividad en la bitácora**
  - **RF cubiertos**: RF-1, RF-2, RF-3
  - **Archivos**: `bitacora.html`, `js/bitacora.js`, `js/bitacora-data.js`, `tests/bitacora.test.js`
  - **Hecho cuando**: el formulario exija la fecha (hoy por defecto, sin
    futuro), el documento guarde `fecha` y `numFotos`, y `fechaDeBitacora`
    caiga a `createdAt` marcando el dato como estimado.

- [x] **T3: Tablero de Bitácora de Campo con filtros, gráficas y exportación**
  - **RF cubiertos**: RF-4, RF-5, RF-6, RF-8
  - **Archivos**: `bitacora-tablero.html`, `js/bitacora-tablero.js`, `js/bitacora-data.js`
  - **Hecho cuando**: el coordinador pueda filtrar por fecha, supervisor y zona,
    ver los KPIs y las cuatro gráficas, y exportar el CSV de lo filtrado.

- [x] **T4: Renombrado a "Métricas de Gestión de Personal"**
  - **RF cubiertos**: RF-7
  - **Archivos**: `dashboard.html`, `js/panel.js`
  - **Hecho cuando**: no quede rastro de "Tablero de eficiencia" en la interfaz.

- [x] **T5: Catálogos de herramientas y materiales**
  - **RF cubiertos**: RF-9
  - **Archivos**: `js/inventario-data.js`, `tests/inventario.test.js`
  - **Hecho cuando**: los 79 ítems de herramientas y los 47 de materiales estén
    cargados con su categoría, sin ids repetidos y con pruebas que lo verifiquen.

- [x] **T6: Pantalla de inventario (herramientas y materiales)**
  - **RF cubiertos**: RF-10, RF-11, RF-16
  - **Archivos**: `inventario.html`, `js/inventario.js`
  - **Hecho cuando**: supervisor y coordinador puedan cargar el estado de las
    herramientas de un técnico y registrar entregas de material con su fecha.

- [x] **T7: Acceso desde el panel**
  - **RF cubiertos**: RF-12
  - **Archivos**: `panel.html`, `js/panel.js`
  - **Hecho cuando**: el supervisor tenga la tarjeta de inventario junto a la de
    bitácora, y el coordinador los enlaces al tablero y al reporte.

- [x] **T8: Reporte de requerimiento de herramientas**
  - **RF cubiertos**: RF-13, RF-14
  - **Archivos**: `reporte-herramientas.html`, `js/reporte-herramientas.js`, `js/inventario-data.js`
  - **Hecho cuando**: el consolidado muestre total, buenas, regulares, malas y
    técnicos por herramienta, resalte lo crítico y exporte a CSV.

- [x] **T9: Reglas de Firestore para los inventarios**
  - **RF cubiertos**: RF-15
  - **Archivos**: `firestore.rules`
  - **Hecho cuando**: las dos colecciones nuevas restrinjan escritura al
    supervisor dueño o su coordinador, y lectura a ellos y al root.

- [x] **T10: Pruebas y verificación final**
  - **RF cubiertos**: Criterios de finalización
  - **Archivos**: `tests/*.js`, `preview/seed.js`, `preview/index.html`
  - **Hecho cuando**: `npm test` pase completo, el smoke test valide también los
    enlaces locales, y las pantallas nuevas se recorran en `preview/` sin
    errores de consola.
