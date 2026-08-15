import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_OWNER_MAIN,
  registerExclusiveAudioOwner,
  requestExclusivePlayback,
} from "../lib/audioExclusive.js";
import {
  episodeHasAudioSource,
  episodeHasGuestPlayback,
  resolveMixPlaybackUrl,
} from "../lib/audioUrls.js";
import { getGuestPreviewSegment } from "../lib/forYouPreview.js";
import {
  clearPlaybackProgress,
  fetchPlaybackProgress,
  savePlaybackProgress,
  shouldResumeAt,
} from "../lib/playbackProgress.js";
import {
  bindMediaSessionActions,
  syncMediaSessionMetadata,
  syncMediaSessionPlaybackState,
  syncMediaSessionPositionState,
} from "../lib/mediaSession.js";

const SAVE_INTERVAL_MS = 10000;

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

async function waitForMetadata(audio) {
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) return;
  await new Promise((resolve) => {
    const onReady = () => {
      audio.removeEventListener("loadedmetadata", onReady);
      audio.removeEventListener("canplay", onReady);
      resolve();
    };
    audio.addEventListener("loadedmetadata", onReady, { once: true });
    audio.addEventListener("canplay", onReady, { once: true });
    setTimeout(resolve, 4000);
  });
}

export default function usePlayer({
  guestPreviewOnly = false,
  isAuthenticated = false,
  userId = null,
  getPlaylist = null,
  getSuspendPlayback = null,
  onDurationKnown = null,
  getArtistName = null,
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
  const playAdjacentRef = useRef(null);
  const currentTrackRef = useRef(null);
  currentTrackRef.current = currentTrack;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const guestPreviewOnlyRef = useRef(guestPreviewOnly);
  guestPreviewOnlyRef.current = guestPreviewOnly;
  const lastSaveAtRef = useRef(0);
  const seekSaveTimerRef = useRef(null);
  const seekRef = useRef(null);
  const onDurationKnownRef = useRef(onDurationKnown);
  onDurationKnownRef.current = onDurationKnown;
  const getArtistNameRef = useRef(getArtistName);
  getArtistNameRef.current = getArtistName;
  const reportedDurationIdsRef = useRef(new Set());

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "metadata";
  }

  const isSuspended = useCallback(() => Boolean(suspendRef.current?.()), []);

  const persistProgress = useCallback(async ({ force = false, clear = false } = {}) => {
    const uid = userIdRef.current;
    const track = currentTrackRef.current;
    const audio = audioRef.current;
    if (!uid || !track?.id || guestPreviewOnlyRef.current) return;

    if (clear) {
      await clearPlaybackProgress(uid, track.id);
      return;
    }
    if (!audio) return;

    const now = Date.now();
    if (!force && now - lastSaveAtRef.current < SAVE_INTERVAL_MS) return;

    const positionSec = Number(audio.currentTime) || 0;
    const duration = Number(audio.duration) || Number(track.durationSecs) || 0;
    lastSaveAtRef.current = now;
    await savePlaybackProgress(uid, track.id, positionSec, duration);
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    void persistProgress({ force: true });
  }, [persistProgress]);

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
          void persistProgress({ force: true });
        }
        return;
      }

      // Save outgoing track before switching
      if (currentTrack?.id && userIdRef.current && !guestPreviewOnly) {
        const pos = Number(audio.currentTime) || 0;
        const dur = Number(audio.duration) || Number(currentTrack.durationSecs) || 0;
        void savePlaybackProgress(userIdRef.current, currentTrack.id, pos, dur);
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
        return;
      }

      let resumeSec = 0;
      if (userId && isAuthenticated) {
        const saved = await fetchPlaybackProgress(userId, ep.id);
        if (gen !== trackGenRef.current) return;
        if (saved && shouldResumeAt(saved.positionSec, saved.durationSec || ep.durationSecs)) {
          resumeSec = saved.positionSec;
        }
      }

      await waitForMetadata(audio);
      if (gen !== trackGenRef.current) return;

      if (resumeSec > 0) {
        const mediaDur = Number(audio.duration) || Number(ep.durationSecs) || 0;
        if (shouldResumeAt(resumeSec, mediaDur)) {
          const ok = await seekToAndPlay(audio, resumeSec);
          if (gen !== trackGenRef.current) return;
          const eff = mediaDur || resumeSec;
          setProgress(eff ? (resumeSec / eff) * 100 : 0);
          setIsPlaying(ok);
          return;
        }
      }

      await startPlayback();
    },
    [
      currentTrack,
      volume,
      guestPreviewOnly,
      isAuthenticated,
      userId,
      isSuspended,
      pause,
      startPlayback,
      isGuestPreviewEnded,
      restartGuestPreview,
      persistProgress,
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
      const mediaDur = Number(audio.duration);
      const trackDur = Number(currentTrack?.durationSecs) || 0;
      if (
        !guestPreviewOnly &&
        currentTrack?.id &&
        Number.isFinite(mediaDur) &&
        mediaDur > 0 &&
        trackDur < 1 &&
        !reportedDurationIdsRef.current.has(currentTrack.id)
      ) {
        reportedDurationIdsRef.current.add(currentTrack.id);
        onDurationKnownRef.current?.(currentTrack.id, Math.round(mediaDur));
      }
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
        syncMediaSessionPositionState(audio, {
          durationSec: windowSec,
          guestPreviewOnly: true,
          segment: segmentRef.current,
        });
        return;
      }
      const eff = effectiveDurationSec(audio, currentTrack, guestPreviewOnly, segmentRef.current);
      if (!eff) return;
      setProgress((audio.currentTime / eff) * 100);
      syncMediaSessionPositionState(audio, {
        durationSec: eff,
        guestPreviewOnly,
        segment: segmentRef.current,
      });
      if (!audio.paused && userIdRef.current) {
        void persistProgress({ force: false });
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      void persistProgress({ force: true });
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      void persistProgress({ clear: true });
      if (!guestPreviewOnly) {
        void playAdjacentRef.current?.("next");
      }
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
  }, [currentTrack, guestPreviewOnly, persistProgress]);

  // Flush progress when leaving the page / tab
  useEffect(() => {
    const flush = () => {
      void persistProgress({ force: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [persistProgress]);

  const getPlaylistTracks = useCallback(() => {
    const list = typeof getPlaylist === "function" ? getPlaylist() : [];
    if (!Array.isArray(list)) return [];
    const canPlay = guestPreviewOnly ? episodeHasGuestPlayback : episodeHasAudioSource;
    return list.filter((ep) => canPlay(ep));
  }, [getPlaylist, guestPreviewOnly]);

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
            if (userIdRef.current) {
              void clearPlaybackProgress(userIdRef.current, currentTrack.id);
            }
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

  useEffect(() => {
    playAdjacentRef.current = playAdjacent;
  }, [playAdjacent]);

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
      if (seekSaveTimerRef.current) clearTimeout(seekSaveTimerRef.current);
      seekSaveTimerRef.current = setTimeout(() => {
        void persistProgress({ force: true });
      }, 400);
    },
    [currentTrack, guestPreviewOnly, persistProgress],
  );
  seekRef.current = seek;

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
      void persistProgress({ force: true });
    }
  }, [
    currentTrack,
    guestPreviewOnly,
    isSuspended,
    pause,
    startPlayback,
    isGuestPreviewEnded,
    restartGuestPreview,
    persistProgress,
  ]);

  // Lock screen / Control Center / Android media notification: title + artwork
  // instead of the signed audio URL.
  useEffect(() => {
    if (!currentTrack) {
      syncMediaSessionMetadata(null);
      syncMediaSessionPlaybackState(false);
      return;
    }
    const artist =
      (typeof getArtistNameRef.current === "function" && getArtistNameRef.current(currentTrack)) ||
      "Music Vault";
    syncMediaSessionMetadata(currentTrack, artist);
    syncMediaSessionPlaybackState(isPlaying);
    syncMediaSessionPositionState(audioRef.current, {
      durationSec: durationSec,
      guestPreviewOnly,
      segment: segmentRef.current,
    });
  }, [currentTrack, isPlaying, durationSec, guestPreviewOnly]);

  useEffect(() => {
    return bindMediaSessionActions({
      onPlay: async () => {
        if (isSuspended()) return;
        await startPlayback();
      },
      onPause: () => pause(),
      onPrevious: async () => {
        await playAdjacentRef.current?.("prev");
      },
      onNext: async () => {
        await playAdjacentRef.current?.("next");
      },
      onSeek: (percent) => {
        seekRef.current?.(percent);
      },
      getAudio: () => audioRef.current,
      guestPreviewOnly,
      getSegment: () => segmentRef.current,
    });
  }, [guestPreviewOnly, isSuspended, pause, startPlayback]);

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
