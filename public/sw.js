/* Service worker for the installable Deep House Lab app.
 *
 * Chrome only offers the install prompt when a service worker handles fetch,
 * so this keeps a small app-shell cache: pages come from the network first
 * (never serve a stale build), static assets are served from cache and
 * refreshed in the background.
 */

const CACHE = "dhlab-shell-v5";
const OFFLINE_URL = "/";
const PRECACHE = [OFFLINE_URL, "/DeepHouseLabLogo.png", "/pwa-icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** Audio streaming and API traffic must always go straight to the network. */
function isCacheable(request, url) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;
  if (request.headers.has("range")) return false;
  return !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/files/");
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(OFFLINE_URL, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(OFFLINE_URL);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isCacheable(event.request, url)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "New update from Deep House Lab" };
  }

  const title = data.title || "Deep House Lab";
  const options = {
    body: data.body || data.message || "A new mix is available.",
    icon: data.icon || "/pwa-icon-192.png",
    badge: data.badge || "/pwa-icon-192.png",
    data: { href: data.href || "/" },
    tag: data.tag || "dhlab-new-mix",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification?.data?.href || "/";
  const targetUrl = new URL(href, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* older browsers */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
