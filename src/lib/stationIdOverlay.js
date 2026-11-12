/**
 * Station-ID voice-overs over the main mix player.
 *
 * - Does not change the mix element volume, URLs, downloads, or Media Session.
 * - Separate HTMLAudioElement per cue + Web Audio delay/echo for blend.
 * - Fail-safe: errors are swallowed; mix playback is never blocked.
 */

export const STATION_ID_SRC = "/dhl_vo.mp3";
export const STATION_ID_30M_SRC = "/dhl_vo_30m.mp3";

/** Shared level under denser mixes (tracks main player volume). */
const VO_LEVEL = 0.745; // was 0.828; another −10% under denser mixes

/** How far past a cue we still allow it to start (timeupdate / seek slack). */
const CUE_FIRE_WINDOW_SEC = 8;

const CUES = [
  { id: "intro", src: STATION_ID_SRC, cueSec: 5 },
  { id: "mid30", src: STATION_ID_30M_SRC, cueSec: 30 * 60 },
];

function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

function minMixDurationForCue(cueSec) {
  return cueSec + 6;
}

/**
 * @param {{ getMainAudio: () => HTMLAudioElement | null }} opts
 */
export function createStationIdOverlay({ getMainAudio }) {
  let ctx = null;
  let trackKey = null;
  let userVolume = 0.75;

  /** @type {Map<string, { vo: HTMLAudioElement | null, graphReady: boolean, fired: boolean, active: boolean, cueSec: number, src: string }>} */
  const slots = new Map(
    CUES.map((c) => [
      c.id,
      {
        id: c.id,
        src: c.src,
        cueSec: c.cueSec,
        vo: null,
        graphReady: false,
        fired: false,
        active: false,
      },
    ]),
  );

  const applyMixVolume = () => {
    const main = getMainAudio?.();
    if (!main) return;
    try {
      main.volume = clamp01(userVolume);
    } catch {
      /* ignore */
    }
  };

  const applyVoVolume = (slot) => {
    if (!slot?.vo) return;
    try {
      // Element volume still feeds the Web Audio graph.
      slot.vo.volume = clamp01(userVolume * VO_LEVEL);
    } catch {
      /* ignore */
    }
  };

  const applyAllVoVolumes = () => {
    for (const slot of slots.values()) {
      if (slot.active) applyVoVolume(slot);
    }
  };

  const ensureContext = async () => {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }
    return ctx;
  };

  const buildEchoGraph = (slot, audioCtx, element) => {
    if (slot.graphReady) return;
    let source = null;
    try {
      source = audioCtx.createMediaElementSource(element);

      const dry = audioCtx.createGain();
      dry.gain.value = 0.9;

      const delay1 = audioCtx.createDelay(1.2);
      delay1.delayTime.value = 0.14;
      const delay2 = audioCtx.createDelay(1.2);
      delay2.delayTime.value = 0.28;

      const feedback = audioCtx.createGain();
      feedback.gain.value = 0.14;

      const wet = audioCtx.createGain();
      wet.gain.value = 0.22;

      const tone = audioCtx.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = 3800;
      tone.Q.value = 0.7;

      source.connect(dry);
      dry.connect(audioCtx.destination);

      source.connect(delay1);
      delay1.connect(delay2);
      delay2.connect(feedback);
      feedback.connect(delay1);
      delay1.connect(tone);
      delay2.connect(tone);
      tone.connect(wet);
      wet.connect(audioCtx.destination);

      slot.graphReady = true;
    } catch {
      // Once createMediaElementSource succeeds, the element must stay routed
      // through the audio context or it will be silent.
      try {
        if (source) source.connect(audioCtx.destination);
        slot.graphReady = Boolean(source);
      } catch {
        slot.graphReady = false;
      }
    }
  };

  const ensureVo = async (slot) => {
    if (typeof Audio === "undefined") return null;
    if (!slot.vo) {
      try {
        const vo = new Audio(slot.src);
        vo.preload = "auto";
        vo.loop = false;
        vo.crossOrigin = "anonymous";
        vo.setAttribute("data-dhl-station-id", slot.id);
        vo.addEventListener("ended", () => {
          slot.active = false;
        });
        vo.addEventListener("error", () => {
          slot.active = false;
        });
        // Warm the file so the first millisecond isn't clipped by buffering.
        try {
          vo.load();
        } catch {
          /* ignore */
        }
        slot.vo = vo;
      } catch {
        return null;
      }
    }

    const audioCtx = await ensureContext();
    if (audioCtx && slot.vo) buildEchoGraph(slot, audioCtx, slot.vo);
    return slot.vo;
  };

  const stopVo = (slot, { resetPosition = true } = {}) => {
    if (slot.vo) {
      try {
        slot.vo.pause();
        if (resetPosition) slot.vo.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    slot.active = false;
  };

  const stopAll = ({ resetPosition = true } = {}) => {
    for (const slot of slots.values()) stopVo(slot, { resetPosition });
  };

  const startVo = async (slot) => {
    if (slot.fired || slot.active) return;
    slot.fired = true;

    const main = getMainAudio?.();
    if (!main || main.paused) {
      // Mix isn't playing yet — allow a later retry when playback continues.
      slot.fired = false;
      return;
    }

    const bed = await ensureVo(slot);
    if (!bed) {
      slot.fired = false;
      return;
    }

    try {
      // Never start from silence: set level before play so the first samples are heard.
      applyVoVolume(slot);
      if (bed.currentTime > 0.01) bed.currentTime = 0;
      // Give the decoder a tick after seek-to-start on some mobile browsers.
      await new Promise((r) => setTimeout(r, 30));
      applyVoVolume(slot);
      await ensureContext();
      await bed.play();
      slot.active = true;
      applyMixVolume();
    } catch {
      slot.active = false;
      slot.fired = false;
      stopVo(slot, { resetPosition: true });
      applyMixVolume();
    }
  };

  const armSlotForResume = (slot, resumeSec) => {
    if (resumeSec > slot.cueSec) {
      slot.fired = true;
      return;
    }
    slot.fired = false;
    void ensureVo(slot);
  };

  return {
    onTrackChange(nextTrackId, { resumeSec = 0, guestPreviewOnly = false } = {}) {
      stopAll({ resetPosition: true });
      trackKey = nextTrackId || null;
      for (const slot of slots.values()) {
        slot.fired = false;
        slot.active = false;
        if (guestPreviewOnly) {
          slot.fired = true;
          continue;
        }
        armSlotForResume(slot, resumeSec);
      }
      applyMixVolume();
    },

    setUserVolume(percent) {
      userVolume = clamp01((Number(percent) || 0) / 100);
      applyMixVolume();
      applyAllVoVolumes();
    },

    /**
     * Call after the main mix seek position changes (scrub / Restart).
     * Seeking back before a cue arms that VO again so Restart replays the tag.
     */
    onSeekTo(currentTimeSec, { guestPreviewOnly = false } = {}) {
      if (guestPreviewOnly || !trackKey) return;
      const t = Number(currentTimeSec) || 0;
      for (const slot of slots.values()) {
        if (t < slot.cueSec) {
          stopVo(slot, { resetPosition: true });
          slot.fired = false;
          slot.active = false;
          void ensureVo(slot);
          continue;
        }
        // Jumped past this cue's fire window — don't start it mid-phrase.
        if (t > slot.cueSec + CUE_FIRE_WINDOW_SEC) {
          stopVo(slot, { resetPosition: true });
          slot.fired = true;
          slot.active = false;
        }
      }
    },

    onTimeUpdate(currentTime, { durationSec = 0, guestPreviewOnly = false } = {}) {
      if (guestPreviewOnly || !trackKey) return;
      const t = Number(currentTime) || 0;
      const dur = Number(durationSec) || 0;

      for (const slot of slots.values()) {
        if (slot.fired || slot.active) continue;
        if (dur > 0 && dur < minMixDurationForCue(slot.cueSec)) {
          slot.fired = true;
          continue;
        }
        // Seeked far past the cue — don't drop the tag mid-mix.
        if (t > slot.cueSec + CUE_FIRE_WINDOW_SEC) {
          slot.fired = true;
          continue;
        }
        if (t + 0.05 >= slot.cueSec) {
          void startVo(slot);
        }
      }
    },

    onMainPause() {
      // Keep cue state; only pause active VOs so Play can continue them.
      for (const slot of slots.values()) {
        if (!slot.active || !slot.vo) continue;
        try {
          slot.vo.pause();
        } catch {
          /* ignore */
        }
      }
    },

    onMainPlay() {
      for (const slot of slots.values()) {
        if (!slot.active || !slot.vo) continue;
        if (slot.vo.ended) {
          slot.active = false;
          continue;
        }
        applyVoVolume(slot);
        void ensureContext()
          .then(() => slot.vo.play())
          .catch(() => {
            /* ignore */
          });
      }
    },

    dispose() {
      stopAll({ resetPosition: true });
      for (const slot of slots.values()) {
        if (slot.vo) {
          try {
            slot.vo.removeAttribute("src");
            slot.vo.load();
          } catch {
            /* ignore */
          }
        }
        slot.vo = null;
        slot.graphReady = false;
        slot.fired = false;
        slot.active = false;
      }
      if (ctx) {
        try {
          void ctx.close();
        } catch {
          /* ignore */
        }
      }
      ctx = null;
      trackKey = null;
    },
  };
}
