import { isLocalMode } from "./localMode.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { uploadMixCover } from "./uploadMixCover.js";

const LOCAL_KEY = "dhlab.dj-of-month";

function mapRow(data) {
  if (!data) return null;
  const profileId = data.profile_id || data.profileId || "";
  const photoUrl = data.photo_url || data.photoUrl || "";
  const bio = data.bio || "";
  const mixId = data.mix_id || data.mixId || "";
  if (!profileId && !photoUrl && !bio) return null;
  return { profileId, mixId, photoUrl, bio };
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return mapRow(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocal(row) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(row));
}

export async function getDjOfMonth() {
  if (isLocalMode()) return { row: readLocal(), error: null };
  if (!isSupabaseConfigured()) return { row: null, error: null };
  const { data, error } = await supabase.from("dj_of_month").select("*").eq("id", 1).maybeSingle();
  if (error) {
    const missing = /dj_of_month|schema cache|does not exist/i.test(error.message || "");
    return {
      row: null,
      error: missing
        ? "Run supabase/dj-of-month.sql in the Supabase SQL editor, then try again."
        : error.message,
    };
  }
  return { row: mapRow(data), error: null };
}

/**
 * @param {{ profileId: string, mixId: string, bio: string, file?: File | null, adminId?: string }} input
 */
export async function saveDjOfMonth({ profileId, mixId, bio, file, adminId }) {
  const text = (bio || "").trim();
  if (!profileId) return { ok: false, error: "Choose the DJ's Deep House Lab handle." };
  if (!mixId) return { ok: false, error: "Choose one of their uploaded mixes." };
  if (!text) return { ok: false, error: "Add a short bio." };
  if (text.length > 280) return { ok: false, error: "Bio must be 280 characters or fewer." };

  if (isLocalMode()) {
    const current = readLocal();
    let photoUrl = current?.photoUrl || "";
    if (file) {
      if (file.size > 2.5 * 1024 * 1024) {
        return { ok: false, error: "While Supabase is paused, use a photo under 2.5 MB." };
      }
      photoUrl = await readFile(file);
    }
    if (!photoUrl) return { ok: false, error: "Upload a picture of the DJ." };
    const row = { profileId, mixId, photoUrl, bio: text };
    try {
      writeLocal(row);
    } catch {
      return { ok: false, error: "That photo is too large to store in this browser. Try a smaller image." };
    }
    return { ok: true, row };
  }

  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };

  const existing = await getDjOfMonth();
  if (existing.error) return { ok: false, error: existing.error };

  let photoUrl = existing.row?.photoUrl || "";
  if (file) {
    try {
      photoUrl = await uploadMixCover(file, adminId);
    } catch (err) {
      return { ok: false, error: err?.message || "Could not upload the photo." };
    }
  }
  if (!photoUrl) return { ok: false, error: "Upload a picture of the DJ." };

  const { error } = await supabase.from("dj_of_month").upsert(
    {
      id: 1,
      profile_id: profileId,
      mix_id: mixId,
      photo_url: photoUrl,
      bio: text,
      updated_at: new Date().toISOString(),
      updated_by: adminId || null,
    },
    { onConflict: "id" },
  );
  if (error) {
    const missing = /dj_of_month|schema cache|does not exist/i.test(error.message || "");
    return {
      ok: false,
      error: missing
        ? "Run supabase/dj-of-month.sql in the Supabase SQL editor, then save again."
        : error.message,
    };
  }
  return { ok: true, row: { profileId, mixId, photoUrl, bio: text } };
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}
