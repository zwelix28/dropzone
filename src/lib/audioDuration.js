function normalizeDurationSec(sec) {
  const n = Math.round(Number(sec) || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Some browsers report Infinity for duration until a seek forces a real value.
 * @param {HTMLAudioElement} audio
 * @returns {Promise<number>}
 */
function readDurationFromAudioElement(audio) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (sec) => {
      if (settled) return;
      settled = true;
      resolve(normalizeDurationSec(sec));
    };

    const tryFinish = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) {
        finish(d);
        return true;
      }
      return false;
    };

    const forceDuration = () => {
      if (tryFinish()) return;
      // Chrome/WebKit quirk: seek near end to materialize duration
      const onTimeUpdate = () => {
        audio.removeEventListener("timeupdate", onTimeUpdate);
        try {
          audio.currentTime = 0;
        } catch {
          // ignore
        }
        finish(audio.duration);
      };
      audio.addEventListener("timeupdate", onTimeUpdate);
      try {
        audio.currentTime = 1e101;
      } catch {
        finish(audio.duration);
      }
      setTimeout(() => {
        audio.removeEventListener("timeupdate", onTimeUpdate);
        finish(audio.duration);
      }, 4000);
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      forceDuration();
      return;
    }

    audio.addEventListener("loadedmetadata", forceDuration, { once: true });
    audio.addEventListener("error", () => finish(0), { once: true });
    setTimeout(() => finish(audio.duration), 12000);
  });
}

/**
 * Read duration (seconds) from a remote audio URL via HTMLAudioElement metadata.
 * @param {string} url
 * @returns {Promise<number>} whole seconds, or 0 if unknown
 */
export function getAudioUrlDurationSec(url) {
  if (!url || typeof Audio === "undefined") return Promise.resolve(0);
  const audio = new Audio();
  audio.preload = "metadata";
  const promise = readDurationFromAudioElement(audio);
  audio.src = url;
  return promise;
}

/**
 * Read duration (seconds) from a local audio File/Blob via HTMLAudioElement metadata.
 * @param {File|Blob} file
 * @returns {Promise<number>} whole seconds, or 0 if unknown
 */
export function getAudioFileDurationSec(file) {
  if (!file || typeof Audio === "undefined" || typeof URL === "undefined") {
    return Promise.resolve(0);
  }
  const objectUrl = URL.createObjectURL(file);
  const audio = new Audio();
  audio.preload = "metadata";
  const promise = readDurationFromAudioElement(audio).finally(() => {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch {
      // ignore
    }
  });
  audio.src = objectUrl;
  return promise;
}
