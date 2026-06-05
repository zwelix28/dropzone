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

/**
 * URL for <audio> src:
 * - Logged-in: signed full mix (or legacy URL).
 * - Guest: full mix (preferred) or public preview clip — player plays 50s from 2:30
 */
export async function resolveMixPlaybackUrl(episode, { guestPreviewOnly, isAuthenticated, preferFullMix = false }) {
  const previewPath = (episode.audioPreviewPath || "").trim();
  const storagePath =
    (episode.audioStoragePath || "").trim() ||
    extractMixAudioPathFromLegacyPublicUrl(episode.audioUrl || "");

  if (guestPreviewOnly) {
    if (!preferFullMix && previewPath) {
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
