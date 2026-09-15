// exportar-csv.js
// Generación y descarga de CSV compatible con Excel.
// Funciones puras (sin DOM ni Firebase) salvo `descargarCSV`, para poder probarlas.

/**
 * Escapa un valor para CSV: envuelve en comillas si trae coma, comilla,
 * salto de línea o punto y coma, y duplica las comillas internas.
 */
export function escaparCampo(valor) {
  const s = valor === null || valor === undefined ? "" : String(valor);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Convierte filas a texto CSV.
 * @param {Array<{clave:string, titulo:string, valor?:Function}>} columnas
 * @param {Array<Object>} filas
 */
export function filasACSV(columnas, filas) {
  const cabecera = columnas.map((c) => escaparCampo(c.titulo)).join(",");
  const cuerpo = (filas || []).map((fila) =>
    columnas
      .map((c) => escaparCampo(typeof c.valor === "function" ? c.valor(fila) : fila[c.clave]))
      .join(",")
  );
  return [cabecera, ...cuerpo].join("\r\n");
}

/**
 * Antepone el BOM UTF-8. Sin él, Excel abre el archivo en Latin-1 y
 * los acentos y la ñ salen como símbolos raros.
 */
export function conBOM(csv) {
  return "﻿" + csv;
}

/** Nombre de archivo con la fecha de hoy, sin caracteres problemáticos. */
export function nombreConFecha(base, fecha = new Date()) {
  const iso = [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
  return `${base.replace(/[^\w\-]+/g, "_")}_${iso}.csv`;
}

/** Dispara la descarga en el navegador. */
export function descargarCSV(nombreArchivo, csv) {
  const blob = new Blob([conBOM(csv)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberar el objeto tras un instante (Safari necesita que el click ya haya corrido).
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
