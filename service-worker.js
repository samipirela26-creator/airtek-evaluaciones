// service-worker.js — hace la app instalable y offline.
// Estrategia "network-first" en archivos propios: cuando hay internet SIEMPRE
// trae lo más nuevo (adiós al problema del caché / Ctrl+Shift+R); si no hay
// señal, responde desde la copia guardada.
const CACHE = "airtek-v1";
const CORE = [
  "./",
  "./index.html",
  "./css/styles.css",
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

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Solo manejamos archivos propios. Los CDNs (Firebase, Chart.js, jsPDF) van directo a la red.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});
