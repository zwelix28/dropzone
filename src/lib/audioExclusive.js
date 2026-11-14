import { silenceOrphanMainPlayers } from "./mainPlayerAudio.js";

/** Ensures only one preview / mix audio owner plays at a time across the app. */
const pauseHandlers = new Map();

export function registerExclusiveAudioOwner(ownerId, pauseFn) {
  pauseHandlers.set(ownerId, pauseFn);
  return () => {
    pauseHandlers.delete(ownerId);
  };
}

export function requestExclusivePlayback(ownerId) {
  // Kill remount-orphaned main <audio> elements before other owners pause.
  silenceOrphanMainPlayers();
  for (const [id, pause] of pauseHandlers) {
    if (id !== ownerId) pause();
  }
}

export const AUDIO_OWNER_MAIN = "main";
export const AUDIO_OWNER_FOR_YOU = "foryou";
