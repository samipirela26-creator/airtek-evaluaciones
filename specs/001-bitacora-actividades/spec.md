# Spec 001 — Formulario de Bitácora de Supervisión (Registro de Actividades Diarias)

## Contexto y objetivo
Los supervisores de campo de Airtek necesitan registrar de manera digital, estandarizada y ágil las actividades que realizan durante su jornada laboral diaria (administrativas, operativas y de certificación), reemplazando el uso de formularios externos en Google Forms. Este registro consolidará la trazabilidad de tiempos, zonas, centros de trabajo y evidencias fotográficas directamente en la plataforma web de Airtek.

## Usuarios / actores
- **Supervisor**: Usuario autenticado con rol `supervisor` que registra sus actividades diarias en campo u oficina.
- **Coordinador**: Usuario autenticado con rol `coordinador` responsable de supervisar las actividades registradas en su zona.

## Historias de usuario
- **H1**: Como supervisor, quiero que el formulario reconozca automáticamente mi identidad para no tener que buscarme en una lista ni permitir que otros registren a mi nombre.
- **H2**: Como supervisor, quiero ingresar mi actividad en un flujo guiado de dos pasos para categorizar fácilmente la zona, nodo y tipo de labor.
- **H3**: Como supervisor, quiero registrar los tiempos, descripción e imágenes de la actividad para respaldar mi jornada.
- **H4**: Como supervisor, quiero poder corregir datos del paso 1 regresando desde el paso 2 sin perder la información ya escrita.
- **H5**: Como supervisor, quiero tener un módulo destacado en el centro de mi panel principal para acceder al registro de bitácora rápidamente.
- **H6**: Como coordinador, cuando entre a "ver" a un supervisor en mi panel, quiero ver la sección de "Registro de actividades" con el historial de sus bitácoras para supervisar su jornada.

## Requisitos funcionales (en notación EARS)

### Acceso y Ubicación Macro (Paso 1)
- **RF-1 (UBICUO)**: EL SISTEMA asociará de forma inmutable el registro de bitácora al supervisor autenticado en la sesión activa (`uid` y `nombre`).
- **RF-2 (DIRIGIDO POR EVENTO)**: CUANDO el supervisor se encuentre en `panel.html`, EL SISTEMA presentará un módulo destacado en el medio de la interfaz ("📝 Bitácora de Actividades") con acceso directo a `bitacora.html`.
- **RF-3 (DIRIGIDO POR EVENTO)**: CUANDO el supervisor acceda a `bitacora.html`, EL SISTEMA presentará el Paso 1 requiriendo la selección obligatoria de:
  1. Zona de pertenencia (`ZONA 1`, `ZONA 2 Y 5`, `ZONA 3`, `ZONA 6`).
  2. Tipo de actividad macro (`GESTIÓN ADMINISTRATIVA`, `GESTIÓN OPERATIVA (EN CAMPO)`, `CERTIFICACION EN CAMPO`).
  3. Área de trabajo / Centro de labores (selector con los nodos operativos de Airtek).
- **RF-4 (COMPORTAMIENTO NO DESEADO)**: SI el supervisor intenta avanzar al Paso 2 sin haber seleccionado Zona, Tipo de Actividad o Área de Trabajo, ENTONCES EL SISTEMA bloqueará el avance y señalará visualmente los campos requeridos faltantes.
- **RF-5 (DIRIGIDO POR EVENTO)**: CUANDO el supervisor complete válidamente los campos del Paso 1 y pulse "Siguiente", EL SISTEMA ocultará el Paso 1 y mostrará el Paso 2 configurado según el tipo macro seleccionado.

### Detalle Operativo, Horarios y Evidencias (Paso 2)
- **RF-6 (DIRIGIDO POR ESTADO)**: MIENTRAS se visualice el Paso 2, EL SISTEMA presentará un selector de "Actividad Específica" con las opciones filtradas según el Tipo de Actividad macro elegido en el Paso 1:
  - Para `GESTIÓN ADMINISTRATIVA`: `APOYO EN ALMACÉN`, `GESTIÓN EN OZMAP`, `GESTIÓN CON ANALISTA DE CYS`, `GESTIÓN DE EVALUACIONES O RENOVACIÓN DE CONTRATO`, `REUNIÓN VIA MEET O PRESENCIAL`, `APOYO A OTRA UNIDAD`, `GESTIÓN DE PROYECTOS ESPECIALES`, `CAPACITACIÓN ADIESTRAMIENTO AL PERSONAL`, `JORNADA EXTENDIDA`, `GESTIÓN DE ACTIVIDADES ADMINISTRATIVAS`.
  - Para `GESTIÓN OPERATIVA (EN CAMPO)`: `INSPECCIÓN EN TRONCAL`, `INSPECCIÓN EN SUBTRONCAL`, `INSPECCIÓN EN MDT`, `INSPECCIÓN DE PROYECTO ESPECIAL`, `SUPERVISIÓN EN CAMPO`, `APOYO A CUADRILLA EN CAMPO (PLANTA EXTERNA AVERIA MAYOR)`, `APOYO A CUADRILLA (PLANTA INTERNA)`, `VENTANA DE MANTENIMIENTO`, `REUNIÓN CON PERSONAL DEL CONDOMINIO`, `GESTIÓN DE APOYO A OTRAS UNIDADES`.
  - Para `CERTIFICACION EN CAMPO`: Opciones de inspección y certificación técnica en campo.
- **RF-7 (DIRIGIDO POR EVENTO)**: CUANDO el supervisor modifique el Tipo de Actividad macro en el Paso 1 tras haber regresado desde el Paso 2, EL SISTEMA reiniciará la selección de Actividad Específica del Paso 2 para evitar inconsistencias de categoría.
- **RF-8 (DIRIGIDO POR EVENTO)**: CUANDO se presente el Paso 2, EL SISTEMA requerirá obligatoriamente:
  1. Selección de la Actividad Específica.
  2. Hora de Inicio (`HH:MM`).
  3. Hora de Fin (`HH:MM`).
  4. Descripción detallada de la actividad realizada (texto libre).
- **RF-9 (DIRIGIDO POR ESTADO)**: MIENTRAS la casilla "Culminó al día siguiente" no esté marcada, SI la Hora de Fin es anterior o igual a la Hora de Inicio, ENTONCES EL SISTEMA rechazará el envío indicando la inconsistencia de horarios.
- **RF-10 (CARACTERÍSTICA OPCIONAL)**: DONDE la actividad finalice después de la medianoche, EL SISTEMA permitirá marcar la casilla "Culminó al día siguiente" admitiendo una Hora de Fin numéricamente menor a la de inicio.
- **RF-11 (CARACTERÍSTICA OPCIONAL)**: DONDE el supervisor decida adjuntar evidencia fotográfica, EL SISTEMA permitirá seleccionar hasta 5 imágenes (formatos JPG, PNG, WEBP), validando el formato y comprimiéndolas a un tamaño ligero en el cliente antes de persistir.
- **RF-12 (DIRIGIDO POR EVENTO)**: CUANDO el supervisor pulse el botón "Atrás" en el Paso 2, EL SISTEMA retornará al Paso 1 conservando intactos todos los valores previamente seleccionados.
- **RF-13 (COMPORTAMIENTO NO DESEADO)**: SI el supervisor intenta enviar el formulario con campos obligatorios vacíos en el Paso 2, ENTONCES EL SISTEMA impedirá el guardado y destacará las omisiones.
- **RF-14 (DIRIGIDO POR EVENTO)**: CUANDO el supervisor pulse "Enviar" con todos los datos válidos, EL SISTEMA persistirá el registro en Firestore con marca temporal del servidor (`serverTimestamp`), mostrará una confirmación de éxito y ofrecerá las opciones "Registrar otra actividad" o "Volver al panel".

### Supervisión por el Coordinador
- **RF-15 (DIRIGIDO POR EVENTO)**: CUANDO el coordinador acceda a la vista detallada de un supervisor en `panel.html`, EL SISTEMA consultará y desplegará la sección "Registro de actividades (Bitácoras)" listando las bitácoras registradas por dicho supervisor (fecha/hora, zona, nodo, tipo, horas trabajadas y detalle).

## Requisitos no funcionales
- **Rendimiento**: La transición entre el Paso 1 y Paso 2 debe ocurrir en menos de 100 ms sin recargar la página.
- **Usabilidad móvil**: El formulario debe ser completamente responsive y cómodo para operar desde smartphones en campo.
- **Compresión de medios**: Cada imagen cargada debe optimizarse en el navegador (formato JPEG/WebP, máx. 1280px de ancho y ≤ 400 KB) para evitar alto consumo de datos móviles y respetar los límites de Firestore.
- **Idioma**: Toda la interfaz, etiquetas y mensajes deben estar en español (es-VE / es).

## Casos límite
- Selección de archivos que no son imágenes: El selector solo debe admitir `image/*` y rechazar cualquier otro formato.
- Falla de conexión a internet durante el envío: El sistema notificará el fallo y mantendrá los datos en pantalla para permitir reintentar sin perder lo redactado.
- Guardia nocturna: Soportado limpiamente mediante la casilla "Culminó al día siguiente".

## Fuera de alcance (para esta iteración)
- Tablero/Dashboard consolidado para el Gerente o Coordinador.
- Exportación masiva de registros a tabla de Excel (XLSX/CSV).
- Edición posterior de bitácoras ya enviadas.

## Criterios de finalización
- Formulario navegable en 2 pasos sin recarga de página ni pérdida de datos al volver atrás.
- Validación estricta de todos los campos obligatorios en cliente.
- Manejo correcto de cruce de medianoche ("Culminó al día siguiente").
- Compresión y carga exitosa de imágenes de evidencia (hasta 5).
- Persistencia verificada del registro en Firestore con su metadata completa.
- Suite de pruebas `npm test` ejecutada y en verde.
- Demostración manual completa del flujo.

## Dudas abiertas
*Ninguna pendiente. Todas las dudas fueron resueltas en la Fase 3 de Clarificación.*
