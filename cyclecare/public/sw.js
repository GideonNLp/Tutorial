/*
 * Service worker: makes the installed app work offline.
 * It only ever talks to this app's own origin and caches the app's own files.
 * No health data passes through here — the journal lives encrypted in IndexedDB.
 */
// Both values are filled in at build time by the precache plugin in vite.config.ts.
const CACHE = 'cyclecare-' + '__VERSION__';
const SHELL = /*__PRECACHE__*/ [];

// Build files have content hashes in their names, so the URL alone identifies them;
// ignoring Vary keeps a cached file usable whatever headers the host adds (e.g. `Vary: Origin`).
const MATCH = { ignoreVary: true };
const SCOPE = new URL('./', self.location.href).href;

self.addEventListener('install', (event) => {
  // `cache: 'reload'` skips the HTTP cache, so a new version never precaches stale files.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })))));
  // No skipWaiting() here: a first install takes over at once anyway, and an update waits
  // until the person accepts it (see the message handler), so open screens never mix versions.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('cyclecare-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Live data (the partner relay) always goes to the network, never into the cache.
  if (request.cache === 'no-store' || new URL(request.url).pathname.includes('/api/')) return;

  // The page itself: the precached copy belongs to the same version as the scripts it names, so it
  // is what we serve. Other addresses (a mistyped path) go to the network and get the host's 404 page.
  if (request.mode === 'navigate') {
    const url = new URL(request.url);
    url.search = '';
    url.hash = '';
    const isApp = url.href === SCOPE || url.href === SCOPE + 'index.html';
    event.respondWith(
      isApp
        ? caches.match('./', MATCH).then((cached) => cached || fetch(request))
        : fetch(request).catch(() => caches.match('./', MATCH).then((cached) => cached || Response.error())),
    );
    return;
  }

  // Hashed build files never change: serve from cache, fetch once.
  event.respondWith(
    caches.match(request, MATCH).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
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
