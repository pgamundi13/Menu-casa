/* Menú de casa — service worker */
const CACHE = 'menu-casa-v3';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // La sincronización con Supabase siempre va a la red.
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  // Navegación: red primero, caché si no hay conexión.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto: caché primero, y se refresca en segundo plano.
  e.respondWith(
    caches.match(request).then(hit => {
      const net = fetch(request).then(r => {
        if (r && r.status === 200 && (r.type === 'basic' || r.type === 'cors')) {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(request, cp));
        }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
