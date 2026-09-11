# Plan de Arquitectura Técnica — Spec 001: Formulario de Bitácora de Supervisión

## Módulos y responsabilidades

1. **`bitacora.html`**:
   - Estructura visual de dos pasos (`#paso-1` y `#paso-2`).
   - Topbar institucional con botón de retorno al panel.
   - Diseño responsive con estilos de `css/styles.css` adaptados a pantallas móviles.

2. **`js/bitacora.js`**:
   - Control de sesión mediante `protegerPagina("supervisor", callback)` importado de `./session.js`.
   - Gestión de estado en memoria del formulario (Paso 1 y Paso 2).
   - Render dinámico de opciones de "Actividad Específica" según el tipo macro seleccionado.
   - Algoritmo de compresión de imágenes en el cliente mediante `HTMLCanvasElement` nativo (JPEG calidad 0.75, máx. 1200px) garantizando archivos de < 250 KB.
   - Validación de consistencia horaria y cálculo de duración estimada en minutos.
   - Persistencia en Firestore (`collection(db, "bitacoras")`) y manejo de estados UI (cargando, éxito, error).

3. **`panel.html` y `js/panel.js`**:
   - **Vista del Supervisor**: Tarjeta/módulo nuevo en el medio (entre la lista de técnicos y las evaluaciones realizadas) con acceso directo `📝 Registrar Bitácora de Actividades` y un resumen de las bitácoras registradas en su jornada.
   - **Vista del Coordinador**: En la pantalla de detalle de un supervisor (`mostrarSupervisor()`), adición de la sección **"Registro de actividades (Bitácoras) (N)"** con el historial de actividades registradas por ese supervisor (fecha/hora, zona, nodo, tipo, subactividad y detalle).

4. **`firestore.rules`**:
   - Definición de reglas de seguridad para la nueva colección `bitacoras`:
     - Escritura (`create`): solo supervisores autenticados y activos, a su propio nombre (`supervisorUid == request.auth.uid`).
     - Lectura (`read`): el supervisor dueño, su coordinador asignado (`esMiSupervisor`), o el usuario con rol `root`.
     - Modificación / Eliminación: deshabilitada por defecto en esta iteración.

5. **`tests/bitacora.test.js`**:
   - Pruebas unitarias sobre la lógica aislada:
     - Validación de horarios (mismo día vs. cruce de medianoche).
     - Validación de selección obligatoria de campos.
     - Diccionario de subactividades según tipo macro.

---

## Modelo de datos (Colección Firestore: `bitacoras/{id}`)

```json
{
  "supervisorUid": "string",
  "supervisorNombre": "string",
  "coordinadorUid": "string",
  "zona": "string (ej: 'ZONA 1')",
  "areaTrabajo": "string (ej: 'NODO POMONA')",
  "tipoMacro": "string ('GESTIÓN ADMINISTRATIVA' | 'GESTIÓN OPERATIVA (EN CAMPO)' | 'CERTIFICACION EN CAMPO')",
  "actividadEspecifica": "string (subtipo seleccionado)",
  "horaInicio": "string ('HH:MM')",
  "horaFin": "string ('HH:MM')",
  "diaSiguiente": "boolean",
  "duracionMinutos": "number",
  "descripcion": "string",
  "imagenes": ["string (Base64 JPEG comprimido < 250KB c/u)"],
  "createdAt": "serverTimestamp"
}
```

---

## Decisiones técnicas y alternativas descartadas

### Decisión 1: Pasos en una sola página con alternancia visual en el DOM
- **Implementación**: `#paso-1` y `#paso-2` en el mismo `bitacora.html` alternando visibilidad con clases CSS.
- **Alternativa descartada**: Separar en dos páginas `bitacora-paso1.html` y `bitacora-paso2.html` pasándose estado por `sessionStorage` o parámetros URL.
- **Justificación**: Elimina la latencia de recarga de página, previene pérdida de estado en conexiones inestables de campo y asegura transiciones inmediatas (< 50 ms).

### Decisión 2: Compresión de imágenes en el cliente a Base64 ligero en Firestore
- **Implementación**: Usar `HTMLCanvasElement` nativo para reescalar imágenes a máx 1200px con compresión JPEG 0.75 antes de almacenar en el documento de Firestore.
- **Alternativa descartada**: Subir archivos binarios crudos sin compresión a Firebase Storage.
- **Justificación**: Cumple estrictamente con el Principio 1 y 2 de la Constitución (sin librerías externas pesadas ni configuración extra de Storage), ahorra consumo de datos móviles a los supervisores en campo y respeta con holgura el límite de 1 MB por documento de Firestore (5 fotos comprimidas totalizan ~600-800 KB).

### Decisión 3: Colección dedicada `bitacoras` en Firestore
- **Implementación**: Colección aislada `bitacoras`.
- **Alternativa descartada**: Almacenar los registros dentro de la colección existente `evaluaciones` con un discriminador `tipo: "bitacora"`.
- **Justificación**: Las evaluaciones técnicas poseen un esquema complejo con plantillas, puntajes ponderados por sección y firmas en canvas. Mantener una colección separada optimiza los índices de Firestore, simplifica las reglas de seguridad y facilita la creación del futuro Dashboard para el Gerente sin mezclar métricas.

---

## Estrategia de tests

- **Sintaxis y Smoke**: Extender `tests/smoke.test.js` para asegurar que `bitacora.html` y `js/bitacora.js` pasen `node --check` y verifiquen dependencias locales.
- **Lógica de negocio (`tests/bitacora.test.js`)**: Pruebas automáticas con el runner nativo de Node.js (`node --test`):
  - Función de cálculo de duración (caso normal: 08:00 a 12:30 = 270 min; caso medianoche: 22:00 a 02:00 = 240 min).
  - Diccionario de subactividades según tipo macro.

---

## Cobertura de Requisitos Funcionales (RF)

| Módulo / Archivo | Requisitos Funcionales Cubiertos |
|---|---|
| `bitacora.html` | RF-2, RF-4, RF-7, RF-10, RF-11 |
| `js/bitacora.js` | RF-1, RF-3, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12, RF-13 |
| `panel.html` / `js/panel.js` | H5 (Acceso desde el panel del supervisor) |
| `firestore.rules` | RF-1, RF-13 (Seguridad y persistencia) |
| `tests/bitacora.test.js` | RF-5, RF-8, RF-9 (Verificación automatizada) |
