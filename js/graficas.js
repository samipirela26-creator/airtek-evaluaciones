// graficas.js — helpers de Chart.js compartidos por los tableros.
// Chart se carga por CDN como global (<script> en el HTML), no como módulo.

export const AZUL = "#0066ff";
export const PALETA = ["#0066ff", "#059669", "#7c3aed", "#dc2626", "#d97706", "#0891b2", "#be185d", "#374151"];
export const SIN_DATOS = "#9ca3af";

// Instancias vivas por canvas: hay que destruirlas antes de recrear,
// si no Chart.js avisa "canvas is already in use".
const instancias = {};

/** ¿Chart.js llegó? Viene por CDN, así que sin internet no está. */
export function hayChart() {
  return typeof Chart !== "undefined";
}

// Si la librería no cargó, se avisa en el sitio de la gráfica en vez de dejar
// un rectángulo blanco. Los números y la exportación no dependen de Chart.js,
// así que la página sigue sirviendo.
function avisarSinGraficas(canvas) {
  if (!canvas || canvas.dataset.avisoPuesto) return;
  canvas.dataset.avisoPuesto = "1";
  canvas.style.display = "none";
  const aviso = document.createElement("div");
  aviso.className = "meta";
  aviso.style.cssText = "padding:18px;text-align:center;border:1px dashed var(--borde);border-radius:10px";
  aviso.textContent = "📶 Las gráficas necesitan internet para cargarse. Los totales y la exportación sí funcionan.";
  canvas.insertAdjacentElement("afterend", aviso);
}

function crear(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  if (!hayChart()) {
    avisarSinGraficas(canvas);
    return null;
  }
  if (instancias[canvasId]) instancias[canvasId].destroy();
  instancias[canvasId] = new Chart(canvas, config);
  return instancias[canvasId];
}

export function barChart(canvasId, labels, data, label, max, color = AZUL, horizontal = false) {
  const colors = Array.isArray(color) ? color : labels.map(() => color);
  return crear(canvasId, {
    type: "bar",
    data: { labels, datasets: [{ label, data, backgroundColor: colors, borderRadius: 6, maxBarThickness: 46 }] },
    options: {
      indexAxis: horizontal ? "y" : "x",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { [horizontal ? "x" : "y"]: { beginAtZero: true, ...(max ? { max } : {}) } },
    },
  });
}

export function donaChart(canvasId, labels, data, label) {
  return crear(canvasId, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ label, data, backgroundColor: labels.map((_, i) => PALETA[i % PALETA.length]), borderWidth: 0 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom", labels: { boxWidth: 14, font: { size: 11 } } } },
    },
  });
}

/** Acorta etiquetas largas para que no aplasten la gráfica. */
export function acortar(texto, max = 38) {
  const s = String(texto ?? "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
