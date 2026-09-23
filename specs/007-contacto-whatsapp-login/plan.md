# Plan técnico — Spec 007

## Decisiones y por qué

| Decisión | Razón |
|---|---|
| Ícono de WhatsApp como SVG inline (path del glifo oficial simplificado) | El resto de íconos del login (`pill-icon`, ojo mostrar/ocultar, Google) ya son SVG inline sin librería — mismo patrón, cumple Constitución art. 7 (sin dependencias nuevas). |
| Enlace dentro de `.brand-pane-footer`, debajo/al lado del `.brand-status-badge` | Es el contenedor que el usuario señaló explícitamente; ya tiene `position:relative; z-index:2` para quedar sobre las ondas decorativas de fondo. |
| Número formateado a E.164 sin espacios en el `href` (`https://wa.me/584127980301`) | Es el formato que exige la API de `wa.me`; espacios o el `+` rompen el link en algunos clientes. |
| Texto visible del link SÍ muestra el número formateado para lectura humana (`+58 412-798-0301`) | El `href` no tiene que ser igual al texto mostrado; mostrar el número ayuda a quien prefiera copiarlo a mano en vez de usar WhatsApp Web. |

## Cambios

- **`index.html`** (`.brand-pane-footer`, línea ~54-59): agregar un
  `<a class="brand-contact-link" href="https://wa.me/584127980301" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">`
  con un SVG inline (glifo WhatsApp, `fill="currentColor"`, ~16px) y el texto
  "Contáctanos por WhatsApp", debajo del `<span class="brand-status-badge">`
  existente (no lo reemplaza).
- **`css/styles.css`** (junto a `.brand-status-badge`, dentro del mismo
  `@media (min-width: 900px)` que ya envuelve `.brand-pane-footer`):
  nueva regla `.brand-contact-link` — `display:inline-flex; align-items:center; gap:6px; margin-top:10px; font-size:0.82rem; font-weight:600; color:rgba(255,255,255,0.92); text-decoration:none;` y un `:hover`/`:focus-visible` que suba la opacidad, consistente con el resto de enlaces del login (`.forgot-link`, `.signup-link`).
- **`preview/generar.sh`**: correr al final para regenerar `preview/index.html` (página raíz modificada).

## Riesgos

- **Que el footer se vea apretado** si el badge + el link no caben en una
  sola línea en pantallas de 900-1000px — mitigado poniendo el link en su
  propia línea (`display:block`/flex-wrap) en vez de forzarlo al lado del
  badge, y confirmando en el navegador con `resize_window` a un ancho
  cercano al breakpoint (900-960px).
- **Ícono SVG de WhatsApp mal dibujado** (los glifos de marca son detallados)
  — mitigado usando un path simplificado ya validado (silueta de burbuja +
  auricular, sin el detalle interno completo del logo oficial), suficiente
  para que se reconozca como WhatsApp sin pretender ser pixel-perfect al
  logo de Meta.
