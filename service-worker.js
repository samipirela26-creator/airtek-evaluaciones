// service-worker.js — hace la app instalable, offline y rápida.
//
// ESTRATEGIA: "stale-while-revalidate" en los archivos propios.
// Si el archivo ya está guardado, se responde con la copia AL INSTANTE y se
// baja la versión nueva en segundo plano para la próxima vez.
//
// Antes era "network-first": cada navegación esperaba a la red aunque el
// archivo ya estuviera guardado. Eso hacía que tocar cualquier botón se
// sintiera lento, y en la calle con señal mala, lentísimo. El contenido de
// verdad (técnicos, evaluaciones, bitácoras) viene de Firestore en cada carga,
// así que el HTML y el CSS son plantillas: servirlos de la copia guardada no
// muestra datos viejos, solo la misma cáscara.
//
// ¿Y cuando sale una versión nueva? Sube CACHE una línea más abajo. Al
// instalarse, este archivo vuelve a bajar los CORE, borra la caché vieja y
// toma el control; js/firebase.js además revisa cada hora y avisa con un
// "Nueva versión disponible".
const CACHE = "gesto-v5";
const CORE = [
  "./",
  "./index.html",
  "./css/login.css",
  "./css/1-base.css",
  "./css/2-layout.css",
  "./css/3-componentes.css",
  "./css/4-pantallas.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** Baja la versión nueva y la guarda, sin hacer esperar a nadie. */
function revalidar(req) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
      }
      return res;
    })
    .catch(() => null);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Solo archivos propios. Los CDN (Firebase, Chart.js, jsPDF, las fuentes) van
  // directo a la red y los maneja la caché normal del navegador.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then((guardado) => {
      const red = revalidar(req);
      // Si ya lo tenemos, se responde al instante; la red actualiza por detrás.
      if (guardado) return guardado;
      // Primera vez: hay que esperar a la red. Si no hay señal y es una
      // navegación, al menos mostramos algo en vez de la pantalla de error.
      return red.then((res) => {
        if (res) return res;
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504, statusText: "Sin conexión" });
      });
    })
  );
});
