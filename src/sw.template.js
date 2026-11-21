// Service worker: keeps the whole game on the device so it runs without internet.
// vite.config.ts fills in the version and the file list at build time.
const CACHE = 'krokodylove-potrubi-__VERSION__';
const FILES = '__FILES__';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

// A new version took over: drop the caches of older builds.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

// Everything the game needs is in the cache, so answer from there first.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // ignoreVary: a server's "Vary" header must not hide our own cached files
      const cached =
        (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) ??
        (request.mode === 'navigate' ? await cache.match('./', { ignoreVary: true }) : undefined);
      return cached ?? fetch(request);
    }),
  );
});
