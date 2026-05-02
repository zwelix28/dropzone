import { normalizePlan } from "../constants/plans.js";
import { extractMixAudioPathFromLegacyPublicUrl } from "./audioUrls.js";

export function mixRowToEpisode(row) {
  if (!row) return null;
  const legacyUrl = row.audio_url ?? "";
  const storagePath =
    (row.audio_storage_path && String(row.audio_storage_path).trim()) ||
    extractMixAudioPathFromLegacyPublicUrl(legacyUrl);
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? "",
    genre: row.genre ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    coverUrl: row.cover_url ?? "",
    audioUrl: legacyUrl,
    audioStoragePath: storagePath,
    audioPreviewPath: (row.audio_preview_path && String(row.audio_preview_path).trim()) || "",
    durationSecs: row.duration_secs ?? 0,
    plays: row.plays ?? 0,
    downloads: row.downloads ?? 0,
    shares: row.shares ?? 0,
    createdAt: row.created_at,
    tracklist: Array.isArray(row.tracklist) ? row.tracklist : [],
    trending: row.trending ?? 999,
  };
}

export function profileRowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username ?? "DJ",
    handle: row.handle ?? "@dj",
    bio: row.bio ?? "",
    avatar: row.avatar_url ?? "",
    followers: row.followers_count ?? 0,
    following: row.following_count ?? 0,
    verified: row.verified ?? false,
    genre: row.genre ?? "Tech House",
    location: row.location ?? "",
    isAdmin: row.is_admin ?? false,
    isBanned: row.is_banned ?? false,
    plan: normalizePlan(row.plan),
  };
}

export function notificationRowToApp(row) {
  if (!row) return null;
  return {
    id: row.id,
    read: row.read ?? false,
    type: row.type ?? "info",
    title: row.title ?? "",
    message: row.message ?? "",
    href: row.href ?? null,
    episodeId: row.episode_id ?? null,
    meta: row.meta ?? {},
    createdAt: row.created_at,
  };
}
