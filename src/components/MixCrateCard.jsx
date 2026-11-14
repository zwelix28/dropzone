import Icon from "./Icon.jsx";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { mixTitleBody } from "../constants/mixTitle.js";
import { fmtDuration } from "../lib/format.js";
import {
  formatPresaveReleaseLine,
  isMixPresave,
  isMixStreamable,
} from "../lib/mixVisibility.js";
import { useApp } from "../context/AppContext.jsx";

function crateTitle(title) {
  return mixTitleBody(title) || title || "Untitled Mix";
}

/**
 * Bezel-less mix tile matching Lab Home Fresh crates.
 * Title + duration / Pre-save release — no handle, plays, or likes.
 */
export default function MixCrateCard({
  episode,
  isActive = false,
  isPlaying = false,
  onPlay,
  onOpen,
  className = "",
}) {
  const { auth } = useApp();
  const allowAdminPreview = Boolean(auth.currentUser?.isAdmin);
  const streamable = isMixStreamable(episode, { allowAdminPreview });
  const presave = isMixPresave(episode);
  const presaveLine = formatPresaveReleaseLine(episode.goesLiveAt);
  const title = crateTitle(episode.title);
  const tip = presave ? `${episode.title} — ${presaveLine}` : episode.title;

  const handleClick = () => {
    if (streamable) onPlay?.(episode);
    else onOpen?.(episode);
  };

  return (
    <button
      type="button"
      className={`lab-home-crate-card profile-mix-crate${isActive ? " is-active" : ""}${presave ? " is-presave" : ""}${className ? ` ${className}` : ""}`}
      title={tip}
      onClick={handleClick}
    >
      <span className="lab-home-crate-art">
        <img src={resolveMixArtwork(episode.coverUrl)} alt="" onError={handleArtworkError} />
        {presave ? (
          <span className="lab-home-crate-presave-badge tag tag-orange">Pre-save</span>
        ) : (
          <span className="lab-home-crate-play" aria-hidden="true">
            <Icon name={isActive && isPlaying ? "pause" : "play"} size={18} color="#07090F" />
          </span>
        )}
      </span>
      <span className="lab-home-crate-copy">
        <b>{title}</b>
        {presave ? (
          <span className="lab-home-crate-release">{presaveLine}</span>
        ) : (
          <span className="lab-home-crate-meta">{fmtDuration(episode.durationSecs)}</span>
        )}
      </span>
    </button>
  );
}
