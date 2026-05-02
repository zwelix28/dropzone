import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GUEST_SNIPPET_DURATION_SEC, resolveMixPlaybackUrl } from "../lib/audioUrls.js";

function effectiveDurationSec(audio, track, guestPreviewOnly) {
  if (!guestPreviewOnly) {
    return Number(audio.duration) || Number(track?.durationSecs) || 0;
  }
  const d = Number(audio.duration) || Number(track?.durationSecs) || 0;
  if (d > 0) return Math.min(d, GUEST_SNIPPET_DURATION_SEC);
  return GUEST_SNIPPET_DURATION_SEC;
}

export default function usePlayer({
  guestPreviewOnly = false,
  isAuthenticated = false,
  getPlaylist = null,
} = {}) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  /** Whole seconds for UI (metadata + track row); updates when audio metadata loads. */
  const [durationSec, setDurationSec] = useState(0);
  const audioRef = useRef(null);
  const prevGuestAuthRef = useRef({ guestPreviewOnly, isAuthenticated });

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "metadata";
  }

  const playTrack = useCallback(
    async (ep) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (currentTrack?.id === ep.id) {
        if (audio.paused) {
          if (guestPreviewOnly && audio.currentTime >= GUEST_SNIPPET_DURATION_SEC - 0.05) {
            audio.currentTime = 0;
            setProgress(0);
          }
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
        return;
      }

      setCurrentTrack(ep);
      setProgress(0);
      const initialDur = guestPreviewOnly
        ? (() => {
            const d = Number(ep?.durationSecs) || 0;
            return d > 0 ? Math.min(Math.floor(d), GUEST_SNIPPET_DURATION_SEC) : GUEST_SNIPPET_DURATION_SEC;
          })()
        : Math.floor(Math.max(0, Number(ep?.durationSecs) || 0));
      setDurationSec(initialDur);

      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
      audio.volume = Math.max(0, Math.min(1, volume / 100));

      const url = await resolveMixPlaybackUrl(ep, { guestPreviewOnly, isAuthenticated });

      if (!url) {
        setIsPlaying(false);
        return;
      }

      audio.src = url;
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    },
    [currentTrack, volume, guestPreviewOnly, isAuthenticated],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack) {
      setDurationSec(0);
      return;
    }
    if (!audio) return;

    const syncDuration = () => {
      const eff = effectiveDurationSec(audio, currentTrack, guestPreviewOnly);
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
        const cap = GUEST_SNIPPET_DURATION_SEC;
        const t = audio.currentTime;
        // Only cap after playback has started (avoids spurious early timeupdate) and we have frame data.
        const canCap =
          audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && t > 0.02;
        if (canCap && Number.isFinite(t) && t >= cap - 0.05) {
          audio.pause();
          setIsPlaying(false);
          const eff = effectiveDurationSec(audio, currentTrack, guestPreviewOnly);
          if (eff) setProgress(100);
          return;
        }
      }
      const eff = effectiveDurationSec(audio, currentTrack, guestPreviewOnly);
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

  const playNext = useCallback(async () => {
    const audio = audioRef.current;
    const list = typeof getPlaylist === "function" ? getPlaylist() : [];
    const safeList = Array.isArray(list) ? list : [];
    if (!currentTrack || safeList.length === 0) return;

    if (safeList.length === 1 && safeList[0].id === currentTrack.id) {
      if (audio) {
        audio.currentTime = 0;
        setProgress(0);
        try {
          await audio.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
      return;
    }

    const idx = safeList.findIndex((e) => e.id === currentTrack.id);
    const nextIdx = idx >= 0 ? (idx + 1) % safeList.length : 0;
    const next = safeList[nextIdx];
    if (next) await playTrack(next);
  }, [currentTrack, playTrack, getPlaylist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume / 100));
  }, [volume]);

  const seek = useCallback(
    (percent) => {
      const audio = audioRef.current;
      if (!audio) return;
      const eff = effectiveDurationSec(audio, currentTrack, guestPreviewOnly);
      if (!eff) return;
      const p = Math.max(0, Math.min(100, percent));
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
    if (audio.paused) {
      if (guestPreviewOnly && audio.currentTime >= GUEST_SNIPPET_DURATION_SEC - 0.05) {
        audio.currentTime = 0;
        setProgress(0);
      }
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
  }, [currentTrack, guestPreviewOnly]);

  useEffect(() => {
    const prev = prevGuestAuthRef.current;
    const authChanged =
      prev.guestPreviewOnly !== guestPreviewOnly || prev.isAuthenticated !== isAuthenticated;
    prevGuestAuthRef.current = { guestPreviewOnly, isAuthenticated };
    if (!authChanged || !currentTrack) return;
    void playTrack(currentTrack);
  }, [guestPreviewOnly, isAuthenticated, currentTrack, playTrack]);

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
      toggle,
      seek,
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
      toggle,
      seek,
      guestPreviewOnly,
      isAuthenticated,
    ],
  );

  return playerApi;
}
