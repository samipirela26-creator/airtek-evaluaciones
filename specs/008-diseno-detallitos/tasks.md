# Tareas — Spec 008: Rediseño con el lenguaje visual de Mis Detallitos

## Fase 1 — Base y armazón

- [x] **T1: Aislar el login en su propio CSS**
  - **RF cubiertos**: RF-1, RF-2, RF-3, RF-4
  - **Archivos**: `css/login.css` (nuevo), `index.html`, `service-worker.js`
  - **Hecho cuando**: `css/login.css` existe con los cuatro tramos copiados
    literalmente de `css/styles.css` (`1–43`, `215–246`, `420–423`,
    `425–1039`) y llaves balanceadas; `index.html` carga únicamente ese
    archivo y su `<body>` quedó intacto; el service worker lo precachea y
    `CACHE` subió a `gesto-v2`; verificado en el navegador que el login se ve
    idéntico a 375px y a 1280px y que no pide ningún otro CSS.
  - **Hecho**: `css/login.css` son 727 líneas, 98 llaves que abren y 98 que
    cierran, con el `@import` de Poppins antes de cualquier regla (solo lo
    precede un comentario, que es válido). Se confirmó que el bloque del
    login termina limpio en la línea 1039: los dos únicos selectores de
    aspecto parecido que quedan más abajo (`.mobile-topbar` y
    `.sidebar-status-chip .status-pulse`) son de `panel.html`, y `index.html`
    no usa ninguno de los dos.
  - **Verificado en el navegador** (375x812 y 1280x860, servidor estático en
    el 5510): el panel de red muestra que la página pide **solo**
    `css/login.css` — ninguna petición a `styles.css`; `document.styleSheets`
    confirma una sola hoja. Poppins cargada (`document.fonts.check` true).
    Valores computados idénticos a los declarados: campos píldora
    `height: 54px`, `padding: 13px 48px 13px 50px` — **el relleno vertical de
    13px sigue viniendo de la regla global de `input`, que era el detalle
    frágil** —, `border-radius: 16px`, `font-size: 15.2px`; `.login-h1` a
    31.2px/800; la fila "Recordarme" conserva el `margin-bottom: 6px` y el
    `font-weight: 600` que heredaba de `label`. `.msg.error` y `.msg.ok`
    resuelven sus tokens (`#dc2626` / `#059669`). `.status-pulse` del login
    queda sin animación, como debe. Sin desborde horizontal.
  - **Nota**: en el panel del navegador el service worker no llega a
    registrarse ("unknown error when fetching the script"). Se comprobó que
    falla **igual con la versión del archivo que está en el commit**, así que
    es una limitación del panel, no del cambio: el script se sirve 200 como
    `text/javascript`, pasa `node --check` y los seis archivos de `CORE`
    existen. Queda por confirmar en un navegador normal.

- [x] **T2: Las cuatro capas de CSS**
  - **RF cubiertos**: RF-16, RF-17, RF-18
  - **Archivos**: `css/1-base.css`, `css/2-layout.css`,
    `css/3-componentes.css`, `css/4-pantallas.css` (nuevos)
  - **Hecho cuando**: las cuatro capas cubren lo que cubría `styles.css` sin
    el bloque del login; los tokens conservan sus nombres actuales con los
    alias de compatibilidad; `--sombra-card` es `none`; están arreglados
    `.btn.link`, `.meta`, la doble `.btn.secundario`, el `@keyframes`
    faltante y las clases que el JS escribe sin CSS; el CSS muerto se fue.

- [x] **T3: El armazón compartido y los helpers**
  - **RF cubiertos**: RF-5, RF-6, RF-7, RF-8, RF-9, RF-10
  - **Archivos**: `js/navegacion.js`, `js/shell.js`, `js/ui/iconos.js`,
    `js/ui/html.js`, `js/ui/listas.js` (nuevos)
  - **Hecho cuando**: `menuDeRol()` nunca devuelve más de 5 entradas y solo
    pantallas que ese rol puede abrir; el dock marca la activa con
    `aria-current="page"`; `esc()` quedó unificado en la versión que escapa
    `>`; `ICONS.link` existe; los banners de "Ver como" y "Modo de prueba"
    siguen apareciendo debajo de la cabecera.

- [x] **T4: Enganchar las 14 páginas y actualizar el smoke test**
  - **Archivos**: las 14 `.html` con sesión, sus módulos JS,
    `tests/smoke.test.js`, `service-worker.js`, `preview/` (regenerado)
  - **Hecho cuando**: cada pantalla carga las capas nuevas y llama a
    `montarShell()`; el test #5 del smoke apunta a `js/navegacion.js`;
    `css/styles.css` se eliminó y no queda ninguna referencia a él;
    `npm test` en verde; `bash preview/generar.sh` corrido.

## Fase 2 — Las tres pantallas de inicio

- [x] **T5: `panel.html` con los tres paneles por rol**
- [x] **T6: Listas acotadas con `renderLista` y `barraDeFiltros`**
  - **RF cubiertos**: RF-11, RF-12, RF-13, RF-14, RF-15
- [x] **T7: `dashboard.html`, `evaluacion.html` y `auditoria.html`**

## Fase 3 — El resto

- [x] **T8: Las 10 pantallas restantes**, `registro.html` incluida (que de
  paso recupera el layout que no tenía).

## Verificación transversal (en cada fase, no solo al final)

- [x] El login idéntico a 375px y 1280px: pide sólo `css/login.css` y los
  valores computados coinciden con los declarados.
- [x] Los tres roles en `preview/` — supervisor 5 botones (con "Evaluar"
  destacado), coordinador 5 (con "Más"), administrador 3.
- [ ] "Ver como" y "Modo de prueba" con su banner y su bloqueo de escritura:
  **pendiente**, no se ejercitó en esta pasada.
- [x] Sin desborde horizontal a 375px y ningún control por debajo de 44px, en
  las 14 pantallas recorridas.
- [x] `npm test` en verde (60 pruebas).

## Lo que se hizo de más, y lo que quedó pendiente

**De más** (apareció al implementar, no estaba en el plan):

- `.srow` no envolvía: un botón de texto largo ("Duplicar para editar")
  aplastaba el nombre del formulario a 69px en un teléfono. Ahora envuelve.
- Auditoría resolvía el nombre de usuario de los 200 movimientos traídos —
  200 lecturas a Firestore— para pintar sólo los primeros. Ahora recorta antes
  del bucle.
- Emojis que hacían de icono reemplazados por SVG de trazo 2px en el editor
  (reordenar, eliminar, actualizar puntajes), en el botón de exportar, y en
  los avisos de "Ver como" y "Modo de prueba". En el selector de "Ver como"
  el emoji simplemente se quitó: dentro de un `<option>` no se puede meter SVG.
- Entrada 2.4.0 en el aviso de novedades, que es la convención del repo para
  cualquier cambio que el usuario vaya a notar.

**Pendiente:**

- Ejercitar "Ver como" y "Modo de prueba" en el navegador.
- El service worker no llega a registrarse en el panel del navegador, pero
  falla igual con la versión anterior del archivo: es el panel, no el cambio.
  Confirmarlo en un Chrome normal antes de desplegar.
- `barraDeFiltros()` está escrita y probada en el lienzo de diseño, pero
  todavía no se usó en ninguna pantalla: las que listan colecciones hoy filtran
  por otros medios (selector de técnico, rango de fechas). Conectarla donde
  aporte.
- Quedan emojis en textos de contenido (avisos, novedades, metadatos de
  bitácora). No son iconos funcionales, así que no violan el DESIGN.md §5.2,
  pero convendría revisarlos.
