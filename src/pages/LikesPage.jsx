import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import LikeButton from "../components/LikeButton.jsx";
import MixLiveListeners from "../components/MixLiveListeners.jsx";
import PageHeader from "../components/PageHeader.jsx";
import TrackCard from "../components/TrackCard.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { fmt, fmtDuration } from "../lib/format.js";
import { scrollAppMainToTop } from "../lib/scrollAppMain.js";

const DESKTOP_PAGE_SIZE = 8;
const MOBILE_PAGE_SIZE = 12;

function LikeListRow({ episode, user, isActive, isPlaying, onPlay }) {
  const navigate = useNavigate();
  const location = useLocation();
  const description = (episode.description || "").trim();

  const openMix = () => {
    navigate(`/mix/${episode.id}`, { state: { from: location.pathname } });
  };

  const handlePlay = (event) => {
    event.stopPropagation();
    event.preventDefault();
    onPlay?.(episode);
  };

  return (
    <article className={`mixes-row${isActive ? " is-active" : ""}`}>
      <div className="mixes-row-art">
        <img
          src={resolveMixArtwork(episode.coverUrl)}
          alt=""
          onError={handleArtworkError}
        />
        <button
          type="button"
          className="mixes-row-play"
          aria-label={isActive && isPlaying ? "Pause mix" : "Play mix"}
          onClick={handlePlay}
        >
          <Icon name={isActive && isPlaying ? "pause" : "play"} size={22} color="#07090F" />
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
          <div className="mixes-row-like" onClick={(e) => e.stopPropagation()}>
            <LikeButton mixId={episode.id} size="sm" />
          </div>
        </div>

        {description ? <p className="mixes-row-desc">{description}</p> : null}

        <div className="mixes-row-meta">
          {episode.genre ? <span className="tag tag-blue">{episode.genre}</span> : null}
          <span>{fmtDuration(episode.durationSecs)}</span>
          <span>
            <Icon name="play" size={12} /> {fmt(episode.plays || 0)}
          </span>
          {isActive && isPlaying ? <MixLiveListeners mixId={episode.id} size="sm" /> : null}
        </div>

        <div className="mixes-row-actions">
          <button type="button" className="btn btn-primary" onClick={handlePlay}>
            <Icon name={isActive && isPlaying ? "pause" : "play"} size={15} />
            {isActive && isPlaying ? "Pause" : "Play"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={openMix}>
            View mix
          </button>
        </div>
      </div>
    </article>
  );
}

export default function LikesPage() {
  const { auth, episodes, users, player, likedMixIds } = useApp();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim().toLowerCase();
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [page, setPage] = useState(1);

  const favoriteEpisodes = useMemo(() => {
    const byId = new Map(episodes.map((e) => [e.id, e]));
    return likedMixIds.map((id) => byId.get(id)).filter(Boolean);
  }, [likedMixIds, episodes]);

  const filtered = useMemo(() => {
    if (!q) return favoriteEpisodes;
    return favoriteEpisodes.filter((ep) => {
      const user = users.find((u) => u.id === ep.userId);
      return (
        (ep.title || "").toLowerCase().includes(q) ||
        (user?.username || "").toLowerCase().includes(q)
      );
    });
  }, [favoriteEpisodes, users, q]);

  const pageSize = isCompact ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [q, isCompact, likedMixIds.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(filtered.length, page * pageSize);

  const goPage = (next) => {
    setPage(next);
    scrollAppMainToTop({ smooth: true });
  };

  if (!auth.session?.user?.id) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className={`fade-in mixes-page likes-page${isCompact ? " is-compact" : ""}`}>
      <PageHeader icon="heart" title="LIKES" large marginBottom={isCompact ? 16 : 20} />
      <p className="mixes-lede">
        Mixes you hearted — full artwork and details, ready to replay anytime.
      </p>

      {favoriteEpisodes.length === 0 ? (
        <div className="mixes-empty library-empty">
          <Icon name="heart" size={40} color="var(--text3)" />
          <p>No likes yet. Explore Mixes and tap the heart on sets you want to replay anytime.</p>
          <Link to="/mixes" className="btn btn-primary">
            Browse mixes
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="library-status">No likes match that search.</p>
      ) : (
        <>
          <div className="mixes-toolbar">
            <span>
              Showing {rangeStart}–{rangeEnd} of {filtered.length}
            </span>
            {totalPages > 1 ? (
              <span>
                Page {page} of {totalPages}
              </span>
            ) : null}
          </div>

          {isCompact ? (
            <div className="mixes-mobile-grid">
              {pageItems.map((ep) => (
                <TrackCard
                  key={ep.id}
                  episode={ep}
                  users={users}
                  isActive={player.currentTrack?.id === ep.id}
                  isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
                  onPlay={player.playTrack}
                  compact
                  layout="row"
                />
              ))}
            </div>
          ) : (
            <div className="mixes-list" role="list">
              {pageItems.map((ep) => {
                const user = users.find((u) => u.id === ep.userId);
                return (
                  <div key={ep.id} role="listitem">
                    <LikeListRow
                      episode={ep}
                      user={user}
                      isActive={player.currentTrack?.id === ep.id}
                      isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
                      onPlay={player.playTrack}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="mixes-pager" aria-label="Likes pages">
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
