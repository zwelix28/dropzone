import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_OWNER_MAIN,
  registerExclusiveAudioOwner,
  requestExclusivePlayback,
} from "../lib/audioExclusive.js";
import { resolveMixPlaybackUrl } from "../lib/audioUrls.js";
import { getGuestPreviewSegment } from "../lib/forYouPreview.js";

function effectiveDurationSec(audio, track, guestPreviewOnly, segment) {
  if (!guestPreviewOnly) {
    return Number(audio.duration) || Number(track?.durationSecs) || 0;
  }
  if (segment?.windowSec) return segment.windowSec;
  return getGuestPreviewSegment(track?.durationSecs).windowSec;
}

async function seekToAndPlay(audio, startSec) {
  requestExclusivePlayback(AUDIO_OWNER_MAIN);
  try {
    audio.currentTime = startSec;
  } catch {
    // ignore seek errors on some browsers
  }
  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      audio.removeEventListener("seeked", finish);
      resolve();
    };
    audio.addEventListener("seeked", finish);
    setTimeout(finish, 150);
  });
  try {
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

async function beginGuestSegmentPlayback(audio, startSec) {
  const seekAndPlay = async () => {
    const ok = await seekToAndPlay(audio, startSec);
    return ok;
  };

  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return seekAndPlay();
  }

  await new Promise((resolve) => {
    const onReady = () => {
      audio.removeEventListener("loadedmetadata", onReady);
      audio.removeEventListener("canplay", onReady);
      resolve();
    };
    audio.addEventListener("loadedmetadata", onReady, { once: true });
    audio.addEventListener("canplay", onReady, { once: true });
  });
  return seekAndPlay();
}

export default function usePlayer({
  guestPreviewOnly = false,
  isAuthenticated = false,
  getPlaylist = null,
  getSuspendPlayback = null,
} = {}) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  const [shuffleOn, setShuffleOn] = useState(false);
  /** Whole seconds for UI (metadata + track row); updates when audio metadata loads. */
  const [durationSec, setDurationSec] = useState(0);
  const audioRef = useRef(null);
  const segmentRef = useRef({ start: 0, end: 0, windowSec: 0 });
  const trackGenRef = useRef(0);
  const prevGuestAuthRef = useRef({ guestPreviewOnly, isAuthenticated });
  const suspendRef = useRef(getSuspendPlayback);
  suspendRef.current = getSuspendPlayback;

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "metadata";
  }

  const isSuspended = useCallback(() => Boolean(suspendRef.current?.()), []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  useEffect(() => registerExclusiveAudioOwner(AUDIO_OWNER_MAIN, pause), [pause]);

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || isSuspended()) return false;
    requestExclusivePlayback(AUDIO_OWNER_MAIN);
    try {
      await audio.play();
      setIsPlaying(true);
      return true;
    } catch {
      setIsPlaying(false);
      return false;
    }
  }, [isSuspended]);

  const restartGuestPreview = useCallback((audio) => {
    const { start } = segmentRef.current;
    audio.currentTime = start;
    setProgress(0);
  }, []);

  const isGuestPreviewEnded = useCallback((audio) => {
    const { start, end } = segmentRef.current;
    const t = audio.currentTime;
    return t >= end - 0.05 || t < start;
  }, []);

  const playTrack = useCallback(
    async (ep) => {
      const audio = audioRef.current;
      if (!audio || !ep) return;
      if (isSuspended()) {
        pause();
        return;
      }

      if (currentTrack?.id === ep.id) {
        if (audio.paused) {
          if (guestPreviewOnly && isGuestPreviewEnded(audio)) {
            restartGuestPreview(audio);
          }
          await startPlayback();
        } else {
          audio.pause();
          setIsPlaying(false);
        }
        return;
      }

      const gen = ++trackGenRef.current;
      const segment = guestPreviewOnly ? getGuestPreviewSegment(ep.durationSecs) : { start: 0, end: 0, windowSec: 0 };
      segmentRef.current = segment;

      setCurrentTrack(ep);
      setProgress(0);
      setDurationSec(
        guestPreviewOnly
          ? Math.floor(segment.windowSec)
          : Math.floor(Math.max(0, Number(ep?.durationSecs) || 0)),
      );

      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
      audio.volume = Math.max(0, Math.min(1, volume / 100));

      const url = await resolveMixPlaybackUrl(ep, {
        guestPreviewOnly,
        isAuthenticated,
        preferFullMix: guestPreviewOnly,
      });
      if (gen !== trackGenRef.current) return;
      if (isSuspended()) {
        pause();
        return;
      }

      if (!url) {
        setIsPlaying(false);
        return;
      }

      audio.src = url;

      if (guestPreviewOnly) {
        const ok = await beginGuestSegmentPlayback(audio, segment.start);
        if (gen !== trackGenRef.current) return;
        setIsPlaying(ok);
      } else {
        await startPlayback();
      }
    },
    [
      currentTrack,
      volume,
      guestPreviewOnly,
      isAuthenticated,
      isSuspended,
      pause,
      startPlayback,
      isGuestPreviewEnded,
      restartGuestPreview,
    ],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack) {
      setDurationSec(0);
      return;
    }
    if (!audio) return;

    const syncDuration = () => {
      const eff = effectiveDurationSec(audio, currentTrack, guestPreviewOnly, segmentRef.current);
      const sec = Math.floor(Math.max(0, eff));
      setDurationSec(sec);
    };

    syncDuration();
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);

    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
    };
  }, [currentTrack, guestPreviewOnly]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (guestPreviewOnly) {
        const { start, end } = segmentRef.current;
        const windowSec = Math.max(1, end - start);
        const t = audio.currentTime;
        if (t >= end - 0.05) {
          audio.pause();
          setIsPlaying(false);
          setProgress(100);
          return;
        }
        setProgress(Math.max(0, Math.min(100, ((t - start) / windowSec) * 100)));
        return;
      }
      const eff = effectiveDurationSec(audio, currentTrack, guestPreviewOnly, segmentRef.current);
      if (!eff) return;
      setProgress((audio.currentTime / eff) * 100);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [currentTrack, guestPreviewOnly]);

  const getPlaylistTracks = useCallback(() => {
    const list = typeof getPlaylist === "function" ? getPlaylist() : [];
    return Array.isArray(list) ? list : [];
  }, [getPlaylist]);

  const playAdjacent = useCallback(
    async (direction) => {
      const audio = audioRef.current;
      const safeList = getPlaylistTracks();
      if (!currentTrack || safeList.length === 0) return;

      if (safeList.length === 1 && safeList[0].id === currentTrack.id) {
        if (audio) {
          if (guestPreviewOnly) {
            restartGuestPreview(audio);
          } else {
            audio.currentTime = 0;
            setProgress(0);
          }
          await startPlayback();
        }
        return;
      }

      const idx = safeList.findIndex((e) => e.id === currentTrack.id);
      const baseIdx = idx >= 0 ? idx : 0;

      if (direction === "next" && shuffleOn && safeList.length > 1) {
        const pool = safeList.filter((e) => e.id !== currentTrack.id);
        const target = pool[Math.floor(Math.random() * pool.length)] || safeList[baseIdx];
        if (target) await playTrack(target);
        return;
      }

      const nextIdx =
        direction === "next"
          ? (baseIdx + 1) % safeList.length
          : (baseIdx - 1 + safeList.length) % safeList.length;
      const target = safeList[nextIdx];
      if (target) await playTrack(target);
    },
    [
      currentTrack,
      getPlaylistTracks,
      playTrack,
      startPlayback,
      shuffleOn,
      guestPreviewOnly,
      restartGuestPreview,
    ],
  );

  const toggleShuffle = useCallback(() => {
    setShuffleOn((v) => !v);
  }, []);

  const playNext = useCallback(async () => {
    await playAdjacent("next");
  }, [playAdjacent]);

  const playPrev = useCallback(async () => {
    await playAdjacent("prev");
  }, [playAdjacent]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume / 100));
  }, [volume]);

  const seek = useCallback(
    (percent) => {
      const audio = audioRef.current;
      if (!audio) return;
      const p = Math.max(0, Math.min(100, percent));
      if (guestPreviewOnly) {
        const { start, end } = segmentRef.current;
        const windowSec = Math.max(1, end - start);
        audio.currentTime = start + (windowSec * p) / 100;
        setProgress(p);
        return;
      }
      const eff = effectiveDurationSec(audio, currentTrack, guestPreviewOnly, segmentRef.current);
      if (!eff) return;
      audio.currentTime = (eff * p) / 100;
      setProgress(p);
    },
    [currentTrack, guestPreviewOnly],
  );

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentTrack) return;
    if (!audio.src) return;
    if (isSuspended()) {
      pause();
      return;
    }
    if (audio.paused) {
      if (guestPreviewOnly && isGuestPreviewEnded(audio)) {
        restartGuestPreview(audio);
      }
      await startPlayback();
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrack, guestPreviewOnly, isSuspended, pause, startPlayback, isGuestPreviewEnded, restartGuestPreview]);

  useEffect(() => {
    const prev = prevGuestAuthRef.current;
    const authChanged =
      prev.guestPreviewOnly !== guestPreviewOnly || prev.isAuthenticated !== isAuthenticated;
    prevGuestAuthRef.current = { guestPreviewOnly, isAuthenticated };
    if (!authChanged || !currentTrack || isSuspended()) return;
    void playTrack(currentTrack);
  }, [guestPreviewOnly, isAuthenticated, currentTrack, playTrack, isSuspended]);

  const playerApi = useMemo(
    () => ({
      currentTrack,
      isPlaying,
      progress,
      durationSec,
      volume,
      setVolume,
      playTrack,
      playNext,
      playPrev,
      toggle,
      pause,
      seek,
      shuffleOn,
      toggleShuffle,
      guestPreviewOnly,
      isAuthenticated,
    }),
    [
      currentTrack,
      isPlaying,
      progress,
      durationSec,
      volume,
      playTrack,
      playNext,
      playPrev,
      toggle,
      pause,
      seek,
      shuffleOn,
      toggleShuffle,
      guestPreviewOnly,
      isAuthenticated,
    ],
  );

  return playerApi;
}
