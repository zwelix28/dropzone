import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function AvatarLightbox({ src, label, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label ? `${label} profile photo` : "Profile photo"}
      className="avatar-lightbox"
      onClick={onClose}
    >
      <button type="button" className="avatar-lightbox-close" aria-label="Close" onClick={onClose}>
        <Icon name="x" size={22} />
      </button>
      <div className="avatar-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={label ? `${label} profile photo` : "Profile photo"} />
        {label ? <div className="avatar-lightbox-caption">{label}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export default function UserAvatar({
  user,
  size = 36,
  square = false,
  style,
  className = "",
  /** Show green verified check on the avatar when `user.verified` */
  showVerified = false,
  /**
   * When true and a photo exists, tap/click opens a full-view lightbox.
   * Only enable on profile pages — keep false in lists/cards (Community, etc.).
   */
  expandable = false,
}) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const raw = (user?.avatar || "").trim();
  const showImg = Boolean(raw) && !failed;
  const verified = Boolean(showVerified && user?.verified);
  const canExpand = Boolean(expandable && showImg);
  const label = user?.username || user?.handle || "";

  const openLightbox = (e) => {
    if (!canExpand) return;
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const baseStyle = {
    width: size,
    height: size,
    flexShrink: 0,
    cursor: canExpand ? "pointer" : undefined,
    ...style,
  };

  const badgeSize = Math.max(11, Math.round(size * 0.36));
  const avatarClass = `avatar ${square ? "avatar-sq" : ""} ${className}`.trim();

  const media = !showImg ? (
    <div
      className={avatarClass}
      style={{
        ...baseStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--accent2)",
        color: "var(--bg)",
        fontWeight: 700,
        fontSize: Math.max(12, size * 0.38),
        cursor: undefined,
      }}
      aria-hidden={!user?.username}
    >
      {(user?.username || user?.handle || "?").replace(/^@/, "").charAt(0).toUpperCase() || "?"}
    </div>
  ) : (
    <img
      src={raw}
      alt={user?.username ? `${user.username} avatar` : "Profile photo"}
      className={avatarClass}
      style={baseStyle}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );

  const avatarNode = (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        flexShrink: 0,
        width: size,
        height: size,
        cursor: canExpand ? "pointer" : undefined,
        lineHeight: 0,
      }}
      onClick={canExpand ? openLightbox : undefined}
      onKeyDown={
        canExpand
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") openLightbox(e);
            }
          : undefined
      }
      role={canExpand ? "button" : undefined}
      tabIndex={canExpand ? 0 : undefined}
      title={canExpand ? "View profile photo" : undefined}
      aria-label={canExpand ? (label ? `View ${label}'s profile photo` : "View profile photo") : undefined}
    >
      {media}
      {verified ? (
        <span style={{ position: "absolute", right: -1, bottom: -1, lineHeight: 0, pointerEvents: "none" }}>
          <VerifiedBadge size={badgeSize} />
        </span>
      ) : null}
    </span>
  );

  return (
    <>
      {avatarNode}
      {open && showImg ? <AvatarLightbox src={raw} label={label} onClose={() => setOpen(false)} /> : null}
    </>
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
