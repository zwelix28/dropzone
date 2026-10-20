import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

/** Active listeners for a mix (streaming + seen within ~2 minutes). */
export async function fetchMixActiveListenerCount(mixId) {
  if (!mixId || !isSupabaseConfigured()) return 0;
  const { data, error } = await supabase.rpc("get_mix_active_listener_count", {
    p_mix_id: mixId,
  });
  if (error) {
    console.warn("fetchMixActiveListenerCount", error.message);
    return 0;
  }
  const n = Number(data);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
