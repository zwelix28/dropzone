import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getClientLocaleHints } from "../lib/presence.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

const HEARTBEAT_MS = 30_000;

/**
 * Keeps user_presence fresh and records session logins for admin analytics.
 * No-op for guests or when Supabase is not configured.
 */
export default function usePresenceHeartbeat({ userId, isPlaying, currentTrack }) {
  const location = useLocation();
  const loginRecordedRef = useRef(false);
  const path = location.pathname;

  useEffect(() => {
    loginRecordedRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return undefined;

    const recordLogin = async () => {
      if (loginRecordedRef.current) return;
      const hints = getClientLocaleHints();
      const { error } = await supabase.rpc("record_user_login", {
        p_timezone: hints.timezone,
        p_region: hints.region,
        p_country: hints.country,
        p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });
      if (!error) loginRecordedRef.current = true;
    };

    const sendHeartbeat = async () => {
      const hints = getClientLocaleHints();
      await supabase.rpc("upsert_user_presence", {
        p_is_streaming: Boolean(isPlaying && currentTrack?.id),
        p_mix_id: isPlaying && currentTrack?.id ? currentTrack.id : null,
        p_mix_title: isPlaying && currentTrack?.title ? currentTrack.title : "",
        p_timezone: hints.timezone,
        p_region: hints.region,
        p_country: hints.country,
        p_page_path: path,
      });
    };

    void recordLogin();
    void sendHeartbeat();

    const timer = setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_MS);

    return () => clearInterval(timer);
  }, [userId, isPlaying, currentTrack?.id, currentTrack?.title, path]);
}
