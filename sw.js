const CACHE = 'oma-store-v1';
/* Lo indispensable para abrir la tienda sin conexión. Lo demás (imágenes de
   cada color, capas del maniquí) se guarda la primera vez que se ve. */
const ASSETS = ['./','./index.html','./oma.css','./store-app.js','./maniqui.js','./tinte.js','./config.js','./catalogo.js',
  './renders3d.js','./admin.js','./supabase.js','./analitica.js','./analitica-config.js','./manifest.json','./fonts/fonts.css',
  './fonts/cormorant-garamond-latin-wght.woff2','./fonts/montserrat-latin-wght.woff2',
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/favicon.png',
  './marca/oma-claro.webp','./marca/oma-oscuro.webp','./marca/oma-logo-claro.webp','./marca/oma-logo-oscuro.webp',
  './maniqui/maniqui.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
/* Red primero: siempre sirve la versión publicada más reciente y guarda una
   copia para funcionar sin internet. Las llamadas a Supabase y Mercado Pago
   no se tocan, así el inventario y la configuración nunca se quedan viejos. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(url.pathname.startsWith('/.netlify/')) return;
  e.respondWith(
    fetch(req).then(res => {
      if(res && res.ok && res.type === 'basic'){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
