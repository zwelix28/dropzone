import { createClient } from "@supabase/supabase-js";
import { isLocalMode } from "./localMode.js";

function readViteEnv(value) {
  if (value == null || typeof value !== "string") return "";
  let s = value.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const url = readViteEnv(import.meta.env.VITE_SUPABASE_URL);
const anonKey = readViteEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

/** False in local testing mode so nothing hits the billed cloud project. */
export const isSupabaseConfigured = () => Boolean(url && anonKey) && !isLocalMode();

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
