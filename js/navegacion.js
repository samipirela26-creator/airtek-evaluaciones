// navegacion.js — la tabla de pantallas, y qué ve cada perfil.
//
// Única fuente de verdad de la navegación. Antes la lista vivía duplicada en
// tres ramas if/else dentro de js/panel.js, y sólo existía en esa página: al
// salir del panel no quedaba ninguna navegación.
//
// `roles` tiene que coincidir con lo que exige protegerPagina() en el módulo
// de cada pantalla. Si no coincide, el botón lleva a un rebote a panel.html.
//
// Sólo entran al menú las pantallas que funcionan SIN parámetros en la URL.
// historial.html y detalle.html necesitan ?tecnico= / ?id= y sin ellos avisan
// "Falta el técnico": se llega a ellas desde una lista, no desde el dock.

export const PANTALLAS = [
  // Común a los tres perfiles
  { id: "panel", archivo: "panel.html", titulo: "Panel", icono: "inicio",
    roles: ["root", "coordinador", "supervisor"], orden: 10, menu: true },

  // Supervisor
  { id: "bitacora", archivo: "bitacora.html", titulo: "Bitácora", icono: "bitacora",
    roles: ["supervisor"], orden: 20, menu: true },
  { id: "evaluacion", archivo: "evaluacion.html", titulo: "Evaluar", icono: "evaluar",
    roles: ["supervisor"], orden: 30, menu: true, destacado: true },

  // Supervisor y coordinador
  { id: "inventario", archivo: "inventario.html", titulo: "Inventario", icono: "inventario",
    roles: ["supervisor", "coordinador"], orden: 40, menu: true },

  // Coordinador
  { id: "dashboard", archivo: "dashboard.html", titulo: "Métricas", icono: "metricas",
    roles: ["coordinador"], orden: 20, menu: true },
  { id: "tablero", archivo: "bitacora-tablero.html", titulo: "Tablero", icono: "tablero",
    roles: ["coordinador"], orden: 30, menu: true },
  { id: "herramientas", archivo: "reporte-herramientas.html", titulo: "Herramientas", icono: "herramientas",
    roles: ["coordinador"], orden: 50, menu: true },
  { id: "editor", archivo: "editor.html", titulo: "Formulario", icono: "formulario",
    roles: ["coordinador"], orden: 60, menu: true },

  // Administrador (root)
  { id: "auditoria", archivo: "auditoria.html", titulo: "Auditoría", icono: "auditoria",
    roles: ["root"], orden: 20, menu: true },

  // Común, al final del menú
  { id: "perfil", archivo: "perfil.html", titulo: "Perfil", icono: "cuenta",
    roles: ["root", "coordinador", "supervisor"], orden: 90, menu: true },

  // Pantallas de detalle: se alcanzan desde una lista, no desde el dock.
  { id: "historial", archivo: "historial.html", titulo: "Historial", icono: "historial",
    roles: ["root", "coordinador", "supervisor"], orden: 95, menu: false },
  { id: "detalle", archivo: "detalle.html", titulo: "Detalle de evaluación", icono: "historial",
    roles: ["root", "coordinador", "supervisor"], orden: 96, menu: false },
];

/** Cuántos botones entran en el dock. Es un tope deliberado: una barra con
 *  más botones deja de ser cómoda de usar con el pulgar. */
export const TOPE_DOCK = 5;

/** Las pantallas de menú de un rol, ya filtradas y ordenadas. */
export function pantallasDeRol(rol) {
  return PANTALLAS
    .filter((p) => p.menu && p.roles.includes(rol))
    .sort((a, b) => a.orden - b.orden);
}

/**
 * Reparte las pantallas de un rol entre el dock y el menú "Más".
 * Si caben todas, no hay "Más". Si no caben, el dock se queda con
 * TOPE_DOCK - 1 y el resto pasa a "Más", para que el botón quepa.
 */
export function menuDeRol(rol) {
  const todas = pantallasDeRol(rol);
  if (todas.length <= TOPE_DOCK) return { dock: todas, mas: [] };
  return { dock: todas.slice(0, TOPE_DOCK - 1), mas: todas.slice(TOPE_DOCK - 1) };
}

/** La pantalla de arranque de cada perfil. Hoy los tres empiezan en el panel,
 *  que pinta una interfaz distinta según el rol. */
export function inicioDeRol() {
  return "panel.html";
}

/** El id de la pantalla a partir de un nombre de archivo, para marcar la
 *  activa. Devuelve null si el archivo no está en la tabla. */
export function pantallaDeArchivo(archivo) {
  const p = PANTALLAS.find((x) => x.archivo === archivo);
  return p ? p.id : null;
}
