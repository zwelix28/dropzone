import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

function localKey(userId) {
  return `dhl-presaves:${userId}`;
}

function readLocalIds(userId) {
  if (typeof localStorage === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(localKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        mixId: String(row.mixId || row.mix_id || ""),
        createdAt: row.createdAt || row.created_at || new Date().toISOString(),
      }))
      .filter((row) => row.mixId);
  } catch {
    return [];
  }
}

function writeLocalIds(userId, rows) {
  if (typeof localStorage === "undefined" || !userId) return;
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(rows.slice(0, 100)));
  } catch {
    /* quota */
  }
}

/** @returns {Promise<Array<{ mixId: string, createdAt: string }>>} */
export async function listMixPresaves(userId) {
  if (!userId) return [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("mix_presaves")
        .select("mix_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && Array.isArray(data)) {
        const rows = data.map((row) => ({
          mixId: row.mix_id,
          createdAt: row.created_at || new Date().toISOString(),
        }));
        writeLocalIds(userId, rows);
        return rows;
      }
    } catch {
      /* fall through */
    }
  }

  return readLocalIds(userId);
}

export async function hasMixPresave(userId, mixId) {
  if (!userId || !mixId) return false;
  const rows = await listMixPresaves(userId);
  return rows.some((row) => row.mixId === mixId);
}

/**
 * Bookmark a pre-save mix into the member's library.
 * @returns {Promise<{ ok: boolean, already?: boolean, error?: string }>}
 */
export async function addMixPresave(userId, mixId) {
  if (!userId || !mixId) return { ok: false, error: "Sign in to pre-save mixes." };

  const existing = readLocalIds(userId);
  if (existing.some((row) => row.mixId === mixId)) {
    // Still try remote upsert for sync, but treat as already saved.
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from("mix_presaves").upsert(
        {
          user_id: userId,
          mix_id: mixId,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,mix_id" },
      );
      if (error) {
        if (/mix_presaves|does not exist|schema cache/i.test(error.message || "")) {
          // Migration not applied — keep local bookmark.
        } else if (!/duplicate|unique/i.test(error.message || "")) {
          return { ok: false, error: error.message };
        }
      }
    } catch (err) {
      return { ok: false, error: err?.message || "Could not pre-save this mix." };
    }
  }

  const already = existing.some((row) => row.mixId === mixId);
  const next = [
    { mixId, createdAt: new Date().toISOString() },
    ...existing.filter((row) => row.mixId !== mixId),
  ];
  writeLocalIds(userId, next);
  return { ok: true, already };
}

export async function removeMixPresave(userId, mixId) {
  if (!userId || !mixId) return { ok: false };

  if (isSupabaseConfigured()) {
    try {
      await supabase.from("mix_presaves").delete().eq("user_id", userId).eq("mix_id", mixId);
    } catch {
      /* local still clears */
    }
  }

  writeLocalIds(
    userId,
    readLocalIds(userId).filter((row) => row.mixId !== mixId),
  );
  return { ok: true };
}
