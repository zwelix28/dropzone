import { mixRowToEpisode, profileRowToUser } from "./maps.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

/** Fetch a single mix and its owner profile by id (for shared /mix/:id links). */
export async function fetchMixById(id) {
  if (!id || !isSupabaseConfigured()) return null;

  const { data, error } = await supabase.from("mixes").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;

  const episode = mixRowToEpisode(data);
  if (!episode) return null;

  let user = null;
  if (data.user_id) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user_id).maybeSingle();
    user = profileRowToUser(profile);
  }

  return { episode, user };
}
