// prueba-data.js
// Lógica pura del modo "Modo de prueba" (spec 004): sin DOM ni Firebase,
// para poder probarla con node --test. session.js la conecta a
// sessionStorage.
//
// A diferencia de "Ver como" (ver-como-data.js), este modo NUNCA cambia el
// uid — root conserva su propia sesión real y solo se le presta el rol.

const CLAVE_PRUEBA = "airtek_modo_prueba";

/**
 * Lee el estado guardado de "Modo de prueba" desde `storage` (sessionStorage
 * real, o un doble de prueba). Nunca lanza: sin almacenamiento disponible o
 * con un valor corrupto, se comporta como si no hubiera modo activo.
 */
export function leerPrueba(storage) {
  try {
    const guardado = storage.getItem(CLAVE_PRUEBA);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

export function escribirPrueba(storage, rol) {
  storage.setItem(CLAVE_PRUEBA, JSON.stringify({ rol }));
}

export function borrarPrueba(storage) {
  storage.removeItem(CLAVE_PRUEBA);
}

/**
 * Identidad efectiva en "Modo de prueba": mismo uid real de siempre —lo que
 * cambia es el rol con el que se lee/escribe la interfaz. `real` es siempre
 * `{ user, perfil }` —lo que ya entrega `protegerPagina`.
 *
 * `coordinadorUid` se resuelve al propio uid real cuando el rol prestado es
 * "supervisor": no existe una cuenta de coordinador de prueba separada, root
 * es su propio coordinador y su propio supervisor de prueba a la vez, así
 * que lo que crea como "supervisor" encuentra lo que creó como "coordinador".
 */
// Marca visual de datos de prueba (spec 004, RF-11): antepone "🧪 " a un
// nombre si no lo tiene ya. Es solo una ayuda humana para reconocer a simple
// vista qué es de prueba en las listas propias de root — el aislamiento real
// lo da `esPrueba` en `firestore.rules`, no este prefijo.
export function conPrefijoPrueba(nombre) {
  const n = (nombre || "").trim();
  return n.startsWith("🧪") ? n : `🧪 ${n}`;
}

export function contextoEfectivoPrueba(real, prueba) {
  return {
    uid: real.user.uid,
    perfil: {
      ...real.perfil,
      rol: prueba.rol,
      coordinadorUid:
        prueba.rol === "supervisor" ? real.user.uid : (real.perfil.coordinadorUid ?? null),
    },
    impersonando: false,
    enPrueba: true,
    real,
  };
}
