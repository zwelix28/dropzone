import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import LikeButton from "./LikeButton.jsx";
import UserAvatar from "./UserAvatar.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";
import { fmtPlayerTime } from "../lib/format.js";
import { GUEST_SNIPPET_DURATION_SEC } from "../lib/audioUrls.js";

/**
 * Full-screen now playing for logged-in users on small screens.
 */
export default function MobileNowPlaying({
  track,
  user,
  isPlaying,
  progress,
  durationSec = 0,
  guestPreviewOnly,
  onClose,
  onToggle,
  onSeek,
  onNext,
}) {
  const navigate = useNavigate();
  const swipeRef = useRef({ y0: 0, x0: 0, armed: false });
  const progressRef = useRef(null);
  const scrubbingRef = useRef(false);

  if (!track) return null;

  const fallbackTotal = guestPreviewOnly
    ? (() => {
        const d = Number(track.durationSecs) || 0;
        return d > 0 ? Math.min(Math.floor(d), GUEST_SNIPPET_DURATION_SEC) : GUEST_SNIPPET_DURATION_SEC;
      })()
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

  const onSwipeAreaTouchStart = (e) => {
    const t = e.touches[0];
    swipeRef.current = { y0: t.clientY, x0: t.clientX, armed: true };
  };

  const onSwipeAreaTouchEnd = (e) => {
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 875,
        display: "flex",
        flexDirection: "column",
        paddingTop: "max(8px, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
        overflow: "hidden",
      }}
    >
      {/* Ambient artwork */}
      {cover ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "-12%",
            backgroundImage: `url(${cover})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(48px) saturate(1.15)",
            opacity: 0.45,
            transform: "scale(1.05)",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(7,9,15,0.5) 0%, var(--bg) 38%, #07090f 100%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.1em" }}>NOW PLAYING</span>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Minimize player"
            onClick={onClose}
            style={{ padding: "10px 14px", minWidth: 44, minHeight: 44, justifyContent: "center" }}
          >
            <Icon name="chevronDown" size={22} color="var(--text2)" />
          </button>
        </div>

        {/* Swipe-to-minimize: artwork + title + artist (scrolls if needed; no overlap with dock) */}
        <div
          className="now-playing-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "clamp(12px, 3vmin, 18px)",
            paddingBottom: 8,
          }}
          onTouchStart={onSwipeAreaTouchStart}
          onTouchEnd={onSwipeAreaTouchEnd}
        >
          <div
            style={{
              width: "min(88vw, min(360px, 48dvh))",
              maxWidth: "100%",
              aspectRatio: "1",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 28px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              flexShrink: 0,
              marginTop: 4,
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
                <Icon name="music" size={56} color="var(--text3)" />
              </div>
            )}
          </div>

          <div style={{ width: "100%", maxWidth: 440, textAlign: "center", padding: "0 4px", flexShrink: 0 }}>
            <h2
              style={{
                fontFamily: "var(--ff-display)",
                fontSize: "clamp(22px, 6.5vw, 32px)",
                letterSpacing: "0.04em",
                lineHeight: 1.12,
                marginBottom: 12,
                marginTop: 0,
                color: "var(--text)",
                textShadow: "0 2px 24px rgba(0,0,0,0.35)",
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
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "clamp(8px, 2.5vmin, 12px)",
                  flexWrap: "wrap",
                  background: "rgba(17,24,39,0.65)",
                  border: "1px solid var(--border)",
                  borderRadius: "clamp(12px, 3vmin, 16px)",
                  padding: "clamp(8px, 2.2vmin, 12px) clamp(12px, 3.2vmin, 16px)",
                  marginBottom: 0,
                  width: "100%",
                  maxWidth: "min(360px, 92vw)",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <UserAvatar
                  user={user}
                  size={44}
                  showVerified={false}
                  style={{ width: "clamp(36px, 11vmin, 44px)", height: "clamp(36px, 11vmin, 44px)" }}
                />
                <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "clamp(15px, 4.2vmin, 17px)",
                      color: "var(--text)",
                      lineHeight: 1.2,
                    }}
                  >
                    {user.username}
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(12px, 3.5vmin, 14px)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 2,
                    }}
                  >
                    <span>{user.handle}</span>
                    {user.verified ? <VerifiedBadge size={15} /> : null}
                  </div>
                </div>
              </button>
            ) : (
              <p style={{ color: "var(--text3)", fontSize: 15, margin: 0 }}>Unknown artist</p>
            )}
          </div>
        </div>

        {/* Bottom dock: genre / like → scrubber → transport (fixed order, no overlap) */}
        <div
          style={{
            flexShrink: 0,
            width: "100%",
            maxWidth: 440,
            margin: "0 auto",
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(180deg, transparent, rgba(7,9,15,0.85) 30%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 14,
              minHeight: 40,
            }}
          >
            {track.genre ? (
              <span className="tag tag-blue" style={{ fontSize: 11, padding: "4px 10px" }}>
                {track.genre}
              </span>
            ) : null}
            <LikeButton mixId={track.id} variant="inline" size="sm" />
          </div>

          <div
            ref={progressRef}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label="Playback position"
            style={{
              padding: "10px 0 12px",
              touchAction: "none",
              cursor: "pointer",
            }}
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
            <div
              className="progress-wrap"
              style={{
                height: 6,
                borderRadius: 3,
                pointerEvents: "none",
              }}
            >
              <div className="progress-fill" style={{ width: `${progress}%`, borderRadius: 3, height: "100%" }} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 2,
              marginBottom: 4,
              fontSize: 12,
              color: "var(--text2)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
            }}
          >
            <span>{fmtPlayerTime(elapsedSec)}</span>
            <span>{fmtPlayerTime(remainingSec)}</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 32,
              marginTop: 18,
              paddingBottom: 4,
            }}
          >
            <div style={{ width: 64 }} aria-hidden />

            <button
              type="button"
              onClick={onToggle}
              aria-label={isPlaying ? "Pause" : "Play"}
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: "var(--accent2)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isPlaying ? "0 0 36px rgba(14,165,233,0.45)" : "0 12px 40px rgba(0,0,0,0.45)",
                animation: isPlaying ? "glow 2.2s ease-in-out infinite" : undefined,
              }}
            >
              <Icon name={isPlaying ? "pause" : "play"} size={34} color="#07090F" />
            </button>

            <button
              type="button"
              onClick={() => void onNext?.()}
              aria-label="Next track"
              title="Next"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              }}
            >
              <Icon name="skip" size={26} color="var(--accent)" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
