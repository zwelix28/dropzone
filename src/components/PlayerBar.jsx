import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";
import WaveAnim from "./WaveAnim.jsx";
import { fmtPlayerTime } from "../lib/format.js";
import {
  episodeHasAudioSource,
  episodeHasGuestPlayback,
  GUEST_SNIPPET_DURATION_SEC,
  resolveMixDownloadUrl,
} from "../lib/audioUrls.js";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";

export default function PlayerBar({
  track,
  users,
  isPlaying,
  onToggle,
  progress,
  durationSec = 0,
  onSeek,
  volume,
  onVolume,
  onExpandFullPlayer,
}) {
  const isMobile = useMediaQuery("(max-width: 720px)");
  if (!track) return null;
  const user = users.find((u) => u.id === track.userId);
  const { auth, trackEvent } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const guest = !auth.session?.user?.id;

  const hasAudioSource = episodeHasAudioSource(track);
  const guestPlaybackOk = episodeHasGuestPlayback(track);
  const guestEffDuration = guest
    ? Math.min(track.durationSecs || GUEST_SNIPPET_DURATION_SEC, GUEST_SNIPPET_DURATION_SEC)
    : track.durationSecs || 0;
  const totalSec =
    durationSec > 0 ? durationSec : guest ? Math.floor(guestEffDuration) : Math.floor(Math.max(0, track.durationSecs || 0));
  const elapsedSec = totalSec > 0 ? Math.min(totalSec, Math.floor((totalSec * progress) / 100)) : 0;
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const shareUrl = useMemo(() => {
    try {
      return `${window.location.origin}/mix/${track.id}`;
    } catch {
      return `/mix/${track.id}`;
    }
  }, [track.id]);

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

  const progressRow = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 8 : 10,
        width: "100%",
        maxWidth: isMobile ? "none" : 500,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--text3)",
          minWidth: isMobile ? 32 : 35,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtPlayerTime(elapsedSec)}
      </span>
      <div
        className="progress-wrap"
        style={{ flex: 1, touchAction: "none" }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - rect.left) / rect.width) * 100);
        }}
      >
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <span
        style={{
          fontSize: 11,
          color: "var(--text3)",
          minWidth: isMobile ? 32 : 35,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtPlayerTime(remainingSec)}
      </span>
    </div>
  );

  const guestHint = guest ? (
    <div
      style={{
        fontSize: isMobile ? 10 : 11,
        color: "var(--orange)",
        marginTop: 2,
        textAlign: isMobile ? "center" : "left",
        lineHeight: 1.45,
        padding: isMobile ? "0 4px" : 0,
      }}
    >
      {!guestPlaybackOk ? "No preview for this mix. " : null}
      <button
        type="button"
        onClick={() => auth.setShowAuth(true)}
        style={{ background: "none", color: "var(--accent)", fontWeight: 700 }}
      >
        Sign in
      </button>{" "}
      {guestPlaybackOk
        ? isMobile
          ? "for full playback & download."
          : "for the full-length stream and download."
        : "when available."}
    </div>
  ) : null;

  const iconBtn = (props) => (
    <button
      type="button"
      {...props}
      style={{
        background: "none",
        color: "var(--text2)",
        minWidth: 44,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...props.style,
      }}
    />
  );

  if (isMobile) {
    return (
      <div className="player-bar">
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minWidth: 0 }}>
            {onExpandFullPlayer && !guest ? (
              <button
                type="button"
                aria-label="Expand now playing"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpandFullPlayer();
                }}
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="chevronUp" size={20} color="var(--accent)" />
              </button>
            ) : null}
            <img
              src={track.coverUrl}
              alt=""
              style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {track.title}
              </div>
              {user ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: "var(--accent)",
                    marginTop: 2,
                    minWidth: 0,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.username}
                  </span>
                  {user.verified ? <VerifiedBadge size={12} /> : null}
                </div>
              ) : null}
            </div>
            <WaveAnim active={isPlaying} />
            <button
              type="button"
              onClick={onToggle}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--accent2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px var(--glow)",
                flexShrink: 0,
              }}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <Icon name={isPlaying ? "pause" : "play"} size={20} color="#07090F" />
            </button>
          </div>

          {progressRow}
          {guestHint}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 120 }}>
              <Icon name="volume" size={16} color="var(--text3)" />
              <div
                className="progress-wrap"
                style={{ flex: 1, maxWidth: 140, touchAction: "none" }}
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
                  navigate(`/mix/${track.id}`, { state: { from: location.pathname } });
                },
                title: guest ? "Sign in for mix page" : "Open mix",
                style: { opacity: guest ? 0.55 : 1 },
                children: <Icon name="eye" size={18} />,
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-bar">
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
          <img
            src={track.coverUrl}
            alt={track.title}
            style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
          />
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 160,
              }}
            >
              {track.title}
            </div>
            {user && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  color: "var(--accent)",
                  marginTop: 1,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.username}
                </span>
                {user.verified ? <VerifiedBadge size={12} /> : null}
              </div>
            )}
            {track.description ? (
              <div
                title={track.description}
                style={{
                  fontSize: 10,
                  color: "var(--text3)",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 160,
                }}
              >
                {track.description}
              </div>
            ) : null}
          </div>
          <div style={{ marginLeft: 4 }}>
            <WaveAnim active={isPlaying} />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button type="button" onClick={() => {}} style={{ background: "none", color: "var(--text3)" }}>
              <Icon name="shuffle" size={16} />
            </button>
            <button type="button" onClick={() => {}} style={{ background: "none", color: "var(--text2)" }}>
              <Icon name="prev" size={18} />
            </button>
            <button
              type="button"
              onClick={onToggle}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--accent2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px var(--glow)",
                transition: "all 0.2s",
              }}
            >
              <Icon name={isPlaying ? "pause" : "play"} size={18} color="#07090F" />
            </button>
            <button type="button" onClick={() => {}} style={{ background: "none", color: "var(--text2)" }}>
              <Icon name="skip" size={18} />
            </button>
            <button type="button" onClick={() => {}} style={{ background: "none", color: "var(--text3)" }}>
              <Icon name="heart" size={16} />
            </button>
          </div>

          {progressRow}
          {guestHint}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 160,
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <Icon name="volume" size={16} color="var(--text3)" />
          <div
            className="progress-wrap"
            style={{ width: 90 }}
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
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!hasAudioSource}
            title={
              guest
                ? "Sign in to download"
                : hasAudioSource
                  ? "Download"
                  : "No audio available to download"
            }
            style={{
              background: "none",
              color: "var(--text2)",
              opacity: hasAudioSource ? (guest ? 0.45 : 1) : 0.5,
              cursor: hasAudioSource ? "pointer" : "not-allowed",
            }}
          >
            <Icon name="download" size={16} />
          </button>
          <button type="button" onClick={handleShare} title="Share" style={{ background: "none", color: "var(--text2)" }}>
            <Icon name="share" size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (guest) {
                auth.setShowAuth(true);
                return;
              }
              navigate(`/mix/${track.id}`, { state: { from: location.pathname } });
            }}
            title={guest ? "Sign in to view mix details" : "Open mix page"}
            style={{
              background: "none",
              color: "var(--text2)",
              opacity: guest ? 0.45 : 1,
            }}
          >
            <Icon name="eye" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
