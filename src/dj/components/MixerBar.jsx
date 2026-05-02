export default function MixerBar({ crossfader, setCrossfader, volA, setVolA, volB, setVolB, onSync, compact }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(26,34,53,0.95), rgba(12,16,24,0.98))",
        border: "1px solid rgba(56,189,248,0.2)",
        borderRadius: 14,
        padding: "18px 20px",
        display: "grid",
        gap: 18,
        gridTemplateColumns: compact ? "1fr" : "1fr auto 1fr",
        alignItems: "center",
      }}
    >
      <div>
        <label style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.12em", display: "block", marginBottom: 6 }}>DECK A LEVEL</label>
        <input type="range" min={0} max={1} step={0.01} value={volA} onChange={(e) => setVolA(Number(e.target.value))} style={{ width: "100%", accentColor: "#34d399" }} />
      </div>

      <div style={{ textAlign: "center", minWidth: 200 }}>
        <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.15em", marginBottom: 8 }}>CROSSFADER</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
          <span style={{ fontSize: 10, color: "#34d399", fontWeight: 700 }}>A</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={crossfader}
            onChange={(e) => setCrossfader(Number(e.target.value))}
            style={{ width: 140, accentColor: "#38bdf8" }}
          />
          <span style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700 }}>B</span>
        </div>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 12, fontSize: 12, padding: "6px 14px" }} onClick={onSync}>
          Sync BPM (B → A)
        </button>
      </div>

      <div>
        <label style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.12em", display: "block", marginBottom: 6 }}>DECK B LEVEL</label>
        <input type="range" min={0} max={1} step={0.01} value={volB} onChange={(e) => setVolB(Number(e.target.value))} style={{ width: "100%", accentColor: "#38bdf8" }} />
      </div>
    </div>
  );
}
