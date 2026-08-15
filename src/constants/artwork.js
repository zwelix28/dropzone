/** Square default cover for mixes with no (or unusable) artwork. */
export const DEFAULT_MIX_ARTWORK = "/DeepHouseLabLogo.png";

/** True when a cover URL is missing or an old vector placeholder we no longer use. */
export function isPlaceholderCover(coverUrl) {
  const url = (coverUrl || "").trim().toLowerCase();
  if (!url) return true;
  return url.split(/[?#]/)[0].endsWith(".svg");
}

/** Resolve a mix cover to a displayable image, falling back to the default artwork. */
export function resolveMixArtwork(coverUrl) {
  return isPlaceholderCover(coverUrl) ? DEFAULT_MIX_ARTWORK : coverUrl.trim();
}

/**
 * `onError` for cover images: swap in the default artwork when the stored file
 * is missing (e.g. covers deleted from storage) instead of rendering blank.
 */
export function handleArtworkError(event) {
  const img = event?.currentTarget;
  if (!img || img.dataset.artworkFallback === "1") return;
  img.dataset.artworkFallback = "1";
  img.src = DEFAULT_MIX_ARTWORK;
}
