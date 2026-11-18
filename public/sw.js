// Service worker for the installed app (PWA).
// - Pages: network first, so a new deploy shows up on the next open; the cached copy is used offline.
// - Libraries and fonts from CDNs (versioned URLs): served from cache, refreshed in the background.
// - /api/* (Gemini), /__/* (Google sign-in) and Firebase traffic are never touched: they must stay live.
//   Firestore keeps its own offline copy of the data (enablePersistence).
const VERSION = 'v1';
const SHELL = `vtct-shell-${VERSION}`;
const RUNTIME = `vtct-runtime-${VERSION}`;
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon.svg'];
const CDN_HOSTS = new Set(['cdn.jsdelivr.net', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com']);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('vtct-') && k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put('/', res.clone());
    return res;
  } catch (e) {
    return (await cache.match('/')) || Response.error();
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(event.request);
  const fresh = fetch(event.request).then(res => {
    if (res.ok || res.type === 'opaque') cache.put(event.request, res.clone());
    return res;
  });
  if (cached) { event.waitUntil(fresh.catch(() => {})); return cached; }
  return fresh;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/__/')) return;
    if (req.mode === 'navigate') { if (url.pathname === '/' || url.pathname === '/index.html') event.respondWith(networkFirst(req)); return; }
    event.respondWith(staleWhileRevalidate(event));
    return;
  }
  if (CDN_HOSTS.has(url.hostname)) event.respondWith(staleWhileRevalidate(event));
});
