/**
 * Tracklist helpers — canonical line format: "01. Artist - Title"
 */

const HEADING_RE = /(?:^|\n)\s*(?:track\s*lists?|tracklist)\s*:?\s*(?:\n|$)/i;
const NUMBERED_RE = /^\s*(\d{1,3})\s*[.)]\s*(.+?)\s+[-–—]\s+(.+?)\s*$/;
const NUMBERED_SPACE_RE = /^\s*(\d{1,3})\s+(.+?)\s+[-–—]\s+(.+?)\s*$/;
const UNNUMBERED_RE = /^\s*(.+?)\s+[-–—]\s+(.+?)\s*$/;
function padNum(n) {
  return String(Math.max(1, Math.floor(n))).padStart(2, "0");
}

function cleanPart(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse one raw line into { num, artist, title } or null. */
export function parseTracklistLine(line, fallbackNum = 1) {
  const raw = String(line || "").trim();
  if (!raw) return null;

  let match = raw.match(NUMBERED_RE) || raw.match(NUMBERED_SPACE_RE);
  if (match) {
    const artist = cleanPart(match[2]);
    const title = cleanPart(match[3]);
    if (!artist || !title) return null;
    return { num: Number(match[1]) || fallbackNum, artist, title };
  }

  match = raw.match(UNNUMBERED_RE);
  if (match) {
    const artist = cleanPart(match[1]);
    const title = cleanPart(match[2]);
    if (!artist || !title) return null;
    // Skip heading-like leftovers
    if (/^track\s*lists?$/i.test(artist)) return null;
    return { num: fallbackNum, artist, title };
  }

  return null;
}

/** Format a parsed entry as the canonical storage string. */
export function formatTracklistEntry(entry, index = 0) {
  if (!entry) return "";
  const artist = cleanPart(entry.artist);
  const title = cleanPart(entry.title);
  if (!artist || !title) return "";
  const num = Number(entry.num) > 0 ? Number(entry.num) : index + 1;
  return `${padNum(num)}. ${artist} - ${title}`;
}

/**
 * Normalize pasted / stored text into ordered canonical lines.
 * Accepts string, string[], or mixed.
 */
export function normalizeTracklist(input) {
  const text = Array.isArray(input)
    ? input.map((line) => String(line || "").trim()).filter(Boolean).join("\n")
    : String(input || "");

  const entries = [];
  let nextNum = 1;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^track\s*lists?\s*:?\s*$/i.test(trimmed)) continue;
    const parsed = parseTracklistLine(trimmed, nextNum);
    if (!parsed) continue;
    entries.push(parsed);
    nextNum = parsed.num + 1;
  }

  // Re-number sequentially for a clean list (paste often has gaps / 1,1,1).
  return entries.map((entry, index) => formatTracklistEntry({ ...entry, num: index + 1 }, index)).filter(Boolean);
}

export function tracklistToText(input) {
  return normalizeTracklist(input).join("\n");
}

export function parseTracklistEntries(input) {
  return normalizeTracklist(input).map((line, index) => parseTracklistLine(line, index + 1)).filter(Boolean);
}

/**
 * Lift a Tracklist block out of free-form description text.
 * Returns cleaned description + extracted lines (may be empty).
 */
export function extractTracklistFromDescription(description) {
  const raw = String(description || "");
  const match = raw.match(HEADING_RE);
  if (!match || match.index == null) {
    return { description: raw.trimEnd(), tracklist: [] };
  }

  const start = match.index + (raw[match.index] === "\n" ? 1 : 0);
  const before = raw.slice(0, start).replace(/\s+$/, "");
  const afterHeading = raw.slice(match.index + match[0].length);
  const lines = afterHeading.split(/\r?\n/);
  const trackLines = [];
  let consumed = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      if (trackLines.length) {
        consumed = i + 1;
        break;
      }
      continue;
    }
    if (parseTracklistLine(trimmed, trackLines.length + 1)) {
      trackLines.push(trimmed);
      consumed = i + 1;
      continue;
    }
    if (trackLines.length) {
      consumed = i;
      break;
    }
    break;
  }

  const tracklist = normalizeTracklist(trackLines);
  if (!tracklist.length) {
    return { description: raw.trimEnd(), tracklist: [] };
  }

  const remainderTail = lines.slice(consumed).join("\n").replace(/^\s+/, "");
  const descriptionOut = [before, remainderTail].filter(Boolean).join("\n\n").trimEnd();
  return { description: descriptionOut, tracklist };
}

/** Always remove an embedded Tracklist block from description text. */
export function stripTracklistFromDescription(description) {
  return extractTracklistFromDescription(description).description;
}

/**
 * Prefer the dedicated tracklist column; otherwise lift a Tracklist block
 * out of the free-form description (common on older mixes).
 * Description is always returned without the clear-text tracklist block.
 */
export function resolveMixTracklist(description, storedTracklist) {
  const peeled = extractTracklistFromDescription(description);
  const stored = normalizeTracklist(storedTracklist);
  if (stored.length) {
    return {
      description: peeled.description,
      tracklist: stored,
      fromDescription: false,
    };
  }
  if (peeled.tracklist.length) {
    return {
      description: peeled.description,
      tracklist: peeled.tracklist,
      fromDescription: true,
    };
  }
  return {
    description: peeled.description,
    tracklist: [],
    fromDescription: false,
  };
}
