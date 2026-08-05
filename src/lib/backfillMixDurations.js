import { getAudioUrlDurationSec } from "./audioDuration.js";
import { resolveMixPlaybackUrl } from "./audioUrls.js";

const CONCURRENCY = 2;

/**
 * For mixes with missing duration_secs, read length from audio metadata and
 * report via onUpdate (caller updates UI + persists).
 *
 * @param {Array} episodes
 * @param {{ isAuthenticated?: boolean, onUpdate?: (id: string, durationSecs: number) => void }} opts
 */
export async function backfillMissingMixDurations(episodes, opts = {}) {
  const list = Array.isArray(episodes) ? episodes : [];
  const missing = list.filter((ep) => ep?.id && Number(ep.durationSecs) < 1);
  if (!missing.length) return;

  const { isAuthenticated = false, onUpdate } = opts;
  let i = 0;

  async function worker() {
    while (i < missing.length) {
      const ep = missing[i++];
      try {
        const url = await resolveMixPlaybackUrl(ep, {
          guestPreviewOnly: !isAuthenticated,
          isAuthenticated,
          preferFullMix: true,
        });
        if (!url) continue;
        const durationSecs = await getAudioUrlDurationSec(url);
        if (durationSecs < 1) continue;
        onUpdate?.(ep.id, durationSecs);
      } catch (err) {
        console.warn("backfill mix duration", ep?.id, err?.message || err);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, missing.length) }, () => worker()));
}
