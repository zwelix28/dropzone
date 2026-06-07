import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

export async function fetchAdminAnalytics() {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { data, error } = await supabase.rpc("admin_get_analytics");
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data || {} };
}

export function formatRelativeTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleString();
}
