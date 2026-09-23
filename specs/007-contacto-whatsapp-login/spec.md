# Spec 007 — Contacto por WhatsApp en el login

## Contexto y objetivo

El usuario (dueño/administrador del sistema) quiere que quien vea la
pantalla de login pueda contactarlo directamente si tiene un problema para
ingresar o una consulta, sin tener que buscar el dato en otro lado.

## Usuarios / actores

- Visitantes de la pantalla de login en **escritorio** (técnicos,
  supervisores, coordinadores u otros que intenten ingresar): ven un enlace
  de WhatsApp con el número del administrador en el panel de marca.

## Decisiones (confirmadas con el usuario, no quedan abiertas)

- **Número**: `+58 412 7980301` (Venezuela, con código de país).
- **Formato**: enlace de WhatsApp (`https://wa.me/...`), no texto plano ni
  `tel:`. Al tocarlo/hacer clic abre WhatsApp (o WhatsApp Web) con una
  conversación ya iniciada hacia ese número.
- **Ubicación**: panel de marca del login (`.brand-pane-footer`,
  `index.html`), junto al badge existente "Plataforma Segura · Red GESTO".
  El usuario eligió este lugar sabiendo que ese panel **solo es visible en
  escritorio** (oculto en móvil por el breakpoint `min-width: 900px` ya
  existente) — no se pide replicarlo en el header móvil.

## Requisitos funcionales (notación EARS)

- **RF-1 (UBICUO)**: El panel de marca del login (escritorio) mostrará un
  enlace visible con ícono de WhatsApp y un texto corto invitando a
  contactar (p. ej. "Contáctanos por WhatsApp").
- **RF-2 (DIRIGIDO POR EVENTO)**: Cuando el usuario haga clic en el enlace,
  se abrirá `https://wa.me/584127980301` en una pestaña/app nueva
  (`target="_blank"`, con `rel="noopener"` por seguridad).
- **RF-3 (UBICUO)**: El enlace usará el mismo lenguaje visual del panel de
  marca (tipografía Poppins ya cargada, tono de color legible sobre el fondo
  azul del panel — blanco/blanco translúcido, consistente con
  `.brand-status-badge`), sin introducir una librería de íconos nueva (el
  ícono de WhatsApp se dibuja como SVG inline, igual que el resto de íconos
  del login).

## Requisitos no funcionales

- **Sin dependencias nuevas** (Constitución art. 7): SVG inline, sin
  librería de íconos ni fuente de íconos externa.
- **Sin backend**: es un `<a href>` estático, no involucra Firebase.
- **No se toca el layout existente**: el badge "Plataforma Segura · Red
  GESTO" permanece; el enlace se agrega dentro del mismo
  `.brand-pane-footer`, sin romper el panel en pantallas de escritorio
  angostas (900–1100px).

## Fuera de alcance

- Mostrar el contacto en el header móvil del login (`.mobile-brand-center`)
  o en cualquier otra pantalla (panel, registro, etc.) — el usuario pidió
  específicamente el login, panel de marca.
- Formularios de contacto, chat en vivo, correo u otro canal — solo
  WhatsApp.
- Validar o enmascarar el número (es información pública que el propio
  usuario quiere exponer).

## Criterios de finalización

- En `index.html`, el panel de marca de escritorio muestra el enlace de
  WhatsApp junto al badge existente.
- `npm test` en verde.
- Recorrido visual con `preview_start` + `resize_window` a escritorio:
  el enlace se ve bien alineado, no rompe el layout del footer ni se monta
  sobre el badge; confirmar con `read_page` que el `href` apunta a
  `https://wa.me/584127980301`.

## Dudas abiertas

*Ninguna pendiente.* Número, formato y ubicación confirmados con el
usuario.
