import { episodeHasAudioSource } from "./audioUrls.js";

/** Max share of feed slots that can be Deep House Lab (prevents flooding). */
const MAX_DHLAB_RATIO = 0.38;
/** Base chance to pick DHL when both queues have items. */
const DHLAB_PICK_BIAS = 0.42;
/** Never place more than this many DHL items back-to-back. */
const MAX_DHLAB_STREAK = 2;

function sortNewestFirst(list) {
  return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dailySeed(viewerUserId, salt = "vault") {
  const day = Math.floor(Date.now() / 86400000);
  return hashSeed(`${viewerUserId || "guest"}:${salt}:${day}`);
}

/** Light shuffle within small windows so DHL-only feeds are not rigidly chronological. */
function softenDhlabOrdering(dhlabQueue, viewerUserId) {
  const rand = mulberry32(dailySeed(viewerUserId, "dhl-order"));
  const arr = [...dhlabQueue];
  for (let i = 0; i < arr.length; i += 1) {
    const window = Math.min(5, arr.length - i);
    if (window < 2) break;
    const offset = Math.floor(rand() * window);
    const j = i + offset;
    if (j !== i) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  return arr;
}

/**
 * Interleave followed artists with Deep House Lab posts.
 * DHL is boosted but capped and streak-limited; order is stable per user per day.
 */
function blendFollowedWithDhlab(otherQueue, dhlabQueue, viewerUserId) {
  const rand = mulberry32(dailySeed(viewerUserId, "vault-blend"));
  const others = [...otherQueue];
  const dhlab = [...dhlabQueue];
  const result = [];

  const totalEstimate = others.length + dhlab.length;
  const maxDhlabSlots = Math.max(1, Math.ceil(totalEstimate * MAX_DHLAB_RATIO));
  let dhlabUsed = 0;
  let dhlabStreak = 0;

  while (others.length > 0 || dhlab.length > 0) {
    if (!others.length) {
      result.push(...dhlab);
      break;
    }
    if (!dhlab.length) {
      result.push(...others);
      break;
    }

    const canPickDhlab = dhlabUsed < maxDhlabSlots && dhlabStreak < MAX_DHLAB_STREAK;

    if (!canPickDhlab) {
      result.push(others.shift());
      dhlabStreak = 0;
      continue;
    }

    const filledRatio = dhlabUsed / Math.max(1, result.length + 1);
    let pDhlab = DHLAB_PICK_BIAS * (1 - filledRatio / MAX_DHLAB_RATIO);
    pDhlab = Math.max(0.16, Math.min(0.52, pDhlab));

    if (rand() < pDhlab) {
      result.push(dhlab.shift());
      dhlabUsed += 1;
      dhlabStreak += 1;
    } else {
      result.push(others.shift());
      dhlabStreak = 0;
    }
  }

  return result;
}

/**
 * Build Vault Feed for a signed-in user.
 * - Followed artists (newest first) form the base.
 * - Deep House Lab mixes are woven in for every user (follow or not), without duplicates.
 */
export function buildVaultFeed({ episodes, followingIds, dhlabUserId, viewerUserId, hasAudio = episodeHasAudioSource }) {
  const playable = (episodes || []).filter((ep) => hasAudio(ep));
  const following = followingIds instanceof Set ? followingIds : new Set(followingIds || []);

  const dhlabEpisodes = dhlabUserId
    ? sortNewestFirst(playable.filter((ep) => ep.userId === dhlabUserId))
    : [];

  const followedEpisodes = following.size
    ? sortNewestFirst(playable.filter((ep) => following.has(ep.userId)))
    : [];

  if (!dhlabEpisodes.length) {
    if (followedEpisodes.length) return followedEpisodes;
    return catalogFallback(playable, viewerUserId);
  }

  const otherFollowed = followedEpisodes.filter((ep) => ep.userId !== dhlabUserId);

  if (!otherFollowed.length) {
    return softenDhlabOrdering(dhlabEpisodes, viewerUserId);
  }

  const blended = blendFollowedWithDhlab(otherFollowed, dhlabEpisodes, viewerUserId);
  return blended.length ? blended : softenDhlabOrdering(dhlabEpisodes, viewerUserId);
}

function catalogFallback(playable, viewerUserId, limit = 30) {
  if (!playable.length) return [];
  return softenDhlabOrdering(sortNewestFirst(playable).slice(0, limit), viewerUserId);
}
