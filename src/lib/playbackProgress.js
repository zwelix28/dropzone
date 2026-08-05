import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

/** Ignore tiny listens when restoring. */
export const RESUME_MIN_SEC = 5;
/** Treat near-end as finished (start over next time). */
export const RESUME_END_MARGIN_SEC = 15;

function localKey(userId, mixId) {
  return `mv-playback:${userId}:${mixId}`;
}

function readLocal(userId, mixId) {
  if (typeof localStorage === "undefined" || !userId || !mixId) return null;
  try {
    const raw = localStorage.getItem(localKey(userId, mixId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const positionSec = Number(parsed?.positionSec);
    if (!Number.isFinite(positionSec) || positionSec < 0) return null;
    return {
      positionSec,
      durationSec: Number(parsed?.durationSec) || 0,
      totalListenedSec: Number(parsed?.totalListenedSec) || 0,
      lastReportedSec: Number(parsed?.lastReportedSec) || 0,
    };
  } catch {
    return null;
  }
}

function writeLocal(userId, mixId, row) {
  if (typeof localStorage === "undefined" || !userId || !mixId) return;
  try {
    localStorage.setItem(
      localKey(userId, mixId),
      JSON.stringify({
        positionSec: row.positionSec,
        durationSec: row.durationSec || 0,
        totalListenedSec: row.totalListenedSec || 0,
        lastReportedSec: row.lastReportedSec || 0,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // quota / private mode
  }
}

function clearLocal(userId, mixId) {
  if (typeof localStorage === "undefined" || !userId || !mixId) return;
  try {
    localStorage.removeItem(localKey(userId, mixId));
  } catch {
    // ignore
  }
}

/** Whether a saved position should be used to resume playback. */
export function shouldResumeAt(positionSec, durationSec) {
  const pos = Number(positionSec);
  if (!Number.isFinite(pos) || pos < RESUME_MIN_SEC) return false;
  const dur = Number(durationSec);
  if (Number.isFinite(dur) && dur > 0 && pos >= Math.max(RESUME_MIN_SEC, dur - RESUME_END_MARGIN_SEC)) {
    return false;
  }
  return true;
}

function accumulateListen(prev, positionSec) {
  const last = Number(prev?.lastReportedSec) || 0;
  const total = Number(prev?.totalListenedSec) || 0;
  const pos = Number(positionSec) || 0;
  // Only count forward progress (ignores seek-back)
  const delta = pos > last ? pos - last : 0;
  return {
    totalListenedSec: total + delta,
    lastReportedSec: pos,
  };
}

/**
 * Load saved position for a signed-in user (DB first, then local cache).
 * @returns {Promise<{ positionSec: number, durationSec: number, totalListenedSec?: number, lastReportedSec?: number } | null>}
 */
export async function fetchPlaybackProgress(userId, mixId) {
  if (!userId || !mixId) return null;

  if (isSupabaseConfigured()) {
    try {
      let { data, error } = await supabase
        .from("playback_progress")
        .select("position_sec, duration_sec, total_listened_sec, last_reported_sec")
        .eq("user_id", userId)
        .eq("mix_id", mixId)
        .maybeSingle();
      if (error && /total_listened_sec|last_reported_sec|42703/i.test(error.message || "")) {
        ({ data, error } = await supabase
          .from("playback_progress")
          .select("position_sec, duration_sec")
          .eq("user_id", userId)
          .eq("mix_id", mixId)
          .maybeSingle());
      }
      if (!error && data) {
        const row = {
          positionSec: Number(data.position_sec) || 0,
          durationSec: Number(data.duration_sec) || 0,
          totalListenedSec: Number(data.total_listened_sec) || 0,
          lastReportedSec: Number(data.last_reported_sec) || 0,
        };
        writeLocal(userId, mixId, row);
        return row;
      }
    } catch {
      // fall through to local
    }
  }

  return readLocal(userId, mixId);
}

/** Persist position for a signed-in user (local + DB upsert). Accrues listen time. */
export async function savePlaybackProgress(userId, mixId, positionSec, durationSec = 0) {
  if (!userId || !mixId) return;
  const pos = Number(positionSec);
  if (!Number.isFinite(pos) || pos < 0) return;

  const existing = (await fetchPlaybackProgress(userId, mixId)) || {
    positionSec: 0,
    durationSec: 0,
    totalListenedSec: 0,
    lastReportedSec: 0,
  };

  // Near end / finished → lock in listen time, reset resume cursor
  if (!shouldResumeAt(pos, durationSec)) {
    await finalizePlaybackProgress(userId, mixId, pos, durationSec, existing);
    return;
  }

  const { totalListenedSec, lastReportedSec } = accumulateListen(existing, pos);
  const row = {
    positionSec: pos,
    durationSec: Number(durationSec) || 0,
    totalListenedSec,
    lastReportedSec,
  };
  writeLocal(userId, mixId, row);

  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from("playback_progress").upsert(
      {
        user_id: userId,
        mix_id: mixId,
        position_sec: row.positionSec,
        duration_sec: row.durationSec,
        total_listened_sec: row.totalListenedSec,
        last_reported_sec: row.lastReportedSec,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,mix_id" },
    );
  } catch {
    // local cache still holds progress
  }
}

async function finalizePlaybackProgress(userId, mixId, positionSec, durationSec, existing) {
  const dur = Number(durationSec) || Number(existing?.durationSec) || 0;
  const endPos = Math.max(Number(positionSec) || 0, dur > 0 ? dur : 0);
  const { totalListenedSec } = accumulateListen(existing, endPos);
  const row = {
    positionSec: 0,
    durationSec: dur,
    totalListenedSec,
    lastReportedSec: 0,
  };
  writeLocal(userId, mixId, row);

  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from("playback_progress").upsert(
      {
        user_id: userId,
        mix_id: mixId,
        position_sec: 0,
        duration_sec: row.durationSec,
        total_listened_sec: row.totalListenedSec,
        last_reported_sec: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,mix_id" },
    );
  } catch {
    // ignore
  }
}

/** Reset resume cursor after a mix ends (keeps cumulative listen totals). */
export async function clearPlaybackProgress(userId, mixId) {
  if (!userId || !mixId) return;
  const existing = await fetchPlaybackProgress(userId, mixId);
  if (!existing) {
    clearLocal(userId, mixId);
    return;
  }
  await finalizePlaybackProgress(
    userId,
    mixId,
    existing.positionSec,
    existing.durationSec,
    existing,
  );
}

/**
 * Aggregate listening behaviour for the signed-in user's profile.
 * @param {string} userId
 * @param {{ id: string, genre?: string }[]} episodes
 * @param {string[]} likedMixIds
 */
export async function fetchListenerProfileStats(userId, episodes = [], likedMixIds = []) {
  const byId = new Map(episodes.map((ep) => [ep.id, ep]));
  const genreCounts = (ids) => {
    const map = new Map();
    for (const id of ids) {
      const g = (byId.get(id)?.genre || "").trim();
      if (!g) continue;
      map.set(g, (map.get(g) || 0) + 1);
    }
    let best = null;
    let bestN = 0;
    for (const [g, n] of map) {
      if (n > bestN) {
        best = g;
        bestN = n;
      }
    }
    return best;
  };

  const mostLikedGenre = genreCounts(likedMixIds);

  let rows = [];
  if (userId && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("playback_progress")
        .select("mix_id, position_sec, total_listened_sec, mixes(genre)")
        .eq("user_id", userId);
      if (!error && Array.isArray(data)) rows = data;
    } catch {
      rows = [];
    }
  }

  // Fallback: local keys for this user if DB empty
  if (!rows.length && typeof localStorage !== "undefined" && userId) {
    const prefix = `mv-playback:${userId}:`;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const mixId = key.slice(prefix.length);
      const local = readLocal(userId, mixId);
      if (!local) continue;
      rows.push({
        mix_id: mixId,
        position_sec: local.positionSec,
        total_listened_sec: local.totalListenedSec || local.positionSec,
        mixes: { genre: byId.get(mixId)?.genre || "" },
      });
    }
  }

  let totalListenedSec = 0;
  const listenByGenre = new Map();
  let mixesStarted = 0;

  for (const row of rows) {
    mixesStarted += 1;
    const listened =
      Number(row.total_listened_sec) > 0
        ? Number(row.total_listened_sec)
        : Number(row.position_sec) || 0;
    totalListenedSec += listened;
    const genre =
      (row.mixes?.genre && String(row.mixes.genre).trim()) ||
      (byId.get(row.mix_id)?.genre || "").trim();
    if (genre && listened > 0) {
      listenByGenre.set(genre, (listenByGenre.get(genre) || 0) + listened);
    }
  }

  let mostListenedGenre = null;
  let mostListenedSec = 0;
  for (const [g, sec] of listenByGenre) {
    if (sec > mostListenedSec) {
      mostListenedGenre = g;
      mostListenedSec = sec;
    }
  }

  const hours = totalListenedSec / 3600;

  return {
    mixesStarted,
    likesCount: likedMixIds.length,
    hoursListened: hours,
    mostLikedGenre,
    mostListenedGenre,
    totalListenedSec,
  };
}

export function formatListenHours(hours) {
  const h = Number(hours) || 0;
  if (h < 0.1) return "0h";
  if (h < 10) return `${h.toFixed(1)}h`;
  return `${Math.round(h)}h`;
}
