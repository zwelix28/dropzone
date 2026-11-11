import { parseTracklistEntries } from "../lib/tracklist.js";

/**
 * Themed tracklist for mix detail (and upload preview).
 * Expects canonical or pasteable "01. Artist - Title" lines.
 */
export default function MixTracklist({
  tracklist,
  title = "Tracklist",
  compact = false,
  className = "",
}) {
  const entries = parseTracklistEntries(tracklist);
  if (!entries.length) return null;

  return (
    <section
      className={`mix-tracklist${compact ? " is-compact" : ""} ${className}`.trim()}
      aria-label={title}
    >
      <header className="mix-tracklist-head">
        <span className="mix-tracklist-kicker">{title}</span>
        <span className="mix-tracklist-count">
          {entries.length} {entries.length === 1 ? "track" : "tracks"}
        </span>
      </header>
      <ol className="mix-tracklist-list">
        {entries.map((entry) => (
          <li key={`${entry.num}-${entry.artist}-${entry.title}`} className="mix-tracklist-row">
            <span className="mix-tracklist-num" aria-hidden>
              {String(entry.num).padStart(2, "0")}
            </span>
            <div className="mix-tracklist-copy">
              <span className="mix-tracklist-artist">{entry.artist}</span>
              <span className="mix-tracklist-sep" aria-hidden>
                —
              </span>
              <span className="mix-tracklist-title">{entry.title}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
