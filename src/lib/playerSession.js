/**
 * Survives a full page refresh so the mini-player can reappear at the last
 * mix + position. Autoplay after reload is still blocked by browsers without a
 * gesture — we restore paused (and optionally attempt play once).
 */

const SESSION_KEY = "dhl-player-session";
/** Ignore stale sessions older than 7 days. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @typedef {{
 *   mixId: string,
 *   positionSec: number,
 *   durationSec?: number,
 *   wasPlaying: boolean,
 *   volume?: number,
 *   queueOrder?: string[] | null,
 *   shuffleOn?: boolean,
 *   updatedAt: number,
 * }} PlayerSession
 */

/** @returns {PlayerSession | null} */
export function readPlayerSession() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const mixId = typeof parsed?.mixId === "string" ? parsed.mixId : "";
    const positionSec = Number(parsed?.positionSec);
    const updatedAt = Number(parsed?.updatedAt) || 0;
    if (!mixId || !Number.isFinite(positionSec) || positionSec < 0) return null;
    if (updatedAt && Date.now() - updatedAt > MAX_AGE_MS) {
      clearPlayerSession();
      return null;
    }
    return {
      mixId,
      positionSec,
      durationSec: Number(parsed?.durationSec) || 0,
      wasPlaying: Boolean(parsed?.wasPlaying),
      volume: Number.isFinite(Number(parsed?.volume)) ? Number(parsed.volume) : undefined,
      queueOrder: Array.isArray(parsed?.queueOrder) ? parsed.queueOrder.filter(Boolean) : null,
      shuffleOn: Boolean(parsed?.shuffleOn),
      updatedAt,
    };
  } catch {
    return null;
  }
}

/** @param {Partial<PlayerSession> & { mixId: string }} session */
export function writePlayerSession(session) {
  if (typeof localStorage === "undefined" || !session?.mixId) return;
  try {
    const prev = readPlayerSession();
    const next = {
      mixId: session.mixId,
      positionSec: Math.max(0, Number(session.positionSec) || 0),
      durationSec: Math.max(0, Number(session.durationSec) || prev?.durationSec || 0),
      wasPlaying: Boolean(session.wasPlaying),
      volume: Number.isFinite(Number(session.volume))
        ? Number(session.volume)
        : prev?.volume,
      queueOrder:
        session.queueOrder === undefined
          ? prev?.queueOrder ?? null
          : Array.isArray(session.queueOrder)
            ? session.queueOrder
            : null,
      shuffleOn:
        session.shuffleOn === undefined ? Boolean(prev?.shuffleOn) : Boolean(session.shuffleOn),
      updatedAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode
  }
}

export function clearPlayerSession() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
