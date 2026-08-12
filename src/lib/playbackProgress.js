import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { mixRowToEpisode } from "./maps.js";

/** Ignore tiny listens when restoring. */
export const RESUME_MIN_SEC = 5;
/** Treat near-end as finished (start over next time). */
export const RESUME_END_MARGIN_SEC = 15;
/** Max in-progress sessions shown / kept in Library per user. */
export const LIBRARY_MAX_SESSIONS = 5;

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

  if (isSupabaseConfigured()) {
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

  await enforceLibrarySessionCap(userId, mixId);
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

/**
 * Keep at most LIBRARY_MAX_SESSIONS resumable mixes.
 * Newest (by updated_at) win; older resume cursors are cleared (listen totals kept).
 * @param {string} userId
 * @param {string} [keepMixId] mix that was just saved — always retained if resumable
 */
async function enforceLibrarySessionCap(userId, keepMixId) {
  if (!userId) return;

  /** @type {Array<{ mixId: string, positionSec: number, durationSec: number, updatedAtMs: number }>} */
  const candidates = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("playback_progress")
        .select("mix_id, position_sec, duration_sec, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const positionSec = Number(row.position_sec) || 0;
          const durationSec = Number(row.duration_sec) || 0;
          if (!shouldResumeAt(positionSec, durationSec)) continue;
          candidates.push({
            mixId: row.mix_id,
            positionSec,
            durationSec,
            updatedAtMs: row.updated_at ? new Date(row.updated_at).getTime() : 0,
          });
        }
      }
    } catch {
      // fall through to local
    }
  }

  if (!candidates.length && typeof localStorage !== "undefined") {
    const prefix = `mv-playback:${userId}:`;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const mixId = key.slice(prefix.length);
      const local = readLocal(userId, mixId);
      if (!local || !shouldResumeAt(local.positionSec, local.durationSec)) continue;
      let updatedAtMs = 0;
      try {
        const raw = JSON.parse(localStorage.getItem(key) || "{}");
        updatedAtMs = Number(raw?.updatedAt) || 0;
      } catch {
        // ignore
      }
      candidates.push({
        mixId,
        positionSec: local.positionSec,
        durationSec: local.durationSec,
        updatedAtMs,
      });
    }
  }

  if (candidates.length <= LIBRARY_MAX_SESSIONS) return;

  candidates.sort((a, b) => {
    if (keepMixId) {
      if (a.mixId === keepMixId && b.mixId !== keepMixId) return -1;
      if (b.mixId === keepMixId && a.mixId !== keepMixId) return 1;
    }
    return b.updatedAtMs - a.updatedAtMs;
  });

  const toDrop = candidates.slice(LIBRARY_MAX_SESSIONS);
  await Promise.all(toDrop.map((row) => clearPlaybackProgress(userId, row.mixId)));
}

/** Load Library sessions and trim anything beyond the 5-session cap. */
export async function fetchLibrarySessions(userId, catalogEpisodes = []) {
  if (!userId) return [];
  await enforceLibrarySessionCap(userId);
  return listLibrarySessions(userId, catalogEpisodes);
}

async function listLibrarySessions(userId, catalogEpisodes = []) {
  if (!userId) return [];

  const byId = new Map(catalogEpisodes.map((ep) => [ep.id, ep]));
  /** @type {Array<{ mixId: string, positionSec: number, durationSec: number, totalListenedSec: number, updatedAt: string | null, episode: object | null }>} */
  let sessions = [];

  if (isSupabaseConfigured()) {
    try {
      let { data, error } = await supabase
        .from("playback_progress")
        .select(
          "mix_id, position_sec, duration_sec, total_listened_sec, updated_at, mixes(id, user_id, title, description, genre, tags, cover_url, audio_url, audio_storage_path, audio_preview_path, duration_secs, plays, downloads, shares, likes_count, created_at, tracklist, trending, is_for_sale, price_zar, sales_count, content_type)",
        )
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error && /total_listened_sec|42703/i.test(error.message || "")) {
        ({ data, error } = await supabase
          .from("playback_progress")
          .select(
            "mix_id, position_sec, duration_sec, updated_at, mixes(id, user_id, title, description, genre, tags, cover_url, audio_url, audio_storage_path, audio_preview_path, duration_secs, plays, downloads, shares, likes_count, created_at, tracklist, trending, is_for_sale, price_zar, sales_count, content_type)",
          )
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(100));
      }

      if (!error && Array.isArray(data)) {
        sessions = data.map((row) => {
          const mixRow = row.mixes;
          const episode =
            (mixRow ? mixRowToEpisode(mixRow) : null) || byId.get(row.mix_id) || null;
          const durationSec =
            Number(row.duration_sec) || Number(episode?.durationSecs) || 0;
          return {
            mixId: row.mix_id,
            positionSec: Number(row.position_sec) || 0,
            durationSec,
            totalListenedSec: Number(row.total_listened_sec) || 0,
            updatedAt: row.updated_at || null,
            episode,
          };
        });
      }
    } catch {
      sessions = [];
    }
  }

  // Local fallback when DB empty / offline
  if (!sessions.length && typeof localStorage !== "undefined") {
    const prefix = `mv-playback:${userId}:`;
    const localRows = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const mixId = key.slice(prefix.length);
      const local = readLocal(userId, mixId);
      if (!local) continue;
      let updatedAt = null;
      try {
        const raw = JSON.parse(localStorage.getItem(key) || "{}");
        if (raw?.updatedAt) updatedAt = new Date(raw.updatedAt).toISOString();
      } catch {
        // ignore
      }
      localRows.push({
        mixId,
        positionSec: local.positionSec,
        durationSec: local.durationSec || Number(byId.get(mixId)?.durationSecs) || 0,
        totalListenedSec: local.totalListenedSec || 0,
        updatedAt,
        episode: byId.get(mixId) || null,
      });
    }
    localRows.sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
    sessions = localRows;
  }

  return sessions
    .filter(
      (s) => s.episode && shouldResumeAt(s.positionSec, s.durationSec || s.episode.durationSecs),
    )
    .slice(0, LIBRARY_MAX_SESSIONS);
}

/** Remove a session from Library (resets resume cursor; keeps listen totals). */
export async function dismissLibrarySession(userId, mixId) {
  await clearPlaybackProgress(userId, mixId);
}

