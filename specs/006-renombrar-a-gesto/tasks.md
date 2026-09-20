# Tareas — Spec 006: Renombrar a GESTO

- [x] **T1: Los 4 logos imagen → texto "GESTO" (la parte visual más delicada)**
  - **RF cubiertos**: RF-1, RF-4
  - **Archivos**: `index.html`, `panel.html`, `css/styles.css`
  - **Hecho cuando**: en `index.html` (panel de marca de escritorio y
    header móvil) y `panel.html` (sidebar y topbar móvil), el `<img>` del
    logo se reemplaza por texto "GESTO" con el peso/tipografía de
    `.brand-text`, color correcto según el fondo de cada caso (blanco sobre
    azul en el login; `var(--azul-airtek)` sobre fondo claro en el panel); el
    subtítulo "Gestión y Supervisión de Tareas Operativas" aparece junto al
    logo del panel de marca de escritorio del login; verificado en el
    navegador (`preview_start` + `resize_window` escritorio y móvil) que
    nada se corrió de lugar y el texto se ve proporcionado, no solo que el
    CSS compile.
  - **Verificado en preview/**: login desktop (panel de marca con "GESTO" +
    tagline) y mobile header, panel sidebar desktop y topbar mobile — los 4
    casos renderizan "GESTO" con el peso/color correctos, sin desajustes de
    layout; `read_page` confirmó "GESTO"/"EVALUACIONES" presentes en el DOM
    del topbar móvil. De paso corregido `.brand-submark` en `index.html`
    (`AIRTEK.` → `GESTO.`), detectado durante la verificación visual y en
    alcance de T1 (texto de marca, no un logo-imagen, pero mismo patrón
    `.brand-text`).

- [x] **T2: Títulos y marca del resto de páginas HTML raíz + regenerar preview/**
  - **RF cubiertos**: RF-5
  - **Archivos**: las 13 páginas HTML raíz restantes (todas menos
    `index.html`/`panel.html`, ya cubiertas en T1), `preview/` (regenerado,
    no editado a mano)
  - **Hecho cuando**: cada `<title>` y cada nodo `.marca`/`.logo` dice
    "GESTO"; corrido `bash preview/generar.sh` al final (una sola vez,
    después de terminar T1 y T2) y confirmado que `preview/*.html` quedó
    regenerado sin diffs manuales.
  - **Verificado**: `grep -ni airtek` sobre las 13 páginas confirmó 0
    coincidencias tras el reemplazo; también actualizado `<title>` de
    `panel.html` e `index.html` (parte del mismo patrón de título raíz,
    dejando ambos consistentes con las 13 restantes antes de regenerar
    `preview/`); `bash preview/generar.sh` regeneró las 14 páginas sin
    intervención manual.

- [x] **T3: Metadatos de instalación/compartir y textos sueltos de panel/index**
  - **RF cubiertos**: RF-4, RF-6, RF-8
  - **Archivos**: `manifest.json`, `js/firebase.js`, `index.html`, `panel.html`
  - **Hecho cuando**: `manifest.json` (`name`/`short_name`/`description`,
    con el desarrollo de la sigla en `description`), la meta
    `apple-mobile-web-app-title`, y las `og:*`/meta `description` de
    `index.html` (sin tocar `og:url`/`og:image`) dicen "GESTO"; "Red Airtek
    Operativa" y "Airtek Fibra" en `panel.html` también.
  - **Verificado**: `grep -ni airtek` sobre los 4 archivos solo deja las
    exclusiones documentadas (`projectId`/`authDomain`/`storageBucket` de
    Firebase, `.toast-airtek`, `og:url`/`og:image`, `airtek-waves.svg`,
    `--azul-airtek`).

- [x] **T4: PDF generado y copy de la interfaz (JS)**
  - **RF cubiertos**: RF-3, RF-7, RF-8
  - **Archivos**: `js/detalle.js`, `js/panel.js`, `js/editor.js`,
    `js/registro.js`, `js/plantilla.js`
  - **Hecho cuando**: el encabezado y pie del PDF de evaluación dicen
    "GESTO" (verificado generando un PDF real, no solo leyendo el código);
    el copy de bienvenida de root, el texto del editor sobre "el formulario
    oficial", el nombre de invitador por defecto y la pregunta de
    evaluación oficial (`PLANTILLA_DEFAULT`) dicen "GESTO".
  - **Verificado**: generé un PDF real en `preview/detalle.html?id=e_1`
    (interceptando `jsPDF` con un Proxy para capturar cada `.text()`
    dibujado, sin depender de una descarga real) — encabezado "GESTO", pie
    "GESTO · Evaluación de Juan Pérez · Pág 1/1". De paso encontré y
    corregí dos menciones de "Airtek" en `preview/seed.js` (pregunta
    sí/no y pregunta técnica del mock de plantilla) que aparecían en el
    PDF de prueba — mismo texto que ya se corrigió en
    `js/plantilla.js:96`, así que se alinean. Nota de entorno: el server
    estático local (`python3 -m http.server`) cacheaba agresivamente los
    módulos JS en el navegador del sandbox incluso tras editarlos; se
    resolvió reinyectando el script con un query de cache-bust para cada
    verificación, no afecta al comportamiento real en producción (GitHub
    Pages + Service Worker versionado en T6).

- [x] **T5: Nombres de archivos descargados**
  - **RF cubiertos**: RF-9
  - **Archivos**: `js/panel.js` (respaldo), `js/bitacora-data.js` o
    `js/bitacora-tablero.js` (CSV), `tests/exportar-csv.test.js`
  - **Hecho cuando**: el respaldo JSON se llama `gesto-respaldo-...json`, el
    CSV de bitácoras `bitacoras_gesto_...csv`, y
    `tests/exportar-csv.test.js` afirma el nombre nuevo (no el viejo).
  - **Verificado**: `npm test` 59/59 en verde tras el cambio de assertion.

- [x] **T6: Limpieza de imágenes y versión de caché**
  - **RF cubiertos**: RF-1, RF-2
  - **Archivos**: `img/` (borrar 6 archivos), `service-worker.js`
  - **Hecho cuando**: `airtek-logo-black.png`, `airtek-logo-blue.png`,
    `airtek-logo-blue-transparent.png`, `airtek-logo-white-transparent.png`,
    `airtek-pin.png`, `airtek-pin-transparent.png` ya no existen en el
    repo, y ningún HTML/CSS los sigue referenciando (confirmado con grep,
    no solo por no haber errores al ojo); `service-worker.js` usa
    `CACHE = "gesto-v1"`.
  - **Verificado**: grep de `airtek-logo|airtek-pin` sobre todo el repo
    (antes de borrar) ya daba 0 coincidencias fuera de `img/`, así que el
    borrado con `git rm` fue seguro; `CORE`/`PRECACHE` de
    `service-worker.js` tampoco los menciona.

- [x] **T7: Documentación activa**
  - **RF cubiertos**: RF-10
  - **Archivos**: `README.md`, `AGENTS.md`, `docs/constitution.md`,
    `DESIGN.md`
  - **Hecho cuando**: título y descripción de cada uno dicen "GESTO";
    `DESIGN.md` §5 ya no describe un PNG de logotipo ni un pin (reflejando
    T1/T6), y el resto de la guía (paleta, tipografía, Bento Grid,
    animación) queda intacto — se verifica con un diff de esa sección, no
    reescribiendo el documento entero.
  - **Verificado**: `git diff DESIGN.md` confirma que solo cambiaron el
    título/descripción y §5 (logotipo ahora descrito como wordmark
    tipográfico, entrada del pin eliminada) — las secciones 2-4 y 6
    (paleta, tipografía, Bento Grid, animación, anti-slop) quedan
    byte-por-byte intactas pese a mencionar "Airtek" en su prosa
    descriptiva (p. ej. "curvatura del logotipo de Airtek" en §1,
    `--azul-airtek`/"Azul Eléctrico Airtek" en §2), tal como pide el plan.
    En `AGENTS.md` se actualizó solo la descripción de línea 4 ("para
    GESTO"); el encabezado de línea 1 (`# AGENTS.md — airtek-evaluaciones`)
    se dejó igual porque nombra el slug del repo, mismo criterio que
    `package.json`'s `name` (fuera de alcance, es infraestructura, no
    marca visible).

- [x] **T8: Verificación final**
  - **RF cubiertos**: Criterios de finalización
  - **Archivos**: ninguno (verificación)
  - **Hecho cuando**: `grep -ri airtek` sobre el repo (sin `node_modules`,
    `.git`) solo encuentra las exclusiones documentadas en plan.md
    (infraestructura de Firebase, `demo-airtek` de tests, claves internas de
    storage, `--azul-airtek`/`.toast-airtek`, specs históricas 001-005,
    `airtek-waves.svg`/`airtek-wallpaper-waves.png`) — nada más; `npm test`
    en verde; recorrido visual en `preview/` y `npm run serve`: login
    (escritorio y móvil), panel (sidebar y topbar móvil), una página
    `.marca` cualquiera, y un PDF de evaluación generado — todos dicen
    "GESTO", sin errores de consola.
  - **Verificado**: `grep -rli airtek .` (sin `.git`/`node_modules`) barrido
    completo; todo lo que quedó encaja en las categorías documentadas en
    `spec.md` ("Fuera de alcance"), más 3 hallazgos menores fuera de esa
    lista que corregí por consistencia (no estaban documentados como
    exclusión, y son texto/etiquetas de bajo riesgo, no infraestructura):
    `package.json` `description` (el `name` sí queda excluido, tal cual
    dice spec.md), `.claude/launch.json` (`"name": "airtek"` → `"gesto"`;
    el `--directory` con la ruta real del repo se dejó igual, es
    infraestructura de filesystem), y `preview/index.html` (el único HTML
    de `preview/` hecho a mano, no generado por `generar.sh`) + un
    comentario suelto en `js/evaluacion.js:37`. Las direcciones de correo
    ficticias `@demo.airtek` en `preview/seed.js` se dejaron igual: son
    datos internos de mock nunca renderizados como texto de marca (mismo
    criterio que las claves de storage documentadas como exclusión).
    `npm test`: 59/59 en verde. Recorrido visual con servidor y caché
    forzadamente frescos: login escritorio y móvil ✓ ("GESTO" + tagline,
    "GESTO. Evaluaciones", "Red GESTO"), panel sidebar + topbar móvil ✓
    (T1), página `.marca` (`auditoria.html`) ✓ ("GESTO · Auditoría"), PDF
    de evaluación ✓ (T4) — todas las requests de red de estas cargas en
    200 OK; los únicos errores de consola vistos son residuos de
    navegaciones anteriores de esta misma sesión de verificación (el PNG
    de firma falsa del seed de prueba, y el artefacto ya documentado del
    entorno sandbox al abrir HTML como `file://`), no regresiones nuevas.
