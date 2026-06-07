/** Presentation helpers for in-app notification rows. */

const TYPE_PRESETS = {
  new_mix: { icon: "music", color: "var(--accent)", category: "New release" },
  milestone: { icon: "award", color: "var(--orange)", category: "Milestone" },
  follow: { icon: "people", color: "var(--green)", category: "Follower" },
  dm: { icon: "mail", color: "var(--accent)", category: "Message" },
  download: { icon: "download", color: "var(--green)", category: "Download" },
  share: { icon: "share", color: "var(--accent)", category: "Share" },
};

export function getNotificationPresentation(notification) {
  const type = notification?.type || "info";
  return TYPE_PRESETS[type] || { icon: "bell", color: "var(--text2)", category: "Update" };
}

export function fmtNotificationTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: diffSec > 31536000 ? "numeric" : undefined,
  });
}
