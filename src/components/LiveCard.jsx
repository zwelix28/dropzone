import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import UserAvatar from "./UserAvatar.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";
import { fmt } from "../lib/format.js";

export default function LiveCard({ stream, users, onJoin, compact = false }) {
  const user = users.find((u) => u.id === stream.userId);
  const [listeners, setListeners] = useState(stream.listeners);
  const edge = compact ? 6 : 10;
  const titleSize = compact ? 12 : 14;
  const metaSize = compact ? 10 : 12;
  const listenSize = compact ? 11 : 12;
  const iconListen = compact ? 11 : 13;
  const genreSize = compact ? 9 : 11;
  const avatarSz = compact ? 18 : 24;
  const badgeSz = compact ? 10 : 12;
  const bodyPad = compact ? "8px 10px" : "14px 16px";
  const gapRow = compact ? 6 : 8;

  useEffect(() => {
    const t = setInterval(
      () => setListeners((l) => l + Math.floor(Math.random() * 5 - 2)),
      4000,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="track-card"
      onClick={() => onJoin(stream)}
      style={{ cursor: "pointer", ...(compact ? { borderRadius: 12 } : {}) }}
    >
      <div style={{ position: "relative" }}>
        <img
          src={stream.coverUrl}
          alt={stream.title}
          style={{
            width: "100%",
            aspectRatio: "16/9",
            objectFit: "cover",
            display: "block",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: edge,
            left: edge,
            display: "flex",
            gap: compact ? 6 : 8,
            alignItems: "center",
            flexWrap: compact ? "wrap" : "nowrap",
            maxWidth: compact ? "calc(100% - 72px)" : undefined,
          }}
        >
          <span className="live-badge" style={compact ? { fontSize: 10, padding: "3px 8px" } : undefined}>
            <span className="live-dot" />
            LIVE
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: listenSize,
              color: "#fff",
            }}
          >
            <Icon name="people" size={iconListen} color="#fff" />
            {fmt(listeners)} listening
          </span>
        </div>
        <div style={{ position: "absolute", top: edge, right: edge }}>
          <span className="tag tag-blue" style={{ fontSize: genreSize, padding: compact ? "2px 8px" : undefined }}>
            {stream.genre}
          </span>
        </div>
      </div>
      <div style={{ padding: bodyPad }}>
        <div style={{ fontWeight: 600, fontSize: titleSize, marginBottom: compact ? 4 : 6, lineHeight: 1.25 }}>
          {stream.title}
        </div>
        {user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: gapRow,
              justifyContent: "space-between",
              flexWrap: compact ? "wrap" : "nowrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: compact ? 5 : 7, minWidth: 0 }}>
              <UserAvatar user={user} size={avatarSz} />
              <span style={{ fontSize: metaSize, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.username}
              </span>
              {user.verified ? <VerifiedBadge size={badgeSz} /> : null}
            </div>
            <span style={{ fontSize: compact ? 10 : 11, color: "var(--text3)", flexShrink: 0 }}>
              Live {stream.startedAt}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

