export default function FXRack({
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
}) {
  return (
    <div
      style={{
        background: "rgba(7,9,15,0.9)",
        border: "1px solid rgba(52,211,153,0.15)",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "var(--text3)", marginBottom: 14 }}>FX (per deck)</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["A", "B"].map((d) => (
          <button
            key={d}
            type="button"
            className="btn"
            onClick={() => setFxTarget(d)}
            style={{
              padding: "6px 16px",
              fontSize: 12,
              background: fxTarget === d ? "rgba(52,211,153,0.2)" : "var(--surface)",
              border: fxTarget === d ? "1px solid #34d399" : "1px solid var(--border)",
              color: fxTarget === d ? "#34d399" : "var(--text2)",
            }}
          >
            Deck {d}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
        <div>
          <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>FILTER (LP ← → HP)</label>
          <input type="range" min={-1} max={1} step={0.02} value={filterMorph} onChange={(e) => setFilterMorph(Number(e.target.value))} style={{ width: "100%", accentColor: "#a7f3d0" }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>ECHO / DELAY</label>
          <input type="range" min={0} max={1} step={0.01} value={echoAmt} onChange={(e) => setEchoAmt(Number(e.target.value))} style={{ width: "100%", accentColor: "#34d399" }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>DELAY TIME</label>
          <input type="range" min={0} max={1} step={0.01} value={echoTime} onChange={(e) => setEchoTime(Number(e.target.value))} style={{ width: "100%", accentColor: "#6ee7b7" }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>DELAY FEEDBACK</label>
          <input type="range" min={0} max={1} step={0.01} value={echoFb} onChange={(e) => setEchoFb(Number(e.target.value))} style={{ width: "100%", accentColor: "#6ee7b7" }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>REVERB</label>
          <input type="range" min={0} max={1} step={0.01} value={reverbAmt} onChange={(e) => setReverbAmt(Number(e.target.value))} style={{ width: "100%", accentColor: "#38bdf8" }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4 }}>FLANGER</label>
          <input type="range" min={0} max={1} step={0.01} value={flangerAmt} onChange={(e) => setFlangerAmt(Number(e.target.value))} style={{ width: "100%", accentColor: "#7dd3fc" }} />
        </div>
      </div>
    </div>
  );
}
