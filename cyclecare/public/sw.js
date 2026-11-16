/*
 * CycleCare service worker: makes the installed app work offline.
 * It only ever talks to this app's own origin and caches the app's own files.
 * No health data passes through here — the journal lives encrypted in IndexedDB.
 */
// Both values are filled in at build time by the precache plugin in vite.config.ts.
const CACHE = 'cyclecare-' + '__VERSION__';
const SHELL = /*__PRECACHE__*/ [];

// Build files have content hashes in their names, so the URL alone identifies them;
// ignoring Vary keeps a cached file usable whatever headers the host adds (e.g. `Vary: Origin`).
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // The page itself: network first, so updates arrive; cached copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./', MATCH)),
    );
    return;
  }

  // Hashed build files never change: serve from cache, fetch once.
  event.respondWith(
    caches.match(request, MATCH).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const open = clients.find((client) => 'focus' in client);
      return open ? open.focus() : self.clients.openWindow('./');
    }),
  );
});
