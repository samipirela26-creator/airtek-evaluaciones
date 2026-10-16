# Plan técnico — Spec 008

## Decisiones y por qué

| Decisión | Razón |
|---|---|
| Aislar el login **antes** de tocar cualquier otra cosa | El `3-componentes.css` de Mis Detallitos estiliza selectores de elemento desnudos (`label`, `input`, `table`, `dialog`). Su `label { text-transform: uppercase; font-size: .72rem }` destrozaría el "Recordarme". Con el login fuera del CSS global, esos selectores dejan de ser un riesgo. |
| En `css/login.css`, las reglas globales van **sin acotar** y copiadas literalmente | Acotarlas bajo `.login-screen-wrap` las subiría a (0,2,1) y le ganarían a `.input-pill-wrap input`, que es (0,1,1) y gana hoy solo por venir después: los campos cambiarían de radio (16→14px) y de letra (.95→1rem). La copia literal preserva la cascada exacta. |
| Conservar los nombres actuales del `:root`, alias de compatibilidad incluidos | `--azul`, `--negro`, `--gris`, `--borde`, `--texto`, `--texto2` ya los usan el JS y el HTML. Renombrarlos sería una rotura gratuita. Cambian los valores, no las llaves. |
| Capas numeradas `1-base` → `4-pantallas`, como Mis Detallitos | El orden de los `<link>` *es* la cascada; numerarlos lo hace evidente y evita que alguien los reordene. |
| `--sombra-card: none` | En Mis Detallitos el color separa las piezas, no la sombra; y bajo el sol una sombra suave no se ve. Se conserva una `--sombra-alta` solo para diálogos y toasts. |
| La navegación en un módulo declarativo propio (`js/navegacion.js`) | Hoy el sidebar se arma con tres ramas `if/else` dentro de `panel.js` y el `.active` está fijo a `panel.html`. Una tabla única de pantallas por rol arregla el marcado de la activa y deja de duplicar la lista. |
| Extraer los helpers duplicados **antes** de rediseñar | `esc()` está copiado en 11 archivos y **las versiones no son idénticas** (solo la de `panel.js:42` escapa `>`); la tarjeta KPI tiene 3 implementaciones; `htmlListaConVerMas`/`htmlTabs` están atrapados en `panel.js` sin exportar. Rediseñar antes de unificar multiplica el trabajo por diez. |
| Reemplazar `htmlListaConVerMas` por un helper con tope real | El actual **trae todos los documentos de Firestore y solo esconde el resto con `hidden`**, y su `wireVerMas` depende de `previousElementSibling`, que se rompe en silencio si el markup se envuelve. |
| Dejar `.topbar` como nombre de clase, o actualizar dos módulos | `ver-como.js:75` y `prueba.js:36` hacen `querySelector(".topbar")` y, si no existe, **salen sin pintar nada**: root perdería el aviso de que está suplantando. |

## Cambios

### F1.1 — Aislar el login

- **`css/login.css`** (nuevo): copia literal de `css/styles.css` tramos
  `1–43` (`@import`, `:root`, `*`, `body`), `215–246` (`h1/h2/h3`, `label`,
  `input`, `:focus`), `420–423` (`.msg`) y `425–1039` (el bloque del login),
  en ese orden, con una cabecera que explica qué no se debe "arreglar".
- **`index.html`** línea 24: el `<link>` pasa de `css/styles.css` a
  `css/login.css`. El `<body>` no se toca.
- **`service-worker.js`**: `./css/login.css` entra en `CORE`; `CACHE` sube a
  `"gesto-v2"`.

### F1.2 — Las capas de CSS

- **`css/1-base.css`**: tokens (nombres actuales, valores nuevos), reset,
  Poppins con el peso 900 que el `DESIGN.md` pide para el wordmark,
  escala tipográfica, `.cifra`/`tabular-nums`, utilidades.
- **`css/2-layout.css`**: `.barra` + el titular de pantalla, `#contenido`,
  `.nav` (dock), `.rejilla`, sidebar de escritorio.
- **`css/3-componentes.css`**: `.tarjeta` y variantes de bloque lleno,
  `.seccion` + `.ver-todo`, `.btn` y variantes, `.chip`/`.chips-barra`,
  formularios, tablas, `.etiqueta`, toasts, `dialog`, `.vacio`, `.cargando`.
- **`css/4-pantallas.css`**: lo específico que migra — `.tabla-escala`,
  `.firma*`, el editor `.ed-*` (19 clases), `.bitacora-item`,
  `.cat-inventario`, `.tab-row`/`.tab-btn`, `.srow*`, `.aa-avatar`, los
  banners de ver-como y de prueba.
- **`css/styles.css`**: se elimina al final de F1, cuando las 14 pantallas
  ya cargan las capas nuevas.
- Arreglos de paso: `.btn.link` legible, `.meta` con definición propia, la
  doble declaración de `.btn.secundario` resuelta, el `@keyframes statusPulse`
  que falta, las clases que el JS escribe y no tienen CSS (`.btn-delete`,
  `.btn-row-principal`, `.btn-row-secundaria`, `.srow-actions`,
  `.ed-sticky-abajo`), y borrar el CSS muerto (`.login-desc`, `.icon-blue`,
  `.sidebar-nav-badge`).

### F1.3 — El armazón

- **`js/navegacion.js`** (nuevo): tabla `{ id, archivo, titulo, icono, roles,
  orden, menu }`, más `menuDeRol(rol)` con tope de 5 e `inicioDeRol(rol)`.
- **`js/shell.js`** (nuevo): `montarShell({ sesion, activa })` inyecta la
  cabecera y el dock, marca la activa con `aria-current` y deja el ancla
  para los banners de suplantación.
- **`js/ui/iconos.js`** (nuevo): se extrae el diccionario `ICONS` de
  `panel.js:46-68` (21 iconos, trazo 2px) y se completa. De paso se corrige
  `ICONS.link`, que no existe y renderiza el texto `undefined` en
  `panel.js:1069`.
- **`js/ui/html.js`** (nuevo): `esc()` unificado (la versión completa, la que
  escapa `>`), `setMsg()`, la tarjeta KPI, `initials`/`AVATAR_COLORS`.
- **`js/ui/listas.js`** (nuevo, se usa desde F2):
  `renderLista({ nodo, items, tope = 25, pintar, vacio })` y
  `barraDeFiltros({ nodo, opciones, activa, onCambio })`.

### F1.4 — Enganchar las 14 páginas

Mismo cambio repetido: los `<link>` nuevos y el contenedor del shell en cada
`.html`; una llamada a `montarShell()` dentro del callback de
`protegerPagina()` en cada módulo JS.

### F1.5 — Los tests

- **`tests/smoke.test.js`**: su test #5 lee el texto de `js/panel.js` con
  `.includes()` exigiendo que mencione `bitacora-tablero.html`,
  `inventario.html` y `reporte-herramientas.html`. Al mover la navegación a
  `js/navegacion.js` hay que apuntarlo al módulo nuevo; su intención (que las
  tres pantallas sean alcanzables) se conserva.

### F2 — Las tres pantallas de inicio

`panel.html` primero (es el inicio común y el destino de rebote), luego
`dashboard.html`, `evaluacion.html` y `auditoria.html`. `panel.js` son 1.374
líneas con 55 estilos en línea y ya trae el rediseño responsive del commit
`6f72422`: **se adapta, no se rehace.**

### F3 — El resto

`evaluar.html`, `historial.html`, `detalle.html`, `bitacora.html`,
`bitacora-tablero.html`, `inventario.html`, `editor.html`,
`reporte-herramientas.html`, `perfil.html`, `registro.html`.

## Riesgos

- **Que el login cambie sin que se note.** Mitigado comparando contra
  captura previa a 375px y 1280px en cada fase, no solo en F1, y mirando en
  el panel de red que `index.html` no pida ningún CSS de la app.
- **Romper algo en silencio por un `id` de DOM renombrado.** Son ~45 los que
  el JS busca por `getElementById`, y nada los verifica: un `null` rompe solo
  esa pantalla, en ejecución. Mitigado dejando los `id` intactos y tratando
  la lista como contrato. `deshabilitarControlesDeEscritura(sesion, ids)`
  recibe arrays de `id`: si cambian, root puede escribir donde no debe.
- **Que los tests den una falsa sensación de seguridad.** Son de lógica pura
  y de reglas; ninguno mira el CSS ni el DOM. `npm test` va a seguir verde
  aunque la UI quede rota. La verificación visual con los tres roles es la
  que manda.
- **Que `preview/` quede desincronizado.** Son artefactos generados: hay que
  editar el HTML de la raíz y correr `bash preview/generar.sh`. Un cambio
  solo de CSS o solo de JS no necesita regenerar.
- **Que el punto verde del login cambie.** `.status-pulse` está definido dos
  veces con valores distintos (login y sidebar de panel), hoy sin colisionar
  porque viven en media queries y contextos separados. Al añadir el
  `@keyframes statusPulse` que falta, verificar que no alcance al login.
