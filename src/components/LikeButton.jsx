import Icon from "./Icon.jsx";
import { useApp } from "../context/AppContext.jsx";

/**
 * Favorite a mix (signed-in) or prompt sign-in. Stops propagation for use on TrackCard.
 */
export default function LikeButton({
  mixId,
  /** @type {'sm' | 'md'} */
  size = "md",
  /** overlay = on cover art; inline = mix detail / plain row */
  variant = "overlay",
  /** Hide the Like/Liked text on inline chips (icon-only toolbars). */
  iconOnly = false,
  /** Override heart icon pixel size when set. */
  iconSize: iconSizeProp,
  className = "",
  style: styleProp,
}) {
  const { auth, likedMixIds, toggleLike } = useApp();
  const uid = auth.session?.user?.id;
  const liked = Boolean(uid && mixId && likedMixIds.includes(mixId));
  const iconSize = iconSizeProp ?? (size === "sm" ? 15 : 17);
  const inline = variant === "inline";
  const useActionTile = inline && className.split(/\s+/).includes("mix-detail-action-btn");

  if (!mixId) return null;

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uid) {
      auth.setShowAuth(true);
      return;
    }
    void toggleLike(mixId);
  };

  const heartColor = liked
    ? "#f87171"
    : inline
      ? "currentColor"
      : "rgba(255,255,255,0.85)";

  return (
    <button
      type="button"
      className={
        useActionTile
          ? className
          : inline
            ? `lab-home-chip${className ? ` ${className}` : ""}`
            : `btn btn-ghost${className ? ` ${className}` : ""}`
      }
      aria-label={liked ? "Remove from likes" : "Add to likes"}
      title={liked ? "Remove from likes" : "Save to likes"}
      onClick={onClick}
      style={{
        ...(useActionTile
          ? undefined
          : inline
            ? { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }
            : {
                padding: size === "sm" ? "6px" : "8px 10px",
                minWidth: size === "sm" ? 36 : undefined,
                justifyContent: "center",
                borderRadius: 10,
                background: "rgba(7,9,15,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(4px)",
              }),
        ...styleProp,
      }}
    >
      <Icon name="heart" size={iconSize} color={heartColor} />
      {inline && !iconOnly ? <span>{liked ? "Liked" : "Like"}</span> : null}
    </button>
  );
}
