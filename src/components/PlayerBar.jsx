import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";
import WaveAnim from "./WaveAnim.jsx";
import { fmtPlayerTime } from "../lib/format.js";
import {
  episodeHasAudioSource,
  episodeHasGuestPlayback,
} from "../lib/audioUrls.js";
import { downloadMixWithMetadata } from "../lib/downloadMixWithMetadata.js";
import { getGuestPreviewSegment } from "../lib/forYouPreview.js";
import { shareMix } from "../lib/shareMix.js";
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
  onPrev,
  onNext,
  shuffleOn = false,
  onToggleShuffle,
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
  const guestEffDuration = guest ? getGuestPreviewSegment(track.durationSecs).windowSec : track.durationSecs || 0;
  const totalSec =
    durationSec > 0 ? durationSec : guest ? Math.floor(guestEffDuration) : Math.floor(Math.max(0, track.durationSecs || 0));
  const elapsedSec = totalSec > 0 ? Math.min(totalSec, Math.floor((totalSec * progress) / 100)) : 0;
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const handleDownload = async () => {
    if (guest) {
      auth.setShowAuth(true);
      return;
    }
    if (!hasAudioSource) return;
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

  if (isMobile) {
    return (
      <div className="player-bar">
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minWidth: 0 }}>
            <button
              type="button"
              aria-label="Open now playing"
              onClick={(e) => {
                e.stopPropagation();
                if (guest || !onExpandFullPlayer) return;
                onExpandFullPlayer();
              }}
              disabled={guest || !onExpandFullPlayer}
              style={{
                flexShrink: 0,
                padding: 0,
                border: "none",
                background: "none",
                lineHeight: 0,
                cursor: guest || !onExpandFullPlayer ? "default" : "pointer",
              }}
            >
              <img
                src={track.coverUrl}
                alt=""
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", display: "block" }}
              />
            </button>
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
          </div>

          {progressRow}
          {guestHint}
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
          {onExpandFullPlayer ? (
            <button
              type="button"
              aria-label="Expand now playing"
              onClick={(e) => {
                e.stopPropagation();
                onExpandFullPlayer();
              }}
              title="Expand player"
              style={{
                flexShrink: 0,
                padding: 0,
                border: "none",
                background: "none",
                borderRadius: 8,
                cursor: "pointer",
                lineHeight: 0,
              }}
            >
              <img
                src={track.coverUrl}
                alt={track.title}
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", display: "block" }}
              />
            </button>
          ) : (
            <img
              src={track.coverUrl}
              alt={track.title}
              style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
            />
          )}
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
            <button
              type="button"
              onClick={() => onToggleShuffle?.()}
              aria-label={shuffleOn ? "Shuffle on" : "Shuffle off"}
              aria-pressed={shuffleOn}
              title={shuffleOn ? "Shuffle on" : "Shuffle off"}
              style={{ background: "none", color: shuffleOn ? "var(--accent)" : "var(--text3)" }}
            >
              <Icon name="shuffle" size={16} />
            </button>
            <button type="button" onClick={() => void onPrev?.()} style={{ background: "none", color: "var(--text2)" }}>
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
            <button type="button" onClick={() => void onNext?.()} style={{ background: "none", color: "var(--text2)" }}>
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
