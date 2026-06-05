import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import LikeButton from "./LikeButton.jsx";
import UserAvatar from "./UserAvatar.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";
import { fmtPlayerTime } from "../lib/format.js";
import { getGuestPreviewSegment } from "../lib/forYouPreview.js";

/** For You–style overlay: legibility tint, then +25% transparency for glass feel. */
const opa = (a) => {
  const tinted = Math.min(1, a + (1 - a) * 0.4);
  return Math.max(0.08, Math.round(tinted * 0.75 * 1000) / 1000);
};

/**
 * Full-screen now playing for logged-in users on small screens.
 * Fixed viewport layout — no internal scrolling; long titles truncate.
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
}) {
  const navigate = useNavigate();
  const swipeRef = useRef({ y0: 0, x0: 0, armed: false });
  const progressRef = useRef(null);
  const scrubbingRef = useRef(false);

  if (!track) return null;

  const fallbackTotal = guestPreviewOnly
    ? Math.floor(getGuestPreviewSegment(track.durationSecs).windowSec)
    : Math.floor(Math.max(0, Number(track.durationSecs) || 0));
  const totalSec = durationSec > 0 ? durationSec : fallbackTotal;
  const elapsedSec = totalSec > 0 ? Math.min(totalSec, Math.floor((totalSec * progress) / 100)) : 0;
  const remainingSec = Math.max(0, totalSec - elapsedSec);

  const setSeekFromClientX = useCallback(
    (clientX) => {
      const el = progressRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const w = rect.width || 1;
      onSeek(Math.max(0, Math.min(100, ((clientX - rect.left) / w) * 100)));
    },
    [onSeek],
  );

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

  const cover = track.coverUrl?.trim();

  return (
    <div
      role="dialog"
      aria-label="Now playing"
      className="mobile-now-playing"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 875,
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxHeight: "100dvh",
        background: `rgba(7,9,15,${opa(0.85)})`,
        backdropFilter: "blur(20px) saturate(1.05)",
        WebkitBackdropFilter: "blur(20px) saturate(1.05)",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      {cover ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "-10%",
            backgroundImage: `url(${cover})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(42px) saturate(1.1)",
            opacity: opa(0.35),
            transform: "scale(1.08)",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(7,9,15,${opa(0.2)}) 0%, rgba(7,9,15,${opa(0.6)}) 55%, rgba(7,9,15,${opa(0.88)}) 100%)`,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: `rgba(7,9,15,${opa(0.5)})`,
          backdropFilter: "blur(28px) saturate(1.05)",
          WebkitBackdropFilter: "blur(28px) saturate(1.05)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 3,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "max(8px, env(safe-area-inset-top, 0px))",
          paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
          paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
          paddingBottom: 10,
          background: `rgba(7,9,15,${opa(0.45)})`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
        onTouchStart={onSwipeTouchStart}
        onTouchEnd={onSwipeTouchEnd}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.1em" }}>NOW PLAYING</span>
        <button
          type="button"
          className="btn btn-ghost"
          aria-label="Minimize player"
          onClick={onClose}
          style={{ padding: "10px 14px", minWidth: 44, minHeight: 44, justifyContent: "center" }}
        >
          <Icon name="chevronDown" size={22} color="var(--text)" />
        </button>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
          paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
          overflow: "hidden",
        }}
      >
        <div
          className="mobile-now-playing-body"
          style={{
            position: "relative",
            zIndex: 2,
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          onTouchStart={onSwipeTouchStart}
          onTouchEnd={onSwipeTouchEnd}
        >
          <div
            className="mobile-now-playing-hero"
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              overflow: "hidden",
              paddingTop: 7,
              paddingBottom: 4,
            }}
          >
            <div
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                maxWidth: 300,
              }}
            >
              <div
                className="mobile-now-playing-art"
                style={{
                  position: "relative",
                  width: "min(100%, 300px, 34dvh)",
                  aspectRatio: "1",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  flexShrink: 1,
                }}
              >
              {cover ? (
                <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(145deg, var(--surface2), var(--surface))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="music" size={48} color="var(--text3)" />
                </div>
              )}
              </div>
            </div>

            <div
              style={{
                flexShrink: 0,
                width: "100%",
                maxWidth: 300,
                margin: "0 auto",
                padding: "0 2px",
                overflow: "hidden",
              }}
            >
              <h2
                title={track.title}
                style={{
                  fontFamily: "var(--ff-display)",
                  fontSize: 20,
                  letterSpacing: "0.03em",
                  lineHeight: 1.15,
                  margin: "0 0 10px",
                  color: "var(--text)",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {track.title}
              </h2>

            {user ? (
              <button
                type="button"
                aria-label={`Open ${user.username}'s profile`}
                onClick={() => {
                  onClose();
                  navigate(`/user/${user.id}`);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  margin: "0 auto",
                  background: `rgba(7,9,15,${opa(0.4)})`,
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  borderRadius: 12,
                  padding: "8px 12px",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <UserAvatar user={user} size={36} showVerified={false} style={{ width: 36, height: 36, flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--text)",
                      lineHeight: 1.2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.username}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 2,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.handle}</span>
                    {user.verified ? <VerifiedBadge size={13} /> : null}
                  </div>
                </div>
              </button>
            ) : (
              <p style={{ color: "var(--text3)", fontSize: 14, margin: 0, textAlign: "center" }}>Unknown artist</p>
            )}
            </div>
          </div>

          <div className="mobile-now-playing-controls">
            <div className="mobile-now-playing-controls-inner">
            <div className="mobile-np-actions">
              {track.genre ? (
                <span className="tag tag-blue mobile-np-float-chip" style={{ fontSize: 10, padding: "5px 10px" }}>
                  {track.genre}
                </span>
              ) : null}
              <LikeButton mixId={track.id} variant="inline" size="sm" className="mobile-np-float-like" />
            </div>

            <div
              ref={progressRef}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-label="Playback position"
              className="mobile-np-progress-hit"
              style={{ touchAction: "none", cursor: "pointer" }}
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
            >
              <div className="progress-wrap mobile-np-float-progress" style={{ pointerEvents: "none" }}>
                <div className="progress-fill" style={{ width: `${progress}%`, height: "100%" }} />
              </div>
            </div>

            <div className="mobile-np-times">
              <span>{fmtPlayerTime(elapsedSec)}</span>
              <span>{fmtPlayerTime(remainingSec)}</span>
            </div>

            <div className="dz-transport-row mobile-np-transport">
              <button
                type="button"
                className="dz-transport-btn"
                onClick={() => onToggleShuffle?.()}
                aria-label={shuffleOn ? "Shuffle on" : "Shuffle off"}
                aria-pressed={shuffleOn}
                title={shuffleOn ? "Shuffle on" : "Shuffle off"}
              >
                <Icon name="shuffle" size={20} />
              </button>

              <button
                type="button"
                className="dz-transport-btn"
                onClick={() => void onPrev?.()}
                aria-label="Previous track"
                title="Previous"
              >
                <Icon name="prev" size={20} />
              </button>

              <button
                type="button"
                className="dz-transport-btn"
                onClick={onToggle}
                aria-label={isPlaying ? "Pause" : "Play"}
                title={isPlaying ? "Pause" : "Play"}
              >
                <Icon name={isPlaying ? "pause" : "play"} size={22} />
              </button>

              <button
                type="button"
                className="dz-transport-btn"
                onClick={() => void onNext?.()}
                aria-label="Next track"
                title="Next"
              >
                <Icon name="skip" size={20} />
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
