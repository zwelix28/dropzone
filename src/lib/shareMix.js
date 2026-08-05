export function getMixShareUrl(mixId) {
  if (!mixId) return "";
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/mix/${mixId}`;
  }
  return `/mix/${mixId}`;
}

async function copyToClipboard(text) {
  if (!text) return false;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand
    }
  }
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Share a mix via the system sheet when available, otherwise copy title + link.
 * Put the title and URL in `text` so recipients (and iOS Copy) always see both —
 * url-only shares are hard to tell apart.
 */
export async function shareMix({ episode, artist, trackEvent, actorUserId }) {
  if (!episode?.id) return { ok: false, url: "", text: "" };

  const url = getMixShareUrl(episode.id);
  if (!url) return { ok: false, url: "", text: "" };

  const title = episode.title || "Mix";
  const label = artist?.username ? `${title} — ${artist.username}` : title;
  // Trailing space helps iMessage treat the URL as a tappable link.
  const shareText = `${label}\n${url} `;

  const record = () => {
    if (trackEvent) void trackEvent({ kind: "share", episodeId: episode.id, actorUserId });
  };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const candidates = [
      { title, text: shareText },
      { title, text: shareText, url },
      { text: shareText },
    ];

    for (const data of candidates) {
      try {
        if (typeof navigator.canShare === "function" && !navigator.canShare(data)) continue;
        await navigator.share(data);
        record();
        return { ok: true, method: "share", url, text: shareText };
      } catch (err) {
        if (err?.name === "AbortError") return { ok: false, aborted: true, url, text: shareText };
      }
    }
  }

  const copied = await copyToClipboard(shareText.trimEnd());
  if (copied) {
    record();
    return { ok: true, method: "clipboard", url, text: shareText };
  }

  return { ok: false, url, text: shareText };
}
