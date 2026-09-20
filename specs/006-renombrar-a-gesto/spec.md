# Spec 006 — Renombrar la app de "Airtek" a "GESTO"

## Contexto y objetivo

La app se llama "Airtek" en toda su marca visible (títulos, topbar, logo,
PDF, formularios, metadatos de instalación). El usuario quiere renombrarla a
**GESTO** ("Gestión y Supervisión de Tareas Operativas"), conservando el
diseño visual documentado en `DESIGN.md` (colores, tipografía Poppins, Bento
Grid, ondas orgánicas del login, sidebar/topbar del panel) exactamente como
está — este es un cambio de **nombre**, no un rediseño.

Un inventario completo previo (187 líneas con "airtek", 45 archivos) encontró
que el logo del login y del panel es una **imagen PNG con "AIRTEK" dibujado
como arte** (no texto real), así que no puede renombrarse con un simple
reemplazo de cadena — necesita su propia decisión de diseño.

## Usuarios / actores

- Todos los usuarios de la app (root, coordinador, supervisor, técnicos que
  usan el link público): ven "GESTO" en vez de "Airtek" en cualquier
  pantalla, PDF o metadato de instalación.

## Decisiones (ya confirmadas con el usuario, no quedan abiertas)

- **RF-1 (UBICUO)**: Las imágenes de logo (`img/airtek-logo-white-transparent.png`
  en el login, `img/airtek-logo-blue-transparent.png` en el panel) se
  reemplazan por **texto estilizado "GESTO"**, con la tipografía y color que
  ya define `DESIGN.md`, en el mismo lugar y con el mismo tamaño/posición
  donde hoy va la imagen.
- **RF-2 (UBICUO)**: El pin decorativo (`img/airtek-pin.png`,
  `airtek-pin-transparent.png`) se elimina del repositorio — no está
  referenciado en ningún HTML/CSS/JS hoy.
- **RF-3 (UBICUO)**: La pregunta de evaluación oficial que menciona "el
  estándar de calidad de Airtek" (`js/plantilla.js`, `PLANTILLA_DEFAULT`) se
  reescribe mencionando "GESTO".
- **RF-4 (UBICUO)**: "Gestión y Supervisión de Tareas Operativas" aparece
  **solo** como subtítulo junto al nombre en el panel de marca del login
  (escritorio) y en la `description` de `manifest.json`. En cualquier otro
  lugar de la app solo se muestra "GESTO".

## Requisitos funcionales (en notación EARS)

- **RF-5 (UBICUO)**: Las 15 páginas HTML raíz mostrarán "GESTO" en su
  `<title>` y en su elemento de marca (topbar `.marca`, `.logo` de
  `registro.html`, o el markup propio de `index.html`/`panel.html`).
- **RF-6 (UBICUO)**: `manifest.json` (`name`, `short_name`, `description`),
  la meta `apple-mobile-web-app-title` (`js/firebase.js`) y las etiquetas
  `og:*`/`description` de `index.html` (excepto `og:url`/`og:image`, que
  apuntan a la URL real y no cambian) mostrarán "GESTO".
- **RF-7 (UBICUO)**: El PDF de evaluación generado (`js/detalle.js`) mostrará
  "GESTO" en su encabezado y pie de página.
- **RF-8 (UBICUO)**: Los textos de interfaz que hoy mencionan "Airtek"
  (bienvenida de root, copy del editor de formularios sobre "el formulario
  oficial", nombre de invitador por defecto, "Red Airtek Operativa", "Airtek
  Fibra") mostrarán "GESTO".
- **RF-9 (UBICUO)**: Los archivos que la app genera para descargar (respaldo
  JSON, exportación CSV de bitácoras) usarán "gesto" en vez de "airtek" en su
  nombre de archivo.
- **RF-10 (UBICUO)**: La documentación activa del proyecto (`README.md`,
  `AGENTS.md`, `docs/constitution.md`, `DESIGN.md`) reflejará el nombre
  "GESTO"; `DESIGN.md` además se actualiza donde describe el logo/pin como
  imágenes de marca, para que quede consistente con RF-1/RF-2.

## Requisitos no funcionales

- **Sin dependencias nuevas** (Constitución art. 7).
- **El diseño visual no cambia**: mismos colores, tipografía, layout,
  breakpoints responsive — solo texto/imágenes de marca (Constitución
  espíritu de "no rediseñar sin que se pida").
- **`preview/*.html` nunca se edita a mano** — se regenera con
  `bash preview/generar.sh` después de editar las páginas raíz
  correspondientes.

## Fuera de alcance

- **Identificadores de infraestructura**: `projectId`/`authDomain`/
  `storageBucket` de Firebase, el alias de `.firebaserc`, la `og:url`/
  `og:image` real de GitHub Pages, `package.json.name` — cambiarlos
  rompería el despliegue real o no aporta nada visible.
- **Claves internas** de `sessionStorage`/`localStorage`
  (`airtek_ver_como`, `airtek_modo_prueba`, `airtek_novedades_vistas`,
  `airtek_borrador_*`), la variable CSS `--azul-airtek` y la clase
  `.toast-airtek`: invisibles para el usuario; renombrarlas solo agrega
  riesgo (tocar varios archivos de test) sin beneficio visible.
- El proyecto ficticio `demo-airtek` usado por los tests contra el emulador.
- Las **specs históricas** (`specs/001-.../` a `specs/005-.../`): son el
  registro de decisiones ya tomadas, no se reescriben.
- Los archivos `img/airtek-wallpaper-waves.png` e `img/airtek-waves.svg`
  (ondas decorativas abstractas, sin texto de marca) — se conservan tal
  cual, incluido su nombre de archivo.

## Criterios de finalización

- Un grep case-insensitive de "airtek" sobre el repo solo encuentra las
  exclusiones documentadas arriba (infraestructura, claves internas,
  `demo-airtek`, specs históricas, los dos archivos de ondas) — nada más.
- `npm test` en verde (incluye la aserción de nombre de archivo CSV
  actualizada).
- Recorrido visual en `preview/` y con `npm run serve`: login (escritorio y
  móvil), panel (sidebar y topbar móvil), una página con `.marca`, y un PDF
  de evaluación generado — todos muestran "GESTO", sin errores de consola,
  y con el mismo layout de antes (nada se corrió de lugar).

## Dudas abiertas

*Ninguna pendiente.* Todas las decisiones de alcance (logo, pin, pregunta de
evaluación, dónde va el desarrollo de la sigla) se resolvieron con el usuario
antes de esta spec.
