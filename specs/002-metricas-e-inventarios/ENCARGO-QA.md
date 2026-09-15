# Encargo: verificar la Spec 002 antes de publicarla

Para quien lo reciba (otra IA u otra persona). Pega este archivo completo al
inicio de la sesión.

---

## Qué se pide, y qué NO

Se pide **verificar**, no arreglar. El resultado es un veredicto por escrito de
cada hipótesis de abajo, con evidencia. **No toques código.** Si algo te parece
urgente, dilo en el informe; no lo corrijas.

La razón de separarlo: quien escribió este módulo es quien propone estas
hipótesis, y nadie audita bien su propio trabajo. Varias de las de abajo son
cosas que el autor **no pudo probar**, no cosas que sabe que están rotas.

## Veredictos posibles

| Veredicto | Cuándo |
|---|---|
| **CIERTO** | Reprodujiste el fallo, o señalas las líneas exactas y explicas el camino completo |
| **FALSO** | El código ya lo evita. Di **dónde** lo evita |
| **NO CONCLUYENTE** | No pudiste determinarlo. Di qué te faltó |

Para cada uno: **gravedad** (qué pierde el supervisor o el coordinador),
**frecuencia** (cada cuánto pasa en el uso real) y **cómo reproducirlo**.

**Se valora más un FALSO bien argumentado que un CIERTO a medias.** Si todo te
sale CIERTO, desconfía de ti mismo antes de entregar.

---

## Estado al momento de escribir esto

**Las reglas de `firestore.rules` YA SE PUBLICARON en el proyecto real** (15 de
septiembre de 2026). El código todavía NO está en `master`, así que la app
publicada en GitHub Pages sigue siendo la versión anterior: en producción
conviven **reglas nuevas con código viejo**.

Eso deja dos cosas ya resueltas, que **no hace falta que verifiques**:

- La sintaxis de las reglas es válida. La consola de Firebase la valida antes
  de publicar; si estuviera mal, el publicado habría fallado.
- La lectura de bitácoras no se rompió. El único cambio sobre una colección en
  uso fue agregar un `||` a la regla de lectura, y agregar un "o" solo amplía
  el acceso, nunca lo quita.

Lo que sigue abierto es si las reglas **hacen lo que deben** cuando el código
nuevo las ejerza. Eso es el Bloque A.

## ⚠ Regla innegociable sobre los datos

El proyecto de Firebase es el **real**, con datos del personal de la empresa.

- **No escribas nada** en `usuarios`, `tecnicos`, `evaluaciones` ni `bitacoras`.
- Para probar las reglas usa el **emulador**:
  `firebase emulators:start --only firestore`, cargándole el mismo
  `firestore.rules`. Ahí puedes simular cualquier usuario y rol sin tocar nada.
- Si algo solo se puede comprobar contra el proyecto real, **no lo hagas**:
  anótalo como NO CONCLUYENTE y explica qué haría falta.

## Contexto mínimo

Rama: `feature/metricas-e-inventarios`. Ruta:
`/home/sanuel/Documentos/airtek-evaluaciones`.

Lee **`AGENTS.md`** y **`docs/constitution.md`** primero, y luego
`specs/002-metricas-e-inventarios/spec.md` (qué se pidió) y `plan.md` (por qué
se hizo así).

Lo que más se olvida:

- Son **ES Modules vanilla sin bundler**. No hay build.
- El backend es **Firebase**; toda la seguridad vive en `firestore.rules`.
- `npm test` corre con `node --test` y debe quedar en verde.
- Hay un **modo de previsualización sin Firebase** para ejercitar la interfaz:
  ```bash
  bash preview/servir.sh
  # luego abre http://localhost:5510/preview/index.html
  ```
  Los datos de ejemplo están en `preview/seed.js`. El rol se elige con
  `?u=coordinador|supervisor|root`.

**No pruebes contra el Firebase de producción.** Si necesitas probar reglas,
usa el emulador (`firebase emulators:start --only firestore`), nunca el
proyecto real: ahí hay datos de personal de la empresa.

---

## Las hipótesis

### Bloque A — Reglas de Firestore (lo más importante)

Las reglas están publicadas, pero **nunca se ejecutaron contra el código
nuevo**: no hay emulador configurado en este repo y el autor no pudo probarlas.
Todo este bloque es especulación suya. Móntalo en el emulador.

1. **La consulta del coordinador al reporte de herramientas es rechazada por las
   reglas.** `js/reporte-herramientas.js` consulta
   `inventario_herramientas where supervisorUid in [...]`, pero la regla de
   lectura exige `esMiSupervisor(resource.data.supervisorUid)`, que hace un
   `get()`. Verifica si Firestore acepta esa consulta o la rechaza entera.
   *(Pista: `js/dashboard.js` ya usa ese patrón contra `evaluaciones` y funciona
   en producción. Confírmalo o desmiéntelo, no lo des por hecho.)*

2. **La condición `coordinadorUid` de `bitacoras` no sirve de nada.** Se
   agregó `resource.data.get('coordinadorUid', '') == request.auth.uid` para
   que el tablero consulte por ese campo sin un `get()` por documento. Pero
   `js/bitacora-tablero.js` **no consulta por `coordinadorUid`**: consulta por
   `supervisorUid in [...]` a través de `traerPorLotes`. Verifica si esa
   condición está haciendo algo o si es código muerto que solo amplía la
   superficie de permisos sin beneficio.

3. **Se excede el límite de lecturas de documentos de las reglas.**
   `puedeTocarInventario` llama a `activo()` y a `esMiSupervisor()`, y cada una
   hace su propio `get()`. Verifica cuántas lecturas cuesta una escritura de
   inventario y si se acerca al tope que impone Firestore.

4. **Un supervisor puede escribir el inventario de un técnico que no es suyo.**
   La regla confía en el `supervisorUid` que manda el cliente
   (`request.resource.data.supervisorUid`). Revisa si un supervisor puede
   mandar el uid de otro y colarse.

### Bloque B — Interfaz

5. **La pantalla de inventario es impracticable en un teléfono o tablet de
   gama baja.** `inventario.html` dibuja 81 herramientas × 5 campos = más de
   400 inputs de golpe, y cada tecleo recalcula el resumen recorriendo todo.
   El autor solo la probó en un navegador de escritorio. Pruébala en un
   dispositivo real o con throttling de CPU.

6. **Poner una herramienta en cero la borra sin avisar.**
   `renglonesConDatos` (en `js/inventario-data.js`) descarta los renglones sin
   unidades. Si un supervisor corrige "tenía 2 alicates, ahora 0", el renglón
   desaparece del documento. Verifica si eso hace que "no tiene ninguno" y
   "nunca lo llenó" queden indistinguibles en el reporte del coordinador.

7. **En el reporte consolidado aparecen dos filas llamadas "Cleaver".** El
   catálogo lo tiene en KIT DE EMPALME GPON y en KIT DE FUSION DE FIBRA OPTICA,
   con ids distintos. Revisa si el coordinador puede distinguirlas en
   `reporte-herramientas.html` y si eso descuadra el conteo para una compra.

8. **El tablero de bitácora se cae o se arrastra con fotos reales.** Las
   imágenes van en Base64 dentro del documento (`imagenes`), y el SDK web no
   permite pedir campos sueltos: `bitacora-tablero.html` se las descarga todas
   aunque no las use. Los datos de ejemplo de `preview/seed.js` traen
   `imagenes: []`, así que esto **nunca se probó con peso real**. Mide qué pasa
   con 200 bitácoras de 5 fotos.

9. **Sin internet, el tablero queda en blanco sin explicar por qué.** Chart.js
   entra por CDN (`cdn.jsdelivr.net`). Verifica qué ve el coordinador si el
   colegio se queda sin señal a mitad de la carga.

### Bloque C — Datos y fechas

10. **Las bitácoras viejas mienten en el tablero.** Las registradas antes de
    esta versión no tienen campo `fecha` y se les infiere de `createdAt`. El
    autor puso un aviso y una marca `~`, pero verifica si el aviso se ve donde
    hace falta y si el CSV exportado lo conserva.

11. **El límite de fecha futura se puede burlar.** `bitacora.js` fija
    `max = hoy` al cargar la página y valida contra `hoyISO()` al enviar. Revisa
    qué pasa si la pestaña queda abierta pasada la medianoche, y si la
    validación del cliente es la única barrera (las reglas no validan la fecha).

12. **El catálogo de materiales no tiene unidad de medida.** Se registra
    "FIBRA ÓPTICA DROP × 3" sin saber si son metros, carretes o rollos.
    Determina si eso hace inutilizable el historial de entregas para pedir
    reposición, o si el nombre del ítem basta en la práctica.

---

## Lo que el autor dejó a medias a propósito

No son hallazgos: son deudas conocidas. No hace falta que las verifiques, pero
si te tropiezas con consecuencias de ellas, dilo.

- Los ítems que venían fusionados en la planilla ya se separaron con el cliente.
  El último, `CONNECTOR CLEAR PEN SC Y LC B EQUIPOS DE PRUEBA`, se interpretó
  como dos lápices limpiadores (SC y LC) más el encabezado de la categoría
  siguiente colado en la celda. **Vale la pena que lo confirmes con la planilla
  original**: es la única separación que se hizo por interpretación y no por
  instrucción literal del cliente.
- Hay tres nombres más que vienen raros de la planilla y se cargaron literales:
  `Mariota de fibra de vidrio 150m, diámetro 11mm 5` (ese "5" del final),
  `Bolso cilindrico de empalme (Tipo liniero` y
  `Detector de voltaje sin contacto (Tipo lápiz` (paréntesis sin cerrar).
  Son cosméticos, pero el coordinador los va a ver así.
- Las fotos de las bitácoras siguen en Base64 dentro del documento. Sacarlas es
  una migración de datos y quedó fuera de esta spec.
- El catálogo solo se edita tocando `js/inventario-data.js` y desplegando.

---

## Qué entregar

Un solo archivo, `specs/002-metricas-e-inventarios/QA-VEREDICTOS.md`, con una
sección por hipótesis:

```markdown
### N. <la hipótesis tal cual>
**Veredicto:** CIERTO | FALSO | NO CONCLUYENTE
**Evidencia:** archivo:línea y el camino del código, o los pasos con los que lo
reprodujiste
**Gravedad / Frecuencia:** qué se pierde · cada cuánto pasa
**Cómo reproducirlo:** pasos concretos (o por qué no se puede)
```

Y al final, una sección **"De qué no estoy seguro"**. Es obligatoria. Si no
tienes dudas sobre nada, no miraste lo suficiente.

Agrega también una recomendación final de una línea: **¿se publica o no se
publica?**

Rama: `qa/spec-002`, salida de `feature/metricas-e-inventarios`. Como este
encargo es de verificación y no de arreglo, lo único que debería commitear ahí
es tu informe.
**No commitees en `master`**: en este repo `master` es GitHub Pages, o sea que
mergear ahí es publicar.

---

## Cómo escribir el informe

En español de Venezuela, directo, sin jerga innecesaria. Explica el porqué, no
solo el qué. Cuando afirmes algo sin haberlo comprobado, dilo.
