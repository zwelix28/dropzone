/**
 * Registers the app-shell service worker, which is what makes the app
 * installable on Android and desktop Chrome.
 *
 * Skipped in dev so a cached shell never masks local changes. Service workers
 * also need a secure context, so this is a no-op over plain http on a LAN IP.
 *
 * After a deploy, the new worker activates immediately (skipWaiting + claim)
 * and this page reloads once so installed users land on the fresh build.
 *
 * While the installed app stays open, we also re-check for updates when the
 * window is focused / becomes visible again, plus a light periodic poll.
 */

const UPDATE_CHECK_MIN_MS = 60_000;
const UPDATE_POLL_MS = 30 * 60_000;

function markPlayingSessionForResume() {
  try {
    const playing = Array.from(document.querySelectorAll("audio")).some(
      (el) => el && !el.paused && !el.ended && el.currentSrc,
    );
    if (!playing) return;
    const raw = localStorage.getItem("dhl-player-session");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    localStorage.setItem(
      "dhl-player-session",
      JSON.stringify({ ...parsed, wasPlaying: true, updatedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    let registration = null;
    let lastUpdateCheckAt = 0;
    let refreshing = false;

    const checkForUpdates = () => {
      if (!registration?.update) return;
      const now = Date.now();
      if (now - lastUpdateCheckAt < UPDATE_CHECK_MIN_MS) return;
      lastUpdateCheckAt = now;
      void registration.update().catch(() => {
        /* Offline / transient failures are fine — try again next focus. */
      });
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        registration = reg;
        // Check for a newer sw.js on every visit so deploys are not stuck.
        checkForUpdates();
      })
      .catch(() => {
        /* Registration failures must never block the app from rendering. */
      });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      markPlayingSessionForResume();
      refreshing = true;
      window.location.reload();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdates();
    });

    window.addEventListener("focus", () => {
      checkForUpdates();
    });

    // Light poll while the installed app stays open for a long session.
    window.setInterval(() => {
      if (document.visibilityState === "visible") checkForUpdates();
    }, UPDATE_POLL_MS);
  });
}
