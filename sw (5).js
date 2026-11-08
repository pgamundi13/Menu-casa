/* Menu at Home — service worker */
const CACHE = 'menu-at-home-v7';

const SHELL = ['./', './index.html', './app.js', './manifest.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })))))   // straight from the server, never a stale copy
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
  const host = url.hostname;

  // Live data never goes through this cache: the Realtime Database, Google APIs,
  // and the old Supabase project used by the one-off import.
  // (The app keeps its own copy of the data for when there's no signal.)
  const live = (host.endsWith('googleapis.com') && host !== 'fonts.googleapis.com')
    || host.endsWith('firebaseio.com') || host.endsWith('firebasedatabase.app') || host.endsWith('firebaseapp.com') || host.endsWith('supabase.co');
  if (live) return;

  // The app, its manifest and icons: network first so updates arrive, cache when offline.
  if (request.mode === 'navigate' || /(app\.js|manifest\.json|\.png)$/.test(url.pathname)) {
    e.respondWith(
      fetch(request)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(request, cp)); return r; })
        .catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Everything else (icons, fonts, the versioned Firebase SDK): cache first.
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
