/* =========================================================
   MONTHLY PLANNER — offline service worker
   Cache-first with stale-while-revalidate, same-origin only:
   Google Identity / Calendar / Drive / Docs requests always go
   straight to the network.
   Bump CACHE when the shell changes so old copies are dropped.
   ========================================================= */
const CACHE = 'mp27-v12';

/* the whole app is these six files (the fonts live inside index.html) */
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* stale-while-revalidate: answer from cache at once, refresh in the background */
async function handle(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });

  const refresh = fetch(request)
    .then(response => {
      if (response && response.ok) {
        return cache.put(request, response.clone()).then(() => response);
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const fresh = await refresh;
  if (fresh) return fresh;

  /* offline and never cached: a navigation still opens the planner shell */
  if (request.mode === 'navigate') {
    const shell = await cache.match('./index.html');
    if (shell) return shell;
  }
  return new Response('오프라인 상태입니다.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // Google Fonts etc. go straight to the network
  if (url.pathname.endsWith('/sw.js')) return;       // never serve the worker from its own cache

  event.respondWith(handle(request));
});
