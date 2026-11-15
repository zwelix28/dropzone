/**
 * Serve crawlable HTML meta for mix URLs when search / social bots visit.
 * Humans still get the React SPA via context.next().
 *
 * Requires Netlify env: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 * (same values already used for the client build).
 */

import type { Context } from "https://edge.netlify.com";

const BOT_RE =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|applebot|semrushbot|ahrefsbot|petalbot|embedly|quora link preview|pinterest|redditbot|skypeuripreview/i;

const SITE = (Deno.env.get("VITE_PUBLIC_SITE_URL") || "https://deephouselab.co.za").replace(/\/$/, "");

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absoluteAsset(pathOrUrl: string) {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return `${SITE}/DeepHouseLabLogo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${SITE}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export default async (request: Request, context: Context) => {
  const ua = request.headers.get("user-agent") || "";
  if (!BOT_RE.test(ua)) return context.next();

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/mix\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i);
  if (!match) return context.next();

  const mixId = match[1];
  const supabaseUrl = (Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const anon = Deno.env.get("VITE_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !anon) return context.next();

  try {
    const mixRes = await fetch(
      `${supabaseUrl}/rest/v1/mixes?id=eq.${encodeURIComponent(mixId)}&select=id,title,description,cover_url,genre,user_id,status,visibility&limit=1`,
      {
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
          Accept: "application/json",
        },
      },
    );
    if (!mixRes.ok) return context.next();
    const mixes = (await mixRes.json()) as Array<Record<string, unknown>>;
    const mix = mixes?.[0];
    if (!mix?.id) return context.next();

    // Hidden / rejected mixes should not be indexed.
    const status = String(mix.status || "approved");
    const visibility = String(mix.visibility || "live");
    if (status !== "approved" || (visibility !== "live" && visibility !== "presave")) {
      return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    let artist = "Deep House Lab";
    if (mix.user_id) {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(String(mix.user_id))}&select=username&limit=1`,
        {
          headers: {
            apikey: anon,
            Authorization: `Bearer ${anon}`,
            Accept: "application/json",
          },
        },
      );
      if (profileRes.ok) {
        const profiles = (await profileRes.json()) as Array<{ username?: string }>;
        if (profiles?.[0]?.username) artist = profiles[0].username;
      }
    }

    const title = String(mix.title || "Untitled Mix");
    const pageTitle = `${title} · Deep House Lab`;
    const description = String(mix.description || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280) || `${mix.genre ? `${mix.genre} · ` : ""}Stream “${title}” by ${artist} on Deep House Lab.`;
    const image = absoluteAsset(String(mix.cover_url || "/DeepHouseLabLogo.png"));
    const canonical = `${SITE}/mix/${mixId}`;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:site_name" content="Deep House Lab" />
  <meta property="og:type" content="music.song" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: title,
    description,
    url: canonical,
    image,
    genre: mix.genre || "Deep House",
    byArtist: { "@type": "MusicGroup", name: artist },
  })}</script>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>By ${escapeHtml(artist)} on Deep House Lab.</p>
    <p>${escapeHtml(description)}</p>
    <p><a href="${escapeHtml(canonical)}">Open mix</a></p>
  </main>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "x-dhl-seo": "bot-mix",
      },
    });
  } catch {
    return context.next();
  }
};
