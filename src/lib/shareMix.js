export function getMixShareUrl(mixId) {
  if (!mixId) return "";
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/mix/${mixId}`;
  }
  return `/mix/${mixId}`;
}

export async function shareMix({ episode, artist, trackEvent, actorUserId }) {
  if (!episode?.id) return { ok: false };

  const url = getMixShareUrl(episode.id);
  const payload = {
    title: episode.title || "Mix",
    text: artist?.username ? `${episode.title} — ${artist.username}` : episode.title || "Mix",
    url,
  };

  if (navigator.share) {
    try {
      await navigator.share(payload);
      if (trackEvent) void trackEvent({ kind: "share", episodeId: episode.id, actorUserId });
      return { ok: true, method: "share" };
    } catch (err) {
      if (err?.name === "AbortError") return { ok: false, aborted: true };
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    if (trackEvent) void trackEvent({ kind: "share", episodeId: episode.id, actorUserId });
    return { ok: true, method: "clipboard" };
  } catch {
    return { ok: false };
  }
}
