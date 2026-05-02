import Icon from "../../components/Icon.jsx";

function formatTime(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const deckStyle = {
  background: "linear-gradient(165deg, rgba(17,24,39,0.98) 0%, rgba(7,9,15,0.99) 100%)",
  border: "1px solid rgba(52,211,153,0.18)",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 0 40px rgba(52,211,153,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
};

export default function DeckPanel({
  deck,
  label,
  name,
  wfRef,
  audioRef,
  current,
  duration,
  playing,
  bpmDetect,
  bpmManual,
  setBpmManual,
  applyManualBpm,
  cues,
  onAddCue,
  onJumpCue,
  loopIn,
  loopOut,
  onLoopIn,
  onLoopOut,
  onClearLoop,
  onLoadClick,
  canLoad,
  onPlay,
  onPause,
  onCue,
}) {
  return (
    <div style={deckStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span
          style={{
            fontFamily: "var(--ff-display)",
            fontSize: 22,
            letterSpacing: "0.12em",
            color: "#34d399",
            textShadow: "0 0 18px rgba(52,211,153,0.35)",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 11, color: "var(--text3)", maxWidth: "55%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name || "No track"}
        </span>
      </div>

      <div ref={wfRef} style={{ minHeight: 76, borderRadius: 8, background: "rgba(0,0,0,0.35)", marginBottom: 12 }} />

      <audio ref={audioRef} crossOrigin="anonymous" preload="metadata" style={{ display: "none" }} />

      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--ff-mono)", fontSize: 12, color: "var(--text2)", marginBottom: 10 }}>
        <span>{formatTime(current)}</span>
        <span>
          {bpmDetect ? `~${Math.round(bpmDetect)} BPM` : "— BPM"} · {formatTime(duration)}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <button type="button" className="btn btn-primary" style={{ padding: "8px 14px", gap: 6 }} onClick={onPlay} disabled={!name}>
          <Icon name="play" size={14} />
          Play
        </button>
        <button type="button" className="btn btn-ghost" style={{ padding: "8px 14px", gap: 6 }} onClick={onPause}>
          <Icon name="pause" size={14} />
          Pause
        </button>
        <button type="button" className="btn btn-ghost" style={{ padding: "8px 14px", gap: 6 }} onClick={onCue}>
          Cue
        </button>
        <button type="button" className="btn btn-ghost" style={{ padding: "8px 14px" }} onClick={onLoadClick} disabled={!canLoad}>
          Load file
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>TEMPO (manual BPM)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="range"
            min={90}
            max={150}
            value={Math.round(bpmManual || 120)}
            onChange={(e) => {
              const v = Number(e.target.value);
              setBpmManual(v);
              applyManualBpm(deck, v);
            }}
            style={{ flex: 1, accentColor: "#34d399" }}
          />
          <input
            type="number"
            min={80}
            max={180}
            value={Math.round(bpmManual || 120)}
            onChange={(e) => {
              const v = Number(e.target.value) || 120;
              setBpmManual(v);
              applyManualBpm(deck, v);
            }}
            style={{
              width: 56,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              padding: "6px 8px",
              fontFamily: "var(--ff-mono)",
              fontSize: 13,
            }}
          />
        </div>
        <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 6 }}>
          Playback uses rate change (vinyl-style pitch shift). Detected BPM is a hint only.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--text3)", width: "100%", letterSpacing: "0.08em" }}>HOT CUES</span>
        {cues.map((t, i) => (
          <button key={`${t}-${i}`} type="button" className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11, fontFamily: "var(--ff-mono)" }} onClick={() => onJumpCue(deck, t)}>
            {i + 1}
          </button>
        ))}
        <button type="button" className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => onAddCue(deck)} disabled={!name}>
          + Cue
        </button>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.08em" }}>LOOP</span>
        <button type="button" className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => onLoopIn(deck)}>
          In
        </button>
        <button type="button" className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => onLoopOut(deck)}>
          Out
        </button>
        <button type="button" className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => onClearLoop(deck)}>
          Clear
        </button>
        <span style={{ fontSize: 10, color: "var(--text2)", fontFamily: "var(--ff-mono)" }}>
          {loopIn != null && loopOut != null ? `${formatTime(loopIn)} → ${formatTime(loopOut)}` : "—"}
        </span>
      </div>
    </div>
  );
}
