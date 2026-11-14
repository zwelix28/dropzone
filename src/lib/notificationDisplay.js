import { safeAppHref } from "./safeAppHref.js";

/** Presentation helpers for in-app notification rows. */

const TYPE_PRESETS = {
  new_mix: { icon: "music", color: "var(--accent)", category: "New release" },
  new_user: { icon: "user", color: "var(--orange)", category: "Approval" },
  account_approved: { icon: "check", color: "var(--green)", category: "Account" },
  mix_submitted: { icon: "send", color: "var(--orange)", category: "Review" },
  mix_approved: { icon: "check", color: "var(--green)", category: "Submission" },
  mix_rejected: { icon: "x", color: "var(--red)", category: "Submission" },
  floor_event_submitted: { icon: "fire", color: "var(--orange)", category: "Review" },
  floor_event_approved: { icon: "check", color: "var(--green)", category: "Floor" },
  floor_event_rejected: { icon: "x", color: "var(--red)", category: "Floor" },
  milestone: { icon: "award", color: "var(--orange)", category: "Milestone" },
  follow: { icon: "people", color: "var(--green)", category: "Follower" },
  like: { icon: "heart", color: "var(--red)", category: "Like" },
  mix_presave: { icon: "library", color: "var(--orange)", category: "Pre-save" },
  dm: { icon: "mail", color: "var(--accent)", category: "Message" },
  mention: { icon: "comment", color: "var(--accent3)", category: "Mention" },
  download: { icon: "download", color: "var(--green)", category: "Download" },
  share: { icon: "share", color: "var(--accent)", category: "Share" },
  sale: { icon: "zap", color: "var(--green)", category: "New sale" },
};

export function getNotificationPresentation(notification) {
  const type = notification?.type || "info";
  return TYPE_PRESETS[type] || { icon: "bell", color: "var(--text2)", category: "Update" };
}

/** Map notification types to the correct in-app destination (esp. admin tabs). */
export function resolveNotificationHref(notification) {
  if (!notification) return null;

  const type = notification.type || "";
  const episodeId = notification.episodeId || notification.meta?.mix_id || null;
  const stored = typeof notification.href === "string" ? notification.href.trim() : "";

  if (type === "mix_submitted") {
    return safeAppHref(
      episodeId
        ? `/admin?tab=submissions&mix=${encodeURIComponent(episodeId)}`
        : "/admin?tab=submissions",
    );
  }
  if (type === "floor_event_submitted") {
    return safeAppHref("/admin?tab=floor");
  }
  if (type === "new_user") {
    return safeAppHref("/admin?tab=users");
  }

  // Legacy admin alerts used a bare `/admin` href.
  if (stored === "/admin" || stored.startsWith("/admin?")) {
    if (type.includes("mix") && type.includes("submit")) return safeAppHref("/admin?tab=submissions");
    if (type.includes("floor")) return safeAppHref("/admin?tab=floor");
    if (type === "new_user" || notification.meta?.pending_approval) {
      return safeAppHref("/admin?tab=users");
    }
  }

  return safeAppHref(stored);
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
