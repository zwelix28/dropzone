import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { fmtPlayerTime, fmtStreamedAt } from "../lib/format.js";
import {
  dismissLibrarySession,
  fetchLibrarySessions,
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
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim().toLowerCase();
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

  const visibleSessions = useMemo(() => {
    if (!q) return sessions;
    return sessions.filter((session) => {
      const episode = session.episode;
      if (!episode) return false;
      const artist = users.find((user) => user.id === episode.userId);
      return (
        (episode.title || "").toLowerCase().includes(q) ||
        (artist?.username || "").toLowerCase().includes(q)
      );
    });
  }, [sessions, users, q]);

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
      ) : visibleSessions.length === 0 ? (
        <p style={{ color: "var(--text3)", fontSize: isCompact ? 14 : 15 }}>No sessions match that search.</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: isCompact ? 8 : 10,
          }}
        >
          {visibleSessions.map((session) => {
            const ep = session.episode;
            const isActive = player.currentTrack?.id === ep.id;
            const isPlaying = isActive && player.isPlaying;
            const livePos =
              isActive && Number(player.durationSec) > 0
                ? (Number(player.progress) / 100) * Number(player.durationSec)
                : session.positionSec;
            const dur = (isActive && player.durationSec) || session.durationSec || ep.durationSecs || 0;
            const pct = sessionProgressPct(livePos, dur);
            const busy = busyId === session.mixId;
            const artSize = isCompact ? 72 : Math.round(88 * 1.15);

            return (
              <li
                key={session.mixId}
                className={isCompact ? "track-card track-card-row" : undefined}
                style={{
                  display: "flex",
                  gap: isCompact ? 0 : 16,
                  alignItems: "center",
                  padding: isCompact ? "8px 10px 8px 8px" : 14,
                  background: isActive ? "rgba(56,189,248,0.06)" : "var(--surface)",
                  border: `1px solid ${isActive ? "rgba(56,189,248,0.35)" : "var(--border)"}`,
                  borderRadius: 12,
                  overflow: "hidden",
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
                    width: artSize,
                    height: artSize,
                    borderRadius: isCompact ? 8 : 10,
                    overflow: "hidden",
                    border: isCompact ? "none" : "1px solid var(--border)",
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
                      background: isActive ? "rgba(7,9,15,0.45)" : "rgba(7,9,15,0.22)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        width: isCompact ? 28 : 36,
                        height: isCompact ? 28 : 36,
                        borderRadius: "50%",
                        background: "var(--accent2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 24px var(--glow)",
                      }}
                    >
                      <Icon
                        name={isPlaying ? "pause" : "play"}
                        size={isCompact ? 12 : 16}
                        color="#07090F"
                      />
                    </span>
                  </span>
                </button>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: isCompact ? 6 : 8,
                    paddingLeft: isCompact ? 10 : 0,
                    justifyContent: isCompact ? "center" : undefined,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Link
                        to={`/mix/${ep.id}`}
                        style={{
                          color: "var(--text)",
                          textDecoration: "none",
                          fontWeight: 600,
                          fontSize: isCompact ? 13 : 15,
                          lineHeight: 1.35,
                          display: "block",
                          ...(isCompact
                            ? { wordBreak: "break-word" }
                            : {
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }),
                        }}
                      >
                        {ep.title}
                      </Link>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label={`Remove ${ep.title} from library`}
                      title="Remove session"
                      disabled={busy}
                      onClick={() => void handleRemove(session.mixId)}
                      style={{ padding: 6, flexShrink: 0, marginTop: isCompact ? -2 : 0 }}
                    >
                      <Icon name="x" size={16} color="var(--text3)" />
                    </button>
                  </div>

                  <div>
                    <div className="progress-wrap" style={{ height: isCompact ? 3 : 4 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, height: "100%" }} />
                    </div>
                    {!isCompact ? (
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
                        <span style={{ fontWeight: 700 }}>
                          {fmtPlayerTime(livePos)}
                          {dur > 0 ? ` / ${fmtPlayerTime(dur)}` : ""} · {pct}%
                        </span>
                        <span style={{ fontWeight: 700 }}>
                          {session.updatedAt ? fmtStreamedAt(session.updatedAt) : "Saved"}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {!isCompact ? (
                    <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="lab-home-chip is-on"
                        disabled={busy}
                        onClick={() => void handleResume(session)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <Icon name={isPlaying ? "pause" : "play"} size={14} />
                        {isPlaying ? "Pause" : "Resume"}
                      </button>
                      <Link
                        to={`/mix/${ep.id}`}
                        className="lab-home-chip"
                        style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
                      >
                        Details
                      </Link>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
