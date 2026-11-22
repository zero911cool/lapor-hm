// Service worker: menyimpan file aplikasi di HP supaya bisa dibuka tanpa sinyal.
// Naikkan nomor versi setiap kali file aplikasi diubah.
const CACHE = 'lapor-hm-v4';
const ASSETS = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Ambil dari simpanan HP dulu (cepat, jalan tanpa sinyal), lalu perbarui di belakang layar.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Hanya file aplikasi yang disimpan; permintaan data selalu langsung ke server
  const scope = new URL(self.registration.scope);
  const rel = './' + url.pathname.slice(scope.pathname.length);
  if (e.request.mode !== 'navigate' && !ASSETS.includes(rel)) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request)
        .then((r) => { if (r && r.ok) c.put(e.request, r.clone()); return r; })
        .catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || (await c.match('./index.html')) || Response.error();
    })
  );
});
