/** Official Deep House Lab account — optional override via env (Supabase user UUID). */
export const DHLAB_USER_ID = (import.meta.env.VITE_DHLAB_USER_ID || "").trim() || null;

const DHLAB_HANDLES = new Set([
  "@deephouselab",
  "@dhlab",
  "@deephouse.lab",
  "@musicvault",
  "@musicvaultbydhlab",
  "@deephouselabofficial",
]);

const DHLAB_USERNAMES = new Set([
  "deep house lab",
  "deephouselab",
  "dhlab",
  "deep house lab official",
  "music vault",
  "music vault by dhlab",
  "musicvault",
  "musicvaultbydhlab",
]);

function normalizeHandle(handle) {
  const s = String(handle || "").trim().toLowerCase();
  if (!s) return "";
  return s.startsWith("@") ? s : `@${s}`;
}

function textLooksDhlab(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return false;
  return (
    t.includes("deep house lab") ||
    t.includes("deephouselab") ||
    t.includes("music vault by dhlab") ||
    t.includes("music vault")
  );
}

export function isDhlabProfile(user) {
  if (!user?.id) return false;
  if (DHLAB_USER_ID && user.id === DHLAB_USER_ID) return true;

  const handle = normalizeHandle(user.handle);
  const username = String(user.username || "").trim().toLowerCase();

  if (DHLAB_HANDLES.has(handle)) return true;
  if (DHLAB_USERNAMES.has(username)) return true;
  if (textLooksDhlab(username)) return true;
  if (textLooksDhlab(user.bio)) return true;
  if (handle.includes("dhlab") || handle.includes("deephouselab") || handle.includes("musicvault")) return true;

  return false;
}

/** Infer DHL uploader from mix copy when the profile row does not match. */
function resolveDhlabUserIdFromEpisodes(episodes = []) {
  const scores = new Map();
  for (const ep of episodes) {
    if (!ep?.userId) continue;
    let score = 0;
    if (textLooksDhlab(ep.description)) score += 3;
    if (textLooksDhlab(ep.title)) score += 1;
    if (score > 0) scores.set(ep.userId, (scores.get(ep.userId) || 0) + score);
  }
  let bestId = null;
  let bestScore = 0;
  for (const [id, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  return bestId;
}

/** Prefer verified artist with the largest catalog when DHL is still ambiguous. */
function resolveDhlabUserIdFromCatalog(users = [], episodes = []) {
  const counts = new Map();
  for (const ep of episodes) {
    if (!ep?.userId) continue;
    counts.set(ep.userId, (counts.get(ep.userId) || 0) + 1);
  }
  let bestId = null;
  let bestCount = 0;
  for (const user of users) {
    if (!user.verified) continue;
    const c = counts.get(user.id) || 0;
    if (c > bestCount) {
      bestCount = c;
      bestId = user.id;
    }
  }
  return bestCount > 0 ? bestId : null;
}

export function resolveDhlabUserId(users = [], episodes = []) {
  if (DHLAB_USER_ID) return DHLAB_USER_ID;

  const fromProfile = users.find((u) => isDhlabProfile(u));
  if (fromProfile?.id) return fromProfile.id;

  const fromEpisodes = resolveDhlabUserIdFromEpisodes(episodes);
  if (fromEpisodes) return fromEpisodes;

  return resolveDhlabUserIdFromCatalog(users, episodes);
}
