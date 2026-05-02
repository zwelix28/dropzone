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
  className = "",
  style: styleProp,
}) {
  const { auth, likedMixIds, toggleLike } = useApp();
  const uid = auth.session?.user?.id;
  const liked = Boolean(uid && mixId && likedMixIds.includes(mixId));
  const iconSize = size === "sm" ? 15 : 17;
  const inline = variant === "inline";

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

  const heartColor = liked ? "#f87171" : inline ? "var(--text3)" : "rgba(255,255,255,0.85)";

  return (
    <button
      type="button"
      className={`btn btn-ghost ${className}`.trim()}
      aria-label={liked ? "Remove from likes" : "Add to likes"}
      title={liked ? "Remove from likes" : "Save to likes"}
      onClick={onClick}
      style={{
        padding: inline ? (size === "sm" ? "8px 12px" : "8px 14px") : size === "sm" ? "6px" : "8px 10px",
        minWidth: inline ? undefined : size === "sm" ? 36 : undefined,
        justifyContent: "center",
        borderRadius: 10,
        ...(inline
          ? { fontSize: size === "sm" ? 12 : 13 }
          : {
              background: "rgba(7,9,15,0.55)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(4px)",
            }),
        ...styleProp,
      }}
    >
      <Icon name="heart" size={iconSize} color={heartColor} />
      {inline ? <span style={{ marginLeft: 6 }}>{liked ? "Liked" : "Like"}</span> : null}
    </button>
  );
}
