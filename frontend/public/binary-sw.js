// Binary Trading Service Worker
// PERFORMANCE: Caches static assets for faster loading and offline capability

const CACHE_NAME = "binary-trading-v1";
const STATIC_CACHE_NAME = "binary-static-v1";
const DYNAMIC_CACHE_NAME = "binary-dynamic-v1";

// Static assets to cache immediately
const STATIC_ASSETS = [
  // Chart library assets
  "/fonts/inter-var.woff2",
  "/fonts/mono.woff2",
];

// URL patterns to cache dynamically
const CACHE_PATTERNS = {
  // Chart data - cache with network-first strategy
  chartData: /\/api\/v1\/(candles|klines|ohlc)/,
  // Static assets - cache with cache-first strategy
  static: /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|ico)$/,
  // API endpoints - cache with stale-while-revalidate
  api: /\/api\/v1\/(markets|symbols|tickers)/,
};

// Maximum cache sizes
const MAX_CACHE_ITEMS = {
  dynamic: 100,
  chartData: 50,
};

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  chartData: 5 * 60 * 1000, // 5 minutes
  api: 30 * 1000, // 30 seconds
  static: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ============================================================================
// SERVICE WORKER LIFECYCLE
// ============================================================================

self.addEventListener("install", (event) => {
  console.log("[Binary SW] Installing...");
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log("[Binary SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS.filter(url => {
        // Only cache assets that exist
        return true;
      })).catch(err => {
        console.warn("[Binary SW] Failed to cache some static assets:", err);
      });
    })
  );
  // Take control immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[Binary SW] Activating...");
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith("binary-") &&
                name !== CACHE_NAME &&
                name !== STATIC_CACHE_NAME &&
                name !== DYNAMIC_CACHE_NAME
              );
            })
            .map((name) => {
              console.log("[Binary SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// ============================================================================
// FETCH STRATEGIES
// ============================================================================

/**
 * Cache-first strategy for static assets
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error("[Binary SW] Cache-first failed:", error);
    throw error;
  }
}

/**
 * Network-first strategy for dynamic data
 */
async function networkFirst(request, cacheName = DYNAMIC_CACHE_NAME) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log("[Binary SW] Network failed, trying cache:", request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Stale-while-revalidate strategy for API data
 */
async function staleWhileRevalidate(request, cacheName = DYNAMIC_CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await caches.match(request);

  // Fetch in background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.error("[Binary SW] Background fetch failed:", error);
      return null;
    });

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Otherwise wait for network
  return fetchPromise;
}

/**
 * Limit cache size
 */
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    // Delete oldest items
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// ============================================================================
// FETCH EVENT HANDLER
// ============================================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  // Only handle same-origin requests and allowed CDNs
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Match against patterns and apply appropriate strategy
  if (CACHE_PATTERNS.static.test(url.pathname)) {
    // Static assets - cache first
    event.respondWith(cacheFirst(request));
    return;
  }

  if (CACHE_PATTERNS.chartData.test(url.pathname)) {
    // Chart data - network first with cache fallback
    event.respondWith(
      networkFirst(request, DYNAMIC_CACHE_NAME).then((response) => {
        limitCacheSize(DYNAMIC_CACHE_NAME, MAX_CACHE_ITEMS.chartData);
        return response;
      })
    );
    return;
  }

  if (CACHE_PATTERNS.api.test(url.pathname)) {
    // API data - stale while revalidate
    event.respondWith(
      staleWhileRevalidate(request, DYNAMIC_CACHE_NAME).then((response) => {
        limitCacheSize(DYNAMIC_CACHE_NAME, MAX_CACHE_ITEMS.dynamic);
        return response;
      })
    );
    return;
  }
});

// ============================================================================
// MESSAGE HANDLER (for communication with main thread)
// ============================================================================

self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case "CLEAR_CACHE":
      event.waitUntil(
        Promise.all([
          caches.delete(CACHE_NAME),
          caches.delete(STATIC_CACHE_NAME),
          caches.delete(DYNAMIC_CACHE_NAME),
        ]).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;

    case "CLEAR_DYNAMIC_CACHE":
      event.waitUntil(
        caches.delete(DYNAMIC_CACHE_NAME).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;

    case "GET_CACHE_STATS":
      event.waitUntil(
        Promise.all([
          caches.open(STATIC_CACHE_NAME).then((c) => c.keys()),
          caches.open(DYNAMIC_CACHE_NAME).then((c) => c.keys()),
        ]).then(([staticKeys, dynamicKeys]) => {
          event.ports[0]?.postMessage({
            staticCount: staticKeys.length,
            dynamicCount: dynamicKeys.length,
          });
        })
      );
      break;

    case "PREFETCH":
      // Prefetch URLs in the background
      if (payload?.urls && Array.isArray(payload.urls)) {
        event.waitUntil(
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            return Promise.allSettled(
              payload.urls.map((url) =>
                fetch(url).then((response) => {
                  if (response.ok) {
                    return cache.put(url, response);
                  }
                })
              )
            );
          })
        );
      }
      break;

    default:
      console.log("[Binary SW] Unknown message type:", type);
  }
});

console.log("[Binary SW] Service worker loaded");
