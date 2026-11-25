const CACHE_NAME = "rate-gpt-shell-v12";
const OFFLINE_URL = "/offline.html";
const CSS_REQUEST = (url) => new Request(url, {
  headers: { Accept: "text/css,*/*;q=0.1" }
});
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  CSS_REQUEST("/style/base.css"),
  CSS_REQUEST("/style/theme.css"),
  CSS_REQUEST("/style/offline.css"),
  "/script/theme.js",
  "/Images/Logo.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("rate-gpt-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache live prices, weather, contact, or any API response.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const copy = response.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, copy);
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL)))
    );
    return;
  }

  if (/\.(?:css|js|mjs|webp|png|jpg|jpeg|svg|woff2?|webmanifest)$/i.test(url.pathname)) {
    const cachedResponse = caches.match(request);
    const networkResponse = fetch(request).then(async (response) => {
      const isStylesheet = url.pathname.endsWith(".css");
      const hasExpectedContentType = response.headers.get("content-type")?.startsWith("text/css");
      if (response.ok && (!isStylesheet || hasExpectedContentType)) {
        const copy = response.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, copy);
      }
      return response;
    });
    event.waitUntil(networkResponse.then(() => undefined).catch(() => undefined));
    event.respondWith(cachedResponse.then((cached) => cached || networkResponse));
  }
});
