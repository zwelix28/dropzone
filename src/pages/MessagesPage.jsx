import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { timeSince } from "../lib/format.js";
import { isUuid } from "../lib/dmUtils.js";

function fmtMsgTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

export default function MessagesPage() {
  const { threadId } = useParams();
  const { auth, users, refreshDmUnreadCount, markDmThreadUnread, markDmThreadRead } = useApp();
  const isMobile = useMediaQuery("(max-width: 720px)");
  const isWide = useMediaQuery("(min-width: 980px)");

  const me = auth.session?.user?.id;
  const selectedThreadId = threadId && isUuid(threadId) ? threadId : null;

  // Inbox list
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadInbox = useCallback(async () => {
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
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !me) return;
    const ch = supabase
      .channel(`dm-inbox-${me}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_threads", filter: `user1_id=eq.${me}` }, () => void loadInbox())
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_threads", filter: `user2_id=eq.${me}` }, () => void loadInbox())
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [me, loadInbox]);

  // Thread
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [threadErr, setThreadErr] = useState(null);

  const peerId = useMemo(() => {
    if (!thread || !me) return null;
    if (thread.user1_id === me) return thread.user2_id;
    if (thread.user2_id === me) return thread.user1_id;
    return null;
  }, [thread, me]);

  const peer = peerId ? users.find((u) => u.id === peerId) : null;

  const loadThread = useCallback(async () => {
    if (!selectedThreadId || !me || !isSupabaseConfigured()) {
      setThread(null);
      setMessages([]);
      setThreadErr(null);
      return;
    }
    const { data, error: e } = await supabase.from("dm_threads").select("*").eq("id", selectedThreadId).maybeSingle();
    if (e) {
      setThreadErr(e.message);
      setThread(null);
      return;
    }
    if (!data || (data.user1_id !== me && data.user2_id !== me)) {
      setThreadErr("Conversation not found");
      setThread(null);
      return;
    }
    setThreadErr(null);
    setThread(data);
  }, [selectedThreadId, me]);

  const loadMessages = useCallback(async () => {
    if (!selectedThreadId || !me || !isSupabaseConfigured()) return;
    const { data, error: e } = await supabase
      .from("dm_messages")
      .select("id, sender_id, body, read_at, created_at")
      .eq("thread_id", selectedThreadId)
      .order("created_at", { ascending: true });
    if (!e) setMessages(data || []);
  }, [selectedThreadId, me]);

  useEffect(() => {
    void loadThread();
    void loadMessages();
    if (selectedThreadId) void markDmThreadRead(selectedThreadId);
  }, [selectedThreadId, loadThread, loadMessages, markDmThreadRead]);

  useEffect(() => {
    if (!selectedThreadId || !isSupabaseConfigured()) return;
    const ch = supabase
      .channel(`dm-thread-${selectedThreadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${selectedThreadId}` }, () => {
        void loadMessages();
        void markDmThreadRead(selectedThreadId);
        void loadInbox();
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [selectedThreadId, loadMessages, markDmThreadRead, loadInbox]);

  const send = async () => {
    const body = text.trim();
    if (!body || !peerId || sending || !isSupabaseConfigured()) return;
    setSending(true);
    const { error: e } = await supabase.rpc("send_direct_message", { p_peer_id: peerId, p_body: body });
    setSending(false);
    if (e) {
      alert(e.message || "Could not send");
      return;
    }
    setText("");
    await loadMessages();
    await loadThread();
    void loadInbox();
    void refreshDmUnreadCount();
  };

  if (!me) return <Navigate to="/discover" replace />;

  // Mobile: render single-pane (inbox OR thread) without redirects.
  if (isMobile) {
    if (!selectedThreadId) {
      return (
        <div className="fade-in dm-wrap" style={{ padding: "16px 12px" }}>
          <div className="dm-header">
            <div style={{ minWidth: 0 }}>
              <h1 className="dm-title" style={{ fontSize: 28 }}>MESSAGES</h1>
              <p className="dm-subtitle">Mutual followers only.</p>
            </div>
          </div>

          {loading ? (
            <div style={{ color: "var(--text3)", fontSize: 14, padding: 10 }}>Loading…</div>
          ) : error ? (
            <div style={{ color: "var(--red)", fontSize: 14, padding: 10 }}>{error}</div>
          ) : rows.length === 0 ? (
            <div
              style={{
                padding: 22,
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
                const tid = r.thread_id;
                const peer = users.find((u) => u.id === peerId);
                const unread = Number(r.unread_count) || 0;
                const preview = (r.last_preview || "").trim() || "No messages yet";
                const when = r.thread_updated_at ? timeSince(r.thread_updated_at) : "";
                return (
                  <div key={tid} className="dm-row">
                    <Link to={`/messages/${tid}`} className="dm-row-link">
                      <UserAvatar user={peer || { id: peerId, username: "User", handle: "", avatar: "" }} size={44} showVerified />
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
                      style={{ padding: "8px 10px", minWidth: 44, minHeight: 44, justifyContent: "center", flexShrink: 0, marginRight: 10, borderRadius: 12 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (unread > 0) void markDmThreadRead(tid);
                        else void markDmThreadUnread(tid);
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

    // Mobile thread view
    return (
      <div className="fade-in dm-wrap" style={{ padding: "16px 12px 110px" }}>
        {threadErr ? (
          <div style={{ padding: 24, color: "var(--red)" }}>{threadErr}</div>
        ) : !thread ? (
          <div style={{ padding: 24, color: "var(--text3)" }}>Loading…</div>
        ) : (
          <div className="dm-thread">
            <div className="dm-thread-head">
              <Link to="/messages" className="btn btn-ghost" style={{ padding: "8px 10px", flexShrink: 0, borderRadius: 12 }} aria-label="Back to inbox">
                <span style={{ display: "inline-block", transform: "rotate(90deg)" }}>
                  <Icon name="chevronDown" size={20} color="var(--text2)" />
                </span>
              </Link>

              <UserAvatar user={peer || { id: peerId, username: "User", handle: "", avatar: "" }} size={40} showVerified />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: "0.01em" }}>{peer?.username || "User"}</span>
                  {peer?.verified ? <VerifiedBadge size={16} /> : null}
                  {peer?.handle ? <span style={{ fontSize: 12, color: "var(--text3)" }}>{peer.handle}</span> : null}
                </div>
                {peerId ? (
                  <Link to={`/user/${peerId}`} style={{ fontSize: 12, color: "var(--accent)" }}>
                    View profile
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="dm-thread-body">
              {messages.length === 0 ? (
                <div style={{ padding: 28, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
                  Say hello — send the first message.
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === me;
                  return (
                    <div key={m.id} className="dm-bubble-row" style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "100%" }}>
                        <div className={`dm-bubble ${mine ? "mine" : "theirs"}`}>{m.body}</div>
                        <div className="dm-bubble-meta" style={{ textAlign: mine ? "right" : "left" }}>
                          {fmtMsgTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="dm-compose">
              <textarea
                className="inp"
                placeholder="Write a message…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                maxLength={4000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button type="button" className="btn btn-primary dm-send-btn" disabled={sending || !text.trim()} onClick={() => void send()} aria-label="Send" title="Send">
                <Icon name="send" size={18} color="#07090f" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in dm-wrap" style={{ padding: "28px 36px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isWide ? "360px minmax(0, 1fr)" : "320px minmax(0, 1fr)",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Left: Inbox */}
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 12 }}>
            <h1 className="dm-title" style={{ fontSize: 34 }}>MESSAGES</h1>
            <p className="dm-subtitle">Mutual followers only.</p>
          </div>

          {loading ? (
            <div style={{ color: "var(--text3)", fontSize: 14, padding: 10 }}>Loading…</div>
          ) : error ? (
            <div style={{ color: "var(--red)", fontSize: 14, padding: 10 }}>{error}</div>
          ) : rows.length === 0 ? (
            <div
              style={{
                padding: 18,
                borderRadius: 16,
                border: "1px dashed var(--border)",
                background: "rgba(17,24,39,0.55)",
                color: "var(--text3)",
                fontSize: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="mail" size={20} color="var(--text3)" />
                No conversations yet.
              </div>
            </div>
          ) : (
            <div className="dm-list">
              {rows.map((r) => {
                const peerId = r.peer_id;
                const tid = r.thread_id;
                const peer = users.find((u) => u.id === peerId);
                const unread = Number(r.unread_count) || 0;
                const preview = (r.last_preview || "").trim() || "No messages yet";
                const when = r.thread_updated_at ? timeSince(r.thread_updated_at) : "";
                const active = selectedThreadId === tid;

                return (
                  <div
                    key={tid}
                    className="dm-row"
                    style={
                      active
                        ? { borderColor: "rgba(56,189,248,0.55)", boxShadow: "0 0 0 1px rgba(56,189,248,0.35), 0 18px 42px rgba(0,0,0,0.45)" }
                        : undefined
                    }
                  >
                    <Link to={`/messages/${tid}`} className="dm-row-link">
                      <UserAvatar user={peer || { id: peerId, username: "User", handle: "", avatar: "" }} size={42} showVerified />
                      <div className="dm-row-meta">
                        <div className="dm-row-top">
                          <span className="dm-peer">
                            <span className="dm-peer-name">{peer?.username || "User"}</span>
                            {peer?.verified ? <VerifiedBadge size={14} /> : null}
                          </span>
                          <span className="dm-time">{when}</span>
                        </div>
                        <div className="dm-preview">{preview}</div>
                      </div>
                      <div className="dm-row-right">
                        {unread > 0 ? <span className="dm-unread-pill">{unread > 99 ? "99+" : unread}</span> : null}
                      </div>
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      title={unread > 0 ? "Mark read" : "Mark unread"}
                      style={{ padding: "8px 10px", minWidth: 44, minHeight: 44, justifyContent: "center", flexShrink: 0, marginRight: 10, borderRadius: 12 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (unread > 0) void markDmThreadRead(tid);
                        else void markDmThreadUnread(tid);
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

        {/* Right: Thread */}
        <div style={{ minWidth: 0 }}>
          {!selectedThreadId ? (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 16,
                background: "rgba(17,24,39,0.55)",
                padding: 26,
                color: "var(--text3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Icon name="mail" size={20} color="var(--text3)" />
                Select a conversation
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>Pick a chat from the left to start messaging.</div>
            </div>
          ) : threadErr ? (
            <div style={{ padding: 24, color: "var(--red)" }}>{threadErr}</div>
          ) : !thread ? (
            <div style={{ padding: 24, color: "var(--text3)" }}>Loading…</div>
          ) : (
            <div className="dm-thread">
              <div className="dm-thread-head">
                <UserAvatar user={peer || { id: peerId, username: "User", handle: "", avatar: "" }} size={40} showVerified />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: "0.01em" }}>{peer?.username || "User"}</span>
                    {peer?.verified ? <VerifiedBadge size={16} /> : null}
                    {peer?.handle ? <span style={{ fontSize: 12, color: "var(--text3)" }}>{peer.handle}</span> : null}
                  </div>
                  {peerId ? (
                    <Link to={`/user/${peerId}`} style={{ fontSize: 12, color: "var(--accent)" }}>
                      View profile
                    </Link>
                  ) : null}
                </div>
                {peerId ? (
                  <Link to={`/user/${peerId}`} className="btn btn-ghost" style={{ padding: "8px 12px", borderRadius: 12 }}>
                    <Icon name="eye" size={16} />
                    Profile
                  </Link>
                ) : null}
              </div>

              <div className="dm-thread-body">
                {messages.length === 0 ? (
                  <div style={{ padding: 28, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
                    Say hello — send the first message.
                  </div>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === me;
                    return (
                      <div key={m.id} className="dm-bubble-row" style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "100%" }}>
                          <div className={`dm-bubble ${mine ? "mine" : "theirs"}`}>{m.body}</div>
                          <div className="dm-bubble-meta" style={{ textAlign: mine ? "right" : "left" }}>
                            {fmtMsgTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="dm-compose">
                <textarea
                  className="inp"
                  placeholder="Write a message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={2}
                  maxLength={4000}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary dm-send-btn"
                  disabled={sending || !text.trim()}
                  onClick={() => void send()}
                  aria-label="Send"
                  title="Send"
                >
                  <Icon name="send" size={18} color="#07090f" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

