/**
 * Local testing mode — no cloud Supabase calls.
 * Enable with VITE_LOCAL_MODE=true in .env.local, then restart Vite.
 *
 * Resume production:
 * 1. Set VITE_LOCAL_MODE=false (or remove it) and restart Vite. Cloud login and
 *    storage turn back on. These browser-only stores are then ignored:
 *    - session flag dhlab.local-auth (local@deephouselab.test / localtest)
 *    - likes in dhlab.local-likes
 *    - DJ of the month in dhlab.dj-of-month
 *    - uploaded mixes in IndexedDB database dhlab-local
 * 2. Publish any test mixes again through Upload so they land in Supabase.
 * 3. Run supabase/dj-of-month.sql if it is not applied, then save DJ of the month
 *    again in Admin. Also confirm mix-active-listeners.sql, notify-email-push.sql,
 *    and comment-mentions-mix-detail-href.sql are applied, and that notify-delivery
 *    still has its Resend, VAPID, and NOTIFY_WEBHOOK_SECRET secrets.
 */

function readFlag(value) {
  if (value == null || typeof value !== "string") return false;
  const s = value.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export function isLocalMode() {
  return readFlag(import.meta.env.VITE_LOCAL_MODE);
}

export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";
export const LOCAL_ARTIST_ID = "00000000-0000-4000-8000-000000000002";
export const LOCAL_TEST_EMAIL = "local@deephouselab.test";
export const LOCAL_TEST_PASSWORD = "localtest";

const LOCAL_AUTH_KEY = "dhlab.local-auth";
const LOCAL_LIKES_KEY = "dhlab.local-likes";

export function readLocalLikes() {
  try {
    const raw = localStorage.getItem(LOCAL_LIKES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string" && id) : [];
  } catch {
    return [];
  }
}

export function writeLocalLikes(mixIds) {
  try {
    localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(mixIds));
  } catch {
    /* ignore quota or private mode */
  }
}

export function hasLocalAuthSession() {
  try {
    return sessionStorage.getItem(LOCAL_AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLocalAuthSession(active) {
  try {
    if (active) sessionStorage.setItem(LOCAL_AUTH_KEY, "1");
    else sessionStorage.removeItem(LOCAL_AUTH_KEY);
  } catch {
    /* sessionStorage can be unavailable in private contexts */
  }
}

export function getLocalDemoProfile() {
  return {
    id: LOCAL_USER_ID,
    username: "Local Tester",
    handle: "@localtester",
    bio: "Local testing account — Supabase cloud is paused.",
    avatar: "/DeepHouseLabLogo.png",
    followers: 12,
    following: 3,
    verified: true,
    genre: "Deep House",
    location: "Local",
    isAdmin: true,
    isBanned: false,
    isApproved: true,
    plan: "pro",
    notifyEmailNewMix: false,
    notifyPushNewMix: false,
  };
}

export function getLocalDemoSession() {
  return {
    access_token: "local-test-token",
    token_type: "bearer",
    user: {
      id: LOCAL_USER_ID,
      email: LOCAL_TEST_EMAIL,
      app_metadata: { provider: "local" },
      user_metadata: { username: "Local Tester" },
    },
  };
}

export function getLocalSeedProfiles() {
  return [
    getLocalDemoProfile(),
    {
      id: LOCAL_ARTIST_ID,
      username: "Deep House Lab",
      handle: "@deephouselab",
      bio: "Official lab account (local seed).",
      avatar: "/DeepHouseLabLogo.png",
      followers: 128,
      following: 0,
      verified: true,
      genre: "Deep House",
      location: "Johannesburg",
      isAdmin: true,
      isBanned: false,
      isApproved: true,
      plan: "pro",
      notifyEmailNewMix: false,
      notifyPushNewMix: false,
    },
  ];
}

/** Placeholder catalog mixes are not shipped in local testing. Real uploads live in IndexedDB. */
export function getLocalSeedEpisodes() {
  return [];
}

/** In-memory comments for local mode (reset on full page reload). */
const localCommentsByMix = new Map();

export function getLocalMixComments(mixId) {
  return [...(localCommentsByMix.get(mixId) || [])];
}

export function addLocalMixComment(mixId, userId, body) {
  const list = localCommentsByMix.get(mixId) || [];
  const row = {
    id: `local-comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mixId,
    userId,
    body,
    createdAt: new Date().toISOString(),
  };
  localCommentsByMix.set(mixId, [...list, row]);
  return row;
}
