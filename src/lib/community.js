import { GENRES } from "../constants/genres.js";

function normalizeGenre(raw) {
  return String(raw || "").trim().toLowerCase();
}

function catalogTaste(userId, episodes = []) {
  const counts = new Map();
  let mixCount = 0;
  for (const ep of episodes) {
    if (ep.userId !== userId) continue;
    mixCount += 1;
    const g = String(ep.genre || "").trim();
    if (!g) continue;
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  let topGenre = "";
  let topN = 0;
  for (const [g, n] of counts) {
    if (n > topN) {
      topGenre = g;
      topN = n;
    }
  }
  return { mixCount, topGenre, genres: counts };
}

/**
 * Rank community profiles for discovery.
 * Shared genre / catalog taste ranks first; then verified, then followers.
 */
export function rankCommunityUsers({ users = [], episodes = [], currentUser, query = "", genreFilter = "All" } = {}) {
  const me = currentUser?.id;
  const myGenre = normalizeGenre(currentUser?.genre);
  const myTaste = me ? catalogTaste(me, episodes) : { mixCount: 0, topGenre: "", genres: new Map() };
  const q = String(query || "").trim().toLowerCase();
  const filter = genreFilter === "All" ? "" : genreFilter;

  const scored = [];
  for (const user of users) {
    if (!user?.id || user.id === me || user.isBanned || user.isApproved === false) continue;

    const taste = catalogTaste(user.id, episodes);
    const profileGenre = String(user.genre || "").trim();
    const effectiveGenre = taste.topGenre || profileGenre;
    if (filter && effectiveGenre !== filter && profileGenre !== filter) continue;

    const haystack = `${user.username || ""} ${user.handle || ""} ${user.bio || ""} ${user.location || ""} ${effectiveGenre}`.toLowerCase();
    if (q && !haystack.includes(q)) continue;

    let score = 0;
    const reasons = [];

    if (myGenre && normalizeGenre(profileGenre) === myGenre) {
      score += 40;
      reasons.push(`Same taste · ${profileGenre}`);
    } else if (myTaste.topGenre && normalizeGenre(taste.topGenre) === normalizeGenre(myTaste.topGenre)) {
      score += 36;
      reasons.push(`Same catalog · ${taste.topGenre}`);
    } else if (myTaste.genres.size && taste.genres.size) {
      let overlap = 0;
      for (const g of myTaste.genres.keys()) {
        if (taste.genres.has(g)) overlap += 1;
      }
      if (overlap > 0) {
        score += 18 + overlap * 4;
        reasons.push("Overlapping genres");
      }
    }

    if (user.verified) score += 12;
    score += Math.min(20, Number(user.followers) || 0) * 0.15;
    score += Math.min(8, taste.mixCount);

    if (!reasons.length && effectiveGenre) reasons.push(effectiveGenre);
    if (!reasons.length) reasons.push("On Music Vault");

    scored.push({
      user,
      score,
      reason: reasons[0],
      mixCount: taste.mixCount,
      topGenre: effectiveGenre,
    });
  }

  scored.sort((a, b) => b.score - a.score || (b.user.followers || 0) - (a.user.followers || 0) || String(a.user.username).localeCompare(String(b.user.username)));
  return scored;
}

export const COMMUNITY_GENRE_FILTERS = ["All", ...GENRES];
