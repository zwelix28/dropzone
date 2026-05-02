import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { isUuid } from "../lib/dmUtils.js";

/**
 * Creates or loads a DM thread with a peer (mutual follow enforced server-side), then opens the thread.
 */
export default function MessageStartPage() {
  const { userId } = useParams();
  const { auth } = useApp();
  const [err, setErr] = useState(null);
  const [redirect, setRedirect] = useState(null);

  const me = auth.session?.user?.id;

  useEffect(() => {
    if (!me || !userId || !isUuid(userId) || userId === me) {
      setErr("Invalid user");
      return;
    }
    if (!isSupabaseConfigured()) {
      setErr("Messaging unavailable");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("ensure_direct_message_thread", { p_peer_id: userId });
      if (cancelled) return;
      if (error) {
        setErr(error.message || "Could not open conversation");
        return;
      }
      if (data) setRedirect(String(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [me, userId]);

  if (!me) return <Navigate to="/discover" replace />;
  if (redirect) return <Navigate to={`/messages/${redirect}`} replace />;

  return (
    <div className="fade-in" style={{ padding: 32, color: "var(--text2)", fontSize: 14 }}>
      {err ? <p style={{ color: "var(--red)" }}>{err}</p> : <p>Opening conversation…</p>}
    </div>
  );
}
