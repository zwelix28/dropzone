/**
 * Registers the app-shell service worker, which is what makes the app
 * installable on Android and desktop Chrome.
 *
 * Skipped in dev so a cached shell never masks local changes. Service workers
 * also need a secure context, so this is a no-op over plain http on a LAN IP.
 *
 * After a deploy, the new worker activates immediately (skipWaiting + claim)
 * and this page reloads once so installed users land on the fresh build.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
      // Check for a newer sw.js on every visit so deploys are not stuck.
      void registration.update();
    }).catch(() => {
      /* Registration failures must never block the app from rendering. */
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
