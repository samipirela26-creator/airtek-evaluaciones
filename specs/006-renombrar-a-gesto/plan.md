# Plan técnico — Spec 006

## Decisiones y por qué

| Decisión | Razón |
|---|---|
| El logo se reemplaza por **texto** "GESTO" con Poppins, no por una imagen nueva | No hay un archivo de logo "GESTO" listo, y generar uno que imite el trazo conectado a mano del logo de Airtek es un encargo de diseño gráfico, no un renombrado de texto. `DESIGN.md` ya documenta Poppins como la tipografía del sistema, y el proyecto ya tiene un precedente de wordmark en texto puro: `.brand-text`/`.brand-accent` en `index.html:103` (`AIRTEK.` + `Evaluaciones`), con `font-weight:900`/`800`. Se reutiliza ese mismo peso tipográfico para las 4 imágenes que se reemplazan, ajustando color según el fondo de cada una. |
| El pin se borra, no se reemplaza | Verificado por grep: no aparece en ningún `<img>`/`background-image`/`import` de ningún HTML, CSS o JS del repo. Es un archivo agregado en el commit del rediseño pero nunca consumido. |
| `preview/*.html` no se edita a mano | Son copias generadas por `preview/generar.sh` a partir de las páginas raíz (con rutas reescritas a absolutas e import map de mocks). Editar la copia directamente se pierde en el próximo `generar.sh` y además queda desincronizada. |
| `img/airtek-waves.svg` e `img/airtek-wallpaper-waves.png` no se tocan | Son patrones decorativos abstractos (ondas), sin ningún texto ni logo dibujado — el nombre de archivo es lo único "Airtek", y no hace falta que el nombre de archivo coincida con la marca para que la app diga "GESTO" en pantalla. |
| Se sube `CACHE` en `service-worker.js` a `"gesto-v1"` | No aporta nada visible por sí solo, pero el propio archivo ya documenta la convención ("sube este número en cada despliegue para avisar 'nueva versión'") y este despliegue sí amerita avisar — mejor aprovecharlo que dejarlo en un nombre que ya no coincide con la marca mostrada. |

## Los 4 reemplazos de logo-imagen → logo-texto

Mismo patrón en los cuatro casos: quitar el `<img>`, poner un `<span>`/`<div>`
con la clase existente renombrada (o una nueva) y una regla CSS que imite el
tamaño/posición de la imagen que reemplaza. Referencia de estilo a reutilizar
(`css/styles.css:783-791`, ya existente):
```css
.brand-text { font-weight: 900; color: #0f172a; letter-spacing: 1px; }
.brand-accent { font-weight: 700; color: #00bfff; letter-spacing: 0; }
```

| Dónde | Archivo:línea | Imagen (tamaño) | Fondo | Texto nuevo |
|---|---|---|---|---|
| Login, panel de marca (escritorio) | `index.html:44`, CSS `css/styles.css:527` (`.brand-pane-logo`, `height:32px`, `filter: drop-shadow(...)`) | Blanca, con sombra | Pane azul | "GESTO" blanco, `font-weight:900`, tamaño ~1.6rem, conservando el `text-shadow` equivalente al `drop-shadow` actual. Debajo, el subtítulo "Gestión y Supervisión de Tareas Operativas" (RF-4) en un tamaño pequeño, mismo tono que `.brand-pane-desc`. |
| Login, header móvil | `index.html:79`, CSS `css/styles.css:681` (`.mobile-brand-logo`, `height:36px`) | Blanca, con sombra | Header azul móvil | "GESTO" blanco, mismo criterio; `.mobile-brand-tag` (línea 80, ya es texto: "EVALUACIONES") se conserva tal cual al lado, o se cambia a algo más corto si no entra — se decide mirándolo en el navegador. |
| Panel, sidebar (escritorio) | `panel.html:15`, CSS `css/styles.css:1313` (`.sidebar-logo`, `height:28px`) | Azul (`airtek-logo-blue-transparent.png`) | Fondo claro del sidebar | "GESTO" en `var(--azul-airtek)`, mismo peso. |
| Panel, topbar móvil | `panel.html:47`, CSS `css/styles.css:65` (`.topbar-logo`, `height:26px`, `height:22px` en el breakpoint de `:1215`) | Azul | Topbar claro | "GESTO" en `var(--azul-airtek)`, mismo peso. |

El tamaño exacto en `rem`/`px` se ajusta mirando el resultado real en el
navegador (`preview_start` + `resize_window` a escritorio y móvil) — la
tabla de arriba da el criterio (mismo alto visual aproximado, mismo color,
mismo peso tipográfico que `.brand-text`), no un valor final cerrado.

## Resto de los cambios (mecánicos, por categoría)

- **Páginas HTML raíz (15 archivos)**: `<title>` y el nodo de marca de cada
  una — mismo patrón `.marca`/`.logo` en 13 de ellas (buscar `AIRTEK` dentro
  de `<title>` y de la clase de marca de cada archivo), más los 4 casos de
  imagen→texto de la tabla anterior. Después de editar las 15, correr
  `bash preview/generar.sh` para regenerar `preview/*.html` — no tocar esas
  copias a mano.
- **`manifest.json`**: `name`, `short_name`, `description` (esta última
  lleva el desarrollo de la sigla, RF-4).
- **`js/firebase.js:82`**: meta `apple-mobile-web-app-title`.
- **`index.html`**: `<title>`, meta `description`, `og:site_name`,
  `og:title`, `og:description`, `og:image:alt`, aria-labels, "Plataforma
  Segura · Red Airtek" (línea 56). *No* tocar `og:url`/`og:image`.
- **`panel.html`**: "Red Airtek Operativa" (línea 20), "Airtek Fibra"
  (línea 33, etiqueta de rol del usuario en el sidebar).
- **`js/detalle.js`**: línea 160 (`docp.text("AIRTEK", ...)`) y línea 233
  (pie de página del PDF).
- **`js/panel.js:365`**: copy de bienvenida de root.
- **`js/editor.js`**: líneas 74, 78, 83, 172 — copy sobre "el formulario
  oficial de Airtek".
- **`js/registro.js:47`**: nombre de invitador por defecto.
- **`js/plantilla.js:96`**: pregunta de evaluación oficial (RF-3).
- **Nombres de archivo descargado**: `js/panel.js:1312`
  (`airtek-respaldo...json` → `gesto-respaldo...json`),
  `js/bitacora-tablero.js:176` (usa `nombreConFecha("bitacoras_airtek")` de
  `bitacora-data.js` → `"bitacoras_gesto"`) — y actualizar
  `tests/exportar-csv.test.js:61`, que afirma el nombre viejo.
- **`img/`**: borrar `airtek-logo-black.png`, `airtek-logo-blue.png`,
  `airtek-logo-blue-transparent.png`, `airtek-logo-white-transparent.png`
  (ya no se referencian tras el paso anterior), `airtek-pin.png`,
  `airtek-pin-transparent.png` (huérfanos).
- **`service-worker.js`**: `CACHE = "airtek-v4"` → `"gesto-v1"`.
- **Documentación activa**: `README.md` (título + descripción),
  `AGENTS.md` (encabezado), `docs/constitution.md` (título), `DESIGN.md`
  (nombre del sistema + §5 "Simbología y Recursos de Marca": quitar la
  mención al PNG del logotipo y al pin —ya no existen—, y anotar que el
  nombre se resuelve con texto estilizado). El resto de `DESIGN.md`
  (paleta, tipografía, Bento Grid, animación) **no cambia**.

## Riesgos

- **Que el texto "GESTO" no calce visualmente donde antes iba una imagen
  con proporciones distintas** (más corto, distinta relación ancho/alto) —
  mitigado revisando cada uno de los 4 casos en el navegador antes de dar
  la tarea por terminada, no solo confiando en que el CSS compile.
- **Que `preview/generar.sh` no capture bien algún cambio** si se edita una
  página raíz después de regenerar — por eso el orden es: terminar TODOS
  los cambios de HTML raíz primero, regenerar una sola vez al final.
- **Un `og:site_name`/`og:title` desalineado con `og:url`** (la URL real
  sigue diciendo `airtek-evaluaciones` en el path) — es esperado y ya está
  en "fuera de alcance"; no es un bug, es la URL real del repo.
