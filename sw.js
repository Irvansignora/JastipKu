const CACHE_NAME = 'jastipku-v1.6';
const ASSETS = [
  '/',
  '/index.html',
  '/admin/index.html',
  '/css/style.css',
  '/css/admin.css',
  '/js/app.js',
  '/js/admin.js',
  '/js/data.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Hanya proses request http/https (mencegah error chrome-extension)
  if (!e.request.url.startsWith('http')) return;
  
  e.respondWith(
    fetch(e.request).then(res => {
      // Jika berhasil ngambil dari internet, update cache biar selalu yang paling baru
      if (res && res.status === 200 && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => {
      // Kalau offline (atau gagal ambil jaringan), baru fallback ke cache
      return caches.match(e.request).then(cached => {
        if (cached) return cached;
        // Fallback jika tidak ada di cache (offline)
        if (e.request.destination === 'document' || e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
