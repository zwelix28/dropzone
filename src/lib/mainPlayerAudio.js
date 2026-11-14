/**
 * Single shared HTMLAudioElement for the main mix player.
 * Prevents orphan streams when React remounts usePlayer (Strict Mode / HMR),
 * which previously left a playing Audio alive while a new one started.
 */

/** @type {HTMLAudioElement | null} */
let sharedMainAudio = null;

/** @type {Set<HTMLAudioElement>} */
const knownMainAudio = new Set();

function silenceElement(audio) {
  if (!audio) return;
  try {
    audio.pause();
  } catch {
    /* ignore */
  }
  try {
    audio.removeAttribute("src");
    audio.load();
  } catch {
    /* ignore */
  }
}

/** Return the one main-player element; silence any leaked duplicates. */
export function getMainPlayerAudio() {
  if (typeof Audio === "undefined") return null;

  if (!sharedMainAudio) {
    sharedMainAudio = new Audio();
    sharedMainAudio.preload = "auto";
    sharedMainAudio.setAttribute("data-dhl-main-player", "1");
  }

  knownMainAudio.add(sharedMainAudio);

  for (const audio of [...knownMainAudio]) {
    if (audio === sharedMainAudio) continue;
    silenceElement(audio);
    knownMainAudio.delete(audio);
  }

  return sharedMainAudio;
}

/**
 * Pause/clear every known main-player element except the active singleton.
 * Call before starting playback so a remount orphan cannot keep sounding.
 */
export function silenceOrphanMainPlayers() {
  const keep = sharedMainAudio;
  for (const audio of [...knownMainAudio]) {
    if (keep && audio === keep) continue;
    silenceElement(audio);
    knownMainAudio.delete(audio);
  }
}

/** Soft-pause the singleton without clearing src (used on route suspend / unmount). */
export function pauseMainPlayerAudio() {
  if (!sharedMainAudio) return;
  try {
    sharedMainAudio.pause();
  } catch {
    /* ignore */
  }
}
