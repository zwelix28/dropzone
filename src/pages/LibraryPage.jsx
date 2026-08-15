import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { fmtPlayerTime, timeSince } from "../lib/format.js";
import {
  dismissLibrarySession,
  fetchLibrarySessions,
  LIBRARY_MAX_SESSIONS,
} from "../lib/playbackProgress.js";
import { signedInHomePath } from "../featureFlags.js";

function sessionProgressPct(positionSec, durationSec) {
  const dur = Number(durationSec) || 0;
  const pos = Number(positionSec) || 0;
  if (dur <= 0) return 0;
  return Math.min(99, Math.max(1, Math.round((pos / dur) * 100)));
}

export default function LibraryPage() {
  const { auth, episodes, users, player } = useApp();
  const isCompact = useMediaQuery("(max-width: 720px)");
  const userId = auth.session?.user?.id;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const episodesRef = useRef(episodes);
  episodesRef.current = episodes;
  const loadedUserIdRef = useRef(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!userId) {
      loadedUserIdRef.current = null;
      setSessions([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    const list = await fetchLibrarySessions(userId, episodesRef.current);
    setSessions(list);
    loadedUserIdRef.current = userId;
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (loadedUserIdRef.current === userId) return;
    void load();
  }, [load, userId]);

  useEffect(() => {
    const onFocus = () => {
      void load({ silent: true });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  if (!userId) {
    return <Navigate to="/" replace />;
  }

  const handleResume = (session) => {
    if (!session?.episode) return;
    void player.playTrack(session.episode);
  };

  const handleRemove = async (mixId) => {
    if (!userId || !mixId) return;
    setBusyId(mixId);
    await dismissLibrarySession(userId, mixId);
    setSessions((prev) => prev.filter((s) => s.mixId !== mixId));
    setBusyId(null);
  };

  return (
    <div
      className="fade-in"
      style={{
        padding: isCompact ? "16px 12px" : "32px 36px",
        paddingBottom: 120,
        maxWidth: 920,
      }}
    >
      <PageHeader icon="library" title="LIBRARY" />

      <p
        style={{
          color: "var(--text2)",
          fontSize: isCompact ? 13 : 14,
          lineHeight: 1.55,
          margin: isCompact ? "0 0 18px" : "0 0 24px",
          maxWidth: 520,
        }}
      >
        Pick up where you left off. You can track up to {LIBRARY_MAX_SESSIONS} sessions at a time —
        starting a new one may replace your oldest. Sessions are saved as you listen so you can resume
        after logout or closing the app.
      </p>

      {loading ? (
        <p style={{ color: "var(--text3)", fontSize: 14 }}>Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <div
          style={{
            padding: isCompact ? "28px 16px" : "40px 24px",
            textAlign: "center",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            maxWidth: 420,
          }}
        >
          <Icon name="library" size={28} color="var(--text3)" />
          <p style={{ color: "var(--text3)", fontSize: isCompact ? 14 : 15, margin: "14px 0 16px", lineHeight: 1.6 }}>
            No sessions in progress. Start a mix and it will show up here so you can continue later.
          </p>
          <Link
            to={signedInHomePath()}
            className="btn btn-primary"
            style={isCompact ? { width: "100%", justifyContent: "center" } : undefined}
          >
            Browse mixes
          </Link>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {sessions.map((session) => {
            const ep = session.episode;
            const artist = users.find((u) => u.id === ep.userId);
            const isActive = player.currentTrack?.id === ep.id;
            const isPlaying = isActive && player.isPlaying;
            const livePos =
              isActive && Number(player.durationSec) > 0
                ? (Number(player.progress) / 100) * Number(player.durationSec)
                : session.positionSec;
            const dur = (isActive && player.durationSec) || session.durationSec || ep.durationSecs || 0;
            const pct = sessionProgressPct(livePos, dur);
            const busy = busyId === session.mixId;

            return (
              <li
                key={session.mixId}
                style={{
                  display: "flex",
                  gap: isCompact ? 12 : 16,
                  alignItems: "stretch",
                  padding: isCompact ? 10 : 14,
                  background: isActive ? "rgba(56,189,248,0.06)" : "var(--surface)",
                  border: `1px solid ${isActive ? "rgba(56,189,248,0.35)" : "var(--border)"}`,
                  borderRadius: 12,
                }}
              >
                <button
                  type="button"
                  aria-label={isPlaying ? `Pause ${ep.title}` : `Resume ${ep.title}`}
                  disabled={busy}
                  onClick={() => void handleResume(session)}
                  style={{
                    position: "relative",
                    flexShrink: 0,
                    width: isCompact ? 72 : 88,
                    height: isCompact ? 72 : 88,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    padding: 0,
                    cursor: "pointer",
                    background: "var(--bg2)",
                  }}
                >
                  <img
                    src={resolveMixArtwork(ep.coverUrl)}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={handleArtworkError}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(7,9,15,0.45)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={isPlaying ? "pause" : "play"} size={isCompact ? 18 : 22} color="#fff" />
                  </span>
                </button>

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <Link
                        to={`/mix/${ep.id}`}
                        style={{
                          color: "var(--text)",
                          textDecoration: "none",
                          fontWeight: 700,
                          fontSize: isCompact ? 14 : 15,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ep.title}
                      </Link>
                      {artist ? (
                        <Link
                          to={`/user/${artist.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 4,
                            color: "var(--text2)",
                            textDecoration: "none",
                            fontSize: 12,
                          }}
                        >
                          <UserAvatar user={artist} size={16} showVerified={false} />
                          <span>{artist.username}</span>
                          {artist.verified ? <VerifiedBadge size={11} /> : null}
                        </Link>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label={`Remove ${ep.title} from library`}
                      title="Remove session"
                      disabled={busy}
                      onClick={() => void handleRemove(session.mixId)}
                      style={{ padding: 6, flexShrink: 0 }}
                    >
                      <Icon name="x" size={16} color="var(--text3)" />
                    </button>
                  </div>

                  <div>
                    <div className="progress-wrap" style={{ height: 4 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, height: "100%" }} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        marginTop: 6,
                        fontSize: 11,
                        color: "var(--text3)",
                      }}
                    >
                      <span>
                        {fmtPlayerTime(livePos)}
                        {dur > 0 ? ` / ${fmtPlayerTime(dur)}` : ""} · {pct}%
                      </span>
                      <span>{session.updatedAt ? timeSince(session.updatedAt) : "Saved"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => void handleResume(session)}
                      style={{
                        padding: isCompact ? "7px 12px" : "8px 14px",
                        fontSize: 13,
                        gap: 6,
                      }}
                    >
                      <Icon name={isPlaying ? "pause" : "play"} size={14} />
                      {isPlaying ? "Pause" : "Resume"}
                    </button>
                    <Link
                      to={`/mix/${ep.id}`}
                      className="btn btn-ghost"
                      style={{ padding: isCompact ? "7px 12px" : "8px 14px", fontSize: 13 }}
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
