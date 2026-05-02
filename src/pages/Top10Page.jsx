import { useMemo, useState } from "react";
import Icon from "../components/Icon.jsx";
import TrackCard from "../components/TrackCard.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import WaveAnim from "../components/WaveAnim.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { fmt } from "../lib/format.js";

export default function Top10Page() {
  const { episodes, users, player } = useApp();
  const [tab, setTab] = useState("downloads");
  const isCompact = useMediaQuery("(max-width: 720px)");

  const sorted = useMemo(() => {
    return [...episodes].sort((a, b) =>
      tab === "downloads" ? b.downloads - a.downloads : b.plays - a.plays,
    );
  }, [episodes, tab]);

  const top10 = sorted.slice(0, 10);

  if (isCompact) {
    return (
      <div className="fade-in" style={{ padding: "16px 12px", paddingBottom: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Icon name="award" size={22} color="var(--accent)" />
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 28, letterSpacing: "0.04em" }}>TOP 10</h1>
        </div>
        <p style={{ color: "var(--text2)", marginBottom: 16, fontSize: 13 }}>
          The most downloaded and played mixes on Dropzone
        </p>

        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--surface)",
            borderRadius: 10,
            padding: 4,
            width: "100%",
            maxWidth: "100%",
            marginBottom: 16,
          }}
        >
          {[
            ["downloads", "Downloads"],
            ["plays", "Plays"],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setTab(val)}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: tab === val ? "var(--accent2)" : "transparent",
                color: tab === val ? "#07090F" : "var(--text2)",
                transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {top10.map((ep, i) => (
            <div key={ep.id} style={{ position: "relative" }}>
              <div
                className={i < 3 ? "rank-num top3" : "rank-num"}
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  zIndex: 3,
                  fontSize: 22,
                  minWidth: 36,
                  textAlign: "center",
                  textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                  pointerEvents: "none",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <TrackCard
                episode={ep}
                users={users}
                isActive={player.currentTrack?.id === ep.id}
                isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
                onPlay={player.playTrack}
                compact
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: "32px 36px", paddingBottom: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Icon name="award" size={24} color="var(--accent)" />
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 40, letterSpacing: "0.04em" }}>TOP 10</h1>
      </div>
      <p style={{ color: "var(--text2)", marginBottom: 28 }}>
        The most downloaded and played mixes on Dropzone
      </p>

      <div
        style={{
          display: "flex",
          gap: 4,
          background: "var(--surface)",
          borderRadius: 10,
          padding: 4,
          width: "fit-content",
          marginBottom: 32,
        }}
      >
        {[
          ["downloads", "Most Downloaded"],
          ["plays", "Most Played"],
        ].map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setTab(val)}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: tab === val ? "var(--accent2)" : "transparent",
              color: tab === val ? "#07090F" : "var(--text2)",
              transition: "all 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {top10.map((ep, i) => {
          const user = users.find((u) => u.id === ep.userId);
          const active = player.currentTrack?.id === ep.id;
          return (
            <div
              key={ep.id}
              role="button"
              tabIndex={0}
              onClick={() => player.playTrack(ep)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  player.playTrack(ep);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: active ? "rgba(56,189,248,0.07)" : "var(--surface)",
                border: active ? "1px solid rgba(56,189,248,0.3)" : "1px solid var(--border)",
                borderRadius: 12,
                padding: "12px 16px",
                cursor: "pointer",
                transition: "all 0.2s",
                animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.borderColor = "rgba(56,189,248,0.2)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <div className={`rank-num ${i < 3 ? "top3" : ""}`}>{String(i + 1).padStart(2, "0")}</div>
              <img src={ep.coverUrl} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ep.title}
                </div>
                {user && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--text2)" }}>{user.username}</span>
                    {user.verified ? <VerifiedBadge size={12} /> : null}
                    <span className="tag tag-blue" style={{ fontSize: 10, padding: "2px 7px" }}>
                      {ep.genre}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 24, textAlign: "right", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: tab === "downloads" ? "var(--accent)" : "var(--text)" }}>
                    {fmt(ep.downloads)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>Downloads</div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: tab === "plays" ? "var(--accent)" : "var(--text)" }}>
                    {fmt(ep.plays)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>Plays</div>
                </div>
                <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {active ? <WaveAnim active={player.isPlaying} /> : <Icon name="play" size={18} color="var(--text3)" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
