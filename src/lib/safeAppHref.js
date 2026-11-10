/**
 * Allow only same-origin relative app paths (blocks open redirects / phishing).
 * Mirrors supabase/functions/notify-delivery safeAppHref (path-only form).
 */
export function safeAppHref(href) {
  const raw = typeof href === "string" ? href.trim() : "";
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;
  if (/[\s"'<>]/.test(raw)) return null;
  return raw;
}

/** Allow only http(s) absolute URLs for outbound links (tickets, event details). */
export function safeHttpUrl(url) {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
