// detalle.js — muestra una evaluación completa (solo lectura) y la exporta a PDF.
import { db, toast, logAudit } from "./firebase.js";
import { protegerPagina } from "./session.js";
import {
  doc,
  getDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

const id = new URLSearchParams(location.search).get("id");
let E = null; // la evaluación

protegerPagina(null, async ({ user, perfil }) => {
  const cont = document.getElementById("detalle");
  if (!id) {
    cont.innerHTML = `<div class="msg error">Falta el identificador de la evaluación.</div>`;
    return;
  }
  try {
    const snap = await getDoc(doc(db, "evaluaciones", id));
    if (!snap.exists()) {
      cont.innerHTML = `<div class="msg error">Evaluación no encontrada.</div>`;
      return;
    }
    E = snap.data();
    render(cont);
    document.getElementById("btn-pdf").addEventListener("click", generarPDF);
    document.getElementById("btn-eliminar").addEventListener("click", eliminar);
    // El supervisor dueño puede editar su evaluación.
    if (perfil.rol === "supervisor" && E.supervisorUid === user.uid) {
      const be = document.getElementById("btn-editar");
      be.style.display = "";
      be.addEventListener("click", () => (window.location.href = `evaluacion.html?edit=${id}`));
    }
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="msg error">No se pudo cargar: ${err.message}</div>`;
  }
});

async function eliminar() {
  if (!confirm("¿Eliminar esta evaluación? No se puede deshacer.")) return;
  try {
    await deleteDoc(doc(db, "evaluaciones", id));
    logAudit("evaluacion_eliminada", { evaluacionId: id, tecnico: E.tecnicoNombre });
    toast("Evaluación eliminada");
    setTimeout(() => (window.location.href = "panel.html"), 800);
  } catch (err) {
    console.error(err);
    toast("No se pudo eliminar: " + err.message, { ms: 5000 });
  }
}

function fechaLegible() {
  return E.createdAt?.toDate ? E.createdAt.toDate().toLocaleString("es-VE") : E.fechaHora || "";
}

function render(cont) {
  const P = E.plantillaSnapshot;
  const prom = E.puntajes?.promedioGeneral;

  let html = `
    <div class="card">
      <h1>${esc(E.tecnicoNombre) || "(sin nombre)"}</h1>
      <div class="meta">
        ${esc(E.area) || ""} · ${esc(E.motivo) || "s/motivo"}<br>
        Orden de trabajo: ${esc(E.ordenTrabajo) || "—"}<br>
        Supervisor: ${esc(E.supervisorNombre) || ""} · ${fechaLegible()}
      </div>
      <div style="margin-top:12px">
        <span class="badge" style="font-size:1rem">Promedio general: ${prom != null ? prom.toFixed(2) + " / 4" : "—"}</span>
      </div>
    </div>`;

  if (P && P.secciones) {
    for (const sec of P.secciones) {
      const respuestas = E.respuestas?.[sec.id] || [];
      const filas = sec.preguntas
        .map((preg, i) => {
          const r = respuestas[i];
          return `<tr><td>${esc(preg)}</td><td style="text-align:center;font-weight:600">${esc(r) || "—"}</td></tr>`;
        })
        .join("");
      const promSec = E.puntajes?.porSeccion?.[sec.id];
      const obs = E.observaciones?.[sec.id];
      html += `
        <div class="card">
          <h2>${esc(sec.titulo)}</h2>
          <div class="tabla-scroll">
            <table class="tabla-escala">
              <thead><tr><th></th><th style="text-align:center">Calificación</th></tr></thead>
              <tbody>${filas}</tbody>
            </table>
          </div>
          <div class="meta" style="margin-top:8px">Promedio de la sección: <strong>${promSec != null ? promSec.toFixed(2) + " / 4" : "—"}</strong></div>
          ${obs ? `<p style="margin-top:8px"><strong>Observaciones:</strong> ${esc(obs)}</p>` : ""}
        </div>`;
    }

    // Sí / No
    if (P.siNo) {
      const obsSino = E.observaciones?.[P.siNo.id];
      html += `
        <div class="card">
          <p><strong>${esc(P.siNo.label)}</strong></p>
          <p>Respuesta: <strong>${esc(E.conoceCanales) || "—"}</strong></p>
          ${obsSino ? `<p><strong>Observaciones:</strong> ${esc(obsSino)}</p>` : ""}
        </div>`;
    }
  }

  // Firmas
  html += `<div class="card">
    <h2>Firmas</h2>
    <div class="firma-caja">
      <div class="firma">
        <label>Supervisor</label>
        ${E.firmaSupervisor ? `<img src="${E.firmaSupervisor}" style="width:100%;border:1px solid var(--borde);border-radius:8px">` : `<div class="lista-vacia">Sin firma</div>`}
      </div>
      <div class="firma">
        <label>Técnico</label>
        ${E.firmaTecnico ? `<img src="${E.firmaTecnico}" style="width:100%;border:1px solid var(--borde);border-radius:8px">` : `<div class="lista-vacia">Sin firma</div>`}
      </div>
    </div>
  </div>`;

  cont.innerHTML = html;
}

// ── Exportar a PDF (jsPDF + autotable) ──
const AZUL = [0, 102, 255];
const NEGRO = [17, 17, 17];
const GRIS = [138, 138, 154];
const BLANCO = [255, 255, 255];

function generarPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const docp = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = docp.internal.pageSize.getWidth();
    const P = E.plantillaSnapshot;

    // Encabezado
    docp.setFillColor(...NEGRO);
    docp.rect(0, 0, W, 26, "F");
    docp.setTextColor(...BLANCO);
    docp.setFontSize(18); docp.setFont("helvetica", "bold");
    docp.text("AIRTEK", 14, 12);
    docp.setFontSize(9); docp.setFont("helvetica", "normal");
    docp.text("Evaluación de Desempeño Técnico", 14, 19);
    docp.setFillColor(...AZUL);
    docp.rect(0, 26, W, 2, "F");

    let y = 36;
    docp.setTextColor(...NEGRO);
    docp.setFontSize(15); docp.setFont("helvetica", "bold");
    docp.text(E.tecnicoNombre || "(sin nombre)", 14, y);
    y += 6;
    docp.setFontSize(9); docp.setFont("helvetica", "normal"); docp.setTextColor(...GRIS);
    docp.text(`${E.area || ""}  ·  ${E.motivo || "s/motivo"}`, 14, y); y += 5;
    docp.text(`Orden: ${E.ordenTrabajo || "—"}   Supervisor: ${E.supervisorNombre || ""}   ${fechaLegible()}`, 14, y);
    y += 4;

    const prom = E.puntajes?.promedioGeneral;
    docp.setFillColor(...AZUL);
    docp.roundedRect(14, y, 70, 11, 2, 2, "F");
    docp.setTextColor(...BLANCO); docp.setFontSize(10); docp.setFont("helvetica", "bold");
    docp.text(`Promedio general: ${prom != null ? prom.toFixed(2) + " / 4" : "—"}`, 18, y + 7);
    y += 16;

    if (P && P.secciones) {
      for (const sec of P.secciones) {
        const respuestas = E.respuestas?.[sec.id] || [];
        const body = sec.preguntas.map((preg, i) => [preg, respuestas[i] || "—"]);
        const promSec = E.puntajes?.porSeccion?.[sec.id];
        const titulo = sec.titulo + (promSec != null ? `   (${promSec.toFixed(2)}/4)` : "");
        docp.autoTable({
          head: [[titulo, "Calificación"]],
          body,
          startY: y,
          margin: { left: 14, right: 14 },
          headStyles: { fillColor: AZUL, textColor: BLANCO, fontSize: 9, fontStyle: "bold" },
          bodyStyles: { fontSize: 8.5, textColor: NEGRO },
          alternateRowStyles: { fillColor: [244, 246, 249] },
          columnStyles: { 1: { cellWidth: 34, halign: "center", fontStyle: "bold" } },
        });
        y = (docp.previousAutoTable?.finalY || y) + 3;
        const obs = E.observaciones?.[sec.id];
        if (obs) {
          docp.setFontSize(8); docp.setFont("helvetica", "italic"); docp.setTextColor(...GRIS);
          const lines = docp.splitTextToSize(`Obs: ${obs}`, W - 28);
          docp.text(lines, 14, y + 3); y += lines.length * 4 + 3;
        }
        if (y > 250) { docp.addPage(); y = 20; }
      }
      if (P.siNo) {
        docp.setFontSize(9); docp.setFont("helvetica", "bold"); docp.setTextColor(...NEGRO);
        const l = docp.splitTextToSize(`${P.siNo.label}  →  ${E.conoceCanales || "—"}`, W - 28);
        docp.text(l, 14, y + 4); y += l.length * 4 + 6;
      }
    }

    // Firmas
    if (y > 235) { docp.addPage(); y = 20; }
    y += 6;
    const addFirma = (label, dataURL, x) => {
      if (dataURL) docp.addImage(dataURL, "PNG", x, y, 70, 26);
      docp.setDrawColor(...GRIS); docp.setLineWidth(0.3);
      docp.line(x, y + 28, x + 70, y + 28);
      docp.setFontSize(8); docp.setTextColor(...GRIS); docp.setFont("helvetica", "normal");
      docp.text(label, x + 35, y + 32, { align: "center" });
    };
    addFirma("Firma del Supervisor", E.firmaSupervisor, 14);
    addFirma("Firma del Técnico Evaluado", E.firmaTecnico, W - 84);

    // Pie
    const pages = docp.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      docp.setPage(p);
      docp.setFontSize(7.5); docp.setTextColor(...GRIS); docp.setFont("helvetica", "normal");
      docp.text(`AIRTEK · Evaluación de ${E.tecnicoNombre || ""} · Pág ${p}/${pages}`,
        W / 2, docp.internal.pageSize.getHeight() - 8, { align: "center" });
    }

    const nombreArch = (E.tecnicoNombre || "Evaluacion").replace(/[^a-z0-9]/gi, "_");
    docp.save(`Evaluacion_${nombreArch}.pdf`);
  } catch (err) {
    console.error(err);
    alert("No se pudo generar el PDF: " + err.message);
  }
}
