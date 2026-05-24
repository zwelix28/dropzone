import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function ForYouComments({ mixId, mixTitle, open, onClose }) {
  const navigate = useNavigate();
  const { auth, users, fetchMixComments, addMixComment } = useApp();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!mixId || !open) return;
    setLoading(true);
    setError("");
    const list = await fetchMixComments(mixId);
    setComments(list);
    setLoading(false);
  }, [fetchMixComments, mixId, open]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (!auth.session?.user?.id) {
      auth.setShowAuth(true);
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await addMixComment(mixId, text);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || "Could not post comment.");
      return;
    }
    setBody("");
    await load();
  };

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 900,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        role="dialog"
        aria-label="Comments"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          right: 0,
          bottom: 0,
          top: 0,
          width: "min(420px, 100vw)",
          zIndex: 910,
          background: "var(--bg2)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 18px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Comments</div>
            {mixTitle ? (
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {mixTitle}
              </div>
            ) : null}
          </div>
          <button type="button" className="btn btn-ghost" aria-label="Close comments" onClick={onClose} style={{ padding: 8 }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", WebkitOverflowScrolling: "touch" }}>
          {loading ? (
            <p style={{ color: "var(--text3)", fontSize: 14, textAlign: "center", marginTop: 24 }}>Loading…</p>
          ) : comments.length === 0 ? (
            <p style={{ color: "var(--text3)", fontSize: 14, textAlign: "center", marginTop: 24 }}>
              No comments yet. Be the first.
            </p>
          ) : (
            comments.map((c) => {
              const author = users.find((u) => u.id === c.userId);
              return (
                <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <UserAvatar user={author} size={36} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{author?.username || "DJ"}</div>
                    <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                      {c.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {auth.session?.user?.id ? (
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
              background: "rgba(7,9,15,0.6)",
            }}
          >
            {error ? <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>{error}</p> : null}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="inp"
                placeholder="Add a comment…"
                value={body}
                maxLength={500}
                onChange={(e) => setBody(e.target.value)}
                style={{ flex: 1, height: 42 }}
              />
              <button type="submit" className="btn btn-primary" disabled={submitting || !body.trim()} style={{ padding: "0 14px" }}>
                <Icon name="send" size={16} />
              </button>
            </div>
          </form>
        ) : (
          <div
            style={{
              padding: "16px",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
              background: "rgba(7,9,15,0.6)",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 13, color: "var(--text2)", margin: "0 0 12px", lineHeight: 1.45 }}>
              Sign in or create an account to join the conversation.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => auth.setShowAuth(true)}>
                Sign in
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: "100%" }}
                onClick={() => {
                  onClose();
                  navigate("/register");
                }}
              >
                Create account
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
