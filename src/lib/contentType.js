/** Cutoff: uploads on/before 31 July 2026 are Discover songs (singles). */
export const DISCOVER_SONGS_BEFORE = new Date("2026-08-01T00:00:00.000Z");

/**
 * Discover = singles / short songs.
 * Legacy rows still stored as content_type "mix" but created on/before 31 Jul 2026
 * are treated as Discover until supabase/move-songs-to-discover.sql is applied.
 */
export function isDiscoverItem(episode) {
  if (!episode) return false;
  if (episode.contentType === "single") return true;
  const created = episode.createdAt ? new Date(episode.createdAt) : null;
  if (created && !Number.isNaN(created.getTime()) && created < DISCOVER_SONGS_BEFORE) {
    return true;
  }
  return false;
}

/** Mixes page = full-length mixes (not Discover songs). */
export function isMixesItem(episode) {
  return Boolean(episode) && !isDiscoverItem(episode);
}

/** True for uploads after 31 July 2026 (For You excludes older catalog songs). */
export function isForYouItem(episode) {
  if (!episode?.createdAt) return false;
  const created = new Date(episode.createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return created >= DISCOVER_SONGS_BEFORE;
}
