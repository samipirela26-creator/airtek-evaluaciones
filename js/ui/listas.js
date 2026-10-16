// listas.js — listas acotadas y barras de filtro.
//
// La regla: NUNCA scroll infinito, y tampoco un "cargar más" que alargue la
// lista para siempre. Una lista larga se acota con un tope duro y se navega
// afinando el filtro o buscando. Si el tope recortó algo, la pantalla lo dice
// en vez de disimularlo.
//
// Es el patrón de Mis Detallitos: en sus 7.900 líneas de JS no hay un solo
// IntersectionObserver ni un listener de scroll.

/** Tope por omisión. Más de esto en una pantalla deja de ser una lista y pasa
 *  a ser un muro de texto. */
export const TOPE = 25;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Pinta una lista acotada dentro de `nodo`.
 *
 * @param {object}   opciones
 * @param {Element}  opciones.nodo     dónde pintar.
 * @param {Array}    opciones.items    la colección completa, ya filtrada y ordenada.
 * @param {Function} opciones.pintar   (item, indice) => HTML de una fila.
 * @param {number}   [opciones.tope]   cuántas filas como máximo.
 * @param {string}   [opciones.vacio]  qué decir cuando no hay nada.
 * @param {string}   [opciones.unidad] cómo se llama un elemento, para el aviso
 *                                     del tope ("evaluación", "movimiento"…).
 * @param {string}   [opciones.comoAfinar] la frase que explica cómo ver el resto.
 * @returns {{mostradas: number, total: number, recortada: boolean}}
 */
export function renderLista({
  nodo,
  items = [],
  pintar,
  tope = TOPE,
  vacio = "No hay nada todavía.",
  unidad = "elemento",
  comoAfinar = "Afiná el filtro o buscá por nombre para ver el resto.",
}) {
  if (!nodo) return { mostradas: 0, total: 0, recortada: false };

  const total = items.length;
  if (!total) {
    nodo.innerHTML = `<div class="lista-vacia">${esc(vacio)}</div>`;
    return { mostradas: 0, total: 0, recortada: false };
  }

  const visibles = items.slice(0, tope);
  const recortada = total > tope;
  const plural = total === 1 ? unidad : unidad + "s";

  let html = visibles.map(pintar).join("");

  if (recortada) {
    html +=
      `<div class="tope-aviso">` +
      `<strong>Mostrando ${visibles.length} de ${total} ${esc(plural)}</strong>` +
      `<span>${esc(comoAfinar)}</span>` +
      `</div>`;
  }

  nodo.innerHTML = html;
  return { mostradas: visibles.length, total, recortada };
}

/**
 * Barra de chips para elegir un período (o cualquier filtro de una sola
 * opción). El elegido se LLENA; pasar el ratón sólo marca el borde — si los
 * dos se llenaran igual no se sabría cuál está elegido.
 *
 * @param {object}   opciones
 * @param {Element}  opciones.nodo
 * @param {Array}    opciones.opciones  [{ id, titulo }]
 * @param {string}   opciones.activa    id de la opción elegida.
 * @param {Function} opciones.onCambio  (id) => void
 */
export function barraDeFiltros({ nodo, opciones = [], activa, onCambio }) {
  if (!nodo) return;
  nodo.className = "chips-barra";
  nodo.innerHTML = opciones
    .map(
      (o) =>
        `<button type="button" class="chip" data-filtro="${esc(o.id)}" ` +
        `aria-pressed="${o.id === activa ? "true" : "false"}">${esc(o.titulo)}</button>`
    )
    .join("");

  nodo.querySelectorAll("[data-filtro]").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.getAttribute("aria-pressed") === "true") return;
      nodo.querySelectorAll("[data-filtro]").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      if (typeof onCambio === "function") onCambio(b.dataset.filtro);
    })
  );
}

/** Rangos de período, calcados de los de Mis Detallitos. Devuelven fechas
 *  ISO (YYYY-MM-DD) para comparar contra el campo `dia` de los documentos. */
export const hoyISO = () => new Date().toISOString().slice(0, 10);

export function sumarDias(iso, dias) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export const RANGOS = [
  { id: "semana", titulo: "7 días", desde: () => sumarDias(hoyISO(), -6) },
  { id: "mes", titulo: "Este mes", desde: () => hoyISO().slice(0, 8) + "01" },
  { id: "ano", titulo: "Este año", desde: () => hoyISO().slice(0, 4) + "-01-01" },
  { id: "todo", titulo: "Todo", desde: () => "2020-01-01" },
];
