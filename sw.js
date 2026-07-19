// WW4 service worker — network-first so updates show up immediately while
// still working offline as a fallback. Bump CACHE_NAME on every deploy that
// changes cached files, so old/stale caches get purged automatically.
const CACHE_NAME = 'ww4-cache-v2';
const SHELL_FILES = [
  './',
  'index.html',
  'ww4-singleplayer.html',
  'ww4-multiplayer.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(SHELL_FILES.map((f) => cache.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never cache Firebase calls — multiplayer state must always be live.
  if (req.url.includes('firebaseio.com') || req.url.includes('googleapis.com')) return;

  // Network-first: always try to get the latest version. Only fall back to
  // the cache if the network request fails (e.g. offline). This means a new
  // deploy shows up on next reload instead of being stuck behind old cache.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
