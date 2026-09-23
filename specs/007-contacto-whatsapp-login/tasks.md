# Tareas — Spec 007: Contacto por WhatsApp en el login

- [x] **T1: Enlace de WhatsApp en el panel de marca del login**
  - **RF cubiertos**: RF-1, RF-2, RF-3
  - **Archivos**: `index.html`, `css/styles.css`
  - **Hecho cuando**: `.brand-pane-footer` muestra el badge "Plataforma
    Segura · Red GESTO" (sin cambios) y, debajo, un enlace con ícono
    WhatsApp + texto "Contáctanos por WhatsApp" que abre
    `https://wa.me/584127980301` en pestaña nueva; verificado en el
    navegador (`resize_window` escritorio, incluyendo ~920px) que no rompe
    el layout del footer; `read_page`/`find` confirma el `href` correcto;
    `npm test` en verde.
  - **Verificado**: capturas en 800px y 920px de ancho muestran el badge y
    el link en líneas separadas, legibles, sin desbordes; `find` confirmó
    `href="https://wa.me/584127980301"` en el DOM real servido. Nota: la
    página raíz `index.html` (login) queda fuera del regenerado de
    `preview/generar.sh` a propósito — ese script salta explícitamente
    `index.html` porque `preview/index.html` es un menú hecho a mano
    (línea 19 del script), así que no hay `preview/index.html` que
    actualizar para este cambio. De paso se regeneró `preview/panel.html`
    (llevaba el renombrado "GESTO" de la spec 006 sin sincronizar en
    `preview/`), sin relación con esta tarea.
