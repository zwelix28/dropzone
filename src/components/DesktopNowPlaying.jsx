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
  resolveMixDownloadUrl,
} from "../lib/audioUrls.js";
import { getGuestPreviewSegment } from "../lib/forYouPreview.js";
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
}) {
  const { auth, trackEvent } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const guest = !auth.session?.user?.id;

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
  const cover = track.coverUrl?.trim();
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/mix/${track.id}`;

  const handleDownload = async () => {
    if (guest) {
      auth.setShowAuth(true);
      return;
    }
    if (!hasAudioSource) return;
    const url = await resolveMixDownloadUrl(track, track.title);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    a.target = "_blank";
    a.download = `${(track.title || "mix").replace(/[^\w\s-]/g, "").trim()}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    void trackEvent({ kind: "download", episodeId: track.id, actorUserId: auth.currentUser?.id });
  };

  const handleShare = async () => {
    const payload = {
      title: track.title || "Mix",
      text: user ? `${track.title} — ${user.username}` : track.title,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // fallthrough
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore
    }

    void trackEvent({ kind: "share", episodeId: track.id, actorUserId: auth.currentUser?.id });
  };

  const iconBtn = (props) => (
    <button
      type="button"
      {...props}
      style={{
        background: "none",
        color: "var(--text2)",
        minWidth: 40,
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: 8,
        ...props.style,
      }}
    />
  );

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
          width: "min(520px, calc(100vw - 280px))",
          zIndex: 850,
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
              <img src={cover} alt={track.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
                    navigate(`/user/${user.id}`);
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

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {iconBtn({
                  onClick: () => void onPrev?.(),
                  title: "Previous",
                  children: <Icon name="prev" size={18} />,
                })}
                <button
                  type="button"
                  onClick={onToggle}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "var(--accent2)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 20px var(--glow)",
                    margin: "0 4px",
                  }}
                >
                  <Icon name={isPlaying ? "pause" : "play"} size={20} color="#07090F" />
                </button>
                {iconBtn({
                  onClick: () => void onNext?.(),
                  title: "Next",
                  children: <Icon name="skip" size={18} />,
                })}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {iconBtn({
                  onClick: () => void handleDownload(),
                  disabled: !hasAudioSource,
                  title: guest ? "Sign in to download" : "Download",
                  style: {
                    opacity: hasAudioSource ? (guest ? 0.5 : 1) : 0.35,
                    cursor: hasAudioSource ? "pointer" : "not-allowed",
                  },
                  children: <Icon name="download" size={18} />,
                })}
                {iconBtn({
                  onClick: handleShare,
                  title: "Share",
                  children: <Icon name="share" size={18} />,
                })}
                {iconBtn({
                  onClick: () => {
                    if (guest) {
                      auth.setShowAuth(true);
                      return;
                    }
                    onClose();
                    navigate(`/mix/${track.id}`, { state: { from: location.pathname } });
                  },
                  title: guest ? "Sign in for mix page" : "Open mix",
                  style: { opacity: guest ? 0.55 : 1 },
                  children: <Icon name="eye" size={18} />,
                })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="volume" size={16} color="var(--text3)" />
              <div
                className="progress-wrap"
                style={{ flex: 1, maxWidth: 160, cursor: "pointer" }}
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
                {guestPlaybackOk ? "for full playback & download." : "when available."}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
