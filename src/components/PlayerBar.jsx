import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import MarqueeText from "./MarqueeText.jsx";
import MixLiveListeners from "./MixLiveListeners.jsx";
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
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { canDownloadMix } from "../constants/plans.js";
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
  elevatedForTabNav = false,
  desktopExpanded = false,
}) {
  const isMobile = useMediaQuery("(max-width: 720px)");
  if (!track) return null;
  const user = users.find((u) => u.id === track.userId);
  const { auth, trackEvent, likedMixIds, toggleLike } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const guest = !auth.session?.user?.id;
  const liked = Boolean(!guest && track.id && likedMixIds.includes(track.id));
  const allowDownload = canDownloadMix(auth.currentUser, {
    isOwner: Boolean(auth.currentUser?.id && track.userId === auth.currentUser.id),
  });

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
    if (!allowDownload || !hasAudioSource) return;
    if (!liked) return;
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
          e.stopPropagation();
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
        onClick={(e) => {
          e.stopPropagation();
          auth.setShowAuth(true);
        }}
        style={{ background: "none", color: "var(--accent)", fontWeight: 700 }}
      >
        Sign in
      </button>{" "}
      {guestPlaybackOk
        ? isMobile
          ? "for full playback."
          : "for the full-length stream."
        : "when available."}
    </div>
  ) : null;

  if (isMobile) {
    const canExpand = Boolean(!guest && onExpandFullPlayer);
    const openFullPlayer = () => {
      if (!canExpand) return;
      onExpandFullPlayer();
    };

    return (
      <div
        className={`player-bar${elevatedForTabNav ? " player-bar-above-tabs" : ""}${desktopExpanded ? " is-desktop-expanded" : ""}`}
        role={canExpand ? "button" : undefined}
        tabIndex={canExpand ? 0 : undefined}
        aria-label={canExpand ? "Open now playing" : undefined}
        onClick={openFullPlayer}
        onKeyDown={(e) => {
          if (!canExpand) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFullPlayer();
          }
        }}
        style={{ cursor: canExpand ? "pointer" : undefined }}
      >
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
            <img
              src={resolveMixArtwork(track.coverUrl)}
              alt=""
              style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", display: "block", flexShrink: 0 }}
              onError={handleArtworkError}
            />
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <MarqueeText
                text={track.title}
                fill
                style={{ fontWeight: 600, fontSize: 13 }}
              />
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
            <MixLiveListeners mixId={track.id} size="sm" />
            <WaveAnim active={isPlaying} />
          </div>

          {progressRow}
          {guestHint}
        </div>
      </div>
    );
  }

  return (
    <div className={`player-bar${desktopExpanded ? " is-desktop-expanded" : ""}`}>
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
                src={resolveMixArtwork(track.coverUrl)}
                alt={track.title}
                style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", display: "block" }}
                onError={handleArtworkError}
              />
            </button>
          ) : (
            <img
              src={resolveMixArtwork(track.coverUrl)}
              alt={track.title}
              style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }}
              onError={handleArtworkError}
            />
          )}
          <div style={{ overflow: "hidden", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <MarqueeText
                text={track.title}
                maxWidth={180}
                style={{ fontWeight: 600, fontSize: 13 }}
              />
              <MixLiveListeners mixId={track.id} size="sm" />
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
                  maxWidth: 180,
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
          <div className="dnp-transport" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className={`mnp-control mnp-control-glow dnp-control${shuffleOn ? " is-on" : ""}`}
              onClick={() => onToggleShuffle?.()}
              aria-label={shuffleOn ? "Shuffle on" : "Shuffle off"}
              aria-pressed={shuffleOn}
              title={shuffleOn ? "Shuffle on" : "Shuffle off"}
            >
              <Icon name="shuffle" size={18} />
            </button>
            <button
              type="button"
              className="mnp-control mnp-control-glow dnp-control"
              onClick={() => void onPrev?.()}
              aria-label="Previous track"
              title="Previous"
            >
              <Icon name="prev" size={18} />
            </button>
            <button
              type="button"
              className="mnp-control mnp-control-main mnp-control-glow dnp-control-main"
              onClick={onToggle}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <Icon name={isPlaying ? "pause" : "play"} size={20} />
            </button>
            <button
              type="button"
              className="mnp-control mnp-control-glow dnp-control"
              onClick={() => void onNext?.()}
              aria-label="Next track"
              title="Next"
            >
              <Icon name="skip" size={18} />
            </button>
            <button
              type="button"
              className="mnp-control mnp-control-glow dnp-control"
              onClick={restart}
              aria-label="Restart mix"
              title="Restart"
            >
              <svg
                width="18"
                height="18"
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
            className={`mnp-utility dnp-utility${liked ? " is-liked" : ""}`}
            onClick={() => {
              if (guest) {
                auth.setShowAuth(true);
                return;
              }
              void toggleLike(track.id);
            }}
            aria-label={liked ? "Remove from likes" : "Add to likes"}
            title={liked ? "Remove from likes" : "Save to likes"}
            aria-pressed={liked}
          >
            <Icon name="heart" size={16} color={liked ? "#f87171" : "currentColor"} />
          </button>
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
                opacity: hasAudioSource ? 1 : 0.45,
                cursor: hasAudioSource ? "pointer" : "not-allowed",
              }}
            >
              <Icon name="download" size={16} />
            </button>
          ) : null}
          <button
            type="button"
            className="mnp-utility mnp-utility-glow dnp-utility"
            onClick={handleShare}
            title="Share"
            aria-label="Share"
          >
            <Icon name="share" size={16} />
          </button>
          <button
            type="button"
            className="mnp-utility mnp-utility-glow dnp-utility"
            onClick={() => {
              if (guest) {
                auth.setShowAuth(true);
                return;
              }
              navigate(`/mix/${track.id}`, { state: { from: location.pathname } });
            }}
            title={guest ? "Sign in to view mix details" : "Open mix page"}
            aria-label={guest ? "Sign in for mix page" : "Open mix"}
            style={{ opacity: guest ? 0.55 : 1 }}
          >
            <Icon name="eye" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
