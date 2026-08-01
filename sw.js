/* Menú de casa — service worker */
const CACHE = 'menu-casa-v8';

const SHELL = ['./','./index.html','./app.js','./manifest.json',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Supabase (incluido el WebSocket de Realtime) siempre va a la red.
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  // La app: red primero, para coger siempre la última versión.
  if (request.mode === 'navigate' || url.pathname.endsWith('app.js')) {
    e.respondWith(
      fetch(request)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(request, cp)); return r; })
        .catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Resto: caché primero y refresco en segundo plano.
  e.respondWith(caches.match(request).then(hit => {
    const net = fetch(request).then(r => {
      if (r && r.status === 200 && (r.type === 'basic' || r.type === 'cors')) {
        const cp = r.clone(); caches.open(CACHE).then(c => c.put(request, cp));
      }
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
