import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import LikeButton from "./LikeButton.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";
import WaveAnim from "./WaveAnim.jsx";
import { fmtPlayerTime } from "../lib/format.js";
import {
  episodeHasAudioSource,
  episodeHasGuestPlayback,
} from "../lib/audioUrls.js";
import { downloadMixWithMetadata } from "../lib/downloadMixWithMetadata.js";
import { shareMix } from "../lib/shareMix.js";
import { getGuestPreviewSegment } from "../lib/forYouPreview.js";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { canDownloadMix } from "../constants/plans.js";
import { useApp } from "../context/AppContext.jsx";

export default function DesktopNowPlaying({
  track,
  user,
  isPlaying,
  progress,
  durationSec = 0,
  volume,
  onClose,
  onToggle,
  onSeek,
  onNext,
  onPrev,
  onVolume,
  shuffleOn = false,
  onToggleShuffle,
}) {
  const { auth, trackEvent, likedMixIds } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const guest = !auth.session?.user?.id;
  const liked = Boolean(!guest && track?.id && likedMixIds.includes(track.id));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!track) return null;

  const hasAudioSource = episodeHasAudioSource(track);
  const guestPlaybackOk = episodeHasGuestPlayback(track);
  const guestEffDuration = guest ? getGuestPreviewSegment(track.durationSecs).windowSec : track.durationSecs || 0;
  const totalSec =
    durationSec > 0 ? durationSec : guest ? Math.floor(guestEffDuration) : Math.floor(Math.max(0, track.durationSecs || 0));
  const elapsedSec = totalSec > 0 ? Math.min(totalSec, Math.floor((totalSec * progress) / 100)) : 0;
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const cover = resolveMixArtwork(track.coverUrl);
  const allowDownload = canDownloadMix(auth.currentUser, {
    isOwner: Boolean(auth.currentUser?.id && track.userId === auth.currentUser.id),
  });
  const handleDownload = async () => {
    if (guest) {
      auth.setShowAuth(true);
      return;
    }
    if (!allowDownload || !hasAudioSource || !liked) return;
    const { ok } = await downloadMixWithMetadata(track, { artist: user });
    if (!ok) return;
    void trackEvent({ kind: "download", episodeId: track.id, actorUserId: auth.currentUser?.id });
  };

  const handleShare = async () => {
    await shareMix({
      episode: track,
      artist: user,
      trackEvent,
      actorUserId: auth.currentUser?.id,
    });
  };

  const restart = () => {
    onSeek(0);
    if (!isPlaying) onToggle();
  };

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 840,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        role="dialog"
        aria-label="Now playing"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          bottom: 92,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(520px, calc(100vw - 48px))",
          maxWidth: 520,
          zIndex: 870,
          background: "rgba(12,16,28,0.98)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.12em" }}>
            NOW PLAYING
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Minimize player"
            onClick={onClose}
            style={{ padding: "6px 10px", minWidth: 36, minHeight: 36, justifyContent: "center" }}
          >
            <Icon name="chevronDown" size={20} color="var(--text2)" />
          </button>
        </div>

        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 12,
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {cover ? (
              <img
                src={cover}
                alt={track.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={handleArtworkError}
              />
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
                <Icon name="music" size={40} color="var(--text3)" />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <h2
                style={{
                  fontFamily: "var(--ff-display)",
                  fontSize: 20,
                  letterSpacing: "0.03em",
                  lineHeight: 1.15,
                  margin: 0,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {track.title}
              </h2>
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(auth.currentUser?.id === user.id ? "/profile" : `/user/${user.id}`);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 6,
                    background: "none",
                    color: "var(--accent)",
                    fontSize: 14,
                    fontWeight: 600,
                    maxWidth: "100%",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.username}
                  </span>
                  {user.verified ? <VerifiedBadge size={14} /> : null}
                </button>
              ) : (
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text3)" }}>Unknown artist</p>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {track.genre ? (
                <span className="tag tag-blue" style={{ fontSize: 10, padding: "3px 8px" }}>
                  {track.genre}
                </span>
              ) : null}
              <LikeButton mixId={track.id} variant="inline" size="sm" />
              <WaveAnim active={isPlaying} />
            </div>

            <div>
              <div
                className="progress-wrap"
                style={{ cursor: "pointer", touchAction: "none" }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  onSeek(((e.clientX - rect.left) / rect.width) * 100);
                }}
              >
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                  fontSize: 11,
                  color: "var(--text3)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span>{fmtPlayerTime(elapsedSec)}</span>
                <span>{fmtPlayerTime(remainingSec)}</span>
              </div>
            </div>

            <div
              className="dnp-transport"
              aria-label="Playback controls"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className={`mnp-control mnp-control-glow dnp-control${shuffleOn ? " is-on" : ""}`}
                onClick={() => onToggleShuffle?.()}
                aria-label={shuffleOn ? "Shuffle on" : "Shuffle off"}
                aria-pressed={shuffleOn}
                title={shuffleOn ? "Shuffle on" : "Shuffle off"}
              >
                <Icon name="shuffle" size={20} />
              </button>
              <button
                type="button"
                className="mnp-control mnp-control-glow dnp-control"
                onClick={() => void onPrev?.()}
                aria-label="Previous track"
                title="Previous"
              >
                <Icon name="prev" size={20} />
              </button>
              <button
                type="button"
                className="mnp-control mnp-control-main mnp-control-glow dnp-control-main"
                onClick={onToggle}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                <Icon name={isPlaying ? "pause" : "play"} size={24} />
              </button>
              <button
                type="button"
                className="mnp-control mnp-control-glow dnp-control"
                onClick={() => void onNext?.()}
                aria-label="Next track"
                title="Next"
              >
                <Icon name="skip" size={20} />
              </button>
              <button
                type="button"
                className="mnp-control mnp-control-glow dnp-control"
                onClick={restart}
                aria-label="Restart mix"
                title="Restart"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <polyline points="3 4 3 10 9 10" />
                </svg>
              </button>
            </div>

            <div
              aria-label="Mix actions"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {allowDownload ? (
                  <button
                    type="button"
                    className={`mnp-utility mnp-utility-glow dnp-utility${liked && hasAudioSource ? " is-on" : ""}`}
                    onClick={() => void handleDownload()}
                    disabled={!hasAudioSource}
                    title={
                      guest
                        ? "Sign in to download"
                        : !liked
                          ? "Like this mix to unlock download"
                          : hasAudioSource
                            ? "Download full mix"
                            : "No audio available to download"
                    }
                    aria-label={liked ? "Download full mix" : "Like to download"}
                    style={{
                      opacity: hasAudioSource ? 1 : 0.4,
                      cursor: hasAudioSource ? "pointer" : "not-allowed",
                    }}
                  >
                    <Icon name="download" size={18} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="mnp-utility mnp-utility-glow dnp-utility"
                  onClick={handleShare}
                  title="Share"
                  aria-label="Share"
                >
                  <Icon name="share" size={18} />
                </button>
                <button
                  type="button"
                  className="mnp-utility mnp-utility-glow dnp-utility"
                  onClick={() => {
                    if (guest) {
                      auth.setShowAuth(true);
                      return;
                    }
                    onClose();
                    navigate(`/mix/${track.id}`, { state: { from: location.pathname } });
                  }}
                  title={guest ? "Sign in for mix page" : "Open mix"}
                  aria-label={guest ? "Sign in for mix page" : "Open mix"}
                  style={{ opacity: guest ? 0.55 : 1 }}
                >
                  <Icon name="eye" size={18} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 140px", maxWidth: 220 }}>
                <Icon name="volume" size={16} color="var(--text3)" />
                <div
                  className="progress-wrap"
                  style={{ flex: 1, cursor: "pointer" }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onVolume(((e.clientX - rect.left) / rect.width) * 100);
                  }}
                >
                  <div
                    className="progress-fill"
                    style={{
                      width: `${volume}%`,
                      background: "linear-gradient(90deg, var(--text3), var(--text2))",
                    }}
                  />
                </div>
              </div>
            </div>

            {guest ? (
              <div style={{ fontSize: 11, color: "var(--orange)", lineHeight: 1.45 }}>
                {!guestPlaybackOk ? "No preview for this mix. " : null}
                <button
                  type="button"
                  onClick={() => auth.setShowAuth(true)}
                  style={{ background: "none", color: "var(--accent)", fontWeight: 700 }}
                >
                  Sign in
                </button>{" "}
                {guestPlaybackOk ? "for full playback." : "when available."}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
