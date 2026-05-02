import { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { DJAudioEngine } from "./djAudioEngine.js";
import { estimateBpmFromBuffer } from "../lib/bpmDetect.js";

function pickRecorderMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/**
 * @param {{ accessToken?: string }} opts
 */
export function useLetsDJ(opts = {}) {
  const accessToken = opts.accessToken;

  const engineRef = useRef(null);
  const wsA = useRef(null);
  const wsB = useRef(null);
  const audioA = useRef(null);
  const audioB = useRef(null);
  const wfContainerA = useRef(null);
  const wfContainerB = useRef(null);
  const objectUrls = useRef({ A: null, B: null });
  const recordChunks = useRef([]);
  const mediaRecorderRef = useRef(null);
  const autoMixRaf = useRef(null);
  const autoMixTransition = useRef(null);
  const prevAutoMix = useRef(false);

  const [engineReady, setEngineReady] = useState(false);
  const [crossfader, setCrossfader] = useState(0);
  const [volA, setVolA] = useState(1);
  const [volB, setVolB] = useState(1);

  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [bpmDetectA, setBpmDetectA] = useState(null);
  const [bpmDetectB, setBpmDetectB] = useState(null);
  const [bpmManualA, setBpmManualA] = useState(120);
  const [bpmManualB, setBpmManualB] = useState(120);

  const [currentA, setCurrentA] = useState(0);
  const [currentB, setCurrentB] = useState(0);
  const [durationA, setDurationA] = useState(0);
  const [durationB, setDurationB] = useState(0);
  const [playingA, setPlayingA] = useState(false);
  const [playingB, setPlayingB] = useState(false);

  const [fxTarget, setFxTarget] = useState("A");
  const [filterMorph, setFilterMorph] = useState(0);
  const [echoAmt, setEchoAmt] = useState(0);
  const [echoTime, setEchoTime] = useState(0.35);
  const [echoFb, setEchoFb] = useState(0.25);
  const [reverbAmt, setReverbAmt] = useState(0);
  const [flangerAmt, setFlangerAmt] = useState(0);

  const [queue, setQueue] = useState([]);
  const [autoMix, setAutoMix] = useState(false);
  const [outDeck, setOutDeck] = useState("A");

  const [cuesA, setCuesA] = useState([]);
  const [cuesB, setCuesB] = useState([]);
  const [loopInA, setLoopInA] = useState(null);
  const [loopOutA, setLoopOutA] = useState(null);
  const [loopInB, setLoopInB] = useState(null);
  const [loopOutB, setLoopOutB] = useState(null);

  const [recording, setRecording] = useState(false);
  const [recordBlob, setRecordBlob] = useState(null);
  const [, setUiTick] = useState(0);
  const crossfaderRef = useRef(0);
  const autoMixBusy = useRef(false);

  const destroyWavesurfer = useCallback((deck) => {
    const w = deck === "A" ? wsA.current : wsB.current;
    if (w) {
      try {
        w.destroy();
      } catch {
        /* ignore */
      }
      if (deck === "A") wsA.current = null;
      else wsB.current = null;
    }
  }, []);

  const buildWavesurfer = useCallback(
    (deck) => {
      const audio = deck === "A" ? audioA.current : audioB.current;
      const container = deck === "A" ? wfContainerA.current : wfContainerB.current;
      if (!audio || !container) return;
      destroyWavesurfer(deck);
      const w = WaveSurfer.create({
        container,
        height: 76,
        waveColor: "rgba(52,211,153,0.22)",
        progressColor: "#34d399",
        cursorColor: "#38bdf8",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        media: audio,
        interact: true,
      });
      if (deck === "A") wsA.current = w;
      else wsB.current = w;
    },
    [destroyWavesurfer],
  );

  useEffect(() => {
    engineRef.current = new DJAudioEngine();
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const a = audioA.current;
    const b = audioB.current;
    if (!a || !b) return;
    const eng = engineRef.current;
    if (!eng) return;
    let cancelled = false;
    (async () => {
      await eng.ensureContext();
      if (cancelled) return;
      eng.connectDeck("A", a);
      eng.connectDeck("B", b);
      eng.setCrossfader(crossfader);
      eng.setDeckVolume("A", volA);
      eng.setDeckVolume("B", volB);
      setEngineReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    crossfaderRef.current = crossfader;
    if (!engineReady || !engineRef.current) return;
    engineRef.current.setCrossfader(crossfader);
  }, [crossfader, engineReady]);

  useEffect(() => {
    if (!engineReady || !engineRef.current) return;
    engineRef.current.setDeckVolume("A", volA);
    engineRef.current.setDeckVolume("B", volB);
  }, [volA, volB, engineReady]);

  useEffect(() => {
    if (!engineReady || !engineRef.current) return;
    const id = fxTarget;
    engineRef.current.setFilterMorph(id, filterMorph);
    engineRef.current.setEcho(id, echoAmt, echoTime, echoFb);
    engineRef.current.setReverb(id, reverbAmt);
    engineRef.current.setFlanger(id, flangerAmt);
  }, [fxTarget, filterMorph, echoAmt, echoTime, echoFb, reverbAmt, flangerAmt, engineReady]);

  const detectBpmFromFile = useCallback(async (file) => {
    const ctx = new AudioContext();
    try {
      const ab = await file.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab.slice(0));
      return estimateBpmFromBuffer(buf);
    } catch {
      return { bpm: 120, confidence: 0 };
    } finally {
      await ctx.close().catch(() => {});
    }
  }, []);

  const loadFileToDeck = useCallback(
    async (deck, file) => {
      const audio = deck === "A" ? audioA.current : audioB.current;
      if (!audio) return;
      const prev = objectUrls.current[deck];
      if (prev) URL.revokeObjectURL(prev);
      const url = URL.createObjectURL(file);
      objectUrls.current[deck] = url;
      audio.src = url;
      audio.playbackRate = 1;
      if (deck === "A") {
        setNameA(file.name.replace(/\.[^/.]+$/, ""));
        setBpmManualA(120);
      } else {
        setNameB(file.name.replace(/\.[^/.]+$/, ""));
        setBpmManualB(120);
      }
      const { bpm } = await detectBpmFromFile(file);
      if (deck === "A") {
        setBpmDetectA(bpm);
        setBpmManualA(Math.round(bpm) || 120);
      } else {
        setBpmDetectB(bpm);
        setBpmManualB(Math.round(bpm) || 120);
      }
      audio.onloadedmetadata = () => {
        if (deck === "A") setDurationA(audio.duration || 0);
        else setDurationB(audio.duration || 0);
        buildWavesurfer(deck);
      };
    },
    [buildWavesurfer, detectBpmFromFile],
  );

  const loadQueueToDeck = useCallback(
    async (deck, item) => {
      if (!item?.file) return;
      await loadFileToDeck(deck, item.file);
    },
    [loadFileToDeck],
  );

  const addToQueue = useCallback((files) => {
    const list = Array.from(files || []);
    setQueue((q) => [
      ...q,
      ...list.map((file, i) => ({
        id: `${Date.now()}-${i}-${file.name}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        file,
      })),
    ]);
  }, []);

  const removeFromQueue = useCallback((id) => {
    setQueue((q) => q.filter((x) => x.id !== id));
  }, []);

  const playDeck = useCallback(
    async (deck) => {
      await engineRef.current?.ensureContext();
      const audio = deck === "A" ? audioA.current : audioB.current;
      if (!audio?.src) return;
      await audio.play();
      if (deck === "A") setPlayingA(true);
      else setPlayingB(true);
    },
    [],
  );

  const pauseDeck = useCallback((deck) => {
    const audio = deck === "A" ? audioA.current : audioB.current;
    audio?.pause();
    if (deck === "A") setPlayingA(false);
    else setPlayingB(false);
  }, []);

  const cueDeck = useCallback((deck) => {
    const audio = deck === "A" ? audioA.current : audioB.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.pause();
    if (deck === "A") setPlayingA(false);
    else setPlayingB(false);
  }, []);

  const seekDeck = useCallback((deck, t) => {
    const audio = deck === "A" ? audioA.current : audioB.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(t, audio.duration || 0));
  }, []);

  const syncBpm = useCallback(() => {
    const a = audioA.current;
    const b = audioB.current;
    if (!a || !b) return;
    const detA = bpmDetectA || 120;
    const detB = bpmDetectB || 120;
    const target = (bpmManualA || detA) * (a.playbackRate || 1);
    const rateB = target / detB;
    b.playbackRate = Math.max(0.85, Math.min(1.25, rateB));
    setBpmManualB(Math.round(detB * b.playbackRate));
  }, [bpmDetectA, bpmDetectB, bpmManualA]);

  const applyManualBpm = useCallback(
    (deck, bpm) => {
      const audio = deck === "A" ? audioA.current : audioB.current;
      const detected = deck === "A" ? bpmDetectA : bpmDetectB;
      if (!audio) return;
      const base = detected || 120;
      const r = bpm / base;
      audio.playbackRate = Math.max(0.85, Math.min(1.25, r));
      if (deck === "A") setBpmManualA(bpm);
      else setBpmManualB(bpm);
    },
    [bpmDetectA, bpmDetectB],
  );

  const addCue = useCallback((deck) => {
    const audio = deck === "A" ? audioA.current : audioB.current;
    if (!audio) return;
    const t = audio.currentTime;
    if (deck === "A") setCuesA((c) => [...c, t].slice(0, 8));
    else setCuesB((c) => [...c, t].slice(0, 8));
  }, []);

  const jumpCue = useCallback((deck, t) => {
    seekDeck(deck, t);
  }, [seekDeck]);

  const setLoopBracket = useCallback(
    (deck, which) => {
      const audio = deck === "A" ? audioA.current : audioB.current;
      if (!audio) return;
      const t = audio.currentTime;
      if (deck === "A") {
        if (which === "in") setLoopInA(t);
        else setLoopOutA(t);
      } else {
        if (which === "in") setLoopInB(t);
        else setLoopOutB(t);
      }
    },
    [],
  );

  const clearLoop = useCallback((deck) => {
    if (deck === "A") {
      setLoopInA(null);
      setLoopOutA(null);
    } else {
      setLoopInB(null);
      setLoopOutB(null);
    }
  }, []);

  useEffect(() => {
    const onTime = () => {
      const a = audioA.current;
      const b = audioB.current;
      if (a) setCurrentA(a.currentTime);
      if (b) setCurrentB(b.currentTime);
      if (a && loopInA != null && loopOutA != null && loopOutA > loopInA && a.currentTime >= loopOutA) {
        a.currentTime = loopInA;
      }
      if (b && loopInB != null && loopOutB != null && loopOutB > loopInB && b.currentTime >= loopOutB) {
        b.currentTime = loopInB;
      }
    };
    const a = audioA.current;
    const b = audioB.current;
    a?.addEventListener("timeupdate", onTime);
    b?.addEventListener("timeupdate", onTime);
    return () => {
      a?.removeEventListener("timeupdate", onTime);
      b?.removeEventListener("timeupdate", onTime);
    };
  }, [loopInA, loopOutA, loopInB, loopOutB, engineReady]);

  useEffect(() => {
    const id = setInterval(() => setUiTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, []);

  const startRecording = useCallback(async () => {
    const eng = engineRef.current;
    if (!eng) return;
    await eng.ensureContext();
    const stream = eng.getRecordStream();
    if (!stream) return;
    recordChunks.current = [];
    const mime = pickRecorderMime();
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size) recordChunks.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(recordChunks.current, { type: mr.mimeType || "audio/webm" });
      setRecordBlob(blob);
    };
    mr.start(200);
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    setRecording(false);
    mediaRecorderRef.current = null;
  }, []);

  const downloadRecording = useCallback(
    (filename) => {
      if (!recordBlob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(recordBlob);
      a.download = filename || "dropzone-mix.webm";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    [recordBlob],
  );

  /** @param {{ supabase: import('@supabase/supabase-js').SupabaseClient, userId: string, title: string, refreshMixes?: () => Promise<void> }} args */
  const publishMix = useCallback(
    async ({ supabase, userId, title, refreshMixes }) => {
      if (!recordBlob || !userId) return { ok: false, error: "Missing blob or user" };
      const ext = recordBlob.type.includes("webm") ? "webm" : "mp3";
      const audioPath = `${userId}/dj-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("mix-audio").upload(audioPath, recordBlob, {
        cacheControl: "3600",
        upsert: false,
        contentType: recordBlob.type || "audio/webm",
      });
      if (upErr) return { ok: false, error: upErr.message };

      const tracklist = [nameA, nameB].filter(Boolean);
      const bpmMin = Math.min(bpmManualA || 120, bpmManualB || 120);
      const bpmMax = Math.max(bpmManualA || 120, bpmManualB || 120);
      const desc = `DJ set from Let's DJ. BPM ~${bpmMin}–${bpmMax}. Tracks: ${tracklist.join(", ") || "live blend"}.`;

      const { data: inserted, error: insErr } = await supabase
        .from("mixes")
        .insert({
          user_id: userId,
          title: (title || "").trim() || "Live DJ Mix",
          description: desc,
          genre: "DJ Set",
          tags: ["dj", "live"],
          tracklist: tracklist.length ? tracklist : ["Live blend"],
          cover_url: "",
          audio_url: "",
          audio_storage_path: audioPath,
          audio_preview_path: "",
          duration_secs: Math.round((durationA + durationB) / 2) || 0,
        })
        .select("id")
        .single();

      if (insErr) return { ok: false, error: insErr.message };
      await refreshMixes?.();
      return { ok: true, mixId: inserted.id };
    },
    [recordBlob, nameA, nameB, bpmManualA, bpmManualB, durationA, durationB],
  );

  const djFetchUrl = useCallback((path) => {
    const base = (import.meta.env.VITE_DJ_API_URL || "").replace(/\/$/, "");
    return base ? `${base}${path}` : path;
  }, []);

  const uploadTrackToApi = useCallback(
    async (file) => {
      if (!accessToken) return { ok: false, error: "Sign in required for API upload" };
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(djFetchUrl("/api/dj/tracks"), {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      if (!r.ok) return { ok: false, error: await r.text() };
      return await r.json();
    },
    [accessToken, djFetchUrl],
  );

  const saveMixMetadataToApi = useCallback(
    async (payload) => {
      if (!accessToken) return { ok: false, error: "Sign in required" };
      const r = await fetch(djFetchUrl("/api/dj/mixes"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return { ok: false, error: await r.text() };
      return await r.json();
    },
    [accessToken, djFetchUrl],
  );

  useEffect(() => {
    if (autoMix && !prevAutoMix.current) {
      setOutDeck(crossfaderRef.current > 0.5 ? "B" : "A");
    }
    prevAutoMix.current = autoMix;
  }, [autoMix]);

  useEffect(() => {
    if (!autoMix || !engineReady) {
      autoMixBusy.current = false;
      autoMixTransition.current = null;
      return;
    }
    const run = () => {
      const od = outDeck;
      const outgoing = od === "A" ? audioA.current : audioB.current;
      const tr = autoMixTransition.current;
      if (tr?.active) {
        const elapsed = (performance.now() - tr.start) / 1000;
        const dur = tr.durationSec;
        const p = Math.min(1, elapsed / dur);
        const from = tr.fromXf;
        const to = tr.toXf;
        setCrossfader(from + (to - from) * p);
        if (p >= 1) {
          autoMixTransition.current = null;
          setOutDeck(tr.newOut);
          autoMixBusy.current = false;
        }
      } else if (outgoing?.duration && outgoing.currentTime > 0 && !autoMixBusy.current) {
        const remaining = outgoing.duration - outgoing.currentTime;
        if (remaining < 12 && remaining > 1 && queue.length > 0) {
          autoMixBusy.current = true;
          const next = queue[0];
          const inactive = od === "A" ? "B" : "A";
          (async () => {
            await loadQueueToDeck(inactive, next);
            setQueue((q) => q.slice(1));
            const inc = inactive === "A" ? audioA.current : audioB.current;
            const out = od === "A" ? audioA.current : audioB.current;
            const { bpm: nextBpm } = await detectBpmFromFile(next.file);
            if (inc && out) {
              const activeRate = out.playbackRate || 1;
              const outDet = od === "A" ? bpmDetectA : bpmDetectB;
              const targetBpm = (outDet || 120) * activeRate;
              if (nextBpm) inc.playbackRate = Math.max(0.88, Math.min(1.22, targetBpm / nextBpm));
            }
            await engineRef.current?.ensureContext();
            try {
              await inc?.play();
            } catch {
              autoMixBusy.current = false;
              return;
            }
            if (inactive === "A") setPlayingA(true);
            else setPlayingB(true);
            const fromXf = crossfaderRef.current;
            const toXf = inactive === "B" ? 1 : 0;
            autoMixTransition.current = {
              active: true,
              start: performance.now(),
              durationSec: 8,
              fromXf,
              toXf,
              newOut: inactive,
            };
          })();
        }
      }
      autoMixRaf.current = requestAnimationFrame(run);
    };
    autoMixRaf.current = requestAnimationFrame(run);
    return () => {
      if (autoMixRaf.current) cancelAnimationFrame(autoMixRaf.current);
    };
  }, [autoMix, engineReady, outDeck, queue, loadQueueToDeck, bpmDetectA, detectBpmFromFile]);

  return {
    audioEngineRef: engineRef,
    engineReady,
    audioA,
    audioB,
    wfContainerA,
    wfContainerB,
    crossfader,
    setCrossfader,
    volA,
    setVolA,
    volB,
    setVolB,
    nameA,
    nameB,
    bpmDetectA,
    bpmDetectB,
    bpmManualA,
    bpmManualB,
    setBpmManualA,
    setBpmManualB,
    applyManualBpm,
    syncBpm,
    currentA,
    currentB,
    durationA,
    durationB,
    playingA,
    playingB,
    fxTarget,
    setFxTarget,
    filterMorph,
    setFilterMorph,
    echoAmt,
    setEchoAmt,
    echoTime,
    setEchoTime,
    echoFb,
    setEchoFb,
    reverbAmt,
    setReverbAmt,
    flangerAmt,
    setFlangerAmt,
    queue,
    addToQueue,
    removeFromQueue,
    autoMix,
    setAutoMix,
    outDeck,
    loadFileToDeck,
    playDeck,
    pauseDeck,
    cueDeck,
    seekDeck,
    cuesA,
    cuesB,
    addCue,
    jumpCue,
    loopInA,
    loopOutA,
    loopInB,
    loopOutB,
    setLoopBracket,
    clearLoop,
    recording,
    recordBlob,
    startRecording,
    stopRecording,
    downloadRecording,
    publishMix,
    uploadTrackToApi,
    saveMixMetadataToApi,
  };
}
