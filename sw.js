/* Quillkeep service worker: makes the app open offline and installable.
   The app page is fetched fresh when online (so updates arrive straight away) and from the cache when offline.
   Your world is never stored here; it lives in Google Drive and in the browser's own storage. */
const CACHE = 'quillkeep-4.0-7bb30741';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('quillkeep-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // Google Drive, GitHub etc. go straight to the network
  if (url.pathname.endsWith('/config.json')) return; // always live
  const isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);
  if (isPage || url.pathname.endsWith('.html')) {
    e.respondWith(timeout(fetch(req), 4000).then(r => { if (r.ok && !url.pathname.endsWith('handout.html')) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(isPage ? './index.html' : req, cp)); } return r; })
      .catch(() => caches.match(isPage ? './index.html' : req).then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })));
});
