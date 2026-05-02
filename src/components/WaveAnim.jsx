export default function WaveAnim({ active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 22 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="wave-bar"
          style={{
            animationPlayState: active ? "running" : "paused",
            height: active ? undefined : "4px",
            opacity: active ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

