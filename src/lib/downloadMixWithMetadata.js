import { resolveMixDownloadUrl } from "./audioUrls.js";

const ALBUM_NAME = "Music Vault by DHLab";

export function mixDownloadFilename(title) {
  return `${(title || "mix").replace(/[^\w\s-]/g, "").trim() || "mix"}.mp3`;
}

function isMp3Buffer(buffer, contentType = "") {
  if (/mpeg|mp3/i.test(contentType)) return true;
  const view = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (view.length >= 3 && view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33) return true;
  if (view.length >= 2 && view[0] === 0xff && (view[1] & 0xe0) === 0xe0) return true;
  return false;
}

function detectImageMime(buffer) {
  const view = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  if (view[0] === 0xff && view[1] === 0xd8) return "image/jpeg";
  if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47) return "image/png";
  if (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46) return "image/gif";
  if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46) return "image/webp";
  return "image/jpeg";
}

async function fetchCoverArt(coverUrl) {
  const url = (coverUrl || "").trim();
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    if (!data.byteLength) return null;
    return { data, mime: detectImageMime(data) };
  } catch {
    return null;
  }
}

function buildComment(episode, artist, mixUrl) {
  const lines = [];
  const desc = (episode.description || "").trim();
  if (desc) lines.push(desc);

  if (episode.genre) lines.push(`Genre: ${episode.genre}`);
  if (Array.isArray(episode.tags) && episode.tags.length) {
    lines.push(`Tags: ${episode.tags.join(", ")}`);
  }

  if (Array.isArray(episode.tracklist) && episode.tracklist.length) {
    lines.push("");
    lines.push("Tracklist:");
    episode.tracklist.forEach((entry, index) => {
      if (typeof entry === "string") {
        lines.push(`${index + 1}. ${entry}`);
        return;
      }
      if (entry?.title) {
        const credit = entry.artist ? ` — ${entry.artist}` : "";
        lines.push(`${index + 1}. ${entry.title}${credit}`);
      }
    });
  }

  if (artist?.handle) lines.push(`Artist: ${artist.handle}`);
  lines.push(`From ${ALBUM_NAME}`);
  if (mixUrl) lines.push(mixUrl);
  return lines.join("\n");
}

async function embedMp3Metadata(arrayBuffer, episode, artist, cover) {
  const { ID3Writer } = await import("browser-id3-writer");
  const writer = new ID3Writer(arrayBuffer);
  const title = (episode.title || "Untitled Mix").trim();
  const artistName = (artist?.username || "Unknown Artist").trim();

  writer.setFrame("TIT2", title);
  writer.setFrame("TPE1", [artistName]);
  writer.setFrame("TPE2", [artistName]);
  writer.setFrame("TALB", ALBUM_NAME);

  const genre = (episode.genre || "").trim();
  if (genre) writer.setFrame("TCON", [genre]);

  const year = episode.createdAt ? new Date(episode.createdAt).getFullYear() : null;
  if (year && !Number.isNaN(year)) writer.setFrame("TYER", year);

  const mixUrl =
    typeof window !== "undefined" && episode.id ? `${window.location.origin}/mix/${episode.id}` : "";
  const comment = buildComment(episode, artist, mixUrl);
  if (comment) {
    writer.setFrame("COMM", {
      description: ALBUM_NAME,
      text: comment,
      language: "eng",
    });
  }

  if (mixUrl) {
    writer.setFrame("TXXX", {
      description: "Source",
      value: mixUrl,
    });
  }

  if (cover?.data) {
    writer.setFrame("APIC", {
      type: 3,
      data: cover.data,
      description: "Cover",
      useUnicodeEncoding: false,
    });
  }

  writer.addTag();
  return writer.getBlob();
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Fetch a mix, embed ID3 tags (title, artist, album, genre, year, comments, cover art), and download.
 */
export async function downloadMixWithMetadata(episode, { artist } = {}) {
  if (!episode) return { ok: false, error: "no_episode" };

  const url = await resolveMixDownloadUrl(episode, episode.title);
  if (!url) return { ok: false, error: "no_url" };

  const filename = mixDownloadFilename(episode.title);

  let response;
  try {
    response = await fetch(url);
  } catch {
    return { ok: false, error: "fetch_failed" };
  }

  if (!response.ok) return { ok: false, error: "fetch_failed" };

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "";
  const canTag = isMp3Buffer(buffer, contentType);

  let blob;
  if (canTag) {
    const cover = await fetchCoverArt(episode.coverUrl);
    try {
      blob = await embedMp3Metadata(buffer, episode, artist, cover);
    } catch {
      blob = new Blob([buffer], { type: "audio/mpeg" });
    }
  } else {
    blob = new Blob([buffer], { type: contentType || "application/octet-stream" });
  }

  triggerDownload(blob, filename);
  return { ok: true, tagged: canTag };
}
