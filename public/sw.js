/* Service worker de Churri-doku: el juego funciona sin conexión.
 * - Páginas: primero la red (para tener siempre la última versión) y, si no hay, la copia guardada.
 * - Código (assets con hash): de la caché; se renueva con cada versión publicada.
 * - Imágenes y fuentes: de la caché al instante y, por detrás, se renuevan (así un retrato
 *   corregido llega en la siguiente visita). «Descargar todo» las guarda de golpe.
 * - Los PDF y el ZIP no se guardan (pesan demasiado). */
const BUILD = '__BUILD__';
const SHELL = `churri-shell-${BUILD}`;
const MEDIA = 'churri-media-v1';
const DATA = 'churri-data-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './manifest.webmanifest', './favicon.svg', './icons/icon-192.png'])).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('churri-shell-') && k !== SHELL).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await cache.match('./');
      if (shell) return shell;
    }
    throw new Error('sin conexión');
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const update = fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || update;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/downloads/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('.json')) event.respondWith(networkFirst(req, DATA));
    else if (url.pathname.includes('/assets/')) event.respondWith(cacheFirst(req, SHELL));
    else if (url.pathname.includes('/img/') || url.pathname.includes('/icons/')) event.respondWith(staleWhileRevalidate(req, MEDIA));
    else event.respondWith(staleWhileRevalidate(req, SHELL));
    return;
  }
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') event.respondWith(staleWhileRevalidate(req, MEDIA));
});

// «Descargar todo para jugar sin conexión»: la página manda la lista de archivos.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'precache') return;
  const urls = event.data.urls || [];
  event.waitUntil((async () => {
    const cache = await caches.open(MEDIA);
    let done = 0;
    for (const u of urls) {
      try {
        if (!(await cache.match(u))) {
          const res = await fetch(u);
          if (res.ok) await cache.put(u, res);
        }
      } catch { /* seguir con el resto */ }
      done++;
      if (done % 10 === 0 || done === urls.length) event.source?.postMessage({ type: 'precache-progress', done, total: urls.length });
    }
  })());
});
