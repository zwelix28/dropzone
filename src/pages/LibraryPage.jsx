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
import { listMixPresaves, removeMixPresave } from "../lib/mixPresaves.js";
import {
  formatPresaveReleaseLine,
  isMixPresave,
  isMixStreamable,
} from "../lib/mixVisibility.js";
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
  streamable,
  presave,
  presaveLine,
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
    if (!streamable) return;
    onResume?.(session);
  };

  return (
    <article className={`mixes-row library-row${isActive ? " is-active" : ""}${presave ? " is-presave" : ""}`}>
      <div className="mixes-row-art">
        <img
          src={resolveMixArtwork(episode.coverUrl)}
          alt=""
          onError={handleArtworkError}
        />
        {streamable ? (
          <button
            type="button"
            className="mixes-row-play"
            aria-label={isPlaying ? `Pause ${episode.title}` : `Resume ${episode.title}`}
            disabled={busy}
            onClick={handleResume}
          >
            <Icon name={isPlaying ? "pause" : "play"} size={22} color="#07090F" />
          </button>
        ) : (
          <div className="mixes-row-presave" aria-hidden="true">
            <span className="tag tag-orange">Pre-save</span>
          </div>
        )}
      </div>

      <div className="mixes-row-body">
        <div className="mixes-row-top">
          <div className="mixes-row-copy">
            <h2 className="mixes-row-title">{episode.title || "Untitled Mix"}</h2>
            {presave ? <p className="mixes-row-presave-line">{presaveLine}</p> : null}
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
            aria-label={
              presave || session.isLibraryPresave
                ? `Unsave ${episode.title}`
                : `Remove ${episode.title} from library`
            }
            title={presave || session.isLibraryPresave ? "Unsave" : "Remove session"}
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

        {streamable ? (
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
        ) : (
          <p className="library-row-presave-note">
            Streaming unlocks when this mix goes live{presaveLine ? ` — ${presaveLine}` : ""}.
          </p>
        )}

        <div className="mixes-row-meta">
          {presave ? <span className="tag tag-orange">Pre-save</span> : null}
          {episode.genre ? <span className="tag tag-blue">{episode.genre}</span> : null}
          {episode.durationSecs ? <span>{fmtDuration(episode.durationSecs)}</span> : null}
        </div>

        <div className="mixes-row-actions">
          {streamable ? (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={handleResume}>
              <Icon name={isPlaying ? "pause" : "play"} size={15} />
              {isPlaying ? "Pause" : "Resume"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost is-presaved"
              disabled={busy}
              onClick={() => onRemove?.(session.mixId)}
              title="Remove this pre-save from Library"
            >
              Unsave
            </button>
          )}
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
  streamable,
  presave,
  presaveLine,
  onResume,
  onRemove,
}) {
  const episode = session.episode;

  return (
    <li className={`track-card track-card-row library-mobile-row${presave ? " is-presave" : ""}`}>
      {streamable ? (
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
      ) : (
        <Link
          to={`/mix/${episode.id}`}
          className="library-mobile-art is-presave"
          aria-label={`View ${episode.title}`}
        >
          <img
            src={resolveMixArtwork(episode.coverUrl)}
            alt=""
            onError={handleArtworkError}
          />
          <span className="library-mobile-presave-chip" aria-hidden="true">
            Pre-save
          </span>
        </Link>
      )}

      <div className="library-mobile-body">
        <div className="library-mobile-top">
          <div className="library-mobile-copy">
            <Link to={`/mix/${episode.id}`} className="library-mobile-title">
              {episode.title}
            </Link>
            {presave ? <p className="mixes-row-presave-line">{presaveLine}</p> : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label={presave || session.isLibraryPresave ? `Unsave ${episode.title}` : `Remove ${episode.title} from library`}
            title={presave || session.isLibraryPresave ? "Unsave" : "Remove session"}
            disabled={busy}
            onClick={() => onRemove?.(session.mixId)}
          >
            <Icon name="x" size={16} color="var(--text3)" />
          </button>
        </div>
        {streamable ? (
          <div className="progress-wrap" style={{ height: 3 }}>
            <div className="progress-fill" style={{ width: `${pct}%`, height: "100%" }} />
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-ghost library-mobile-unsave"
            disabled={busy}
            onClick={() => onRemove?.(session.mixId)}
          >
            Unsave
          </button>
        )}
      </div>
    </li>
  );
}

export default function LibraryPage() {
  const { auth, episodes, users, player, showToast } = useApp();
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
    const catalog = episodesRef.current;
    const byId = new Map(catalog.map((ep) => [ep.id, ep]));
    const [progressList, presaveRows] = await Promise.all([
      fetchLibrarySessions(userId, catalog),
      listMixPresaves(userId),
    ]);
    const progressIds = new Set(progressList.map((s) => s.mixId));
    const presaveSessions = (presaveRows || [])
      .filter((row) => row.mixId && !progressIds.has(row.mixId) && byId.has(row.mixId))
      .map((row) => {
        const episode = byId.get(row.mixId);
        return {
          mixId: row.mixId,
          positionSec: 0,
          durationSec: Number(episode?.durationSecs) || 0,
          totalListenedSec: 0,
          updatedAt: row.createdAt || null,
          episode,
          isLibraryPresave: true,
        };
      });
    setSessions([...presaveSessions, ...progressList]);
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
    const canPreview = Boolean(auth.currentUser?.isAdmin);
    for (const session of sessions.slice(0, 5)) {
      if (!session?.episode?.id) continue;
      if (!isMixStreamable(session.episode, { allowAdminPreview: canPreview })) continue;
      void prefetchMixPlayback(session.episode, opts, {
        warm: true,
        seekSec: Number(session.positionSec) || 0,
      });
    }
  }, [userId, sessions, auth.currentUser?.isAdmin]);

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

  const allowAdminPreview = Boolean(auth.currentUser?.isAdmin);

  const handleResume = (session) => {
    if (!session?.episode) return;
    if (!isMixStreamable(session.episode, { allowAdminPreview })) return;
    void player.playTrack(session.episode);
  };

  const handleRemove = async (mixId) => {
    if (!userId || !mixId) return;
    setBusyId(mixId);
    const row = sessions.find((s) => s.mixId === mixId);
    const title = row?.episode?.title || "Mix";
    const wasPresave = Boolean(row?.isLibraryPresave) || isMixPresave(row?.episode);
    if (row?.isLibraryPresave || wasPresave) {
      await removeMixPresave(userId, mixId);
    }
    if (!row?.isLibraryPresave) {
      await dismissLibrarySession(userId, mixId);
    }
    setSessions((prev) => prev.filter((s) => s.mixId !== mixId));
    setBusyId(null);
    showToast({
      tone: wasPresave ? "presave" : "ok",
      icon: "check",
      title: wasPresave ? "Removed from Library" : "Session removed",
      message: wasPresave
        ? `“${title}” is no longer saved.`
        : `“${title}” was cleared from Library.`,
    });
  };

  const goPage = (next) => {
    setPage(next);
    scrollAppMainToTop({ smooth: true });
  };

  return (
    <div className={`fade-in mixes-page library-page${isCompact ? " is-compact" : ""}`}>
      <PageHeader icon="library" title="LIBRARY" large marginBottom={isCompact ? 16 : 20} />
      <p className="mixes-lede">
        Pick up where you left off, and keep Pre-save drops ready until they go live.
      </p>

      {loading ? (
        <p className="library-status">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <div className="mixes-empty library-empty">
          <Icon name="library" size={40} color="var(--text3)" />
          <p>No sessions in progress. Start a mix and it will show up here so you can continue later.</p>
          <Link to="/mixes" className="btn btn-primary">
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
                const streamable = isMixStreamable(ep, { allowAdminPreview });
                const presave = isMixPresave(ep);
                const presaveLine = formatPresaveReleaseLine(ep.goesLiveAt);
                return (
                  <LibraryMobileRow
                    key={session.mixId}
                    session={session}
                    isPlaying={isPlaying}
                    pct={pct}
                    busy={busyId === session.mixId}
                    streamable={streamable}
                    presave={presave}
                    presaveLine={presaveLine}
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
                const streamable = isMixStreamable(ep, { allowAdminPreview });
                const presave = isMixPresave(ep);
                const presaveLine = formatPresaveReleaseLine(ep.goesLiveAt);
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
                      streamable={streamable}
                      presave={presave}
                      presaveLine={presaveLine}
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
