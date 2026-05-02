import { profileRowToUser } from "./maps.js";
import { supabase } from "./supabaseClient.js";

/** Users who follow `userId` (profile per row when the profile row exists). */
export async function fetchFollowersWithProfiles(userId) {
  if (!userId) return [];
  const { data: rows, error } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = rows || [];
  const ids = [...new Set(list.map((r) => r.follower_id))];
  if (!ids.length) return [];
  const { data: profs, error: e2 } = await supabase.from("profiles").select("*").in("id", ids);
  if (e2) throw e2;
  const map = new Map((profs || []).map((p) => [p.id, profileRowToUser(p)]));
  return list.map((r) => ({ user: map.get(r.follower_id), followedAt: r.created_at })).filter((x) => x.user);
}

/** Users that `userId` follows. */
export async function fetchFollowingWithProfiles(userId) {
  if (!userId) return [];
  const { data: rows, error } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = rows || [];
  const ids = [...new Set(list.map((r) => r.following_id))];
  if (!ids.length) return [];
  const { data: profs, error: e2 } = await supabase.from("profiles").select("*").in("id", ids);
  if (e2) throw e2;
  const map = new Map((profs || []).map((p) => [p.id, profileRowToUser(p)]));
  return list.map((r) => ({ user: map.get(r.following_id), followedAt: r.created_at })).filter((x) => x.user);
}
