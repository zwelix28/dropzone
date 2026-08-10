import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import CommentBody from "./CommentBody.jsx";
import Icon from "./Icon.jsx";
import MentionTextarea from "./MentionTextarea.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { useApp } from "../context/AppContext.jsx";
import { timeSince } from "../lib/format.js";

export default function ForYouComments({ mixId, mixTitle, open, onClose, highlightCommentId }) {
  const navigate = useNavigate();
  const { auth, users, fetchMixComments, addMixComment } = useApp();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const highlightedRef = useRef(false);

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
    if (!open) {
      setBody("");
      setError("");
      highlightedRef.current = false;
      return;
    }
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !highlightCommentId || loading || highlightedRef.current) return;
    const el = document.getElementById(`comment-${highlightCommentId}`);
    if (!el) return;
    highlightedRef.current = true;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [open, highlightCommentId, loading, comments.length]);

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
    window.requestAnimationFrame(() => {
      const list = listRef.current;
      if (list) list.scrollTop = list.scrollHeight;
    });
  };

  const commentCount = comments.length;

  return createPortal(
    <>
      <div role="presentation" className="for-you-comments-backdrop" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
        className="for-you-comments-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="for-you-comments-header">
          <div style={{ minWidth: 0 }}>
            <div className="for-you-comments-header-title">
              Comments{commentCount > 0 ? ` · ${commentCount}` : ""}
            </div>
            {mixTitle ? <div className="for-you-comments-header-meta">{mixTitle}</div> : null}
            <div className="for-you-comments-header-hint">Type @ to tag someone</div>
          </div>
          <button type="button" className="btn btn-ghost for-you-comments-close" aria-label="Close comments" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </header>

        <div ref={listRef} className="for-you-comments-list">
          {loading ? (
            <p className="for-you-comments-empty">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="for-you-comments-empty">No comments yet. Be the first — use @handle to tag a DJ.</p>
          ) : (
            comments.map((c) => {
              const author = users.find((u) => u.id === c.userId);
              const isHighlighted = highlightCommentId === c.id;
              return (
                <article
                  key={c.id}
                  id={`comment-${c.id}`}
                  className={`for-you-comments-item${isHighlighted ? " is-highlighted" : ""}`}
                >
                  <UserAvatar user={author} size={32} />
                  <div className="for-you-comments-item-body">
                    <div className="for-you-comments-item-head">
                      <span className="for-you-comments-item-author">{author?.username || "DJ"}</span>
                      {c.createdAt ? (
                        <span className="for-you-comments-item-time">{timeSince(c.createdAt)}</span>
                      ) : null}
                    </div>
                    <CommentBody text={c.body} users={users} onMentionClick={onClose} />
                  </div>
                </article>
              );
            })
          )}
        </div>

        {auth.session?.user?.id ? (
          <form className="for-you-comments-compose" onSubmit={handleSubmit}>
            {error ? <p className="for-you-comments-compose-error">{error}</p> : null}
            <div className="for-you-comments-compose-row">
              <MentionTextarea
                value={body}
                onChange={setBody}
                users={users}
                excludeUserId={auth.session.user.id}
                disabled={submitting}
                onSubmit={handleSubmit}
              />
              <button
                type="submit"
                className="btn btn-primary for-you-comments-send"
                aria-label="Post comment"
                disabled={submitting || !body.trim()}
              >
                <Icon name="send" size={15} />
              </button>
            </div>
          </form>
        ) : (
          <div className="for-you-comments-guest">
            <p>Sign in to join the conversation.</p>
            <div className="for-you-comments-guest-actions">
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
      </aside>
    </>,
    document.body,
  );
}
