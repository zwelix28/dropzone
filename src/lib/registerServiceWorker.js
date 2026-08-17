/**
 * Registers the app-shell service worker, which is what makes the app
 * installable on Android and desktop Chrome.
 *
 * Skipped in dev so a cached shell never masks local changes. Service workers
 * also need a secure context, so this is a no-op over plain http on a LAN IP.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* Registration failures must never block the app from rendering. */
    });
  });
}
