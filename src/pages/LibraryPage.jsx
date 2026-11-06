import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { fmtDuration, fmtPlayerTime, fmtStreamedAt } from "../lib/format.js";
import { prefetchMixPlayback } from "../lib/audioUrls.js";
import {
  dismissLibrarySession,
  fetchLibrarySessions,
} from "../lib/playbackProgress.js";
import { signedInHomePath } from "../featureFlags.js";
import { scrollAppMainToTop } from "../lib/scrollAppMain.js";

const DESKTOP_PAGE_SIZE = 8;
const MOBILE_PAGE_SIZE = 12;

function sessionProgressPct(positionSec, durationSec) {
  const dur = Number(durationSec) || 0;
  const pos = Number(positionSec) || 0;
  if (dur <= 0) return 0;
  return Math.min(99, Math.max(1, Math.round((pos / dur) * 100)));
}

function LibraryListRow({
  session,
  user,
  isActive,
  isPlaying,
  livePos,
  dur,
  pct,
  busy,
  onResume,
  onRemove,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const episode = session.episode;
  const description = (episode.description || "").trim();

  const openMix = () => {
    navigate(`/mix/${episode.id}`, { state: { from: location.pathname } });
  };

  const handleResume = (event) => {
    event.stopPropagation();
    event.preventDefault();
    onResume?.(session);
  };

  return (
    <article className={`mixes-row library-row${isActive ? " is-active" : ""}`}>
      <div className="mixes-row-art">
        <img
          src={resolveMixArtwork(episode.coverUrl)}
          alt=""
          onError={handleArtworkError}
        />
        <button
          type="button"
          className="mixes-row-play"
          aria-label={isPlaying ? `Pause ${episode.title}` : `Resume ${episode.title}`}
          disabled={busy}
          onClick={handleResume}
        >
          <Icon name={isPlaying ? "pause" : "play"} size={22} color="#07090F" />
        </button>
      </div>

      <div className="mixes-row-body">
        <div className="mixes-row-top">
          <div className="mixes-row-copy">
            <h2 className="mixes-row-title">{episode.title || "Untitled Mix"}</h2>
            {user ? (
              <Link to={`/user/${user.id}`} className="mixes-row-artist" onClick={(e) => e.stopPropagation()}>
                <UserAvatar user={user} size={22} />
                <span>{user.username}</span>
                {user.verified ? <VerifiedBadge size={13} /> : null}
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost library-row-remove"
            aria-label={`Remove ${episode.title} from library`}
            title="Remove session"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(session.mixId);
            }}
          >
            <Icon name="x" size={16} color="var(--text3)" />
          </button>
        </div>

        {description ? <p className="mixes-row-desc">{description}</p> : null}

        <div className="library-row-progress">
          <div className="progress-wrap" style={{ height: 4 }}>
            <div className="progress-fill" style={{ width: `${pct}%`, height: "100%" }} />
          </div>
          <div className="library-row-progress-meta">
            <span>
              {fmtPlayerTime(livePos)}
              {dur > 0 ? ` / ${fmtPlayerTime(dur)}` : ""} · {pct}%
            </span>
            <span>{session.updatedAt ? fmtStreamedAt(session.updatedAt) : "Saved"}</span>
          </div>
        </div>

        <div className="mixes-row-meta">
          {episode.genre ? <span className="tag tag-blue">{episode.genre}</span> : null}
          {episode.durationSecs ? <span>{fmtDuration(episode.durationSecs)}</span> : null}
        </div>

        <div className="mixes-row-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={handleResume}>
            <Icon name={isPlaying ? "pause" : "play"} size={15} />
            {isPlaying ? "Pause" : "Resume"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={openMix}>
            View mix
          </button>
        </div>
      </div>
    </article>
  );
}

function LibraryMobileRow({
  session,
  isPlaying,
  pct,
  busy,
  onResume,
  onRemove,
}) {
  const episode = session.episode;

  return (
    <li className="track-card track-card-row library-mobile-row">
      <button
        type="button"
        aria-label={isPlaying ? `Pause ${episode.title}` : `Resume ${episode.title}`}
        disabled={busy}
        onClick={() => onResume?.(session)}
        className="library-mobile-art"
      >
        <img
          src={resolveMixArtwork(episode.coverUrl)}
          alt=""
          onError={handleArtworkError}
        />
        <span className="library-mobile-art-overlay">
          <span className="library-mobile-play">
            <Icon name={isPlaying ? "pause" : "play"} size={12} color="#07090F" />
          </span>
        </span>
      </button>

      <div className="library-mobile-body">
        <div className="library-mobile-top">
          <Link to={`/mix/${episode.id}`} className="library-mobile-title">
            {episode.title}
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label={`Remove ${episode.title} from library`}
            title="Remove session"
            disabled={busy}
            onClick={() => onRemove?.(session.mixId)}
          >
            <Icon name="x" size={16} color="var(--text3)" />
          </button>
        </div>
        <div className="progress-wrap" style={{ height: 3 }}>
          <div className="progress-fill" style={{ width: `${pct}%`, height: "100%" }} />
        </div>
      </div>
    </li>
  );
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
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    if (!userId) return;
    const opts = { guestPreviewOnly: false, isAuthenticated: true, preferFullMix: false };
    for (const session of sessions.slice(0, 5)) {
      if (!session?.episode?.id) continue;
      void prefetchMixPlayback(session.episode, opts, {
        warm: true,
        seekSec: Number(session.positionSec) || 0,
      });
    }
  }, [userId, sessions]);

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

  const pageSize = isCompact ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(visibleSessions.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [q, isCompact]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleSessions.slice(start, start + pageSize);
  }, [visibleSessions, page, pageSize]);

  const rangeStart = visibleSessions.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(visibleSessions.length, page * pageSize);

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

  const goPage = (next) => {
    setPage(next);
    scrollAppMainToTop({ smooth: true });
  };

  return (
    <div className={`fade-in mixes-page library-page${isCompact ? " is-compact" : ""}`}>
      <PageHeader icon="library" title="LIBRARY" large marginBottom={isCompact ? 16 : 20} />
      <p className="mixes-lede">
        Pick up where you left off — full artwork and progress for every session in progress.
      </p>

      {loading ? (
        <p className="library-status">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <div className="mixes-empty library-empty">
          <Icon name="library" size={40} color="var(--text3)" />
          <p>No sessions in progress. Start a mix and it will show up here so you can continue later.</p>
          <Link to={signedInHomePath()} className="btn btn-primary">
            Browse mixes
          </Link>
        </div>
      ) : visibleSessions.length === 0 ? (
        <p className="library-status">No sessions match that search.</p>
      ) : (
        <>
          <div className="mixes-toolbar">
            <span>
              Showing {rangeStart}–{rangeEnd} of {visibleSessions.length}
            </span>
            {totalPages > 1 ? (
              <span>
                Page {page} of {totalPages}
              </span>
            ) : null}
          </div>

          {isCompact ? (
            <ul className="library-mobile-list">
              {pageItems.map((session) => {
                const ep = session.episode;
                const isActive = player.currentTrack?.id === ep.id;
                const isPlaying = isActive && player.isPlaying;
                const livePos =
                  isActive && Number(player.durationSec) > 0
                    ? (Number(player.progress) / 100) * Number(player.durationSec)
                    : session.positionSec;
                const dur = (isActive && player.durationSec) || session.durationSec || ep.durationSecs || 0;
                const pct = sessionProgressPct(livePos, dur);
                return (
                  <LibraryMobileRow
                    key={session.mixId}
                    session={session}
                    isPlaying={isPlaying}
                    pct={pct}
                    busy={busyId === session.mixId}
                    onResume={handleResume}
                    onRemove={handleRemove}
                  />
                );
              })}
            </ul>
          ) : (
            <div className="mixes-list" role="list">
              {pageItems.map((session) => {
                const ep = session.episode;
                const user = users.find((u) => u.id === ep.userId);
                const isActive = player.currentTrack?.id === ep.id;
                const isPlaying = isActive && player.isPlaying;
                const livePos =
                  isActive && Number(player.durationSec) > 0
                    ? (Number(player.progress) / 100) * Number(player.durationSec)
                    : session.positionSec;
                const dur = (isActive && player.durationSec) || session.durationSec || ep.durationSecs || 0;
                const pct = sessionProgressPct(livePos, dur);
                return (
                  <div key={session.mixId} role="listitem">
                    <LibraryListRow
                      session={session}
                      user={user}
                      isActive={isActive}
                      isPlaying={isPlaying}
                      livePos={livePos}
                      dur={dur}
                      pct={pct}
                      busy={busyId === session.mixId}
                      onResume={handleResume}
                      onRemove={handleRemove}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="mixes-pager" aria-label="Library pages">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => goPage(Math.max(1, page - 1))}
              >
                <Icon name="chevronLeft" size={16} />
                Previous
              </button>
              <div className="mixes-pager-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, idx) =>
                    n === "…" ? (
                      <span key={`gap-${idx}`} className="mixes-pager-gap">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        className={`mixes-pager-num${page === n ? " is-on" : ""}`}
                        aria-current={page === n ? "page" : undefined}
                        onClick={() => goPage(n)}
                      >
                        {n}
                      </button>
                    ),
                  )}
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={page >= totalPages}
                onClick={() => goPage(Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
