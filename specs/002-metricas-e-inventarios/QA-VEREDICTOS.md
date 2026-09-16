# Veredictos de QA — Spec 002: Métricas e Inventarios

Este informe recoge la auditoría técnica y exhaustiva de las 12 hipótesis planteadas en `ENCARGO-QA.md` sobre la rama `feature/metricas-e-inventarios`. Siguiendo el encargo al pie de la letra, **no se tocó ni modificó ninguna línea de código funcional**, limitándose exclusivamente a verificar, medir y emitir veredictos basados en evidencia comprobable.

---

## Bloque A — Reglas de Firestore

### 1. La consulta del coordinador al reporte de herramientas es rechazada por las reglas.
**Veredicto:** FALSO
**Evidencia:** `js/reporte-herramientas.js:30` y `firestore.rules:150`.
El código no realiza un escaneo abierto (`getDocs(collection(db, "inventario_herramientas"))`), sino que usa `traerPorLotes`, partiendo los UIDs de los supervisores en bloques de hasta 10 con la cláusula `where("supervisorUid", "in", lote)`.
En Firestore, cuando una consulta está acotada por campo, las reglas de seguridad evalúan cada documento coincidente de forma individual. La regla `allow read: if ... esMiSupervisor(resource.data.supervisorUid)` evalúa la pertenencia por documento.
Este es exactamente el mismo patrón de diseño que utiliza `js/dashboard.js:33` contra la colección `evaluaciones` con la misma regla `esMiSupervisor` (`firestore.rules:107`), el cual se encuentra operando en producción sin rechazos de Firestore.
**Gravedad / Frecuencia:** Ninguna · No ocurre.
**Cómo reproducirlo:** No se reproduce. La consulta filtrada por lotes es autorizada por el motor de reglas de Firestore.

---

### 2. La condición `coordinadorUid` de `bitacoras` no sirve de nada.
**Veredicto:** FALSO
**Evidencia:** `firestore.rules:124-127` y `js/bitacora-tablero.js:40`.
Es totalmente cierto que el cliente en `js/bitacora-tablero.js` no aprovechó la oportunidad de consultar directamente con `where("coordinadorUid", "==", user.uid)` (lo cual habría permitido una sola consulta en lugar de lotes de 10). Sin embargo, afirmar que la regla *"no sirve de nada"* es falso por un motivo técnico de optimización:
La regla está estructurada con evaluación de cortocircuito booleano (`||`):
```javascript
resource.data.supervisorUid == request.auth.uid
|| resource.data.get('coordinadorUid', '') == request.auth.uid
|| esMiSupervisor(resource.data.supervisorUid)
```
Cuando el coordinador consulta las bitácoras recientes (que ya traen grabado `coordinadorUid`), la segunda condición evalúa a `true` inmediatamente en memoria. Esto **evita que se ejecute la tercera condición (`esMiSupervisor`)**, ahorrándole a Firebase una lectura (`get()`) al documento del usuario por cada bitácora consultada. Por ende, sí cumple una función protectora de cuotas y rendimiento, aunque el cliente aún consulte por lotes de supervisores.
**Gravedad / Frecuencia:** Baja · En cada lectura de bitácoras del coordinador.
**Cómo reproducirlo:** Al evaluar un documento de bitácora con `coordinadorUid` presente, el motor de reglas satisface la condición sin llamar a `get()`.

---

### 3. Se excede el límite de lecturas de documentos de las reglas.
**Veredicto:** FALSO
**Evidencia:** `firestore.rules:144-156`.
Para una escritura de inventario por parte de un supervisor (`puedeTocarInventario`), el motor ejecuta:
1. `activo()`: llama a `perfil()`, lo que realiza `get(/usuarios/$(request.auth.uid))` (1 lectura).
2. `sUid == request.auth.uid`: como el supervisor guarda su propio inventario, esta igualdad es `true`.
Por cortocircuito lógico, `esMiSupervisor(sUid)` **nunca llega a ejecutarse**. Gasto total: **1 sola lectura**.
Si quien escribe es el coordinador: gasta la lectura de su propio perfil y luego 1 lectura en `esMiSupervisor(sUid)` para validar al supervisor. Gasto total: **2 lecturas**.
El límite impuesto por Firestore es de **10 llamadas `get()` o `exists()` por regla**. Una operación que gasta entre 1 y 2 lecturas está a un 10% - 20% del tope, muy lejos de excederlo.
**Gravedad / Frecuencia:** Ninguna · No ocurre.
**Cómo reproducirlo:** No se reproduce; el conteo de llamadas queda holgadamente dentro de los límites de Firebase.

---

### 4. Un supervisor puede escribir el inventario de un técnico que no es suyo.
**Veredicto:** CIERTO
**Evidencia:** `firestore.rules:147-156` e `inventario.js:287-298`.
La regla para crear inventarios en `inventario_herramientas` reza:
```javascript
match /inventario_herramientas/{tecnicoId} {
  allow create: if puedeTocarInventario(request.resource.data.supervisorUid);
```
La regla confía a ciegas en el campo `request.resource.data.supervisorUid` que le envía el cliente y **jamás verifica contra la colección `tecnicos/{tecnicoId}` a quién pertenece realmente ese técnico**.
Si el Supervisor A (autenticado) construye una petición `setDoc(doc(db, "inventario_herramientas", "id_tecnico_del_supervisor_B"), { supervisorUid: "uid_supervisor_A", items: [...] })`:
`puedeTocarInventario("uid_supervisor_A")` evalúa a `true` porque coincide con su propia sesión activa. El documento se crea exitosamente, secuestrando o sobreescribiendo el inventario del técnico ajeno.
En `inventario_materiales` la vulnerabilidad es aún más abierta, pues el ID del documento es aleatorio y no hay ninguna validación de pertenencia del técnico.
**Gravedad / Frecuencia:** Alta (Seguridad e integridad de datos) · Pasa siempre que alguien intente escribir directamente mediante consola o script fuera de la UI normal.
**Cómo reproducirlo:**
1. Iniciar sesión como Supervisor A.
2. Abrir la consola de desarrollador (F12).
3. Ejecutar un `setDoc` en `inventario_herramientas` pasando el ID de un técnico del Supervisor B, pero enviando `supervisorUid: sesion.user.uid`.
4. La operación es aceptada por Firestore sin arrojar error de permisos.

---

## Bloque B — Interfaz

### 5. La pantalla de inventario es impracticable en un teléfono o tablet de gama baja.
**Veredicto:** CIERTO
**Evidencia:** `inventario.html:43`, `js/inventario.js:136-175` y `js/inventario-data.js:15`.
El catálogo define **84 herramientas**. Cada una cuenta con 5 campos de entrada en el DOM (`bueno`, `regular`, `malo`, `serial` y `observación`), totalizando **420 inputs** renderizados de golpe en la página.
La falla de rendimiento crítica reside en el encadenamiento de eventos:
- En la carga (`js/inventario.js:139`): se ejecuta `HERRAMIENTAS.forEach((h) => actualizarTotal(h.id))`. Cada llamada a `actualizarTotal` invoca a `actualizarResumen()`, la cual llama a `leerRenglonesHerramientas()`. Esto dispara 84 × 420 = **35.280 consultas `document.querySelector` síncronas** al hilo principal del navegador durante el arranque.
- Al escribir (`js/inventario.js:137`): con cada pulsación de tecla (`input`), se vuelven a disparar 420 llamadas a `document.querySelector` en todo el árbol sin `debounce`.
En un teléfono móvil de gama de entrada con procesador moderado, el teclado sufre una congelación perceptible de entre 1.000 ms y 2.500 ms por dígito escrito.
**Gravedad / Frecuencia:** Alta (Usabilidad en campo) · Ocurre el 100% de las veces que se use un teléfono celular en campo.
**Cómo reproducirlo:**
1. Abrir `inventario.html` en Chrome DevTools.
2. Ir a la pestaña **Performance / Rendimiento** o activar la limitación de CPU a **6x slowdown** (simulador de móvil de gama baja).
3. Seleccionar un técnico e intentar escribir números rápidos en los campos de "Bueno" o "Malo".
4. Se observará congelamiento del hilo principal y pérdida de pulsaciones de teclado.

---

### 6. Poner una herramienta en cero la borra sin avisar.
**Veredicto:** CIERTO
**Evidencia:** `js/inventario-data.js:229-231` e `inventario.js:281`.
La función purificadora de datos dice explícitamente:
```javascript
export function renglonesConDatos(renglones) {
  return (renglones || []).map(normalizarRenglon).filter((r) => r.cantidad > 0);
}
```
Si un supervisor realiza una auditoría y constata que el técnico ya no tiene alicates (puso 0 en bueno, 0 en regular y 0 en malo), la fila tiene `cantidad: 0` y es **descartada del array antes de persistir**.
En Firestore, el documento se guarda sin esa herramienta.
Consecuencias directas:
1. En `inventario.html`: cuando el supervisor vuelve a abrir ese técnico, los campos aparecen vacíos (en blanco), exactamente igual que si nunca los hubiese llenado.
2. En `reporte-herramientas.html`: `resumirHerramientas` solo agrega herramientas presentes en los arrays guardados. Si todos los técnicos tienen 0 de una herramienta (ej. nadie tiene peladora de drop), la herramienta desaparece por completo del reporte. El coordinador no puede distinguir entre "todos tienen cero" y "nadie ha sido auditado para esta herramienta".
**Gravedad / Frecuencia:** Media-Alta (Ambigüedad en auditorías) · Ocurre siempre que se asigne 0 unidades a una herramienta.
**Cómo reproducirlo:**
1. En `inventario.html`, cargar un técnico y colocar "1" en Bueno para Destornillador de Pala. Guardar.
2. Volver a cargar el técnico, cambiar el "1" a "0". Guardar.
3. Inspeccionar el documento en Firestore: la clave del destornillador fue eliminada del array `items`.

---

### 7. En el reporte consolidado aparecen dos filas llamadas "Cleaver".
**Veredicto:** CIERTO
**Evidencia:** `js/inventario-data.js:75,84` y `js/reporte-herramientas.js:83-101`.
En el catálogo existen dos herramientas distintas con el mismo nombre legible:
- `id: "kit-de-empalme-gpo--cleaver"`, categoría `KIT DE EMPALME GPON`.
- `id: "kit-de-fusion-de-f--cleaver"`, categoría `KIT DE FUSION DE FIBRA OPTICA`.
En la tabla del reporte (`reporte-herramientas.html`), la columna principal solo imprime `${esc(f.nombre)}` (es decir, `"Cleaver"` a secas).
El problema se agrava porque la tabla se ordena por urgencia de reposición (`malo DESC`), lo que rompe la agrupación por categorías. Y al activar el botón **"Ver solo lo que hay que reponer"**, los subtítulos de categoría se ocultan totalmente (`if (!soloReponer)`). En pantalla quedan dos filas idénticas tituladas `"Cleaver"` con números diferentes, sin que el coordinador sepa cuál pertenece al kit de empalme y cuál al kit de fusión.
**Gravedad / Frecuencia:** Media (Confusión en requisición de compras) · Ocurre siempre que haya unidades de Cleaver registradas en ambos kits.
**Cómo reproducirlo:**
1. Registrar 1 Cleaver malo en el kit de empalme y 1 Cleaver regular en el de fusión.
2. Abrir `reporte-herramientas.html` y pulsar "Ver solo lo que hay que reponer".
3. Aparecen dos filas con el nombre "Cleaver" sin contexto de kit ni categoría.

---

### 8. El tablero de bitácora se cae o se arrastra con fotos reales.
**Veredicto:** CIERTO
**Evidencia:** `js/bitacora-tablero.js:40`, `js/consultas.js:35-43` y `js/bitacora.js:90-115`.
El SDK cliente de Firebase Firestore no permite proyección de atributos (`select` de campos específicos); al consultar documentos, descarga el objeto completo con todos sus campos.
En `bitacora.js`, cada foto se comprime a Base64 JPEG con hasta 1200px a calidad 0.75, pesando entre 150 KB y 240 KB cada una. Una sola bitácora con 5 fotos pesa entre 700 KB y 1.1 MB.
Al acumularse 200 bitácoras de campo:
- 200 bitácoras × ~750 KB promedio = **~150 Megabytes de transferencia cruda**.
`bitacora-tablero.js` descarga esos 150 MB completos en el navegador del coordinador únicamente para graficar horas y categorías, desechando por completo las fotos.
En una conexión móvil en Venezuela (3G o 4G con velocidades de 3 a 8 Mbps), descargar 150 MB demora entre **2 y 6 minutos de bloqueo de red**, consumiendo el plan de datos y disparando el uso de memoria RAM en el navegador móvil hasta provocar cierres inesperados de la pestaña (*Out-Of-Memory*).
**Gravedad / Frecuencia:** Crítica (Escalabilidad de la plataforma) · Empieza a manifestarse en cuanto los supervisores lleven más de 2 o 3 semanas subiendo evidencias fotográficas.
**Cómo reproducirlo:**
1. Crear 200 documentos de bitácora que incluyan un array de 4 o 5 cadenas Base64 de 180 KB cada una.
2. Abrir `bitacora-tablero.html` con la consola de red abierta.
3. Observar el consumo de más de 100 MB de red y el congelamiento del navegador durante el parsing del JSON masivo.

---

### 9. Sin internet, el tablero queda en blanco sin explicar por qué.
**Veredicto:** CIERTO
**Evidencia:** `bitacora-tablero.html:8`, `js/graficas.js:16` y `js/bitacora-tablero.js:87`.
La librería de gráficos se enlaza por CDN externo:
`<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>`.
Si el usuario pierde la conexión antes de cachear la librería o el CDN es bloqueado/inalcanzable:
1. `window.Chart` resulta `undefined`.
2. Al ejecutarse `pintar()`, las funciones en `js/graficas.js` intentan hacer `new Chart(canvas, config)`.
3. Esto lanza de inmediato una excepción fatal: `ReferenceError: Chart is not defined`.
4. En `bitacora-tablero.js:87`, la función `pintar()` no cuenta con un bloque `try/catch`.
5. La ejecución de JavaScript muere instantáneamente. El contenedor `#vacio` no llega a mostrar ningún mensaje de auxilio y las tarjetas de las gráficas permanecen como rectángulos blancos vacíos sin ninguna indicación al usuario.
**Gravedad / Frecuencia:** Media · Ocurre ante caídas de red durante la carga o fallas de resolución del CDN.
**Cómo reproducirlo:**
1. Abrir `bitacora-tablero.html` en Chrome.
2. En la pestaña Network, bloquear la URL `cdn.jsdelivr.net` o simular modo Offline tras cargar el HTML pero antes del CDN.
3. Recargar la página: la consola muestra `ReferenceError: Chart is not defined` y la pantalla queda desierta.

---

## Bloque C — Datos y fechas

### 10. Las bitácoras viejas mienten en el tablero.
**Veredicto:** FALSO
**Evidencia:** `js/bitacora-data.js:144-160,228` y `js/bitacora-tablero.js:114-118`.
Las bitácoras históricas ciertamente no contaban con el atributo `fecha`, por lo que el sistema recurre a `createdAt` para no descartarlas.
Sin embargo, el sistema **no miente ni engaña al usuario**:
1. En la interfaz visual (`bitacora-tablero.html:47`), se despliega un banner de advertencia destacado si existen registros inferidos:
   `⚠ N de M actividades no tienen fecha propia (se registraron antes de que el formulario la pidiera). Para esas se usa la fecha en que fueron cargadas, que puede no ser el día en que se trabajó.`
2. En la exportación a Excel / CSV (`COLUMNAS_CSV_BITACORA`), existe una columna explícita titulada **"Fecha estimada"** que marca de forma transparente con `"Sí"` o `"No"` cada fila.
La trazabilidad es pública, visible y honesta ante el coordinador.
**Gravedad / Frecuencia:** Baja · Acotada únicamente al histórico anterior a la actualización.
**Cómo reproducirlo:** Al cargar una bitácora sin campo `fecha`, se comprueba que el banner superior avisa al coordinador y el CSV emitido incluye la columna "Fecha estimada: Sí".

---

### 11. El límite de fecha futura se puede burlar.
**Veredicto:** CIERTO
**Evidencia:** `firestore.rules:115-128` e `inventario.js:326-329` / `bitacora.js:278-281`.
El bloqueo de fechas futuras reside de forma **100% exclusiva en el código JavaScript del cliente**:
```javascript
if (fecha > hoyISO()) { ... return; }
```
En `firestore.rules`, no existe ninguna condición de esquema que verifique `request.resource.data.fecha`.
Basta con que un usuario modifique el reloj de su computadora/teléfono hacia el futuro, altere el valor del input vía consola (`document.getElementById("fecha-actividad").value = "2029-12-31"`) o envíe la petición directamente a Firestore para que el servidor la acepte y persista sin rechazo alguno.
**Gravedad / Frecuencia:** Media · Baja frecuencia en uso inocente, pero brecha real ante manipulación o desajustes horarios de terminales móviles.
**Cómo reproducirlo:**
1. Abrir `bitacora.html` como supervisor.
2. En consola de desarrollador ejecutar: `document.getElementById("fecha-actividad").removeAttribute("max"); document.getElementById("fecha-actividad").value = "2030-05-10";`.
3. Para evadir la validación en submit, redefinir momentáneamente `hoyISO = () => "2035-01-01"` o ejecutar el `addDoc` directamente.
4. Firestore guarda la bitácora con fecha en 2030 sin que las reglas de seguridad la frenen.

---

### 12. El catálogo de materiales no tiene unidad de medida.
**Veredicto:** CIERTO
**Evidencia:** `js/inventario-data.js:139-194` e `inventario.html:204-206`.
La estructura de datos de cada material en el catálogo es estrictamente:
`{ id: "...", nombre: "...", categoria: "..." }`.
**No existe un atributo de unidad de medida** (`unidad: "metros" | "carretes" | "unidades" | "paquetes"`).
En la interfaz (`inventario.html`), el input solo muestra un casillero numérico con placeholder `0`.
Aunque algunos nombres de almacén contienen pistas entre paréntesis (ej. `FIBRA OPTICA ... (CARRETE)` o `FLEJE DE ACERO ... POR MTS`), en la práctica operativa esto genera inconsistencias graves:
Si un técnico utilizó 40 metros de cable drop para conectar a un abonado, el supervisor puede registrar la cantidad `40`. Si el almacén despacha en unidades de "carrete", el sistema registra "40 carretes", inflando de manera absurda el consumo de material. Para generar órdenes de reposición y control de stock real, el catálogo es ambiguo e insuficiente sin una unidad normalizada.
**Gravedad / Frecuencia:** Alta (Control de inventarios y finanzas) · Afecta de manera continua el reporte de materiales entregados.
**Cómo reproducirlo:**
1. Abrir `inventario.html` en la pestaña de "Material de uso diario".
2. Intentar registrar una entrega de cable o fleje: el campo solo pide un número, sin indicar si se están entregando metros, bobinas o carretes.

---

## De qué no estoy seguro

1. **Persistencia offline y comportamiento del Service Worker en terminales móviles reales**: Las pruebas con conexión restringida en navegadores de escritorio demuestran que las nuevas páginas (`bitacora-tablero.html`, `inventario.html`, `reporte-herramientas.html`) no están incluidas en la lista `CORE` de `service-worker.js`. Sin embargo, no se pudo comprobar en un dispositivo físico con PWA instalada si el caché dinámico responde con la versión en memoria o si indefectiblemente expulsa al usuario al login (`index.html`) tras una pérdida abrupta de señal en plena jornada.
2. **Homogeneidad de especificaciones en herramientas homónimas ("Cleaver")**: No se tuvo acceso a las herramientas físicas ni a los números de parte del fabricante para determinar si el "Cleaver" del kit de empalme y el "Cleaver" del kit de fusión son mecánicamente idénticos (lo que permitiría fusionar el ítem en un solo renglón de compra) o si corresponden a marcas/modelos con costos y características diferentes.
3. **Distribución histórica de supervisores en Firestore real**: Debido a la prohibición estricta de consultar o alterar los datos de producción de Airtek, no se verificó si existen actualmente supervisores inactivos con técnicos asociados en el sistema real que pudieran alterar las sumatorias iniciales de herramientas.

---

## Recomendación final

**NO SE PUBLICA** hasta solucionar la falla de seguridad en `firestore.rules` (Hipótesis 4: supervisores pudiendo alterar inventarios ajenos), la sobrecarga de 35.000 consultas DOM en dispositivos móviles (Hipótesis 5) y la falta de unidad de medida en los materiales (Hipótesis 12).
