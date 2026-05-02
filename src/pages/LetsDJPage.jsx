import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import DeckPanel from "../dj/components/DeckPanel.jsx";
import MixerBar from "../dj/components/MixerBar.jsx";
import FXRack from "../dj/components/FXRack.jsx";
import DJQueue from "../dj/components/DJQueue.jsx";
import SpectrumBars from "../dj/components/SpectrumBars.jsx";
import { useLetsDJ } from "../dj/useLetsDJ.js";

export default function LetsDJPage() {
  const navigate = useNavigate();
  const { auth, refreshMixes } = useApp();
  const uid = auth.session?.user?.id;
  const token = auth.session?.access_token;
  const isCompact = useMediaQuery("(max-width: 960px)");

  const fileA = useRef(null);
  const fileB = useRef(null);

  const dj = useLetsDJ({ accessToken: token });
  const [mixTitle, setMixTitle] = useState("My Live Mix");
  const [publishMsg, setPublishMsg] = useState(null);
  const [apiMsg, setApiMsg] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const canPersist = Boolean(uid);

  const handlePublish = async () => {
    if (!canPersist || !dj.recordBlob) {
      auth.setShowAuth(true);
      return;
    }
    if (!isSupabaseConfigured()) {
      setPublishMsg("Configure Supabase in .env.local.");
      return;
    }
    setPublishing(true);
    setPublishMsg(null);
    const r = await dj.publishMix({
      supabase,
      userId: uid,
      title: mixTitle,
      refreshMixes,
    });
    setPublishing(false);
    if (r.ok) {
      setPublishMsg(`Published! Opening mix…`);
      navigate(`/mix/${r.mixId}`);
    } else {
      setPublishMsg(r.error || "Publish failed");
    }
  };

  return (
    <div className="fade-in" style={{ padding: isCompact ? "16px 12px 100px" : "24px 28px 100px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--ff-display)",
              fontSize: isCompact ? 32 : 42,
              letterSpacing: "0.08em",
              color: "#e2e8f0",
              textShadow: "0 0 40px rgba(52,211,153,0.15)",
            }}
          >
            LET&apos;S DJ
          </h1>
          <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 6, maxWidth: 560 }}>
            Two-deck Web Audio mixer with crossfader, tempo, FX, waveform, auto mix, recording, and profile publish.
          </p>
        </div>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.25)",
            fontSize: 12,
            color: "var(--text2)",
            maxWidth: 320,
          }}
        >
          {!canPersist ? (
            <>
              <strong style={{ color: "#34d399" }}>Guest mode:</strong> load local files and mix. Sign in to publish mixes or use the optional DJ API upload.
            </>
          ) : (
            <>
              <strong style={{ color: "#34d399" }}>Signed in:</strong> you can record and publish mixes to your Dropzone profile.
            </>
          )}
        </div>
      </div>

      <SpectrumBars engineRef={dj.audioEngineRef} height={isCompact ? 48 : 56} />

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 16 }}>
        <DeckPanel
          deck="A"
          label="DECK A"
          name={dj.nameA}
          wfRef={dj.wfContainerA}
          audioRef={dj.audioA}
          current={dj.currentA}
          duration={dj.durationA}
          playing={dj.playingA}
          bpmDetect={dj.bpmDetectA}
          bpmManual={dj.bpmManualA}
          setBpmManual={dj.setBpmManualA}
          applyManualBpm={dj.applyManualBpm}
          cues={dj.cuesA}
          onAddCue={dj.addCue}
          onJumpCue={dj.jumpCue}
          loopIn={dj.loopInA}
          loopOut={dj.loopOutA}
          onLoopIn={() => dj.setLoopBracket("A", "in")}
          onLoopOut={() => dj.setLoopBracket("A", "out")}
          onClearLoop={() => dj.clearLoop("A")}
          onLoadClick={() => fileA.current?.click()}
          canLoad
          onPlay={() => dj.playDeck("A")}
          onPause={() => dj.pauseDeck("A")}
          onCue={() => dj.cueDeck("A")}
        />
        <DeckPanel
          deck="B"
          label="DECK B"
          name={dj.nameB}
          wfRef={dj.wfContainerB}
          audioRef={dj.audioB}
          current={dj.currentB}
          duration={dj.durationB}
          playing={dj.playingB}
          bpmDetect={dj.bpmDetectB}
          bpmManual={dj.bpmManualB}
          setBpmManual={dj.setBpmManualB}
          applyManualBpm={dj.applyManualBpm}
          cues={dj.cuesB}
          onAddCue={dj.addCue}
          onJumpCue={dj.jumpCue}
          loopIn={dj.loopInB}
          loopOut={dj.loopOutB}
          onLoopIn={() => dj.setLoopBracket("B", "in")}
          onLoopOut={() => dj.setLoopBracket("B", "out")}
          onClearLoop={() => dj.clearLoop("B")}
          onLoadClick={() => fileB.current?.click()}
          canLoad
          onPlay={() => dj.playDeck("B")}
          onPause={() => dj.pauseDeck("B")}
          onCue={() => dj.cueDeck("B")}
        />
      </div>

      <input
        ref={fileA}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) dj.loadFileToDeck("A", f);
          e.target.value = "";
        }}
      />
      <input
        ref={fileB}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) dj.loadFileToDeck("B", f);
          e.target.value = "";
        }}
      />

      <div style={{ marginTop: 16 }}>
        <MixerBar
          crossfader={dj.crossfader}
          setCrossfader={dj.setCrossfader}
          volA={dj.volA}
          setVolA={dj.setVolA}
          volB={dj.volB}
          setVolB={dj.setVolB}
          onSync={dj.syncBpm}
          compact={isCompact}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <FXRack
          fxTarget={dj.fxTarget}
          setFxTarget={dj.setFxTarget}
          filterMorph={dj.filterMorph}
          setFilterMorph={dj.setFilterMorph}
          echoAmt={dj.echoAmt}
          setEchoAmt={dj.setEchoAmt}
          echoTime={dj.echoTime}
          setEchoTime={dj.setEchoTime}
          echoFb={dj.echoFb}
          setEchoFb={dj.setEchoFb}
          reverbAmt={dj.reverbAmt}
          setReverbAmt={dj.setReverbAmt}
          flangerAmt={dj.flangerAmt}
          setFlangerAmt={dj.setFlangerAmt}
        />
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 16 }}>
        <DJQueue queue={dj.queue} onRemove={dj.removeFromQueue} onAddFiles={dj.addToQueue} autoMix={dj.autoMix} setAutoMix={dj.setAutoMix} canAdd />
        <div
          style={{
            background: "rgba(7,9,15,0.9)",
            border: "1px solid rgba(56,189,248,0.2)",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 12 }}>RECORD & PUBLISH</div>
          <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>
            Records the master output (post crossfader / FX). Use WebM/Opus in-browser; download locally or publish as a mix on your profile.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {!dj.recording ? (
              <button type="button" className="btn btn-primary" style={{ gap: 8 }} onClick={dj.startRecording}>
                <Icon name="mic" size={15} />
                Start recording
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" style={{ borderColor: "var(--red)", color: "var(--red)" }} onClick={dj.stopRecording}>
                Stop recording
              </button>
            )}
            <button type="button" className="btn btn-ghost" disabled={!dj.recordBlob} onClick={() => dj.downloadRecording(`${(mixTitle || "mix").replace(/\s+/g, "-")}.webm`)}>
              <Icon name="download" size={15} />
              Download
            </button>
          </div>
          {dj.recordBlob ? (
            <div style={{ marginBottom: 12, fontSize: 12, color: "var(--text2)" }}>
              Last capture: {(dj.recordBlob.size / (1024 * 1024)).toFixed(2)} MB · {dj.recordBlob.type || "audio"}
            </div>
          ) : null}
          <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>MIX TITLE</label>
          <input
            value={mixTitle}
            onChange={(e) => setMixTitle(e.target.value)}
            disabled={!canPersist}
            style={{
              width: "100%",
              marginBottom: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
            }}
          />
          <button type="button" className="btn btn-primary" disabled={!canPersist || !dj.recordBlob || publishing} style={{ width: "100%", justifyContent: "center" }} onClick={handlePublish}>
            {publishing ? "Publishing…" : "Publish mix to profile"}
          </button>
          {publishMsg ? <p style={{ marginTop: 10, fontSize: 13, color: publishMsg.includes("failed") || publishMsg.includes("Configure") ? "var(--red)" : "var(--green)" }}>{publishMsg}</p> : null}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 8 }}>OPTIONAL NODE + MONGODB API</div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>
              Run <code style={{ color: "var(--accent)" }}>server/</code> and Vite proxy; leave <code>VITE_DJ_API_URL</code> empty to use <code>/api</code>.
            </p>
            <input
              id="dj-api-file"
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f || !canPersist) return;
                setApiMsg("Uploading…");
                const r = await dj.uploadTrackToApi(f);
                setApiMsg(r.ok ? `Uploaded: ${r.storedName || r.id || "ok"}` : r.error);
              }}
            />
            <button type="button" className="btn btn-ghost" style={{ width: "100%" }} disabled={!canPersist} onClick={() => document.getElementById("dj-api-file")?.click()}>
              Upload track to DJ API (Multer)
            </button>
            {apiMsg ? <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 8 }}>{apiMsg}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
