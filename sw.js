/* FPF Arcade offline cache.
   The game is one self-contained HTML file with its fonts inlined, so caching
   that file plus the icons is enough to make the installed app work with no
   network at all. Bump CACHE when tvm-arcade.html changes: the new worker
   deletes older caches on activate, so a reopened app picks the new build up. */
const CACHE = "fpf-arcade-v7";
const ASSETS = [
  "tvm-arcade.html",
  "arcade.webmanifest",
  "assets/arcade-icon-180.png",
  "assets/arcade-icon-192.png",
  "assets/arcade-icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network-first so a redeploy is picked up while online, falling back to the
   cache the moment the phone is offline. Only same-origin GETs are handled. */
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match("tvm-arcade.html")))
  );
});
