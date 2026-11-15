import { absoluteAssetUrl, absoluteUrl, getPublicSiteOrigin } from "./siteUrl.js";

const DEFAULT_TITLE = "Deep House Lab";
const DEFAULT_DESCRIPTION =
  "Stream curated deep house mixes, follow resident DJs, and collect late-night crates on Deep House Lab.";
const DEFAULT_IMAGE = "/DeepHouseLabLogo.png";
const SITE_NAME = "Deep House Lab";

function ensureMeta(attr, key, content) {
  if (typeof document === "undefined") return;
  const selector = attr === "property" ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function ensureLink(rel, href) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function ensureJsonLd(id, data) {
  if (typeof document === "undefined") return;
  const scriptId = `dhl-jsonld-${id}`;
  let el = document.getElementById(scriptId);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = scriptId;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Apply document SEO tags for the current view.
 * @param {{
 *   title?: string,
 *   description?: string,
 *   path?: string,
 *   image?: string,
 *   type?: "website" | "music.song" | "profile" | "article",
 *   noindex?: boolean,
 *   jsonLd?: object | object[] | null,
 * }} opts
 */
export function applyPageSeo({
  title,
  description,
  path = "/",
  image,
  type = "website",
  noindex = false,
  jsonLd = null,
} = {}) {
  if (typeof document === "undefined") return;

  const pageTitle = title?.trim()
    ? title.includes(SITE_NAME)
      ? title.trim()
      : `${title.trim()} · ${SITE_NAME}`
    : DEFAULT_TITLE;
  const desc = (description || DEFAULT_DESCRIPTION).trim().slice(0, 320);
  const url = absoluteUrl(path);
  const imageUrl = absoluteAssetUrl(image || DEFAULT_IMAGE);

  document.title = pageTitle;
  ensureMeta("name", "description", desc);
  ensureMeta("name", "robots", noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large");
  ensureLink("canonical", url);

  ensureMeta("property", "og:site_name", SITE_NAME);
  ensureMeta("property", "og:locale", "en_ZA");
  ensureMeta("property", "og:type", type);
  ensureMeta("property", "og:title", pageTitle);
  ensureMeta("property", "og:description", desc);
  ensureMeta("property", "og:url", url);
  ensureMeta("property", "og:image", imageUrl);

  ensureMeta("name", "twitter:card", "summary_large_image");
  ensureMeta("name", "twitter:title", pageTitle);
  ensureMeta("name", "twitter:description", desc);
  ensureMeta("name", "twitter:image", imageUrl);

  const graph = Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : jsonLd ? [jsonLd] : [];
  if (!graph.length) {
    ensureJsonLd("page", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: getPublicSiteOrigin(),
      description: DEFAULT_DESCRIPTION,
      potentialAction: {
        "@type": "SearchAction",
        target: `${getPublicSiteOrigin()}/mixes?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    });
    return;
  }
  ensureJsonLd("page", graph.length === 1 ? graph[0] : { "@context": "https://schema.org", "@graph": graph });
}

export const SEO_DEFAULTS = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  image: DEFAULT_IMAGE,
  siteName: SITE_NAME,
};
