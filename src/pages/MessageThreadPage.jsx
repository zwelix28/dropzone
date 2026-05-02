import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { isUuid } from "../lib/dmUtils.js";

function fmtMsgTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

export default function MessageThreadPage() {
  const { threadId } = useParams();
  const { auth, users, markDmThreadRead, refreshDmUnreadCount } = useApp();
  const isCompact = useMediaQuery("(max-width: 720px)");
  const me = auth.session?.user?.id;
  const bottomRef = useRef(null);

  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadErr, setLoadErr] = useState(null);

  const validId = threadId && isUuid(threadId);

  const peerId = useMemo(() => {
    if (!thread || !me) return null;
    if (thread.user1_id === me) return thread.user2_id;
    if (thread.user2_id === me) return thread.user1_id;
    return null;
  }, [thread, me]);

  const peer = peerId ? users.find((u) => u.id === peerId) : null;

  const loadThread = useCallback(async () => {
    if (!validId || !me || !isSupabaseConfigured()) return;
    const { data, error } = await supabase.from("dm_threads").select("*").eq("id", threadId).maybeSingle();
    if (error) {
      setLoadErr(error.message);
      setThread(null);
      return;
    }
    if (!data || (data.user1_id !== me && data.user2_id !== me)) {
      setLoadErr("Conversation not found");
      setThread(null);
      return;
    }
    setLoadErr(null);
    setThread(data);
  }, [validId, me, threadId]);

  const loadMessages = useCallback(async () => {
    if (!validId || !me || !isSupabaseConfigured()) return;
    const { data, error } = await supabase
      .from("dm_messages")
      .select("id, sender_id, body, read_at, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (error) {
      console.warn(error.message);
      return;
    }
    setMessages(data || []);
  }, [validId, me, threadId]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!validId || !me) return;
    void markDmThreadRead(threadId);
  }, [validId, me, threadId, markDmThreadRead]);

  useEffect(() => {
    if (!validId || !isSupabaseConfigured()) return;
    const ch = supabase
      .channel(`dm-thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
        () => {
          void loadMessages();
          void markDmThreadRead(threadId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [validId, threadId, loadMessages, markDmThreadRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !peerId || sending || !isSupabaseConfigured()) return;
    setSending(true);
    const { error } = await supabase.rpc("send_direct_message", { p_peer_id: peerId, p_body: body });
    setSending(false);
    if (error) {
      alert(error.message || "Could not send");
      return;
    }
    setText("");
    await loadMessages();
    await loadThread();
    void refreshDmUnreadCount();
  };

  if (!me) return <Navigate to="/discover" replace />;
  if (!validId) return <Navigate to="/messages" replace />;

  if (loadErr && !thread) {
    return (
      <div className="fade-in" style={{ padding: 24 }}>
        <p style={{ color: "var(--red)", marginBottom: 16 }}>{loadErr}</p>
        <Link to="/messages" className="btn btn-ghost">
          Back to inbox
        </Link>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="fade-in" style={{ padding: 24, color: "var(--text3)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div
      className="fade-in"
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: isCompact ? "16px 12px 110px" : "28px 36px 110px",
      }}
    >
      <div className="dm-thread">
        <div className="dm-thread-head">
          <Link
            to="/messages"
            className="btn btn-ghost"
            style={{ padding: "8px 10px", flexShrink: 0, borderRadius: 12 }}
            aria-label="Back to inbox"
          >
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
          <div ref={bottomRef} />
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
    </div>
  );
}
