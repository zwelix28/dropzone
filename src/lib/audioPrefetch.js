/**
 * Lightweight standby <audio> warmers so the next mix/preview can buffer
 * without touching the active player element or changing playback APIs.
 */

const MAX_WARM = 6;
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

/** Append #t=seconds so browsers that support media fragments can Range-request mid-file. */
export function withMediaTimeFragment(url, sec) {
  if (!url || typeof url !== "string") return url;
  const t = Math.floor(Number(sec) || 0);
  if (!Number.isFinite(t) || t < 1) return String(url).split("#")[0];
  return `${String(url).split("#")[0]}#t=${t}`;
}

/**
 * Start (or keep) buffering a URL for mixId.
 * Optional seekSec warms near a resume point (metadata seek, no audible play).
 */
export function warmPlaybackUrl(mixId, url, { seekSec = 0 } = {}) {
  if (!mixId || !url || typeof Audio === "undefined") return;
  const wantSeek = Number(seekSec) > 5;
  const warmUrl = wantSeek ? withMediaTimeFragment(url, seekSec) : String(url).split("#")[0];

  const existing = warmers.get(mixId);
  if (existing) {
    const current = (existing.currentSrc || existing.src || "").split(/[?#]/)[0];
    const next = String(url).split(/[?#]/)[0];
    if (current && current === next) {
      if (wantSeek) {
        const armSeek = () => {
          try {
            if (existing.readyState >= 1) existing.currentTime = Number(seekSec) || 0;
          } catch {
            /* ignore */
          }
        };
        if (existing.readyState >= 1) armSeek();
        else existing.addEventListener("loadedmetadata", armSeek, { once: true });
      }
      return;
    }
    disposeAudio(existing);
    warmers.delete(mixId);
  }

  const audio = new Audio();
  audio.preload = "auto";
  audio.src = warmUrl;
  if (wantSeek) {
    const armSeek = () => {
      try {
        audio.currentTime = Number(seekSec) || 0;
      } catch {
        /* ignore */
      }
    };
    audio.addEventListener("loadedmetadata", armSeek, { once: true });
  }
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
