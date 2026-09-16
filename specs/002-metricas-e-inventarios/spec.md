# Spec 002 — Métricas de Bitácora e Inventario de Técnicos

## Origen

Cinco audios del coordinador de Airtek (septiembre 2026), ya con los
supervisores cargando bitácoras en producción:

- **Audio 1** — poder exportar a Excel las actividades de *todos* los
  supervisores juntos, no de uno en uno; y ver gráficos del tipo de actividad y
  del tiempo invertido.
- **Audio 2** — que esos gráficos vivan en un tablero propio, y que el "Tablero
  de eficiencia" lleve un nombre más técnico.
- **Audio 4** — inventario de los técnicos: material de uso diario y
  herramientas, y que de las herramientas salga un reporte de "cuántos alicates
  tengo regulares, cuántos destornilladores malos" para sustentar los
  requerimientos de compra.
- **Audio 5** — que el inventario se agregue al menú del supervisor igual que se
  hizo con la bitácora, usando los ítems de la planilla que ya existe.

El **Audio 3** es logístico (acceso a la oficina) y no genera requerimientos.

La planilla mencionada en el audio 5 llegó como `LISTA DE HERRAMIENTAS.xlsx`:
79 herramientas en 7 categorías y 47 materiales en 4 categorías. Su estructura
manda sobre el modelo de datos (ver RF-9).

## Requerimientos (notación EARS)

### Bitácora y métricas

- **RF-1 (DIRIGIDO POR EVENTO)** — Cuando el supervisor registre una actividad,
  el sistema **deberá** exigirle la fecha en que la realizó, con el día de hoy
  por defecto y sin aceptar fechas futuras.
- **RF-2 (UBICUO)** — El sistema **deberá** almacenar en cada bitácora la fecha
  de la actividad y la cantidad de fotos adjuntas.
- **RF-3 (DIRIGIDO POR ESTADO)** — Mientras una bitácora no tenga fecha propia
  (registrada antes de esta versión), el sistema **deberá** usar su fecha de
  carga y **advertir** que es estimada, tanto en pantalla como en la
  exportación.
- **RF-4 (UBICUO)** — El coordinador **deberá** disponer de un tablero propio
  con las actividades de todos sus supervisores, filtrable por rango de fechas,
  supervisor y zona.
- **RF-5 (UBICUO)** — El tablero **deberá** mostrar totales de actividades,
  tiempo, supervisores y nodos, y graficar la distribución por tipo de
  actividad, las actividades específicas con más horas, y las horas por
  supervisor y por nodo.
- **RF-6 (DIRIGIDO POR EVENTO)** — Cuando el coordinador pulse exportar, el
  sistema **deberá** descargar un archivo abrible en Excel con las actividades
  que cumplan los filtros vigentes.
- **RF-7 (UBICUO)** — El tablero de evaluaciones **deberá** llamarse "Métricas
  de Gestión de Personal".
- **RF-8 (COMPORTAMIENTO NO DESEADO)** — Si el coordinador exporta sin
  resultados, el sistema **deberá** avisarlo y no generar un archivo vacío.

### Inventarios

- **RF-9 (UBICUO)** — El sistema **deberá** registrar por herramienta y técnico
  cuántas unidades hay en estado bueno, regular y malo, junto con una
  observación y, en los equipos de prueba, el serial. La cantidad total es la
  suma de los tres estados.
- **RF-10 (UBICUO)** — El inventario de herramientas **deberá** ser el estado
  vigente: un registro por técnico que se actualiza.
- **RF-11 (UBICUO)** — El material de uso diario **deberá** registrarse como
  entregas con fecha, conservando el historial para poder ver el consumo.
- **RF-12 (UBICUO)** — El supervisor **deberá** tener acceso al inventario desde
  su panel, igual que a la bitácora.
- **RF-13 (UBICUO)** — El coordinador **deberá** ver un consolidado por
  herramienta con total, buenas, regulares, malas y cuántos técnicos la tienen,
  ordenado por urgencia de reposición y exportable.
- **RF-14 (COMPORTAMIENTO NO DESEADO)** — Si una herramienta registrada ya no
  está en el catálogo, el sistema **deberá** conservarla en el consolidado en
  vez de descartar sus unidades.
- **RF-15 (UBICUO)** — Las reglas de Firestore **deberán** permitir escribir el
  inventario solo al supervisor dueño del técnico (o a su coordinador), y leerlo
  solo a ellos y al root.

### Transversales

- **RF-16 (CARACTERÍSTICA OPCIONAL)** — Si el usuario es coordinador, **deberá**
  poder abrir el inventario de los técnicos de cualquiera de sus supervisores.
- **RF-17 (UBICUO)** — La exportación **deberá** hacerse sin agregar librerías
  externas en runtime (Constitución art. 7).

## Fuera de alcance

- Mover las fotos de las bitácoras fuera del documento de Firestore (hoy van en
  Base64 y encarecen cualquier consulta masiva). Requiere migrar datos
  existentes; va en spec aparte.
- Edición del catálogo de herramientas y materiales desde la aplicación.
- Control de stock de almacén: aquí solo se registra lo entregado al técnico.

## Criterios de finalización

- `npm test` en verde, incluyendo pruebas de las funciones puras nuevas.
- Las cuatro pantallas nuevas o modificadas recorridas en el modo
  `preview/`, sin errores en consola.
- Reglas de Firestore actualizadas y publicadas antes de usar el módulo en
  producción.
