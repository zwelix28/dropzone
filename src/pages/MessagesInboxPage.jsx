import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { timeSince } from "../lib/format.js";

export default function MessagesInboxPage() {
  const { auth, users, refreshDmUnreadCount, markDmThreadUnread, markDmThreadRead } = useApp();
  const isCompact = useMediaQuery("(max-width: 720px)");
  const me = auth.session?.user?.id;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !me) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: e } = await supabase.rpc("list_dm_inbox");
    if (e) {
      setError(e.message);
      setRows([]);
    } else {
      setError(null);
      setRows(Array.isArray(data) ? data : []);
    }
    setLoading(false);
    void refreshDmUnreadCount();
  }, [me, refreshDmUnreadCount]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !me) return;
    const ch = supabase
      .channel(`dm-inbox-${me}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_threads", filter: `user1_id=eq.${me}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_threads", filter: `user2_id=eq.${me}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me, load]);

  if (!me) return <Navigate to="/discover" replace />;

  return (
    <div className="fade-in dm-wrap" style={{ padding: isCompact ? "16px 12px" : "32px 36px" }}>
      <div className="dm-header">
        <div style={{ minWidth: 0 }}>
          <h1 className="dm-title" style={{ fontSize: isCompact ? 28 : 40 }}>MESSAGES</h1>
          <p className="dm-subtitle">Mutual followers only. Keep it professional—this is your inbox.</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text3)", fontSize: 14 }}>Loading…</p>
      ) : error ? (
        <p style={{ color: "var(--red)", fontSize: 14 }}>{error}</p>
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: isCompact ? 22 : 28,
            textAlign: "center",
            border: "1px dashed var(--border)",
            borderRadius: 16,
            color: "var(--text3)",
            fontSize: 14,
            background: "rgba(17,24,39,0.55)",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <Icon name="mail" size={36} color="var(--text3)" />
          </div>
          <p>No conversations yet. Visit a profile you mutually follow and tap Message.</p>
        </div>
      ) : (
        <div className="dm-list">
          {rows.map((r) => {
            const peerId = r.peer_id;
            const threadId = r.thread_id;
            const peer = users.find((u) => u.id === peerId);
            const unread = Number(r.unread_count) || 0;
            const preview = (r.last_preview || "").trim() || "No messages yet";
            const updatedAt = r.thread_updated_at || null;
            const when = updatedAt ? timeSince(updatedAt) : "";
            return (
              <div
                key={threadId}
                className="dm-row"
              >
                <Link
                  to={`/messages/${threadId}`}
                  className="dm-row-link"
                >
                  <UserAvatar
                    user={peer || { id: peerId, username: "User", handle: "", avatar: "" }}
                    size={44}
                    showVerified
                  />
                  <div className="dm-row-meta">
                    <div className="dm-row-top">
                      <span className="dm-peer">
                        <span className="dm-peer-name">{peer?.username || "User"}</span>
                        {peer?.verified ? <VerifiedBadge size={15} /> : null}
                        {peer?.handle ? <span className="dm-peer-handle">{peer.handle}</span> : null}
                      </span>
                      <span className="dm-time">{when}</span>
                    </div>
                    <div className="dm-preview">{preview}</div>
                  </div>
                  <div className="dm-row-right">
                    {unread > 0 ? <span className="dm-unread-pill">{unread > 99 ? "99+" : unread}</span> : null}
                    <span style={{ display: "inline-block", transform: "rotate(-90deg)" }}>
                      <Icon name="chevronDown" size={18} color="var(--text3)" />
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  className="btn btn-ghost"
                  title={unread > 0 ? "Mark read" : "Mark unread"}
                  style={{
                    padding: "8px 10px",
                    minWidth: 44,
                    minHeight: 44,
                    justifyContent: "center",
                    flexShrink: 0,
                    marginRight: 10,
                    borderRadius: 12,
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (unread > 0) void markDmThreadRead(threadId);
                    else void markDmThreadUnread(threadId);
                  }}
                >
                  <Icon name={unread > 0 ? "check" : "mail"} size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
