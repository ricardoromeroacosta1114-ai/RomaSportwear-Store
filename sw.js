const CACHE = 'roma-store-v8';
const ASSETS = ['./','./index.html','./store-app.js','./config.js','./admin.js','./supabase.js','./manifest.json','./fonts/fonts.css',
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/logo.png','./icons/logo-dark.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
/* Red primero: siempre sirve la version publicada mas reciente y guarda una copia
   para funcionar sin internet. Las llamadas a Supabase / Mercado Pago no se tocan,
   asi el catalogo y la configuracion nunca se quedan viejos. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  if(new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if(res && res.ok && res.type === 'basic'){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
