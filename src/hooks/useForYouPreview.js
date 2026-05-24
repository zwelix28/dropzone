import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUDIO_OWNER_FOR_YOU,
  registerExclusiveAudioOwner,
  requestExclusivePlayback,
} from "../lib/audioExclusive.js";
import { resolveMixPlaybackUrl } from "../lib/audioUrls.js";
import {
  FOR_YOU_PREVIEW_SEC,
  getGuestPreviewSegment,
} from "../lib/forYouPreview.js";

function getPreviewSegment(ep) {
  const { start, end } = getGuestPreviewSegment(ep.durationSecs);
  return { start, end };
}

export default function useForYouPreview({ isAuthenticated }) {
  const [track, setTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewStartSec, setPreviewStartSec] = useState(0);
  const [previewEndSec, setPreviewEndSec] = useState(FOR_YOU_PREVIEW_SEC);
  const audioRef = useRef(null);
  const segmentRef = useRef({ start: 0, end: FOR_YOU_PREVIEW_SEC });
  const generationRef = useRef(0);
  const urlCacheRef = useRef(new Map());

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
  }

  const resolveUrl = useCallback(
    async (ep) => {
      const cached = urlCacheRef.current.get(ep.id);
      if (cached) return cached;
      const url = await resolveMixPlaybackUrl(ep, {
        guestPreviewOnly: !isAuthenticated,
        isAuthenticated,
        preferFullMix: true,
      });
      if (url) urlCacheRef.current.set(ep.id, url);
      return url;
    },
    [isAuthenticated],
  );

  const prefetch = useCallback(
    (ep) => {
      if (!ep) return;
      void resolveUrl(ep);
    },
    [resolveUrl],
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
  }, []);

  useEffect(() => registerExclusiveAudioOwner(AUDIO_OWNER_FOR_YOU, stop), [stop]);

  const beginSegmentPlayback = useCallback(async (audio, start, gen) => {
    const seekAndPlay = async () => {
      if (gen !== generationRef.current) return;
      requestExclusivePlayback(AUDIO_OWNER_FOR_YOU);
      try {
        audio.currentTime = start;
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
    if (gen !== generationRef.current) return false;
    return seekAndPlay();
  }, []);

  const playPreview = useCallback(
    async (ep, { force = false } = {}) => {
      const audio = audioRef.current;
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
      audio.removeAttribute("src");
      audio.load();

      const url = await resolveUrl(ep);
      if (gen !== generationRef.current || !url) {
        if (gen === generationRef.current) setIsPlaying(false);
        return false;
      }

      audio.src = url;
      return beginSegmentPlayback(audio, start, gen);
    },
    [beginSegmentPlayback, resolveUrl, track?.id],
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
