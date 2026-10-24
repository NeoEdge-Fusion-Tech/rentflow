/**
 * NeoOps Progressive Web App Service Worker
 */

const CACHE_VERSION = "neoops-v1.0.0";
const STATIC_CACHE_NAME = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `dynamic-${CACHE_VERSION}`;

// Core assets to pre-cache immediately on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// Install event: cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Failed to pre-cache some assets:", err);
      });
    }),
  );
  self.skipWaiting();
});

// Activate event: clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Helper: check if request is for static assets
function isStaticAsset(url) {
  return (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf|ico)$/i) ||
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  );
}

// Fetch event
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (mutations like POST, PUT, DELETE, PATCH must always hit network)
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension, API backend calls, and auth requests from service worker caching
  if (
    url.protocol.startsWith("chrome-extension") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/users/") ||
    url.pathname.startsWith("/inventory/") ||
    url.pathname.startsWith("/payment/") ||
    url.pathname.startsWith("/events/") ||
    url.pathname.startsWith("/clients/") ||
    url.pathname.startsWith("/stats/")
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages) -> Network-first with cache and offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, try cached page first, then cached root index.html, then offline.html
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          const rootCached = await caches.match("/index.html");
          if (rootCached) return rootCached;

          const offlinePage = await caches.match("/offline.html");
          if (offlinePage) return offlinePage;

          return new Response("Offline", {
            status: 503,
            statusText: "Offline",
          });
        }),
    );
    return;
  }

  // 2. Static assets (JS, CSS, images, fonts) -> Stale-While-Revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
    return;
  }

  // 3. All other GET requests -> Network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request)),
  );
});

// Listen for message events (e.g. update triggered from UI)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
