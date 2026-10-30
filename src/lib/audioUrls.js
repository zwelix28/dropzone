import { warmPlaybackUrl } from "./audioPrefetch.js";
import { supabase } from "./supabaseClient.js";
import { FOR_YOU_PREVIEW_SEC } from "./forYouPreview.js";

/** Guests hear a 50s preview from 2:30; full mix requires sign-in. */
export const GUEST_SNIPPET_DURATION_SEC = FOR_YOU_PREVIEW_SEC;

export function episodeHasAudioSource(episode) {
  if (!episode) return false;
  return Boolean(
    (episode.audioStoragePath || "").trim() ||
      extractMixAudioPathFromLegacyPublicUrl(episode.audioUrl || "") ||
      (episode.audioUrl || "").trim(),
  );
}

export function episodeHasGuestPreview(episode) {
  return Boolean((episode?.audioPreviewPath || "").trim());
}

/** Guest can start playback when a full mix or preview source exists (50s window from 2:30). */
export function episodeHasGuestPlayback(episode) {
  return episodeHasGuestPreview(episode) || episodeHasAudioSource(episode);
}

/** Extract `userId/file.ext` from a legacy public object URL. */
export function extractMixAudioPathFromLegacyPublicUrl(audioUrl) {
  if (!audioUrl || typeof audioUrl !== "string") return "";
  const cleaned = audioUrl.split(/[?#]/)[0];
  const marker = "/object/public/mix-audio/";
  const i = cleaned.indexOf(marker);
  if (i === -1) return "";
  return cleaned.slice(i + marker.length);
}

const SIGNED_PLAY_SEC = 3600;
const SIGNED_DOWNLOAD_SEC = 600;
/** Refresh signed URLs a few minutes before Supabase expiry. */
const SIGNED_CACHE_TTL_MS = (SIGNED_PLAY_SEC - 300) * 1000;
const PUBLIC_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** @type {Map<string, { url: string, expiresAt: number }>} */
const playbackUrlCache = new Map();

function playbackCacheKey(episode, { guestPreviewOnly, isAuthenticated, preferFullMix }) {
  const id = episode?.id || "";
  return [
    id,
    guestPreviewOnly ? "g" : "u",
    isAuthenticated ? "1" : "0",
    preferFullMix ? "f" : "p",
  ].join("|");
}

function readPlaybackCache(key) {
  const hit = playbackUrlCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    playbackUrlCache.delete(key);
    return null;
  }
  return hit.url;
}

function writePlaybackCache(key, url, ttlMs) {
  if (!key || !url || !ttlMs) return;
  playbackUrlCache.set(key, { url, expiresAt: Date.now() + ttlMs });
  if (playbackUrlCache.size > 80) {
    const oldest = playbackUrlCache.keys().next().value;
    if (oldest) playbackUrlCache.delete(oldest);
  }
}

export function invalidateMixPlaybackUrlCache() {
  playbackUrlCache.clear();
}

/**
 * URL for <audio> src:
 * - Logged-in: signed full mix (or legacy URL).
 * - Guest: full mix (preferred) or public preview clip — player plays 50s from 2:30
 * Cached in memory so resume / next / For You skip repeat signing.
 */
export async function resolveMixPlaybackUrl(episode, { guestPreviewOnly, isAuthenticated, preferFullMix = false }) {
  const direct = (episode?.audioUrl || "").trim();
  if (direct.startsWith("blob:") || direct.startsWith("data:")) return direct;

  const opts = { guestPreviewOnly, isAuthenticated, preferFullMix };
  const key = episode?.id ? playbackCacheKey(episode, opts) : "";
  if (key) {
    const cached = readPlaybackCache(key);
    if (cached) return cached;
  }

  const previewPath = (episode.audioPreviewPath || "").trim();
  const storagePath =
    (episode.audioStoragePath || "").trim() ||
    extractMixAudioPathFromLegacyPublicUrl(episode.audioUrl || "");

  if (guestPreviewOnly) {
    if (!preferFullMix && previewPath) {
      const { data } = supabase.storage.from("mix-previews").getPublicUrl(previewPath);
      if (data?.publicUrl) {
        if (key) writePlaybackCache(key, data.publicUrl, PUBLIC_CACHE_TTL_MS);
        return data.publicUrl;
      }
    }
    if (storagePath) {
      const { data, error } = await supabase.storage.from("mix-audio").createSignedUrl(storagePath, SIGNED_PLAY_SEC);
      if (!error && data?.signedUrl) {
        if (key) writePlaybackCache(key, data.signedUrl, SIGNED_CACHE_TTL_MS);
        return data.signedUrl;
      }
    }
    const legacy = (episode.audioUrl || "").trim();
    if (legacy) {
      if (key) writePlaybackCache(key, legacy, PUBLIC_CACHE_TTL_MS);
      return legacy;
    }
    return null;
  }

  if (!isAuthenticated) return null;

  if (storagePath) {
    const { data, error } = await supabase.storage.from("mix-audio").createSignedUrl(storagePath, SIGNED_PLAY_SEC);
    if (error || !data?.signedUrl) return null;
    if (key) writePlaybackCache(key, data.signedUrl, SIGNED_CACHE_TTL_MS);
    return data.signedUrl;
  }

  if (episode.audioUrl) {
    if (key) writePlaybackCache(key, episode.audioUrl, PUBLIC_CACHE_TTL_MS);
    return episode.audioUrl;
  }
  return null;
}

/** Resolve + optionally warm a standby buffer. Never throws; safe for fire-and-forget. */
export async function prefetchMixPlayback(episode, opts, { warm = true } = {}) {
  if (!episode) return null;
  try {
    const url = await resolveMixPlaybackUrl(episode, opts);
    if (url && warm && episode.id) warmPlaybackUrl(episode.id, url);
    return url;
  } catch {
    return null;
  }
}

/** Temporary download link (logged-in users only; caller should enforce auth). */
export async function resolveMixDownloadUrl(episode, title) {
  const direct = (episode?.audioUrl || "").trim();
  if (direct.startsWith("blob:") || direct.startsWith("data:")) return direct;

  const storagePath =
    (episode.audioStoragePath || "").trim() ||
    extractMixAudioPathFromLegacyPublicUrl(episode.audioUrl || "");
  const safeName = `${(title || "mix").replace(/[^\w\s-]/g, "").trim() || "mix"}.mp3`;

  if (storagePath) {
    const { data, error } = await supabase.storage
      .from("mix-audio")
      .createSignedUrl(storagePath, SIGNED_DOWNLOAD_SEC, { download: safeName });
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  return episode.audioUrl || null;
}
