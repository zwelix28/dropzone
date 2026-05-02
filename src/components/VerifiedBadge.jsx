import { useState } from "react";
import Icon from "./Icon.jsx";

/** Served from project root `public/verified-artist.png` (drop your asset there). */
const VERIFIED_IMG_SRC = "/verified-artist.png";

/**
 * Verified check for artist accounts (`profiles.verified`).
 * Uses `public/verified-artist.png` when present; otherwise the green circle + icon.
 * @param {number} [size=14] — width/height of the badge (px)
 */
export default function VerifiedBadge({
  size = 14,
  title = "Verified artist",
  style,
  className = "",
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const checkSize = Math.max(8, Math.round(size * 0.58));

  if (!imgFailed) {
    return (
      <img
        className={className}
        src={VERIFIED_IMG_SRC}
        alt={title}
        title={title}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
        style={{
          display: "inline-block",
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          objectFit: "contain",
          verticalAlign: "middle",
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <span
      className={className}
      title={title}
      aria-label={title}
      role="img"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: "50%",
        background: "var(--green)",
        boxShadow: "0 0 0 1.5px var(--bg, #07090F)",
        flexShrink: 0,
        ...style,
      }}
    >
      <Icon name="check" size={checkSize} color="#07090F" />
    </span>
  );
}
