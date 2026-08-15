/**
 * OS / browser now-playing (lock screen, Control Center, Android media
 * notification). Without this, mobile often shows the raw audio URL.
 */

import { DEFAULT_MIX_ARTWORK, resolveMixArtwork } from "../constants/artwork.js";

const ARTWORK_SIZES = [96, 128, 192, 256, 384, 512];

function mediaSessionAvailable() {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

function absoluteArtworkUrl(coverUrl) {
  const raw = resolveMixArtwork(coverUrl);
  const fallback =
    typeof window !== "undefined"
      ? new URL(DEFAULT_MIX_ARTWORK, window.location.origin).href
      : DEFAULT_MIX_ARTWORK;
  if (!raw) return fallback;
  try {
    return new URL(raw, typeof window !== "undefined" ? window.location.origin : undefined).href;
  } catch {
    return raw || fallback;
  }
}

function guessImageType(url) {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function artworkEntries(coverUrl) {
  const src = absoluteArtworkUrl(coverUrl);
  return ARTWORK_SIZES.map((size) => ({
    src,
    sizes: `${size}x${size}`,
    type: guessImageType(src),
  }));
}

/**
 * Push title / artist / cover into the platform media session.
 * @param {{ title?: string, coverUrl?: string } | null} track
 * @param {string} [artistName]
 */
export function syncMediaSessionMetadata(track, artistName = "Music Vault") {
  if (!mediaSessionAvailable() || typeof MediaMetadata === "undefined") return;
  if (!track) {
    try {
      navigator.mediaSession.metadata = null;
    } catch {
      // ignore
    }
    return;
  }

  const title = (track.title || "").trim() || "Untitled Mix";
  const artist = (artistName || "").trim() || "Music Vault";
  const artwork = artworkEntries(track.coverUrl);

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: "Music Vault by DHLab",
      artwork,
    });
  } catch (err) {
    console.warn("mediaSession.metadata", err);
  }
}

/** @param {boolean} isPlaying */
export function syncMediaSessionPlaybackState(isPlaying) {
  if (!mediaSessionAvailable()) return;
  try {
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  } catch {
    // ignore
  }
}

/**
 * Keep the lock-screen scrubber in sync with the HTML audio element.
 * @param {HTMLAudioElement | null} audio
 * @param {{ durationSec?: number, guestPreviewOnly?: boolean, segment?: { start: number, end: number, windowSec: number } }} [opts]
 */
export function syncMediaSessionPositionState(audio, opts = {}) {
  if (!mediaSessionAvailable() || !audio || typeof navigator.mediaSession.setPositionState !== "function") {
    return;
  }

  let duration = Number(opts.durationSec) || 0;
  let position = Number(audio.currentTime) || 0;

  if (opts.guestPreviewOnly && opts.segment) {
    const { start, windowSec } = opts.segment;
    duration = Number(windowSec) || duration;
    position = Math.max(0, position - (Number(start) || 0));
  } else if (!duration) {
    duration = Number(audio.duration) || 0;
  }

  if (!Number.isFinite(duration) || duration <= 0) return;
  position = Math.max(0, Math.min(duration, position));

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: audio.playbackRate || 1,
      position,
    });
  } catch {
    // Some browsers reject position > duration during seeks.
  }
}

/**
 * Wire lock-screen / headset controls to the in-app player.
 * @param {{
 *   onPlay?: () => void | Promise<void>,
 *   onPause?: () => void,
 *   onPrevious?: () => void | Promise<void>,
 *   onNext?: () => void | Promise<void>,
 *   onSeek?: (percent: number) => void,
 *   getAudio?: () => HTMLAudioElement | null,
 *   guestPreviewOnly?: boolean,
 *   getSegment?: () => { start: number, end: number, windowSec: number },
 * }} handlers
 * @returns {() => void} cleanup
 */
export function bindMediaSessionActions(handlers = {}) {
  if (!mediaSessionAvailable()) return () => {};

  const run = (fn) => {
    try {
      const result = fn?.();
      if (result && typeof result.then === "function") void result.catch(() => {});
    } catch {
      // ignore handler errors
    }
  };

  const actionHandlers = {
    play: () => run(handlers.onPlay),
    pause: () => run(handlers.onPause),
    stop: () => run(handlers.onPause),
    previoustrack: () => run(handlers.onPrevious),
    nexttrack: () => run(handlers.onNext),
    seekbackward: (details) => {
      const audio = handlers.getAudio?.();
      if (!audio) return;
      const offset = Number(details?.seekOffset) || 10;
      const next = Math.max(0, (Number(audio.currentTime) || 0) - offset);
      const dur = Number(audio.duration) || 0;
      if (handlers.onSeek && dur > 0) handlers.onSeek((next / dur) * 100);
      else audio.currentTime = next;
    },
    seekforward: (details) => {
      const audio = handlers.getAudio?.();
      if (!audio) return;
      const offset = Number(details?.seekOffset) || 10;
      const dur = Number(audio.duration) || 0;
      const next = Math.min(dur || Number.MAX_SAFE_INTEGER, (Number(audio.currentTime) || 0) + offset);
      if (handlers.onSeek && dur > 0) handlers.onSeek((next / dur) * 100);
      else audio.currentTime = next;
    },
    seekto: (details) => {
      if (details?.seekTime == null) return;
      const audio = handlers.getAudio?.();
      if (!audio) return;

      if (handlers.guestPreviewOnly) {
        const segment = handlers.getSegment?.() || { start: 0, end: 0, windowSec: 0 };
        const windowSec = Math.max(1, Number(segment.windowSec) || segment.end - segment.start || 1);
        const relative = Math.max(0, Math.min(windowSec, Number(details.seekTime) || 0));
        if (handlers.onSeek) handlers.onSeek((relative / windowSec) * 100);
        return;
      }

      const dur = Number(audio.duration) || 0;
      const seekTime = Math.max(0, Number(details.seekTime) || 0);
      if (handlers.onSeek && dur > 0) handlers.onSeek((seekTime / dur) * 100);
      else audio.currentTime = seekTime;
    },
  };

  const bound = [];
  for (const [action, handler] of Object.entries(actionHandlers)) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
      bound.push(action);
    } catch {
      // Action not supported on this browser
    }
  }

  return () => {
    for (const action of bound) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // ignore
      }
    }
  };
}
