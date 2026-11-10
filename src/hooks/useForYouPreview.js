import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUDIO_OWNER_FOR_YOU,
  registerExclusiveAudioOwner,
  requestExclusivePlayback,
} from "../lib/audioExclusive.js";
import {
  releaseWarmPlayback,
  warmPlaybackUrl,
  withMediaTimeFragment,
} from "../lib/audioPrefetch.js";
import { prefetchMixPlayback, resolveMixPlaybackUrl } from "../lib/audioUrls.js";
import {
  FOR_YOU_PREVIEW_SEC,
  getGuestPreviewSegment,
} from "../lib/forYouPreview.js";
import {
  bindMediaSessionActions,
  syncMediaSessionMetadata,
  syncMediaSessionPlaybackState,
  syncMediaSessionPositionState,
} from "../lib/mediaSession.js";

function getPreviewSegment(ep) {
  const { start, end } = getGuestPreviewSegment(ep.durationSecs);
  return { start, end };
}

/** Shared element so the mobile tab tap can unlock autoplay before For You mounts. */
let sharedForYouAudio = null;
let forYouGestureUntil = 0;

export function getForYouAudio() {
  if (typeof Audio === "undefined") return null;
  if (!sharedForYouAudio) {
    sharedForYouAudio = new Audio();
    sharedForYouAudio.preload = "auto";
  }
  return sharedForYouAudio;
}

/** Call from the For You tab click (user gesture) so play can start immediately on open. */
export function primeForYouPlaybackFromGesture() {
  forYouGestureUntil = Date.now() + 5000;
  const audio = getForYouAudio();
  if (!audio) return;
  try {
    const playAttempt = audio.play();
    if (playAttempt && typeof playAttempt.then === "function") {
      playAttempt
        .then(() => {
          audio.pause();
        })
        .catch(() => {});
    }
  } catch {
    /* ignore unlock failures */
  }
}

function hasRecentForYouGesture() {
  return Date.now() < forYouGestureUntil;
}

export default function useForYouPreview({ isAuthenticated, getArtistName = null }) {
  const [track, setTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewStartSec, setPreviewStartSec] = useState(0);
  const [previewEndSec, setPreviewEndSec] = useState(FOR_YOU_PREVIEW_SEC);
  const audioRef = useRef(null);
  const segmentRef = useRef({ start: 0, end: FOR_YOU_PREVIEW_SEC });
  const generationRef = useRef(0);
  const getArtistNameRef = useRef(getArtistName);
  getArtistNameRef.current = getArtistName;
  const trackRef = useRef(null);
  trackRef.current = track;

  if (!audioRef.current) {
    audioRef.current = getForYouAudio();
  }

  const resolveOpts = useCallback(
    () => ({
      guestPreviewOnly: !isAuthenticated,
      isAuthenticated,
      preferFullMix: true,
    }),
    [isAuthenticated],
  );

  const resolveUrl = useCallback(
    async (ep) => {
      if (!ep?.id) return null;
      return resolveMixPlaybackUrl(ep, resolveOpts());
    },
    [resolveOpts],
  );

  const prefetch = useCallback(
    (ep) => {
      if (!ep) return;
      // Warm near the climax window (not byte 0) so swipe-to-play starts instantly.
      const { start } = getPreviewSegment(ep);
      void prefetchMixPlayback(ep, resolveOpts(), { warm: true, seekSec: start });
    },
    [resolveOpts],
  );

  const stop = useCallback(() => {
    generationRef.current += 1;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setIsPlaying(false);
    setProgress(0);
    syncMediaSessionMetadata(null);
    syncMediaSessionPlaybackState(false);
  }, []);

  useEffect(() => registerExclusiveAudioOwner(AUDIO_OWNER_FOR_YOU, stop), [stop]);

  useEffect(() => {
    if (!track) {
      syncMediaSessionMetadata(null);
      syncMediaSessionPlaybackState(false);
      return;
    }
    const artist =
      (typeof getArtistNameRef.current === "function" && getArtistNameRef.current(track)) ||
      "Deep House Lab";
    syncMediaSessionMetadata(track, artist);
    syncMediaSessionPlaybackState(isPlaying);
    const { start, end } = segmentRef.current;
    syncMediaSessionPositionState(audioRef.current, {
      durationSec: Math.max(1, end - start),
      guestPreviewOnly: true,
      segment: { start, end, windowSec: Math.max(1, end - start) },
    });
  }, [track, isPlaying]);

  useEffect(() => {
    return bindMediaSessionActions({
      onPlay: async () => {
        const audio = audioRef.current;
        if (!audio || !trackRef.current) return;
        if (!audio.paused) return;
        const { start, end } = segmentRef.current;
        if (audio.currentTime >= end - 0.08 || audio.currentTime < start) {
          audio.currentTime = start;
          setProgress(0);
        }
        requestExclusivePlayback(AUDIO_OWNER_FOR_YOU);
        try {
          await audio.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      },
      onPause: () => {
        const audio = audioRef.current;
        if (audio && !audio.paused) audio.pause();
      },
      getAudio: () => audioRef.current,
      guestPreviewOnly: true,
      getSegment: () => {
        const { start, end } = segmentRef.current;
        return { start, end, windowSec: Math.max(1, end - start) };
      },
      onSeek: (percent) => {
        const audio = audioRef.current;
        if (!audio) return;
        const { start, end } = segmentRef.current;
        const windowSec = Math.max(1, end - start);
        const p = Math.max(0, Math.min(100, percent));
        audio.currentTime = start + (windowSec * p) / 100;
        setProgress(p);
      },
    });
  }, []);

  const beginSegmentPlayback = useCallback(async (audio, start, gen) => {
    const fromGesture = hasRecentForYouGesture();
    const seekAndPlay = async () => {
      if (gen !== generationRef.current) return false;
      requestExclusivePlayback(AUDIO_OWNER_FOR_YOU);
      try {
        if (Math.abs((audio.currentTime || 0) - start) > 1.25) {
          audio.currentTime = start;
        }
      } catch {
        // ignore seek errors on some browsers
      }
      if (!fromGesture) {
        await new Promise((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            audio.removeEventListener("seeked", finish);
            resolve();
          };
          audio.addEventListener("seeked", finish);
          setTimeout(finish, 60);
        });
      }
      if (gen !== generationRef.current) return false;
      try {
        await audio.play();
        setIsPlaying(true);
        return true;
      } catch {
        setIsPlaying(false);
        return false;
      }
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || fromGesture) {
      // After a tab-bar unlock, try play immediately even if metadata is still catching up.
      const ok = await seekAndPlay();
      if (ok || audio.readyState >= HTMLMediaElement.HAVE_METADATA) return ok;
    }

    await new Promise((resolve) => {
      const onReady = () => {
        audio.removeEventListener("loadedmetadata", onReady);
        audio.removeEventListener("canplay", onReady);
        resolve();
      };
      audio.addEventListener("loadedmetadata", onReady, { once: true });
      audio.addEventListener("canplay", onReady, { once: true });
      if (fromGesture) setTimeout(resolve, 120);
    });
    if (gen !== generationRef.current) return false;
    return seekAndPlay();
  }, []);

  const playPreview = useCallback(
    async (ep, { force = false } = {}) => {
      const audio = audioRef.current || getForYouAudio();
      audioRef.current = audio;
      if (!audio || !ep) return false;

      if (!force && track?.id === ep.id) {
        if (audio.paused) {
          requestExclusivePlayback(AUDIO_OWNER_FOR_YOU);
          try {
            await audio.play();
            setIsPlaying(true);
            return true;
          } catch {
            setIsPlaying(false);
            return false;
          }
        }
        audio.pause();
        setIsPlaying(false);
        return false;
      }

      const gen = ++generationRef.current;
      const { start, end } = getPreviewSegment(ep);
      segmentRef.current = { start, end };
      setPreviewStartSec(start);
      setPreviewEndSec(end);
      setTrack(ep);
      setProgress(0);
      setIsPlaying(false);

      audio.pause();

      // Kick a standby warmer immediately (same as Home Continue), then resolve URL.
      if (ep.id) {
        void prefetchMixPlayback(ep, resolveOpts(), { warm: true, seekSec: start });
      }

      const url = await resolveUrl(ep);
      if (gen !== generationRef.current || !url) {
        if (gen === generationRef.current) setIsPlaying(false);
        return false;
      }

      // Media fragment + warmer HTTP cache → Range near the climax, not the intro.
      warmPlaybackUrl(ep.id, url, { seekSec: start });
      audio.preload = "auto";
      const playUrl = start > 5 ? withMediaTimeFragment(url, start) : url;
      const currentBase = (audio.currentSrc || audio.src || "").split(/[?#]/)[0];
      const nextBase = String(url).split(/[?#]/)[0];
      if (!currentBase || currentBase !== nextBase || !String(audio.src || "").includes("#t=")) {
        audio.src = playUrl;
      }
      releaseWarmPlayback(ep.id);

      // Gesture-primed path: start audio ASAP so the tab tap feels instantaneous.
      if (hasRecentForYouGesture()) {
        requestExclusivePlayback(AUDIO_OWNER_FOR_YOU);
        try {
          await audio.play();
          setIsPlaying(true);
          try {
            if (Math.abs((audio.currentTime || 0) - start) > 1.25) audio.currentTime = start;
          } catch {
            /* ignore */
          }
          return true;
        } catch {
          /* fall through to buffered start */
        }
      }

      return beginSegmentPlayback(audio, start, gen);
    },
    [beginSegmentPlayback, resolveOpts, resolveUrl, track?.id],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const { start, end } = segmentRef.current;
      const windowSec = Math.max(1, end - start);
      const t = audio.currentTime;
      if (t >= end - 0.08) {
        audio.pause();
        setIsPlaying(false);
        setProgress(100);
        return;
      }
      setProgress(Math.max(0, Math.min(100, ((t - start) / windowSec) * 100)));
      syncMediaSessionPositionState(audio, {
        durationSec: windowSec,
        guestPreviewOnly: true,
        segment: { start, end, windowSec },
      });
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => () => stop(), [stop]);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) {
      const { start, end } = segmentRef.current;
      if (audio.currentTime >= end - 0.08 || audio.currentTime < start) {
        audio.currentTime = start;
        setProgress(0);
      }
      requestExclusivePlayback(AUDIO_OWNER_FOR_YOU);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [track]);

  return {
    track,
    isPlaying,
    progress,
    previewStartSec,
    previewEndSec,
    playPreview,
    prefetch,
    toggle,
    stop,
  };
}
