import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_OWNER_MAIN,
  registerExclusiveAudioOwner,
  requestExclusivePlayback,
} from "../lib/audioExclusive.js";
import { releaseWarmPlayback, withMediaTimeFragment } from "../lib/audioPrefetch.js";
import {
  episodeHasAudioSource,
  episodeHasGuestPlayback,
  invalidateMixPlaybackUrlCache,
  prefetchMixPlayback,
  renewMixPlaybackUrl,
  resolveMixPlaybackUrl,
} from "../lib/audioUrls.js";
import { getGuestPreviewSegment } from "../lib/forYouPreview.js";
import {
  clearPlaybackProgress,
  fetchPlaybackProgress,
  peekLocalPlaybackProgress,
  savePlaybackProgress,
  shouldResumeAt,
} from "../lib/playbackProgress.js";
import { moveQueueIds, orderedQueue } from "../lib/playbackQueue.js";
import {
  clearPlayerSession,
  readPlayerSession,
  writePlayerSession,
} from "../lib/playerSession.js";
import {
  bindMediaSessionActions,
  syncMediaSessionMetadata,
  syncMediaSessionPlaybackState,
  syncMediaSessionPositionState,
} from "../lib/mediaSession.js";
import { createStationIdOverlay } from "../lib/stationIdOverlay.js";

const SAVE_INTERVAL_MS = 10000;
/** Max automatic recoveries after a stream error / stall for one track load. */
const MAX_STREAM_RECOVERIES = 2;
/** Re-sign storage URLs before the ~1h Supabase expiry kills a long listen. */
const SIGNED_URL_RENEW_MS = 45 * 60 * 1000;

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
  /** Null follows catalog order. An array is the listener's queue for this session. */
  const [queueOrder, setQueueOrderState] = useState(null);
  const queueOrderRef = useRef(null);
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
  const streamRecoveryRef = useRef(0);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const shuffleOnRef = useRef(shuffleOn);
  shuffleOnRef.current = shuffleOn;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const sessionRestoredRef = useRef(false);
  const stationIdRef = useRef(null);
  if (!stationIdRef.current) {
    stationIdRef.current = createStationIdOverlay({
      getMainAudio: () => audioRef.current,
    });
  }

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    // Buffer ahead while playing / after src is set — cuts mid-track stalls.
    audioRef.current.preload = "auto";
  }

  const snapshotSession = useCallback((overrides = {}) => {
    const track = currentTrackRef.current;
    const audio = audioRef.current;
    if (!track?.id || guestPreviewOnlyRef.current) return;
    const positionSec =
      overrides.positionSec != null
        ? Number(overrides.positionSec)
        : Number(audio?.currentTime) || 0;
    writePlayerSession({
      mixId: track.id,
      positionSec,
      durationSec:
        Number(audio?.duration) || Number(track.durationSecs) || Number(overrides.durationSec) || 0,
      wasPlaying: overrides.wasPlaying != null ? Boolean(overrides.wasPlaying) : Boolean(isPlayingRef.current),
      volume: volumeRef.current,
      queueOrder: queueOrderRef.current,
      shuffleOn: shuffleOnRef.current,
    });
  }, []);

  const resolveOptsRef = useRef({ guestPreviewOnly, isAuthenticated });
  resolveOptsRef.current = { guestPreviewOnly, isAuthenticated };

  const isSuspended = useCallback(() => Boolean(suspendRef.current?.()), []);

  const persistProgress = useCallback(async ({ force = false, clear = false } = {}) => {
    const uid = userIdRef.current;
    const track = currentTrackRef.current;
    const audio = audioRef.current;
    if (!track?.id || guestPreviewOnlyRef.current) return;

    if (clear) {
      clearPlayerSession();
      if (uid) await clearPlaybackProgress(uid, track.id);
      return;
    }
    if (!audio) return;

    const now = Date.now();
    if (!force && now - lastSaveAtRef.current < SAVE_INTERVAL_MS) return;

    const positionSec = Number(audio.currentTime) || 0;
    const duration = Number(audio.duration) || Number(track.durationSecs) || 0;
    lastSaveAtRef.current = now;
    snapshotSession({ positionSec, durationSec: duration, wasPlaying: !audio.paused });
    if (uid) await savePlaybackProgress(uid, track.id, positionSec, duration);
  }, [snapshotSession]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    stationIdRef.current?.onMainPause();
    snapshotSession({ wasPlaying: false });
    void persistProgress({ force: true });
  }, [persistProgress, snapshotSession]);

  useEffect(() => registerExclusiveAudioOwner(AUDIO_OWNER_MAIN, pause), [pause]);

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || isSuspended()) return false;
    requestExclusivePlayback(AUDIO_OWNER_MAIN);
    try {
      await audio.play();
      setIsPlaying(true);
      snapshotSession({ wasPlaying: true });
      return true;
    } catch {
      setIsPlaying(false);
      snapshotSession({ wasPlaying: false });
      return false;
    }
  }, [isSuspended, snapshotSession]);

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

      const rememberInQueue = (mixId) => {
        const order = queueOrderRef.current;
        if (!order || !mixId || order.includes(mixId)) return;
        const next = [mixId, ...order];
        queueOrderRef.current = next;
        setQueueOrderState(next);
      };
      rememberInQueue(ep.id);

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
      streamRecoveryRef.current = 0;
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
      audio.preload = "auto";

      // Arm resume from local cache immediately; refine with DB in parallel with URL resolve.
      let resumeSec = 0;
      if (!guestPreviewOnly && userId && isAuthenticated) {
        const local = peekLocalPlaybackProgress(userId, ep.id);
        if (local && shouldResumeAt(local.positionSec, local.durationSec || ep.durationSecs)) {
          resumeSec = local.positionSec;
        }
      }

      const resolveOpts = {
        guestPreviewOnly,
        isAuthenticated,
        preferFullMix: guestPreviewOnly,
      };
      const urlPromise = resolveMixPlaybackUrl(ep, resolveOpts);
      const progressPromise =
        !guestPreviewOnly && userId && isAuthenticated
          ? fetchPlaybackProgress(userId, ep.id)
          : Promise.resolve(null);

      const [url, saved] = await Promise.all([urlPromise, progressPromise]);
      if (gen !== trackGenRef.current) return;
      if (isSuspended()) {
        pause();
        return;
      }

      if (saved && shouldResumeAt(saved.positionSec, saved.durationSec || ep.durationSecs)) {
        resumeSec = saved.positionSec;
      }

      if (!url) {
        setIsPlaying(false);
        return;
      }

      // Media fragment helps browsers Range-request near the resume point; warmer HTTP cache helps too.
      audio.src =
        !guestPreviewOnly && resumeSec > 0 ? withMediaTimeFragment(url, resumeSec) : url;
      releaseWarmPlayback(ep.id);

      if (guestPreviewOnly) {
        stationIdRef.current?.onTrackChange(ep.id, { guestPreviewOnly: true });
        const ok = await beginGuestSegmentPlayback(audio, segment.start);
        if (gen !== trackGenRef.current) return;
        setIsPlaying(ok);
        return;
      }

      await waitForMetadata(audio);
      if (gen !== trackGenRef.current) return;

      stationIdRef.current?.onTrackChange(ep.id, {
        resumeSec,
        guestPreviewOnly: false,
      });
      stationIdRef.current?.setUserVolume(volume);

      if (resumeSec > 0) {
        const mediaDur = Number(audio.duration) || Number(ep.durationSecs) || 0;
        if (shouldResumeAt(resumeSec, mediaDur)) {
          const ok = await seekToAndPlay(audio, resumeSec);
          if (gen !== trackGenRef.current) return;
          const eff = mediaDur || resumeSec;
          setProgress(eff ? (resumeSec / eff) * 100 : 0);
          setIsPlaying(ok);
          snapshotSession({ positionSec: resumeSec, durationSec: mediaDur, wasPlaying: ok });
          return;
        }
      }

      const started = await startPlayback();
      snapshotSession({ positionSec: 0, wasPlaying: started });
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
      snapshotSession,
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
      if (!audio.paused) {
        stationIdRef.current?.onTimeUpdate(audio.currentTime, {
          durationSec: eff,
          guestPreviewOnly: false,
        });
      }
      if (!audio.paused && userIdRef.current) {
        void persistProgress({ force: false });
      }
    };
    const onPlay = () => {
      setIsPlaying(true);
      stationIdRef.current?.onMainPlay();
    };
    const onPause = () => {
      setIsPlaying(false);
      stationIdRef.current?.onMainPause();
      void persistProgress({ force: true });
    };
    const onEnded = () => {
      setIsPlaying(false);
      // Track finished — reset VO for the next mix; do not leave it hanging.
      stationIdRef.current?.onTrackChange(null, { guestPreviewOnly: true });
      setProgress(0);
      void persistProgress({ clear: true });
      if (!guestPreviewOnly) {
        void playAdjacentRef.current?.("next");
      }
    };

    const recoverStream = async (reason) => {
      if (guestPreviewOnly) return;
      if (!currentTrackRef.current) return;
      if (streamRecoveryRef.current >= MAX_STREAM_RECOVERIES) {
        console.warn("playback: gave up recovering stream", reason);
        setIsPlaying(false);
        snapshotSession({ wasPlaying: false });
        return;
      }
      streamRecoveryRef.current += 1;
      const track = currentTrackRef.current;
      const pos = Number(audio.currentTime) || 0;
      console.warn(`playback: recovering after ${reason} (try ${streamRecoveryRef.current})`, track.id);
      try {
        const url = await renewMixPlaybackUrl(track, {
          guestPreviewOnly: false,
          isAuthenticated,
          preferFullMix: false,
        });
        if (!url || currentTrackRef.current?.id !== track.id) return;
        const resumeAt = pos > 1 ? pos : 0;
        audio.src = resumeAt > 0 ? withMediaTimeFragment(url, resumeAt) : url;
        await waitForMetadata(audio);
        if (currentTrackRef.current?.id !== track.id) return;
        if (resumeAt > 0) {
          const ok = await seekToAndPlay(audio, resumeAt);
          setIsPlaying(ok);
          snapshotSession({ positionSec: resumeAt, wasPlaying: ok });
        } else {
          const ok = await startPlayback();
          setIsPlaying(ok);
        }
      } catch (err) {
        console.warn("playback: recovery failed", err);
        setIsPlaying(false);
      }
    };

    const onError = () => {
      void recoverStream("error");
    };
    const onStalled = () => {
      // Only recover if we were actively playing and the element looks wedged.
      if (audio.paused || audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;
      void recoverStream("stalled");
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("stalled", onStalled);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("stalled", onStalled);
    };
  }, [currentTrack, guestPreviewOnly, persistProgress, isAuthenticated, snapshotSession, startPlayback]);

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

  // Long listens: refresh the signed URL before Supabase expiry (~1h) kills the stream.
  useEffect(() => {
    if (!currentTrack || guestPreviewOnly || !isPlaying) return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;

    const renew = async () => {
      const track = currentTrackRef.current;
      if (!track?.id || audio.paused) return;
      const pos = Number(audio.currentTime) || 0;
      try {
        const url = await renewMixPlaybackUrl(track, {
          guestPreviewOnly: false,
          isAuthenticated,
          preferFullMix: false,
        });
        if (!url || currentTrackRef.current?.id !== track.id) return;
        const wasPlaying = !audio.paused;
        audio.src = pos > 0 ? withMediaTimeFragment(url, pos) : url;
        await waitForMetadata(audio);
        if (currentTrackRef.current?.id !== track.id) return;
        if (wasPlaying) {
          const ok = pos > 0 ? await seekToAndPlay(audio, pos) : await startPlayback();
          setIsPlaying(ok);
          snapshotSession({ positionSec: pos, wasPlaying: ok });
        } else if (pos > 0) {
          try {
            audio.currentTime = pos;
          } catch {
            /* ignore */
          }
        }
        streamRecoveryRef.current = 0;
      } catch (err) {
        console.warn("playback: signed URL renew failed", err);
      }
    };

    const id = window.setInterval(() => {
      void renew();
    }, SIGNED_URL_RENEW_MS);
    return () => window.clearInterval(id);
  }, [currentTrack, guestPreviewOnly, isPlaying, isAuthenticated, startPlayback, snapshotSession]);

  const getPlaylistTracks = useCallback(() => {
    const list = typeof getPlaylist === "function" ? getPlaylist() : [];
    if (!Array.isArray(list)) return [];
    const canPlay = guestPreviewOnly ? episodeHasGuestPlayback : episodeHasAudioSource;
    return list.filter((ep) => canPlay(ep));
  }, [getPlaylist, guestPreviewOnly]);

  const queueTracks = orderedQueue(getPlaylistTracks(), queueOrder);

  const commitQueueOrder = useCallback((ids) => {
    queueOrderRef.current = ids;
    setQueueOrderState(ids);
  }, []);

  const moveQueueItem = useCallback(
    (fromIndex, toIndex) => {
      const ids = queueTracks.map((episode) => episode.id);
      commitQueueOrder(moveQueueIds(ids, fromIndex, toIndex));
    },
    [commitQueueOrder, queueTracks],
  );

  const clearQueue = useCallback(() => {
    const id = currentTrackRef.current?.id;
    const stillPlaying = id && queueTracks.some((episode) => episode.id === id);
    commitQueueOrder(stillPlaying ? [id] : []);
  }, [commitQueueOrder, queueTracks]);

  const playAdjacent = useCallback(
    async (direction) => {
      const audio = audioRef.current;
      const safeList = orderedQueue(getPlaylistTracks(), queueOrderRef.current);
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

  // Prefetch the likely next mix so skip / auto-advance starts warmer.
  useEffect(() => {
    if (!currentTrack?.id) return;
    const safeList = orderedQueue(getPlaylistTracks(), queueOrderRef.current);
    if (safeList.length < 2) return;

    let target = null;
    if (shuffleOn) {
      const pool = safeList.filter((e) => e.id !== currentTrack.id);
      target = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    } else {
      const idx = safeList.findIndex((e) => e.id === currentTrack.id);
      if (idx >= 0) target = safeList[(idx + 1) % safeList.length] || null;
    }
    if (!target || target.id === currentTrack.id) return;

    const { guestPreviewOnly: guest, isAuthenticated: authed } = resolveOptsRef.current;
    void prefetchMixPlayback(target, {
      guestPreviewOnly: guest,
      isAuthenticated: authed,
      preferFullMix: guest,
    });
  }, [currentTrack, shuffleOn, queueOrder, getPlaylistTracks]);

  const playNext = useCallback(async () => {
    await playAdjacent("next");
  }, [playAdjacent]);

  const playPrev = useCallback(async () => {
    await playAdjacent("prev");
  }, [playAdjacent]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Mix volume stays under player control; overlay never ducks it.
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    stationIdRef.current?.setUserVolume(volume);
    if (currentTrackRef.current?.id) {
      snapshotSession({ volume });
    }
  }, [volume, snapshotSession]);

  useEffect(() => {
    return () => {
      stationIdRef.current?.dispose();
    };
  }, []);

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
      const nextSec = (eff * p) / 100;
      audio.currentTime = nextSec;
      setProgress(p);
      // Restart / scrub back before the cue must re-arm the station ID VO.
      stationIdRef.current?.onSeekTo(nextSec, { guestPreviewOnly: false });
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
      "Deep House Lab";
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
    if (!authChanged) return;
    invalidateMixPlaybackUrlCache();
    if (!currentTrack || isSuspended()) return;
    void playTrack(currentTrack);
  }, [guestPreviewOnly, isAuthenticated, currentTrack, playTrack, isSuspended]);

  /**
   * Rebuild now-playing after a full page refresh. Browsers block unmuted autoplay
   * without a gesture, so we load the mix at the saved position and only attempt
   * play when the prior session was actively playing — falling back to paused.
   */
  const restoreSession = useCallback(
    async (episode, session) => {
      if (!episode?.id || guestPreviewOnly || isSuspended()) return false;
      if (sessionRestoredRef.current && currentTrackRef.current?.id === episode.id) return true;
      sessionRestoredRef.current = true;

      const audio = audioRef.current;
      if (!audio) return false;

      if (typeof session?.volume === "number" && Number.isFinite(session.volume)) {
        setVolume(session.volume);
        audio.volume = Math.max(0, Math.min(1, session.volume / 100));
      }
      if (session?.shuffleOn != null) setShuffleOn(Boolean(session.shuffleOn));
      if (Array.isArray(session?.queueOrder) && session.queueOrder.length) {
        queueOrderRef.current = session.queueOrder;
        setQueueOrderState(session.queueOrder);
      }

      const gen = ++trackGenRef.current;
      streamRecoveryRef.current = 0;
      segmentRef.current = { start: 0, end: 0, windowSec: 0 };
      setCurrentTrack(episode);
      setDurationSec(Math.floor(Math.max(0, Number(episode.durationSecs) || Number(session?.durationSec) || 0)));

      let resumeSec = Number(session?.positionSec) || 0;
      if (userId && isAuthenticated) {
        const local = peekLocalPlaybackProgress(userId, episode.id);
        if (local && shouldResumeAt(local.positionSec, local.durationSec || episode.durationSecs)) {
          resumeSec = Math.max(resumeSec, local.positionSec);
        }
        const saved = await fetchPlaybackProgress(userId, episode.id);
        if (gen !== trackGenRef.current) return false;
        if (saved && shouldResumeAt(saved.positionSec, saved.durationSec || episode.durationSecs)) {
          resumeSec = saved.positionSec;
        }
      }
      if (!shouldResumeAt(resumeSec, Number(episode.durationSecs) || Number(session?.durationSec) || 0)) {
        resumeSec = 0;
      }

      const url = await resolveMixPlaybackUrl(episode, {
        guestPreviewOnly: false,
        isAuthenticated,
        preferFullMix: false,
      });
      if (gen !== trackGenRef.current) return false;
      if (!url) {
        setIsPlaying(false);
        return false;
      }

      audio.pause();
      audio.src = resumeSec > 0 ? withMediaTimeFragment(url, resumeSec) : url;
      releaseWarmPlayback(episode.id);
      await waitForMetadata(audio);
      if (gen !== trackGenRef.current) return false;

      const mediaDur = Number(audio.duration) || Number(episode.durationSecs) || 0;
      if (resumeSec > 0 && shouldResumeAt(resumeSec, mediaDur)) {
        try {
          audio.currentTime = resumeSec;
        } catch {
          /* ignore */
        }
        setProgress(mediaDur ? (resumeSec / mediaDur) * 100 : 0);
      } else {
        setProgress(0);
        resumeSec = 0;
      }

      stationIdRef.current?.onTrackChange(episode.id, {
        resumeSec,
        guestPreviewOnly: false,
      });
      stationIdRef.current?.setUserVolume(volumeRef.current);

      let playing = false;
      if (session?.wasPlaying && !isSuspended()) {
        playing = await startPlayback();
      } else {
        setIsPlaying(false);
      }
      snapshotSession({
        positionSec: resumeSec,
        durationSec: mediaDur,
        wasPlaying: playing,
      });
      return true;
    },
    [guestPreviewOnly, isAuthenticated, isSuspended, startPlayback, snapshotSession, userId],
  );

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
      queueOrder,
      queueTracks,
      moveQueueItem,
      clearQueue,
      replaceQueue: commitQueueOrder,
      restoreSession,
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
      queueOrder,
      queueTracks,
      moveQueueItem,
      clearQueue,
      commitQueueOrder,
      restoreSession,
      guestPreviewOnly,
      isAuthenticated,
    ],
  );

  return playerApi;
}
