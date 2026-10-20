import Icon from "./Icon.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMixListenerCount from "../hooks/useMixListenerCount.js";

/**
 * Compact live count of people currently listening to a mix.
 */
export default function MixLiveListeners({
  mixId,
  size = "md",
  showWhenZero = false,
  className = "",
}) {
  const { player } = useApp();
  const count = useMixListenerCount(mixId, { enabled: Boolean(mixId) });
  const selfListening = Boolean(player.isPlaying && player.currentTrack?.id === mixId);
  const display = Math.max(count, selfListening ? 1 : 0);

  if (!mixId || (!showWhenZero && display === 0)) return null;

  const iconSize = size === "sm" ? 11 : size === "lg" ? 15 : 13;
  const fontSize = size === "sm" ? 10 : size === "lg" ? 13 : 12;

  return (
    <span
      className={`mix-live-listeners ${className}`.trim()}
      title={`${display} listening now`}
      aria-label={`${display} listening now`}
      style={{ fontSize }}
    >
      <span className="mix-live-listeners-dot" aria-hidden />
      <Icon name="people" size={iconSize} color="currentColor" />
      <span className="mix-live-listeners-count">{display}</span>
    </span>
  );
}
