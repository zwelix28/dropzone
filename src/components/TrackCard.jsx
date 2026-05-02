import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import LikeButton from "./LikeButton.jsx";
import UserAvatar from "./UserAvatar.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";
import { fmt, fmtDuration } from "../lib/format.js";

export default function TrackCard({
  episode,
  users,
  isPlaying,
  isActive,
  onPlay,
  onDownload,
  compact = false,
}) {
  const user = users.find((u) => u.id === episode.userId);
  const pad = compact ? "8px 10px" : "14px 16px";
  const titleSize = compact ? 12 : 14;
  const descSize = compact ? 10 : 12;
  const metaSize = compact ? 10 : 12;
  const iconSm = compact ? 11 : 13;
  const avatarSz = compact ? 16 : 20;
  const badgeSz = compact ? 10 : 13;
  const playBtn = compact ? 36 : 52;
  const playIcon = compact ? 16 : 20;
  const genreTagSize = compact ? 9 : 11;
  const cornerPad = compact ? 6 : 10;
  const durSize = compact ? 10 : 11;

  return (
    <div
      className={`track-card ${isActive ? "active" : ""}`}
      onClick={() => onPlay(episode)}
      style={compact ? { borderRadius: 12 } : undefined}
    >
      <div style={{ position: "relative" }}>
        <img
          src={episode.coverUrl}
          alt={episode.title}
          style={{
            width: "100%",
            aspectRatio: "1/1",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)",
          }}
        />
        {isActive && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(7,9,15,0.45)",
            }}
          >
            <div
              style={{
                width: playBtn,
                height: playBtn,
                borderRadius: "50%",
                background: "var(--accent2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 24px var(--glow)",
                animation: "glow 2s ease-in-out infinite",
              }}
            >
              <Icon
                name={isPlaying ? "pause" : "play"}
                size={playIcon}
                color="#07090F"
              />
            </div>
          </div>
        )}
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
          <LikeButton mixId={episode.id} size={compact ? "sm" : "md"} />
        </div>
        <div style={{ position: "absolute", bottom: cornerPad, left: cornerPad, right: cornerPad }}>
          <span className="tag tag-blue" style={{ fontSize: genreTagSize, padding: compact ? "2px 8px" : undefined }}>
            {episode.genre}
          </span>
        </div>
      </div>
      <div style={{ padding: pad }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: titleSize,
            marginBottom: compact ? 2 : 4,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: compact ? 2 : 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {episode.title}
        </div>
        {episode.description && !compact ? (
          <div
            title={episode.description}
            style={{
              fontSize: descSize,
              color: "var(--text3)",
              marginBottom: 10,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {episode.description}
          </div>
        ) : null}
        {episode.description && compact ? (
          <div
            title={episode.description}
            style={{
              fontSize: descSize,
              color: "var(--text3)",
              marginBottom: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {episode.description}
          </div>
        ) : null}
        {user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: compact ? 5 : 7,
              marginBottom: compact ? 8 : 12,
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
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", gap: compact ? 8 : 14, minWidth: 0, flexShrink: 1 }}>
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
          </div>
          <span style={{ fontSize: durSize, color: "var(--text3)", flexShrink: 0 }}>
            {fmtDuration(episode.durationSecs)}
          </span>
        </div>
        {onDownload ? null : null}
      </div>
    </div>
  );
}
