import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CommentBody from "./CommentBody.jsx";
import Icon from "./Icon.jsx";
import MentionTextarea from "./MentionTextarea.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { useApp } from "../context/AppContext.jsx";
import { timeSince } from "../lib/format.js";

/**
 * Inline comments for mix detail — same mix_comments data as For You.
 */
export default function MixCommentsSection({ mixId, highlightCommentId, compact = false }) {
  const navigate = useNavigate();
  const { auth, users, fetchMixComments, addMixComment } = useApp();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const highlightedRef = useRef(false);

  const load = useCallback(async () => {
    if (!mixId) return;
    setLoading(true);
    setError("");
    const list = await fetchMixComments(mixId);
    setComments(list);
    setLoading(false);
  }, [fetchMixComments, mixId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    highlightedRef.current = false;
  }, [mixId, highlightCommentId]);

  useEffect(() => {
    if (!highlightCommentId || loading || highlightedRef.current) return;
    const el = document.getElementById(`mix-comment-${highlightCommentId}`);
    if (!el) return;
    highlightedRef.current = true;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [highlightCommentId, loading, comments.length]);

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

  return (
    <section id="mix-comments" className="mix-comments-section" aria-label="Comments">
      <div ref={listRef} className="mix-comments-list">
        {loading ? (
          <p className="mix-comments-empty">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="mix-comments-empty">No comments yet. Use @handle to tag someone.</p>
        ) : (
          comments.map((c) => {
            const author = users.find((u) => u.id === c.userId);
            const isHighlighted = highlightCommentId === c.id;
            const isOwn = auth.session?.user?.id === c.userId;
            const profilePath = author?.id ? `/user/${author.id}` : null;
            const displayName = author?.username || "Listener";
            const handleLabel = author?.handle
              ? author.handle.startsWith("@")
                ? author.handle
                : `@${author.handle}`
              : null;
            return (
              <article
                key={c.id}
                id={`mix-comment-${c.id}`}
                className={`mix-comments-item${isHighlighted ? " is-highlighted" : ""}${isOwn ? " is-own" : ""}`}
              >
                {profilePath ? (
                  <Link
                    to={profilePath}
                    className="mix-comments-avatar-link"
                    aria-label={`View ${displayName}'s profile`}
                  >
                    <UserAvatar user={author} size={compact ? 30 : 34} />
                  </Link>
                ) : (
                  <UserAvatar user={author} size={compact ? 30 : 34} />
                )}
                <div className="mix-comments-item-body">
                  <div className="mix-comments-item-head">
                    {profilePath ? (
                      <Link to={profilePath} className="mix-comments-item-author">
                        <span className="mix-comments-item-name">{displayName}</span>
                        {handleLabel ? (
                          <span className="mix-comments-item-handle">{handleLabel}</span>
                        ) : null}
                      </Link>
                    ) : (
                      <span className="mix-comments-item-author">
                        <span className="mix-comments-item-name">{displayName}</span>
                      </span>
                    )}
                    {isOwn ? <span className="mix-comments-you-badge">You</span> : null}
                    {c.createdAt ? (
                      <span className="mix-comments-item-time">{timeSince(c.createdAt)}</span>
                    ) : null}
                  </div>
                  <CommentBody text={c.body} users={users} />
                </div>
              </article>
            );
          })
        )}
      </div>

      {auth.session?.user?.id ? (
        <form className="mix-comments-compose" onSubmit={handleSubmit}>
          {error ? <p className="mix-comments-compose-error">{error}</p> : null}
          <div className="mix-comments-compose-row">
            <MentionTextarea
              value={body}
              onChange={setBody}
              users={users}
              excludeUserId={auth.session.user.id}
              disabled={submitting}
              onSubmit={handleSubmit}
              placeholder="Share what you think about this mix…"
            />
            <button
              type="submit"
              className="btn btn-primary mix-comments-send"
              aria-label="Post comment"
              disabled={submitting || !body.trim()}
            >
              <Icon name="send" size={15} />
            </button>
          </div>
          <p className="mix-comments-compose-hint">Type @ to tag a DJ or listener</p>
        </form>
      ) : (
        <div className="mix-comments-guest">
          <p>Sign in to join the conversation.</p>
          <div className="mix-comments-guest-actions">
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => auth.setShowAuth(true)}>
              Sign in
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: "100%" }} onClick={() => navigate("/register")}>
              Create account
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
