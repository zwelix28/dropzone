/** For You feed: 50-second preview window from the climax. */
export const FOR_YOU_PREVIEW_SEC = 50;

/** Fixed climax start — 2 minutes 30 seconds into every mix. */
export const FOR_YOU_CLIMAX_START_SEC = 150;

/**
 * Preview start at 2:30; clamped so the 50s window fits within the track duration.
 */
export function computeClimaxStartSec(durationSecs) {
  const d = Math.max(0, Number(durationSecs) || 0);
  const climax = FOR_YOU_CLIMAX_START_SEC;

  if (d <= 0) return climax;
  if (d <= FOR_YOU_PREVIEW_SEC) return 0;
  if (d <= climax) return Math.max(0, d - FOR_YOU_PREVIEW_SEC);

  const maxStart = d - FOR_YOU_PREVIEW_SEC;
  return Math.min(climax, maxStart);
}

export function forYouPreviewEndSec(startSec, durationSecs) {
  const d = Math.max(0, Number(durationSecs) || 0);
  if (d <= 0) return startSec + FOR_YOU_PREVIEW_SEC;
  return Math.min(d, startSec + FOR_YOU_PREVIEW_SEC);
}

/** Guest/main-player preview window: 50s from 2:30 (same as For You). */
export function getGuestPreviewSegment(durationSecs) {
  const start = computeClimaxStartSec(durationSecs);
  const end = forYouPreviewEndSec(start, durationSecs);
  return { start, end, windowSec: Math.max(1, end - start) };
}
