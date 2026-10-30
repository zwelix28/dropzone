import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import MarqueeText from "./MarqueeText.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import { episodeHasAudioSource } from "../lib/audioUrls.js";
import { mixTitleBody } from "../constants/mixTitle.js";
import { moveQueueIds } from "../lib/playbackQueue.js";
import { canDownloadMix } from "../constants/plans.js";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { downloadMixWithMetadata } from "../lib/downloadMixWithMetadata.js";
import { fmtPlayerTime } from "../lib/format.js";
import { getGuestPreviewSegment } from "../lib/forYouPreview.js";

/** Visible queue window size in mobile now playing. */
const QUEUE_WINDOW = 5;

/**
 * Full-screen now playing for logged-in users on small screens.
 * Layout follows the now-playing concept; playback stays on the shared player.
 */
export default function MobileNowPlaying({
  track,
  user,
  isPlaying,
  progress,
  durationSec = 0,
  guestPreviewOnly,
  shuffleOn = false,
  onClose,
  onToggle,
  onSeek,
  onPrev,
  onNext,
  onToggleShuffle,
  queueTracks = [],
  onReplaceQueue,
  onClearQueue,
  onPlayTrack,
}) {
  const navigate = useNavigate();
  const { likedMixIds, trackEvent, auth, toggleLike, users } = useApp();
  const swipeRef = useRef({ y0: 0, x0: 0, armed: false });
  const progressRef = useRef(null);
  const scrubbingRef = useRef(false);
  const [toast, setToast] = useState("");
  const [queueOpen, setQueueOpen] = useState(false);
  const [draftOrder, setDraftOrder] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const setSeekFromClientX = useCallback(
    (clientX) => {
      const hit = progressRef.current;
      if (!hit) return;
      const track = hit.querySelector(".mnp-progress-track") || hit;
      const rect = track.getBoundingClientRect();
      const w = rect.width || 1;
      onSeek(Math.max(0, Math.min(100, ((clientX - rect.left) / w) * 100)));
    },
    [onSeek],
  );

  const nextTrack = useMemo(() => {
    if (!track || shuffleOn) return null;
    if (queueTracks.length < 2) return null;
    const index = queueTracks.findIndex((episode) => episode.id === track.id);
    const nextIndex = (index >= 0 ? index + 1 : 0) % queueTracks.length;
    const next = queueTracks[nextIndex];
    return next && next.id !== track.id ? next : null;
  }, [queueTracks, shuffleOn, track]);

  /** Sliding window of up to 5 mixes starting at the current track; advances as playback moves on. */
  const queueWindow = useMemo(() => {
    if (!queueTracks.length) return { start: 0, tracks: [] };
    const index = track ? queueTracks.findIndex((episode) => episode.id === track.id) : -1;
    const start = index >= 0 ? index : 0;
    return { start, tracks: queueTracks.slice(start, start + QUEUE_WINDOW) };
  }, [queueTracks, track]);

  const visibleQueue = useMemo(() => {
    if (!draftOrder) return queueWindow.tracks;
    const byId = new Map(queueTracks.map((episode) => [episode.id, episode]));
    return draftOrder.map((id) => byId.get(id)).filter(Boolean);
  }, [draftOrder, queueTracks, queueWindow.tracks]);

  if (!track) return null;

  const liked = likedMixIds.includes(track.id);
  const hasAudioSource = episodeHasAudioSource(track);
  const allowDownload = canDownloadMix(auth.currentUser, {
    isOwner: Boolean(auth.currentUser?.id && track.userId === auth.currentUser.id),
  });
  const nextUser = nextTrack ? users.find((person) => person.id === nextTrack.userId) : null;

  const handleDownload = async () => {
    if (!allowDownload) return;
    if (!hasAudioSource) {
      setToast("No audio available to download");
      return;
    }
    if (!liked) {
      setToast("Like this mix to unlock download");
      return;
    }
    setToast("Preparing download…");
    const { ok } = await downloadMixWithMetadata(track, { artist: user });
    if (!ok) {
      setToast("Download unavailable");
      return;
    }
    setToast("Downloading full mix…");
    void trackEvent({ kind: "download", episodeId: track.id, actorUserId: auth.currentUser?.id });
  };

  const handleLike = () => {
    if (!auth.session?.user?.id) {
      auth.setShowAuth(true);
      return;
    }
    void toggleLike(track.id);
  };

  const openMix = () => {
    onClose();
    navigate(`/mix/${track.id}`);
  };

  const openArtist = () => {
    if (!user) return;
    onClose();
    navigate(`/user/${user.id}`);
  };

  const restart = () => {
    onSeek(0);
    if (!isPlaying) onToggle();
  };

  const fallbackTotal = guestPreviewOnly
    ? Math.floor(getGuestPreviewSegment(track.durationSecs).windowSec)
    : Math.floor(Math.max(0, Number(track.durationSecs) || 0));
  const totalSec = durationSec > 0 ? durationSec : fallbackTotal;
  const elapsedSec = totalSec > 0 ? Math.min(totalSec, Math.floor((totalSec * progress) / 100)) : 0;

  const onSwipeTouchStart = (e) => {
    const t = e.touches[0];
    swipeRef.current = { y0: t.clientY, x0: t.clientX, armed: true };
  };

  const onSwipeTouchEnd = (e) => {
    if (!swipeRef.current.armed) return;
    swipeRef.current.armed = false;
    const t = e.changedTouches[0];
    const dy = t.clientY - swipeRef.current.y0;
    const dx = t.clientX - swipeRef.current.x0;
    if (dy > 72 && dy > Math.abs(dx) * 1.15) {
      onClose();
    }
  };

  const cover = resolveMixArtwork(track.coverUrl);

  return (
    <div role="dialog" aria-label="Now playing" className="mnp-screen">
      <div className="mnp-page">
        <section
          className="mnp-card"
          onTouchStart={onSwipeTouchStart}
          onTouchEnd={onSwipeTouchEnd}
        >
          <div className="mnp-heading">
            <button type="button" className="mnp-icon-btn" aria-label="Minimize player" onClick={onClose}>
              <Icon name="chevronDown" size={22} />
            </button>
            <span>NOW PLAYING</span>
            <button type="button" className="mnp-icon-btn" aria-label="Open mix" onClick={openMix}>
              <Icon name="menu" size={18} />
            </button>
          </div>

          <div className="mnp-art">
            {cover ? (
              <img src={cover} alt="" onError={handleArtworkError} />
            ) : (
              <div className="mnp-art-fallback">
                <Icon name="music" size={48} color="var(--text3)" />
              </div>
            )}
          </div>

          <div className="mnp-info">
            {track.genre ? <span className="mnp-genre">{track.genre}</span> : null}
            <h2 className="mnp-title">
              <MarqueeText text={track.title} fill />
            </h2>
            {user ? (
              <button type="button" className="mnp-artist" onClick={openArtist}>
                <span className="mnp-artist-name">{user.username}</span>
                {user.verified ? <VerifiedBadge size={14} /> : null}
              </button>
            ) : (
              <div className="mnp-artist">Deep House Lab</div>
            )}
          </div>

          <div className="mnp-timeline">
            <div
              ref={progressRef}
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-label="Playback position"
              className="mnp-progress-hit"
              onPointerDown={(e) => {
                scrubbingRef.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                setSeekFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (scrubbingRef.current) setSeekFromClientX(e.clientX);
              }}
              onPointerUp={(e) => {
                scrubbingRef.current = false;
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  /* ignore */
                }
              }}
              onPointerCancel={() => {
                scrubbingRef.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") onSeek(Math.min(100, progress + 2));
                if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 2));
              }}
            >
              <div className="mnp-progress-track">
                <div className="mnp-progress-fill" style={{ width: `${progress}%` }} />
                <span className="mnp-progress-thumb" style={{ left: `${progress}%` }} aria-hidden="true" />
              </div>
            </div>
            <div className="mnp-times">
              <span>{fmtPlayerTime(elapsedSec)}</span>
              <span>{fmtPlayerTime(totalSec)}</span>
            </div>
          </div>

          <div className="mnp-transport" aria-label="Playback controls">
            <button
              type="button"
              className={`mnp-control mnp-control-glow${shuffleOn ? " is-on" : ""}`}
              onClick={() => onToggleShuffle?.()}
              aria-label={shuffleOn ? "Shuffle on" : "Shuffle off"}
              aria-pressed={shuffleOn}
            >
              <Icon name="shuffle" size={22} />
            </button>
            <button type="button" className="mnp-control mnp-control-glow" onClick={() => void onPrev?.()} aria-label="Previous track">
              <Icon name="prev" size={22} />
            </button>
            <button
              type="button"
              className="mnp-control mnp-control-main mnp-control-glow"
              onClick={onToggle}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <Icon name={isPlaying ? "pause" : "play"} size={26} />
            </button>
            <button type="button" className="mnp-control mnp-control-glow" onClick={() => void onNext?.()} aria-label="Next track">
              <Icon name="skip" size={22} />
            </button>
            <button type="button" className="mnp-control mnp-control-glow" onClick={restart} aria-label="Restart mix" title="Restart">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <polyline points="3 4 3 10 9 10" />
              </svg>
            </button>
          </div>

          <div className="mnp-utilities">
            <button
              type="button"
              className={`mnp-utility${liked ? " is-liked" : ""}`}
              onClick={handleLike}
              aria-label={liked ? "Remove from likes" : "Add to likes"}
            >
              <Icon name="heart" size={20} color={liked ? "#f87171" : "currentColor"} />
            </button>
            {allowDownload ? (
              <button
                type="button"
                className={`mnp-utility mnp-utility-glow${liked && hasAudioSource ? " is-on" : ""}`}
                onClick={() => void handleDownload()}
                disabled={!hasAudioSource}
                aria-label={liked ? "Download full mix" : "Like to download"}
                title={liked ? "Download full mix" : "Like this mix to unlock download"}
              >
                <Icon name="download" size={22} />
              </button>
            ) : (
              <span className="mnp-utility" aria-hidden="true" />
            )}
            <button type="button" className="mnp-utility mnp-utility-glow" onClick={() => setQueueOpen(true)} aria-label="Open queue">
              <Icon name="list" size={22} />
            </button>
          </div>

          {nextTrack || shuffleOn ? (
            <button type="button" className="mnp-next" onClick={() => void onNext?.()}>
              {nextTrack ? (
                <img src={resolveMixArtwork(nextTrack.coverUrl)} alt="" onError={handleArtworkError} />
              ) : (
                <img className="mnp-next-logo" src="/logo.png" alt="Deep House Lab" />
              )}
              <span className="mnp-next-copy">
                <span className="mnp-next-kicker">NEXT UP</span>
                <span className="mnp-next-title">
                  {nextTrack
                    ? `${nextTrack.title}${nextUser?.username ? ` · ${nextUser.username}` : ""}`
                    : "Shuffle picks the next mix"}
                </span>
              </span>
              <span className="mnp-next-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ) : null}
        </section>
      </div>

      {queueOpen ? (
        <div
          className="mnp-queue-overlay"
          role="presentation"
          onClick={() => {
            setDraftOrder(null);
            setQueueOpen(false);
          }}
        >
          <div
            className="mnp-queue"
            role="dialog"
            aria-modal="true"
            aria-label="Playback queue"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mnp-queue-handle" aria-hidden="true" />
            <div className="mnp-queue-bar">
              <button
                type="button"
                className="mnp-queue-text"
                onClick={() => {
                  setDraftOrder(null);
                  setQueueOpen(false);
                }}
              >
                Close
              </button>
              <div className="mnp-queue-heading">
                <span>Up next</span>
                <small>
                  {visibleQueue.length === 1 ? "1 mix" : `${visibleQueue.length} of 5`}
                </small>
              </div>
              <button
                type="button"
                className="mnp-queue-text"
                onClick={() => {
                  setDraftOrder(null);
                  onClearQueue?.();
                }}
                disabled={queueTracks.length < 2}
              >
                Clear
              </button>
            </div>
            {visibleQueue.length === 0 ? (
              <p className="mnp-queue-empty">Nothing is queued.</p>
            ) : (
              <ul className="mnp-queue-list">
                {visibleQueue.map((episode, index) => {
                  const current = episode.id === track.id;
                  const title = mixTitleBody(episode.title) || episode.title;
                  return (
                    <li key={episode.id} className={current ? "is-current" : ""}>
                      <button
                        type="button"
                        className="mnp-queue-grip"
                        aria-label={`Reorder ${title}`}
                        onPointerDown={(event) => {
                          if (event.button != null && event.button !== 0) return;
                          const row = event.currentTarget.closest("li");
                          const height = row?.getBoundingClientRect().height || 64;
                          event.currentTarget.setPointerCapture(event.pointerId);
                          dragRef.current = {
                            pointerId: event.pointerId,
                            startIndex: index,
                            startY: event.clientY,
                            rowHeight: height + 8,
                            origin: visibleQueue.map((item) => item.id),
                            windowStart: queueWindow.start,
                          };
                        }}
                        onPointerMove={(event) => {
                          const drag = dragRef.current;
                          if (!drag || drag.pointerId !== event.pointerId) return;
                          const offset = Math.round((event.clientY - drag.startY) / drag.rowHeight);
                          const target = Math.max(0, Math.min(drag.origin.length - 1, drag.startIndex + offset));
                          setDraftOrder(moveQueueIds(drag.origin, drag.startIndex, target));
                        }}
                        onPointerUp={(event) => {
                          const drag = dragRef.current;
                          if (!drag || drag.pointerId !== event.pointerId) return;
                          dragRef.current = null;
                          const offset = Math.round((event.clientY - drag.startY) / drag.rowHeight);
                          const target = Math.max(0, Math.min(drag.origin.length - 1, drag.startIndex + offset));
                          const windowNext = moveQueueIds(drag.origin, drag.startIndex, target);
                          const changed = windowNext.some((id, itemIndex) => id !== drag.origin[itemIndex]);
                          setDraftOrder(null);
                          if (!changed) return;
                          const fullIds = queueTracks.map((item) => item.id);
                          const start = drag.windowStart;
                          const end = start + drag.origin.length;
                          const nextFull = [
                            ...fullIds.slice(0, start),
                            ...windowNext,
                            ...fullIds.slice(end),
                          ];
                          onReplaceQueue?.(nextFull);
                        }}
                        onPointerCancel={() => {
                          dragRef.current = null;
                          setDraftOrder(null);
                        }}
                      >
                        <span />
                        <span />
                        <span />
                      </button>
                      <button type="button" className="mnp-queue-main" onClick={() => onPlayTrack?.(episode)}>
                        <img src={resolveMixArtwork(episode.coverUrl)} alt="" onError={handleArtworkError} />
                        <span>
                          <b>
                            {title}
                            {current ? <span className="mnp-queue-now"> — Now playing</span> : null}
                          </b>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {toast ? <div className="mnp-toast">{toast}</div> : null}
    </div>
  );
}
