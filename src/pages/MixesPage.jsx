import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import LikeButton from "../components/LikeButton.jsx";
import MixLiveListeners from "../components/MixLiveListeners.jsx";
import PageHeader from "../components/PageHeader.jsx";
import TrackCard from "../components/TrackCard.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { GENRES } from "../constants/genres.js";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isMixesItem } from "../lib/contentType.js";
import { fmt, fmtDuration } from "../lib/format.js";
import {
  formatPresaveReleaseLine,
  isMixPresave,
  isMixStreamable,
} from "../lib/mixVisibility.js";
import { scrollAppMainToTop } from "../lib/scrollAppMain.js";

const CHIP_GENRES = ["All", ...GENRES.slice(0, 6)];
const DESKTOP_PAGE_SIZE = 8;
const MOBILE_PAGE_SIZE = 12;

function MixListRow({
  episode,
  user,
  isActive,
  isPlaying,
  onPlay,
  allowAdminPreview = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const description = (episode.description || "").trim();
  const streamable = isMixStreamable(episode, { allowAdminPreview });
  const presave = isMixPresave(episode);
  const presaveLine = formatPresaveReleaseLine(episode.goesLiveAt);

  const openMix = () => {
    navigate(`/mix/${episode.id}`, { state: { from: location.pathname } });
  };

  const handlePlay = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!streamable) return;
    onPlay?.(episode);
  };

  return (
    <article className={`mixes-row${isActive ? " is-active" : ""}${presave ? " is-presave" : ""}`}>
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
            aria-label={isActive && isPlaying ? "Pause mix" : "Play mix"}
            onClick={handlePlay}
          >
            <Icon name={isActive && isPlaying ? "pause" : "play"} size={22} color="#07090F" />
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
          <div className="mixes-row-like" onClick={(e) => e.stopPropagation()}>
            <LikeButton mixId={episode.id} size="sm" />
          </div>
        </div>

        {description ? <p className="mixes-row-desc">{description}</p> : null}

        <div className="mixes-row-meta">
          {presave ? <span className="tag tag-orange">Pre-save</span> : null}
          {episode.genre ? <span className="tag tag-blue">{episode.genre}</span> : null}
          <span>{fmtDuration(episode.durationSecs)}</span>
          <span>
            <Icon name="play" size={12} /> {fmt(episode.plays || 0)}
          </span>
          {isActive && isPlaying ? <MixLiveListeners mixId={episode.id} size="sm" /> : null}
        </div>

        <div className="mixes-row-actions">
          <button type="button" className="btn btn-ghost" onClick={openMix}>
            View mix
          </button>
        </div>
      </div>
    </article>
  );
}

/** Full-length mixes. Singles / songs live on Discover. */
export default function MixesPage() {
  const { auth, episodes, users, player } = useApp();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [genre, setGenre] = useState("All");
  const [page, setPage] = useState(1);
  const allowAdminPreview = Boolean(auth.currentUser?.isAdmin);

  const filtered = useMemo(() => {
    return episodes.filter((ep) => {
      if (!isMixesItem(ep)) return false;
      const user = users.find((u) => u.id === ep.userId);
      const matchesGenre = genre === "All" || ep.genre === genre;
      const matchesSearch =
        !q ||
        ep.title.toLowerCase().includes(q.toLowerCase()) ||
        (user?.username || "").toLowerCase().includes(q.toLowerCase());
      return matchesGenre && matchesSearch;
    });
  }, [episodes, users, genre, q]);

  const pageSize = isCompact ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [genre, q, isCompact]);

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

  return (
    <div className={`fade-in mixes-page${isCompact ? " is-compact" : ""}`}>
      <PageHeader title="MIXES" large marginBottom={isCompact ? 16 : 20} />
      <p className="mixes-lede">
        Full-length sets with artwork and details up front. Singles live on Discover.
      </p>

      <div className="lab-home-chips" role="tablist" aria-label="Genres">
        {CHIP_GENRES.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={genre === name}
            className={`lab-home-chip${genre === name ? " is-on" : ""}`}
            onClick={() => setGenre(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mixes-empty">
          <Icon name="music" size={40} color="var(--text3)" />
          <p>No mixes found</p>
        </div>
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
                    <MixListRow
                      episode={ep}
                      user={user}
                      isActive={player.currentTrack?.id === ep.id}
                      isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
                      onPlay={player.playTrack}
                      allowAdminPreview={allowAdminPreview}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="mixes-pager" aria-label="Mix pages">
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
