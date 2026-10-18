// service-worker.js — hace la app instalable, offline y rápida.
//
// ESTRATEGIA: distinta para la página y para lo que la página carga.
//
//   - PÁGINAS (.html): la red primero, la copia guardada como respaldo.
//     Una página pesa unos pocos KB; esperar por ella no se siente. Y así,
//     cuando se despliega algo nuevo, se ve enseguida.
//
//   - TODO LO DEMÁS (css, js, iconos): la copia guardada AL INSTANTE, y la
//     versión nueva se baja por detrás para la próxima. Acá es donde estaba
//     el peso de verdad: cuatro hojas de estilo y una veintena de módulos.
//
// Antes TODO era "network-first" y cada navegación esperaba a la red aunque
// ya tuviera el archivo: tocar cualquier botón se sentía lento, y en la calle
// con señal mala, lentísimo.
//
// Después pasé TODO a "copia primero", HTML incluido, y eso estuvo mal: tras
// cada despliegue la primera visita mostraba la página vieja. De ahí esta
// mezcla, que es la que corresponde.
//
// Al subir CACHE una línea más abajo, al instalarse se vuelven a bajar los
// CORE y se borra la caché anterior; js/firebase.js además revisa cada hora y
// avisa con un "Nueva versión disponible".
const CACHE = "gesto-v8";
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

  // Una página siempre se pide a la red: es chica y así lo nuevo se ve ya.
  // Sin señal, se cae a la copia guardada.
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      revalidar(req).then(
        (res) => res || caches.match(req).then((g) => g || caches.match("./index.html"))
      )
    );
    return;
  }

  // El resto (css, js, iconos): la copia al instante si la hay.
  e.respondWith(
    caches.match(req).then((guardado) => {
      if (guardado) {
        revalidar(req); // se actualiza por detrás, sin hacer esperar
        return guardado;
      }
      return revalidar(req).then(
        (res) => res || new Response("", { status: 504, statusText: "Sin conexión" })
      );
    })
  );
});
