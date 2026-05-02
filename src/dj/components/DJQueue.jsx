import Icon from "../../components/Icon.jsx";

export default function DJQueue({ queue, onRemove, onAddFiles, autoMix, setAutoMix, canAdd }) {
  return (
    <div
      style={{
        background: "rgba(12,16,24,0.95)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text2)" }}>PLAYLIST / AUTO MIX</span>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text2)", cursor: "pointer" }}>
          <input type="checkbox" checked={autoMix} onChange={(e) => setAutoMix(e.target.checked)} style={{ accentColor: "#34d399" }} />
          Auto mix
        </label>
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>
        Queue tracks for automatic blends. When the outgoing deck nears the end, the next track loads on the inactive deck with a beat-matched crossfade.
      </p>
      <button type="button" className="btn btn-ghost" style={{ marginBottom: 12, gap: 8 }} onClick={() => document.getElementById("dj-queue-input")?.click()} disabled={!canAdd}>
        <Icon name="plus" size={15} />
        Add to queue
      </button>
      <input
        id="dj-queue-input"
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          onAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <ul style={{ listStyle: "none", maxHeight: 200, overflowY: "auto" }}>
        {queue.length === 0 ? (
          <li style={{ color: "var(--text3)", fontSize: 13, padding: "8px 0" }}>Queue is empty.</li>
        ) : (
          queue.map((item) => (
            <li
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--surface)",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
              <button type="button" className="btn btn-ghost" style={{ padding: "4px 8px", flexShrink: 0 }} onClick={() => onRemove(item.id)}>
                <Icon name="x" size={14} />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
