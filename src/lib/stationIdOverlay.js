/**
 * Station-ID voice-over over the main mix player.
 *
 * - Does not change the mix element volume, URLs, downloads, or Media Session.
 * - Second HTMLAudioElement + Web Audio delay/echo for blend.
 * - Fail-safe: errors are swallowed; mix playback is never blocked.
 */

export const STATION_ID_SRC = "/dhl_vo.mp3";

/** Fire once this many seconds into each mix listen. */
const CUE_SEC = 5;
/** Skip only if the mix is shorter than the cue + VO. */
const MIN_MIX_DURATION_SEC = CUE_SEC + 6;
const VO_LEVEL = 0.92;

function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

/**
 * @param {{ getMainAudio: () => HTMLAudioElement | null }} opts
 */
export function createStationIdOverlay({ getMainAudio }) {
  let vo = null;
  let ctx = null;
  let graphReady = false;
  let trackKey = null;
  let fired = false;
  let active = false;
  let userVolume = 0.75;

  const applyMixVolume = () => {
    const main = getMainAudio?.();
    if (!main) return;
    try {
      main.volume = clamp01(userVolume);
    } catch {
      /* ignore */
    }
  };

  const applyVoVolume = () => {
    if (!vo) return;
    try {
      // Element volume still feeds the Web Audio graph.
      vo.volume = clamp01(userVolume * VO_LEVEL);
    } catch {
      /* ignore */
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

  const buildEchoGraph = (audioCtx, element) => {
    if (graphReady) return;
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

      graphReady = true;
    } catch {
      // Once createMediaElementSource succeeds, the element must stay routed
      // through the audio context or it will be silent.
      try {
        if (source) source.connect(audioCtx.destination);
        graphReady = Boolean(source);
      } catch {
        graphReady = false;
      }
    }
  };

  const ensureVo = async () => {
    if (typeof Audio === "undefined") return null;
    if (!vo) {
      try {
        vo = new Audio(STATION_ID_SRC);
        vo.preload = "auto";
        vo.loop = false;
        vo.crossOrigin = "anonymous";
        vo.setAttribute("data-dhl-station-id", "1");
        vo.addEventListener("ended", () => {
          active = false;
        });
        vo.addEventListener("error", () => {
          active = false;
        });
        // Warm the file so the first millisecond isn't clipped by buffering.
        try {
          vo.load();
        } catch {
          /* ignore */
        }
      } catch {
        return null;
      }
    }

    const audioCtx = await ensureContext();
    if (audioCtx && vo) buildEchoGraph(audioCtx, vo);
    return vo;
  };

  const stopVo = ({ resetPosition = true } = {}) => {
    if (vo) {
      try {
        vo.pause();
        if (resetPosition) vo.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    active = false;
  };

  const startVo = async () => {
    if (fired || active) return;
    fired = true;

    const main = getMainAudio?.();
    if (!main || main.paused) {
      // Mix isn't playing yet — allow a later retry when playback continues.
      fired = false;
      return;
    }

    const bed = await ensureVo();
    if (!bed) {
      fired = false;
      return;
    }

    try {
      // Never start from silence: set level before play so the first samples are heard.
      applyVoVolume();
      if (bed.currentTime > 0.01) bed.currentTime = 0;
      // Give the decoder a tick after seek-to-start on some mobile browsers.
      await new Promise((r) => setTimeout(r, 30));
      applyVoVolume();
      await ensureContext();
      await bed.play();
      active = true;
      applyMixVolume();
    } catch {
      active = false;
      fired = false;
      stopVo({ resetPosition: true });
      applyMixVolume();
    }
  };

  return {
    onTrackChange(nextTrackId, { resumeSec = 0, guestPreviewOnly = false } = {}) {
      stopVo({ resetPosition: true });
      trackKey = nextTrackId || null;
      fired = false;
      active = false;
      if (guestPreviewOnly || resumeSec > CUE_SEC) {
        fired = true;
        return;
      }
      void ensureVo();
      applyMixVolume();
    },

    setUserVolume(percent) {
      userVolume = clamp01((Number(percent) || 0) / 100);
      applyMixVolume();
      if (active) applyVoVolume();
    },

    onTimeUpdate(currentTime, { durationSec = 0, guestPreviewOnly = false } = {}) {
      if (guestPreviewOnly || !trackKey || fired || active) return;
      const t = Number(currentTime) || 0;
      const dur = Number(durationSec) || 0;
      if (dur > 0 && dur < MIN_MIX_DURATION_SEC) {
        fired = true;
        return;
      }
      // Seeked far past the cue — don't drop the tag mid-mix.
      if (t > CUE_SEC + 8) {
        fired = true;
        return;
      }
      if (t + 0.05 >= CUE_SEC) {
        void startVo();
      }
    },

    onMainPause() {
      // Keep cue state; only pause the VO so Play can continue it.
      if (!active || !vo) return;
      try {
        vo.pause();
      } catch {
        /* ignore */
      }
    },

    onMainPlay() {
      if (!active || !vo) return;
      if (vo.ended) {
        active = false;
        return;
      }
      applyVoVolume();
      void ensureContext()
        .then(() => vo.play())
        .catch(() => {
          /* ignore */
        });
    },

    dispose() {
      stopVo({ resetPosition: true });
      if (vo) {
        try {
          vo.removeAttribute("src");
          vo.load();
        } catch {
          /* ignore */
        }
      }
      vo = null;
      if (ctx) {
        try {
          void ctx.close();
        } catch {
          /* ignore */
        }
      }
      ctx = null;
      graphReady = false;
      trackKey = null;
    },
  };
}
