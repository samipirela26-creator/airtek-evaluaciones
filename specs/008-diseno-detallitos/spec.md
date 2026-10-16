# Spec 008 — Rediseño con el lenguaje visual de Mis Detallitos

## Contexto y objetivo

GESTO funciona, pero su interfaz quedó a medias: el `DESIGN.md` se aplicó
solo al login y al panel. El usuario usa a diario otra aplicación propia,
**Mis Detallitos** (`/home/sanuel/Documentos/Mis detallistos app`, finanzas
de una papelería), y la encuentra notablemente más cómoda. Pidió trasladar
ese lenguaje visual y esa ergonomía a GESTO, conservando la identidad azul
de la marca y **dejando el login exactamente como está**.

Lo que está mal hoy, verificado en el código:

- Al salir de `panel.html` **no hay navegación**: el sidebar solo existe en
  esa página y está oculto por debajo de 960px. Las otras 13 pantallas
  tienen una `.topbar` copiada a mano y un "← Volver".
- Ese "← Volver" es **invisible**: `.btn.link` (`css/styles.css:391`) pinta
  `color: #fff` sobre una `.topbar` que es `background: #ffffff`. Afecta a
  11 páginas y a los botones PDF/Editar/Eliminar de `detalle.html`.
- `.meta` **no existe como clase propia** (solo anidada en `.lista-item .meta`)
  pero se usa en 10 HTML y 9 JS para subtítulos: no tienen ningún estilo.
- El **dock flotante inferior** del `DESIGN.md` §4.5 no existe, ni los
  filtros en píldora (§4.4), ni el micro-histograma (§4.3).
- El `.active` del sidebar está fijo a `panel.html` en las tres variantes de
  rol: nunca marca la página actual.

Lo que Mis Detallitos resuelve y se quiere copiar:

- CSS en **capas numeradas** (`1-base` → `4-pantallas`), 978 líneas que
  cubren toda la app. *"El número es la cascada."*
- Armazón fijo: cabecera donde **el titular es la pantalla**, contenido
  centrado y **dock flotante** en cápsula.
- **Cero scroll infinito, y tampoco "cargar más"**: ni un
  `IntersectionObserver` ni un listener de `scroll` en sus 7.900 líneas de
  JS. Las listas se acotan con tope duro y se navegan con filtros de
  período y búsqueda. Cuando hace falta scroll, se confina en una caja.
- Dock de **5 botones como máximo, filtrado por rol**, con un botón central
  destacado para la acción principal.

## Usuarios / actores

Los tres perfiles del sistema, confirmados en `js/session.js:18` y en
`firestore.rules:8-13` (son strings literales, no hay enum):

- **`supervisor`** — opera en campo: evalúa a sus técnicos, carga bitácora
  diaria con fotos, lleva el inventario de sus técnicos.
- **`coordinador`** — crea y administra supervisores, edita los formularios
  de evaluación, consulta tableros agregados.
- **`root`** — administra el sistema; se le muestra como **"Administrador"**
  (`js/panel.js:192`), nunca como "root". Único con auditoría y respaldo, y
  el único que puede usar los dos modos de suplantación.

`tecnico` **no es un rol**: los técnicos son documentos de la colección
`tecnicos`, sin cuenta de Auth.

## Decisiones (confirmadas con el usuario, no quedan abiertas)

- **Paleta**: se conserva el **azul GESTO `#0066FF`** y la prohibición de
  modo oscuro (`DESIGN.md` §6: el sol vuelve ilegible el fondo negro, y esto
  se usa en la calle). Se adopta la *firma* de Mis Detallitos: bloques de
  color llenos, **cero sombras en reposo**, titulares enormes. Se descartó
  copiar el turquesa de Mis Detallitos porque chocaría con el login azul.
- **Login**: **congelado píxel a píxel**. Su CSS sale a `css/login.css` e
  `index.html` deja de cargar el CSS global. Poppins se sigue cargando en
  ambos lados.
- **Arquitectura**: **sigue siendo multipágina**. Un módulo compartido
  inyecta cabecera y dock en cada `.html`. No se convierte a una sola página
  con router, para no reescribir la navegación de los 30 módulos JS ni
  sacar al login de su propia página.
- **Entrega por fases**: F1 base y armazón, F2 las tres pantallas de inicio,
  F3 el resto.
- **`registro.html` sí recibe el diseño nuevo.** Solo `index.html` queda
  congelado. Conviene además porque `registro.html` usa hoy cuatro clases
  que ya no existen en el CSS (`.login-wrap`, `.login-card`, `.logo`,
  `.sub`): está sin estilo de layout.

## Requisitos funcionales (notación EARS)

### El login congelado

- **RF-1 (UBICUO)**: `index.html` cargará únicamente `css/login.css` y
  ningún otro archivo CSS.
- **RF-2 (UBICUO)**: `css/login.css` contendrá una copia literal de los
  tramos de `css/styles.css` de los que el login dependía: el `@import` de
  Poppins, `:root`, `*`, `body`, las reglas de `h1/h2/h3`, `label`, los
  `input` y su `:focus`, las tres reglas `.msg` y el bloque completo del
  login (líneas 425–1039 del original).
- **RF-3 (UBICUO)**: las reglas de elemento desnudo de `css/login.css`
  permanecerán **sin acotar** bajo ningún ancestro. Acotarlas bajo
  `.login-screen-wrap` subiría su especificidad de (0,1,1) a (0,2,1) y le
  ganarían a `.input-pill-wrap input`, cambiando el radio y el tamaño de
  letra de los campos píldora.
- **RF-4 (UBICUO)**: el `<body>` de `index.html` no se modificará.

### El armazón compartido

- **RF-5 (UBICUO)**: cada pantalla con sesión mostrará una cabecera con el
  titular de la pantalla como elemento tipográfico dominante, y un dock
  flotante inferior en forma de cápsula.
- **RF-6 (UBICUO)**: el dock mostrará **como máximo 5 botones**, y solo las
  pantallas que el rol efectivo puede abrir según `protegerPagina()`. Las
  demás se alcanzarán por una pantalla "Más".
- **RF-7 (DIRIGIDO POR ESTADO)**: mientras una pantalla esté activa, su
  botón del dock llevará `aria-current="page"`.
- **RF-8 (UBICUO)**: para el perfil `supervisor`, el dock mostrará
  "Evaluar" como botón central destacado. Para `coordinador` y `root` no
  habrá botón destacado.
- **RF-9 (UBICUO)**: el dock dejará hueco inferior con
  `env(safe-area-inset-bottom)`.
- **RF-10 (DIRIGIDO POR EVENTO)**: cuando "Ver como" o "Modo de prueba"
  estén activos, el banner correspondiente seguirá apareciendo debajo de la
  cabecera, y los controles de escritura seguirán deshabilitándose donde
  corresponda.

### Las listas acotadas

- **RF-11 (UBICUO)**: ninguna pantalla usará scroll infinito ni un botón de
  "cargar más" que alargue la lista en su lugar.
- **RF-12 (UBICUO)**: toda lista de una colección se acotará a un tope
  (25 por omisión) y mostrará cuántos elementos muestra de cuántos hay.
- **RF-13 (DIRIGIDO POR EVENTO)**: cuando el usuario elija otro período en
  la barra de filtros, la lista se recargará acotada a ese período.
- **RF-14 (UBICUO)**: el chip de filtro elegido se mostrará **relleno**; el
  estado de hover solo marcará el borde.
- **RF-15 (DIRIGIDO POR ESTADO)**: mientras una lista esté recortada por el
  tope, la pantalla dirá que lo está y cómo afinar el filtro.

### Los arreglos de paso

- **RF-16 (UBICUO)**: el botón "← Volver" será legible en las 11 páginas
  afectadas y en `detalle.html`.
- **RF-17 (UBICUO)**: `.meta` tendrá una definición propia aplicable en
  cualquier contexto.
- **RF-18 (UBICUO)**: no se usarán emojis como iconos funcionales
  (`DESIGN.md` §5.2); serán SVG de trazo 2px.

## Requisitos no funcionales

- **Sin compilación ni dependencias nuevas** (Constitución art. 1 y 7): CSS3
  nativo escrito a mano, módulos ES. Tailwind, Sass y PostCSS quedan fuera.
- **Estático** (art. 3): funciona en GitHub Pages y en `python3 -m http.server`.
- **`npm test` en verde** (art. 5).
- **Contraste**: mínimo 4.5:1, objetivo 7:1 (`DESIGN.md` §6). `#0066FF`
  contra blanco da **4,83:1** — pasa el mínimo pero no el objetivo; donde se
  busque 7:1 va `--azul-hover` `#0047B3` (**8,23:1**).
- **Mínimo táctil 44px, ideal 48px**; sin desborde horizontal a 375px; sin
  modo oscuro.
- **Los nombres de clases, variables y funciones nuevas en español**, como
  todo el resto del código.

## Fuera de alcance

- Convertir la app a una sola página con router por hash.
- Reescribir la lógica de negocio, el acceso a datos o las reglas de
  Firestore. Los 10 módulos `*-data.js`, `session.js`, `consultas.js` y
  `plantilla.js` no se tocan.
- Modo oscuro, en ninguna variante.
- El rendimiento de `panel.js` (17 `getDocs` sin `limit`): es un problema
  real, pero es otro trabajo.
- Cambiar el diseño del login.

## Criterios de finalización

- El login se ve idéntico a 375px y a 1280px, comparado contra captura del
  estado anterior, incluida la altura interna de los campos píldora; el
  panel de red confirma que `index.html` no pide ningún CSS de la app; un
  error de credenciales sigue mostrando `.msg.error` estilado.
- Con cada rol simulado en `preview/`, el dock muestra solo sus pantallas,
  nunca más de 5, marca la activa y ningún destino rebota a `panel.html`.
- "Ver como" y "Modo de prueba" siguen mostrando su banner y bloqueando la
  escritura donde corresponde.
- Sin desborde horizontal a 375px; ningún control por debajo de 44px.
- El service worker precachea los CSS nuevos y no queda ninguna petición a
  `styles.css`.
- `npm test` en verde y `bash preview/generar.sh` corrido si se tocó HTML.

## Dudas abiertas

*Ninguna pendiente.* Paleta, congelado del login, arquitectura multipágina y
entrega por fases confirmados con el usuario. El trato de `registro.html`
quedó declarado como supuesto y aceptado.
