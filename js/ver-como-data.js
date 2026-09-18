// ver-como-data.js
// Lógica pura del modo "Ver como" (spec 003): sin DOM ni Firebase, para
// poder probarla con node --test. session.js la conecta a sessionStorage.

const CLAVE_VER_COMO = "airtek_ver_como";

/**
 * Lee el estado guardado de "Ver como" desde `storage` (sessionStorage real,
 * o un doble de prueba). Nunca lanza: sin almacenamiento disponible o con un
 * valor corrupto, se comporta como si no hubiera modo activo.
 */
export function leerVerComo(storage) {
  try {
    const guardado = storage.getItem(CLAVE_VER_COMO);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

export function escribirVerComo(storage, uidObjetivo, perfilObjetivo) {
  storage.setItem(
    CLAVE_VER_COMO,
    JSON.stringify({
      uid: uidObjetivo,
      nombre: perfilObjetivo.nombre,
      rol: perfilObjetivo.rol,
    })
  );
}

export function borrarVerComo(storage) {
  storage.removeItem(CLAVE_VER_COMO);
}

/**
 * Identidad efectiva: la de "Ver como" si hay una guardada (`verComo`, lo
 * que devuelve `leerVerComo`); si no, la real. `real` es siempre
 * `{ user, perfil }` —lo que ya entrega `protegerPagina`— y se conserva en
 * el resultado para auditoría y para no atribuir mal ninguna escritura.
 */
export function contextoEfectivo(real, verComo) {
  if (!verComo) {
    return { uid: real.user.uid, perfil: real.perfil, impersonando: false, real };
  }
  return {
    uid: verComo.uid,
    perfil: { nombre: verComo.nombre, rol: verComo.rol },
    impersonando: true,
    real,
  };
}
