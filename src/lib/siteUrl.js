/** Canonical public origin for SEO, sitemaps, and share cards. */

const FALLBACK_ORIGIN = "https://deephouselab.co.za";

export function getPublicSiteOrigin() {
  const fromEnv = String(import.meta.env.VITE_PUBLIC_SITE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, "");
    if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return origin;
    }
  }
  return FALLBACK_ORIGIN;
}

export function absoluteUrl(path = "/") {
  const origin = getPublicSiteOrigin();
  if (!path || path === "/") return `${origin}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

export function absoluteAssetUrl(pathOrUrl) {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return absoluteUrl("/DeepHouseLabLogo.png");
  if (/^https?:\/\//i.test(raw)) return raw;
  return absoluteUrl(raw.startsWith("/") ? raw : `/${raw}`);
}
