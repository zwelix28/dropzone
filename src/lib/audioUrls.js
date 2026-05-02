import { supabase } from "./supabaseClient.js";

/** Guests hear at most this many seconds; full mix requires sign-in. */
export const GUEST_SNIPPET_DURATION_SEC = 20;

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

/** Guest can start playback (dedicated preview file and/or full mix with client-side 20s cap). */
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

/**
 * URL for <audio> src:
 * - Logged-in: signed full mix (or legacy URL).
 * - Guest: public preview clip if uploaded, else signed full mix — player must cap at GUEST_SNIPPET_DURATION_SEC
 *   (requires Storage policy allowing anon SELECT on mix-audio; not DRM against determined users).
 */
export async function resolveMixPlaybackUrl(episode, { guestPreviewOnly, isAuthenticated }) {
  const previewPath = (episode.audioPreviewPath || "").trim();
  const storagePath =
    (episode.audioStoragePath || "").trim() ||
    extractMixAudioPathFromLegacyPublicUrl(episode.audioUrl || "");

  if (guestPreviewOnly) {
    if (previewPath) {
      const { data } = supabase.storage.from("mix-previews").getPublicUrl(previewPath);
      if (data?.publicUrl) return data.publicUrl;
    }
    if (storagePath) {
      const { data, error } = await supabase.storage.from("mix-audio").createSignedUrl(storagePath, SIGNED_PLAY_SEC);
      if (!error && data?.signedUrl) return data.signedUrl;
    }
    const legacy = (episode.audioUrl || "").trim();
    if (legacy) return legacy;
    return null;
  }

  if (!isAuthenticated) return null;

  if (storagePath) {
    const { data, error } = await supabase.storage.from("mix-audio").createSignedUrl(storagePath, SIGNED_PLAY_SEC);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  if (episode.audioUrl) return episode.audioUrl;
  return null;
}

/** Temporary download link (logged-in users only; caller should enforce auth). */
export async function resolveMixDownloadUrl(episode, title) {
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
