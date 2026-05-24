/** Ensures only one preview audio element plays at a time across the app. */
const pauseHandlers = new Map();

export function registerExclusiveAudioOwner(ownerId, pauseFn) {
  pauseHandlers.set(ownerId, pauseFn);
  return () => {
    pauseHandlers.delete(ownerId);
  };
}

export function requestExclusivePlayback(ownerId) {
  for (const [id, pause] of pauseHandlers) {
    if (id !== ownerId) pause();
  }
}

export const AUDIO_OWNER_MAIN = "main";
export const AUDIO_OWNER_FOR_YOU = "foryou";
