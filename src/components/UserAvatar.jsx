import { useState } from "react";
import VerifiedBadge from "./VerifiedBadge.jsx";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export default function UserAvatar({
  user,
  size = 36,
  square = false,
  style,
  className = "",
  /** Show green verified check on the avatar when `user.verified` */
  showVerified = false,
}) {
  const [failed, setFailed] = useState(false);
  const raw = (user?.avatar || "").trim();
  const showImg = Boolean(raw) && !failed;
  const verified = Boolean(showVerified && user?.verified);

  const baseStyle = {
    width: size,
    height: size,
    flexShrink: 0,
    ...style,
  };

  const badgeSize = Math.max(11, Math.round(size * 0.36));

  const inner = !showImg ? (
    <div
      className={`avatar ${square ? "avatar-sq" : ""} ${className}`.trim()}
      style={{
        ...baseStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--accent2)",
        color: "var(--bg)",
        fontWeight: 700,
        fontSize: Math.max(12, size * 0.38),
      }}
      aria-hidden={!user?.username}
    >
      {(user?.username || user?.handle || "?").replace(/^@/, "").charAt(0).toUpperCase() || "?"}
    </div>
  ) : (
    <img
      src={raw}
      alt={user?.username ? `${user.username} avatar` : "Profile photo"}
      className={`avatar ${square ? "avatar-sq" : ""} ${className}`.trim()}
      style={baseStyle}
      onError={() => setFailed(true)}
    />
  );

  if (!verified) return inner;

  return (
    <span style={{ position: "relative", display: "inline-flex", flexShrink: 0, width: size, height: size }}>
      {inner}
      <span style={{ position: "absolute", right: -1, bottom: -1, lineHeight: 0 }}>
        <VerifiedBadge size={badgeSize} />
      </span>
    </span>
  );
}

const MIME_OK = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isLikelyImageFile(file) {
  if (!file?.type?.startsWith("image/")) return false;
  if (!MIME_OK.has(file.type)) return false;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ext) return true;
  return ALLOWED_EXT.has(ext);
}
