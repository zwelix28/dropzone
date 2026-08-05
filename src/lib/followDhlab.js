import { DHLAB_USER_ID, isDhlabProfile } from "../constants/dhlab.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

/**
 * Resolve the official @deephouselab profile id (env override, then DB lookup).
 * @returns {Promise<string|null>}
 */
export async function resolveDhlabFollowTargetId() {
  if (!isSupabaseConfigured()) return null;
  if (DHLAB_USER_ID) return DHLAB_USER_ID;

  const { data: byHandle } = await supabase
    .from("profiles")
    .select("id, handle, username, bio, verified")
    .or("handle.ilike.@deephouselab,handle.ilike.deephouselab")
    .limit(5);

  const match = (byHandle || []).find((row) => isDhlabProfile(row)) || byHandle?.[0];
  if (match?.id) return match.id;

  const { data: byName } = await supabase
    .from("profiles")
    .select("id, handle, username, bio, verified")
    .ilike("username", "deep house lab")
    .limit(5);

  const named = (byName || []).find((row) => isDhlabProfile(row)) || byName?.[0];
  return named?.id || null;
}

/**
 * Ensure `followerId` follows @deephouselab. Safe to call repeatedly (idempotent).
 * @param {string|null|undefined} followerId
 */
export async function ensureFollowDhlab(followerId) {
  if (!followerId || !isSupabaseConfigured()) return { ok: false };

  try {
    const targetId = await resolveDhlabFollowTargetId();
    if (!targetId || targetId === followerId) return { ok: false, reason: "no_target" };

    const { data: existing } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", followerId)
      .eq("following_id", targetId)
      .maybeSingle();

    if (existing) return { ok: true, already: true };

    const { error } = await supabase.from("follows").insert({
      follower_id: followerId,
      following_id: targetId,
    });

    if (error) {
      // Unique violation / race — treat as success
      if (/duplicate|unique/i.test(error.message || "")) return { ok: true, already: true };
      console.warn("ensureFollowDhlab", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.warn("ensureFollowDhlab", err?.message || err);
    return { ok: false };
  }
}
