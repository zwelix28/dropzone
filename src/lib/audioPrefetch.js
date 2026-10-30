/**
 * Lightweight standby <audio> warmers so the next mix/preview can buffer
 * without touching the active player element or changing playback APIs.
 */

const MAX_WARM = 4;
/** @type {Map<string, HTMLAudioElement>} */
const warmers = new Map();

function disposeAudio(audio) {
  if (!audio) return;
  try {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  } catch {
    // ignore
  }
}

/** Start (or keep) buffering a URL for mixId. Safe no-op in SSR / missing Audio. */
export function warmPlaybackUrl(mixId, url) {
  if (!mixId || !url || typeof Audio === "undefined") return;
  const existing = warmers.get(mixId);
  if (existing) {
    const current = (existing.currentSrc || existing.src || "").split(/[?#]/)[0];
    const next = String(url).split(/[?#]/)[0];
    if (current && current === next) return;
    disposeAudio(existing);
    warmers.delete(mixId);
  }

  const audio = new Audio();
  audio.preload = "auto";
  audio.src = url;
  warmers.set(mixId, audio);

  while (warmers.size > MAX_WARM) {
    const oldest = warmers.keys().next().value;
    if (!oldest || oldest === mixId) break;
    disposeAudio(warmers.get(oldest));
    warmers.delete(oldest);
  }
}

export function releaseWarmPlayback(mixId) {
  if (!mixId || !warmers.has(mixId)) return;
  disposeAudio(warmers.get(mixId));
  warmers.delete(mixId);
}

export function clearWarmPlayback() {
  for (const audio of warmers.values()) disposeAudio(audio);
  warmers.clear();
}
