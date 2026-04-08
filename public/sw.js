// Off-Grid Chat Service Worker — v1
// Offline-first with Network-falling-back-to-cache strategy

const CACHE_NAME = "offgrid-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Skip non-GET and chrome-extension
  if (event.request.method !== "GET") return;
  if (event.request.url.startsWith("chrome-extension")) return;
  if (event.request.url.includes("firestore.googleapis.com")) return; // Don't cache Firebase

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Cache successful responses
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Background sync for queued messages
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Messages are synced via BroadcastChannel when connection resumes
  const clients = await self.clients.matchAll();
  clients.forEach((client) => client.postMessage({ type: "sync-ready" }));
}
