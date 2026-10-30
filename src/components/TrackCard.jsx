import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import LikeButton from "./LikeButton.jsx";
import MixLiveListeners from "./MixLiveListeners.jsx";
import UserAvatar from "./UserAvatar.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";
import { fmt, fmtDuration } from "../lib/format.js";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { isProPlan } from "../constants/plans.js";
import { useApp } from "../context/AppContext.jsx";

/**
 * Mix grid card. Card click opens the mix page without starting playback.
 * Only the cover play control starts / toggles audio.
 * layout="row" = compact horizontal tile (small art, title uses full remaining width).
 */
export default function TrackCard({
  episode,
  users,
  isPlaying,
  isActive,
  onPlay,
  onDownload,
  compact = false,
  layout = "stack",
  /** Desktop: slightly smaller cover + full wrapping title (no clamp). */
  fullTitle = false,
}) {
  const { auth } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const user = users.find((u) => u.id === episode.userId);
  const showDownloads = isProPlan(auth.currentUser);
  const isRow = layout === "row";
  const pad = isRow ? "8px 10px 8px 8px" : compact ? "8px 10px" : fullTitle ? "12px 14px" : "14px 16px";
  const titleSize = isRow ? 13 : compact ? 12 : fullTitle ? 13 : 14;
  const metaSize = compact || isRow ? 10 : 12;
  const iconSm = compact || isRow ? 11 : 13;
  const avatarSz = isRow ? 14 : compact ? 16 : 20;
  const badgeSz = compact || isRow ? 10 : 13;
  const playBtn = isRow ? 28 : compact ? 36 : fullTitle ? 44 : 52;
  const playIcon = isRow ? 12 : compact ? 16 : fullTitle ? 18 : 20;
  const genreTagSize = compact || isRow ? 9 : 11;
  const cornerPad = isRow ? 4 : compact ? 6 : fullTitle ? 8 : 10;
  const durSize = compact || isRow ? 10 : 11;
  const artSize = isRow ? 72 : null;
  const shrinkArt = fullTitle && !isRow;

  const openMix = () => {
    navigate(`/mix/${episode.id}`, { state: { from: location.pathname } });
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onPlay?.(episode);
  };

  const art = (
    <div
      style={
        shrinkArt
          ? {
              padding: "10px 10px 0",
              boxSizing: "border-box",
            }
          : undefined
      }
    >
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          width: artSize || "100%",
          height: artSize || undefined,
          borderRadius: isRow ? 8 : shrinkArt ? 10 : undefined,
          overflow: isRow || shrinkArt ? "hidden" : undefined,
        }}
      >
        <img
          src={resolveMixArtwork(episode.coverUrl)}
          alt={episode.title}
          style={{
            width: "100%",
            height: artSize || undefined,
            aspectRatio: artSize ? undefined : "1/1",
            objectFit: "cover",
            display: "block",
          }}
          onError={handleArtworkError}
        />
        {!isRow ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isActive ? "rgba(7,9,15,0.45)" : "rgba(7,9,15,0.22)",
            opacity: isActive ? 1 : undefined,
            transition: "background 0.2s ease",
          }}
          className="track-card-play-layer"
        >
          <button
            type="button"
            className="track-card-play-btn"
            aria-label={isActive && isPlaying ? "Pause mix" : "Play mix"}
            title={isActive && isPlaying ? "Pause" : "Play"}
            onClick={handlePlayClick}
            style={{
              width: playBtn,
              height: playBtn,
              borderRadius: "50%",
              border: "none",
              padding: 0,
              background: "var(--accent2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 24px var(--glow)",
              cursor: "pointer",
              animation: isActive && isPlaying ? "glow 2s ease-in-out infinite" : undefined,
            }}
          >
            <Icon name={isActive && isPlaying ? "pause" : "play"} size={playIcon} color="#07090F" />
          </button>
        </div>
        {!isRow ? (
          <>
            <div
              style={{
                position: "absolute",
                top: cornerPad,
                right: cornerPad,
                zIndex: 4,
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <LikeButton mixId={episode.id} size={compact || fullTitle ? "sm" : "md"} />
            </div>
            <div style={{ position: "absolute", bottom: cornerPad, left: cornerPad, right: cornerPad, zIndex: 2 }}>
              <span className="tag tag-blue" style={{ fontSize: genreTagSize, padding: compact ? "2px 8px" : undefined }}>
                {episode.genre}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  const titleBlock = (
    <div
      style={{
        fontWeight: 600,
        fontSize: titleSize,
        marginBottom: isRow ? 4 : compact ? 6 : 10,
        lineHeight: 1.35,
        ...(isRow || fullTitle
          ? {
              overflow: "visible",
              wordBreak: "break-word",
              whiteSpace: "normal",
            }
          : {
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }),
      }}
    >
      {episode.title}
    </div>
  );

  const artistBlock =
    user ? (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isRow || compact ? 5 : 7,
          marginBottom: isRow ? 6 : compact ? 8 : 12,
          minWidth: 0,
        }}
      >
        <UserAvatar user={user} size={avatarSz} />
        <Link
          to={`/user/${user.id}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: metaSize,
            color: "var(--text2)",
            textDecoration: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {user.username}
        </Link>
        {user.verified ? <VerifiedBadge size={badgeSz} /> : null}
      </div>
    ) : null;

  const metaRow = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", gap: isRow || compact ? 8 : 14, minWidth: 0, flexShrink: 1, alignItems: "center" }}>
        {isActive && isPlaying ? (
          <MixLiveListeners mixId={episode.id} size={compact || isRow ? "sm" : "md"} />
        ) : null}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            fontSize: metaSize,
            color: "var(--text3)",
          }}
        >
          <Icon name="headphones" size={iconSm} color="var(--text3)" />
          {fmt(episode.plays)}
        </span>
        {showDownloads ? (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: metaSize,
              color: "var(--text3)",
            }}
          >
            <Icon name="download" size={iconSm} color="var(--text3)" />
            {fmt(episode.downloads)}
          </span>
        ) : null}
        {isRow ? (
          <span className="tag tag-blue" style={{ fontSize: genreTagSize, padding: "2px 6px" }}>
            {episode.genre}
          </span>
        ) : null}
      </div>
      <span style={{ fontSize: durSize, color: "var(--text3)", flexShrink: 0 }}>
        {fmtDuration(episode.durationSecs)}
      </span>
    </div>
  );

  return (
    <div
      className={`track-card ${isActive ? "active" : ""}${isRow ? " track-card-row" : ""}`}
      role="link"
      tabIndex={0}
      onClick={openMix}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openMix();
        }
      }}
      style={{
        cursor: "pointer",
        ...(compact || isRow ? { borderRadius: 12 } : undefined),
        ...(isRow
          ? {
              display: "flex",
              alignItems: "center",
              gap: 0,
              paddingLeft: 8,
            }
          : undefined),
      }}
    >
      {art}
      <div
        style={{
          padding: pad,
          flex: isRow ? 1 : undefined,
          minWidth: isRow ? 0 : undefined,
          display: isRow ? "flex" : undefined,
          flexDirection: isRow ? "column" : undefined,
          justifyContent: isRow ? "center" : undefined,
        }}
      >
        {isRow ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>{titleBlock}</div>
            <div
              style={{ flexShrink: 0, marginTop: -2 }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <LikeButton mixId={episode.id} size="sm" />
            </div>
          </div>
        ) : (
          titleBlock
        )}
        {!isRow ? artistBlock : null}
        {metaRow}
        {onDownload ? null : null}
      </div>
    </div>
  );
}
