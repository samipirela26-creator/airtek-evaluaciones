// novedades.js — Aviso de "qué cambió" la primera vez que alguien entra
// después de una actualización.
//
// CÓMO AGREGAR UNA ENTREGA NUEVA:
//   1. Mete una entrada arriba del arreglo VERSIONES (la más nueva primero).
//   2. Escribe los cambios por rol, en lenguaje de usuario: qué puede hacer
//      ahora que antes no podía. No pongas nombres de archivos ni de funciones;
//      esto lo lee un supervisor en su teléfono, no un programador.
//   3. Ya está. El aviso sale solo.
//
// Se recuerda en el navegador (localStorage), igual que el borrador de
// evaluaciones. Quien use teléfono y computadora lo verá una vez en cada uno,
// que para un aviso de novedades está bien.

const CLAVE = "airtek_novedades_vistas";

/**
 * Cada versión: { version, fecha, titulo, cambios: { rol: [...] } }
 * Los roles son "supervisor", "coordinador" y "root". Lo que va en "todos"
 * lo ve cualquiera.
 */
export const VERSIONES = [
  {
    version: "2.2.1",
    fecha: "2026-09-16",
    titulo: "Categorías desplegables en el Inventario",
    cambios: {
      todos: [
        "En el <strong>Inventario de Técnicos</strong>, las categorías de herramientas y de materiales (Básicas, Equipos de Prueba, Kit GPON, etc.) ahora se abren y cierran a demanda: tocás la que necesitás y solo esa se despliega, en vez de scrollear la lista completa.",
      ],
    },
  },
  {
    version: "2.2.0",
    fecha: "2026-09-16",
    titulo: "Ficha del supervisor más ordenada",
    cambios: {
      coordinador: [
        "La ficha de un supervisor ahora se organiza en <strong>pestañas</strong> (Técnicos, Planillas, Bitácora, Evaluaciones) en vez de una lista larga que había que scrollear entera.",
        "En la pestaña Bitácora, cada actividad se ve resumida y <strong>se despliega al tocarla</strong>, en vez de mostrar toda la descripción de una vez.",
        "Cuando hay muchas planillas, bitácoras o evaluaciones, se muestran las primeras y un botón <strong>\"Ver más\"</strong> para el resto.",
        "El menú de acciones del panel ahora separa las <strong>herramientas de gestión</strong> (métricas, tablero, inventario) de las <strong>acciones administrativas</strong> (crear supervisor, invitar, editar formulario).",
        "En pantallas grandes el panel aprovecha mejor el ancho, en vez de quedar angosto en el centro.",
      ],
      supervisor: [
        "\"Mis evaluaciones realizadas\" ahora muestra las más recientes con un botón <strong>\"Ver más\"</strong> en vez de toda la lista de una vez.",
      ],
    },
  },
  {
    version: "2.1.0",
    fecha: "2026-09-16",
    titulo: "Corregir nombres mal escritos",
    cambios: {
      coordinador: [
        "Ya puedes <strong>corregir el nombre de un supervisor</strong>: entra a su ficha y pulsa \"✏️ Corregir nombre\". Antes había que borrarlo y crearlo de nuevo, perdiendo su historial.",
        "La corrección se aplica también a <strong>lo que ya estaba registrado</strong>: sus evaluaciones, bitácoras, técnicos e inventarios. Así el nombre viejo no sigue apareciendo en los tableros ni en los reportes.",
        "Antes de guardar te dice cuántos registros va a corregir, y al terminar te dice cuántos corrigió.",
      ],
      supervisor: [
        "Al corregir el nombre de un técnico con el lápiz ✏️, ahora se corrige también en sus evaluaciones anteriores y en su inventario. Antes los PDF ya guardados conservaban el nombre viejo.",
      ],
    },
  },
  {
    version: "2.0.0",
    fecha: "2026-09-16",
    titulo: "Bitácora con métricas e inventario de técnicos",
    cambios: {
      // Lo de "todos" lo leen supervisores y coordinadores por igual, así que
      // va en tercera persona: el coordinador no registra bitácoras.
      todos: [
        "Las bitácoras ahora guardan <strong>la fecha en que comenzó</strong> la actividad. Si la jornada cruzó la medianoche, cuenta completa en el día en que arrancó.",
        "Las fotos de las bitácoras pesan ahora la mitad: suben más rápido y gastan menos datos.",
      ],
      supervisor: [
        "Nuevo módulo <strong>📦 Inventario de Técnicos</strong> en tu panel: registra las herramientas de cada técnico con cuántas tiene buenas, regulares y malas.",
        "También registras las <strong>entregas de material de uso diario</strong>, con su fecha, para llevar el consumo.",
        "En herramientas, escribir <strong>0</strong> no es lo mismo que dejar el campo en blanco: el 0 significa \"lo revisé y no tiene\", y así lo ve tu coordinador.",
      ],
      coordinador: [
        "Nuevo <strong>📋 Tablero de Bitácora</strong>: las actividades de todos tus supervisores juntas, con filtros por fecha, supervisor y zona.",
        "Puedes <strong>exportar todo a Excel</strong> desde ese tablero, no supervisor por supervisor.",
        "Gráficas del tipo de actividad, de las que más horas consumen, y de las horas por supervisor y por nodo.",
        "Nuevo <strong>🧰 Requerimiento de Herramientas</strong>: cuántas hay buenas, regulares y malas entre todos los técnicos, para sustentar las solicitudes de reposición. También se exporta.",
        "El \"Tablero de eficiencia\" ahora se llama <strong>Métricas de Gestión de Personal</strong>.",
      ],
      root: [
        "El <strong>respaldo</strong> ahora incluye las bitácoras y los inventarios, que antes se quedaban fuera. Te pregunta si quieres las fotos: con ellas el archivo queda completo pero pesa bastante más.",
      ],
    },
  },
];

/** La entrega más reciente, o null si no hay ninguna declarada. */
export function ultimaVersion() {
  return VERSIONES[0] || null;
}

/** Cambios que le tocan a este rol: los de "todos" más los suyos. */
export function cambiosPara(version, rol) {
  if (!version) return [];
  const c = version.cambios || {};
  return [...(c.todos || []), ...(c[rol] || [])];
}

/** ¿Ya vio esta versión en este navegador? */
export function yaLaVio(version) {
  if (!version) return true;
  try {
    return localStorage.getItem(CLAVE) === version.version;
  } catch {
    // Navegación privada o almacenamiento bloqueado: se prefiere no molestar
    // a mostrar el mismo aviso en cada carga.
    return true;
  }
}

export function marcarComoVista(version) {
  if (!version) return;
  try {
    localStorage.setItem(CLAVE, version.version);
  } catch {}
}

/**
 * Pinta el aviso dentro de `contenedor` si toca. Devuelve true si lo mostró.
 * No hace nada si el rol no tiene cambios que le interesen.
 */
export function mostrarNovedades(contenedor, rol, { esc = (s) => s } = {}) {
  const v = ultimaVersion();
  if (!contenedor || !v || yaLaVio(v)) return false;

  const cambios = cambiosPara(v, rol);
  if (!cambios.length) {
    // Nada que contarle a este rol: se marca como vista igual, para que no
    // quede pendiente y le salte con la próxima entrega.
    marcarComoVista(v);
    return false;
  }

  contenedor.style.display = "block";
  contenedor.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div>
        <h2 style="margin:0 0 4px">✨ ${esc(v.titulo)}</h2>
        <p class="meta" style="margin:0">Esto es lo que cambió en esta actualización.</p>
      </div>
      <button class="btn secundario" id="btn-cerrar-novedades"
              style="padding:8px 16px;font-size:.9rem">Entendido</button>
    </div>
    <ul style="margin:14px 0 0;padding-left:20px;line-height:1.6">
      ${cambios.map((c) => `<li style="margin-bottom:6px">${c}</li>`).join("")}
    </ul>`;

  document.getElementById("btn-cerrar-novedades").addEventListener("click", () => {
    marcarComoVista(v);
    contenedor.style.display = "none";
  });
  return true;
}
