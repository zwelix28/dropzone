/**
 * Registers the app-shell service worker, which is what makes the app
 * installable on Android and desktop Chrome.
 *
 * Skipped in dev so a cached shell never masks local changes. Service workers
 * also need a secure context, so this is a no-op over plain http on a LAN IP.
 *
 * After a deploy, the new worker is activated immediately and the page reloads
 * once so installed users land on the fresh build instead of a stale shell.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Ask the browser to check for a newer sw.js on every load.
        void registration.update();

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // A new worker is ready; skipWaiting already ran in sw.js.
              // Reload once so clients pick up the new assets.
              if (sessionStorage.getItem("dhlab-sw-reloaded") === "1") return;
              sessionStorage.setItem("dhlab-sw-reloaded", "1");
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {
        /* Registration failures must never block the app from rendering. */
      });

    // Clear the one-shot reload guard after a successful boot with a controller.
    if (navigator.serviceWorker.controller) {
      sessionStorage.removeItem("dhlab-sw-reloaded");
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
