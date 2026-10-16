// shell.js — el armazón compartido: el dock flotante que llevan todas las
// pantallas con sesión.
//
// Antes, al salir de panel.html no quedaba ninguna navegación: el sidebar sólo
// existía en esa página y encima estaba oculto por debajo de 960px. En las
// otras 13 pantallas lo único que había era un "← Volver".
//
// Lo que monta es sólo el dock. La .topbar de cada página se queda donde está
// a propósito: js/ver-como.js y js/prueba.js hacen querySelector(".topbar")
// para colgar su banner justo debajo, y si no la encuentran salen sin pintar
// nada — root perdería el aviso de que está suplantando a alguien.

import { menuDeRol, pantallaDeArchivo } from "./navegacion.js";
import { icono } from "./ui/iconos.js";

function archivoActual() {
  const nombre = location.pathname.split("/").pop();
  return nombre || "panel.html";
}

/** Un botón del dock. */
function crearEnlace(pantalla, esActiva) {
  const a = document.createElement("a");
  a.href = pantalla.archivo;
  a.dataset.pantalla = pantalla.id;
  if (pantalla.destacado) a.className = "destacado";
  // La activa se marca con aria-current, no con una clase a mano: así no se
  // puede quedar pegada a una pantalla, que es lo que le pasaba al sidebar.
  if (esActiva) a.setAttribute("aria-current", "page");

  const ico = document.createElement("span");
  ico.innerHTML = icono(pantalla.icono, pantalla.destacado ? 19 : 18);
  const txt = document.createElement("span");
  txt.textContent = pantalla.titulo;

  a.append(ico, txt);
  return a;
}

/** El diálogo con las pantallas que no caben en el dock. */
function crearDialogoMas(pantallas, activa) {
  const dlg = document.createElement("dialog");
  dlg.id = "dlg-mas";

  const titulo = document.createElement("h2");
  titulo.textContent = "Más pantallas";

  const lista = document.createElement("div");
  lista.style.display = "flex";
  lista.style.flexDirection = "column";
  lista.style.gap = "6px";

  for (const p of pantallas) {
    const a = document.createElement("a");
    a.href = p.archivo;
    a.className = "sidebar-nav-item";
    a.style.display = "flex";
    a.style.alignItems = "center";
    a.style.gap = "12px";
    a.style.minHeight = "var(--toque)";
    a.style.padding = "0 14px";
    a.style.borderRadius = "var(--radio-chico)";
    a.style.color = "var(--texto-primario)";
    a.style.fontWeight = "500";
    if (p.id === activa) a.setAttribute("aria-current", "page");

    const ico = document.createElement("span");
    ico.innerHTML = icono(p.icono, 18);
    const txt = document.createElement("span");
    txt.textContent = p.titulo;
    a.append(ico, txt);
    lista.appendChild(a);
  }

  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.className = "btn secundario ancho";
  cerrar.textContent = "Cerrar";
  cerrar.style.marginTop = "16px";
  cerrar.addEventListener("click", () => dlg.close());

  dlg.append(titulo, lista, cerrar);
  document.body.appendChild(dlg);
  return dlg;
}

/**
 * Monta el dock en la pantalla actual.
 *
 * @param {object} sesion  el contexto que devuelve contextoActual(), o el
 *                         { user, perfil } de protegerPagina(). Se usa el rol
 *                         EFECTIVO: con "Ver como" o "Modo de prueba" activos,
 *                         el dock tiene que ser el del rol prestado.
 * @param {object} [opciones]
 * @param {string} [opciones.activa]  id de pantalla a marcar; por omisión se
 *                                    deduce del nombre del archivo.
 */
export function montarShell(sesion, opciones = {}) {
  const rol = sesion && sesion.perfil ? sesion.perfil.rol : null;
  if (!rol) return null;
  if (document.querySelector("nav.nav")) return null; // ya estaba montado

  const activa = opciones.activa || pantallaDeArchivo(archivoActual());
  const { dock, mas } = menuDeRol(rol);
  if (!dock.length) return null;

  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.setAttribute("aria-label", "Navegación principal");

  for (const p of dock) nav.appendChild(crearEnlace(p, p.id === activa));

  if (mas.length) {
    const hayActivaEnMas = mas.some((p) => p.id === activa);
    const dlg = crearDialogoMas(mas, activa);

    const btn = document.createElement("a");
    btn.href = "#";
    btn.dataset.pantalla = "mas";
    if (hayActivaEnMas) btn.setAttribute("aria-current", "page");
    const ico = document.createElement("span");
    ico.innerHTML = icono("mas", 18);
    const txt = document.createElement("span");
    txt.textContent = "Más";
    btn.append(ico, txt);
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      dlg.showModal();
    });
    nav.appendChild(btn);
  }

  document.body.appendChild(nav);
  return nav;
}
