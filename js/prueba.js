// prueba.js — "Modo de prueba" (spec 004): deja que root se preste el rol
// de coordinador o supervisor, con su propia sesión real, para crear datos
// inventados y probar flujos completos sin tocar cuentas reales.
import { activarModoPrueba, salirDeModoPrueba } from "./session.js";

const ETIQUETA_ROL = { coordinador: "Coordinador", supervisor: "Supervisor" };

// Pinta los dos botones de activación dentro de `contenedor`. Debe llamarse
// solo cuando quien mira la pantalla es root (RF-1) — este módulo no lo
// vuelve a comprobar.
export function montarSelectorPrueba(contenedor) {
  if (!contenedor) return;
  contenedor.innerHTML = `
    <div class="btn-row">
      <button class="btn secundario" id="prueba-btn-coordinador">🧪 Actuar como coordinador</button>
      <button class="btn secundario" id="prueba-btn-supervisor">🧪 Actuar como supervisor</button>
    </div>`;

  const activar = async (rol) => {
    // Se espera el registro de auditoría (RF-13) antes de recargar: si no,
    // la petición puede quedar cancelada por la propia recarga de la página.
    await activarModoPrueba(rol);
    location.reload();
  };
  document.getElementById("prueba-btn-coordinador").addEventListener("click", () => activar("coordinador"));
  document.getElementById("prueba-btn-supervisor").addEventListener("click", () => activar("supervisor"));
}

// Pinta el aviso fijo de "Modo de prueba" justo debajo de la topbar, en
// cualquier página. Lo llama session.js (protegerPagina) cuando hay modo
// activo — nunca hace falta llamarlo a mano desde una página. Clase propia
// (.banner-modo-prueba) para nunca colisionar ni confundirse visualmente con
// el banner de "Ver como" (.banner-ver-como).
export function montarAvisoPrueba(prueba) {
  if (document.querySelector(".banner-modo-prueba")) return; // ya está pintado
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const rolLabel = ETIQUETA_ROL[prueba.rol] || prueba.rol;
  const banner = document.createElement("div");
  banner.className = "banner-modo-prueba";
  banner.innerHTML = `
    <span>🧪 Modo de prueba activo — actuando como <strong>${rolLabel}</strong></span>
    <button type="button" id="btn-salir-modo-prueba">Salir del modo de prueba</button>`;
  topbar.insertAdjacentElement("afterend", banner);

  document.getElementById("btn-salir-modo-prueba").addEventListener("click", async () => {
    // Igual que al activar: se espera el registro de cierre (RF-14) antes
    // de navegar, para que la escritura no quede cancelada por la propia
    // navegación.
    await salirDeModoPrueba();
    location.href = "panel.html";
  });
}
