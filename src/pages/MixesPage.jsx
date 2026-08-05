import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import TrackCard from "../components/TrackCard.jsx";
import { GENRES } from "../constants/genres.js";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isMixesItem } from "../lib/contentType.js";

/** Full-length mixes. Singles / songs live on Discover. */
export default function MixesPage() {
  const { episodes, users, player } = useApp();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const isCompact = useMediaQuery("(max-width: 720px)");

  const [genre, setGenre] = useState("All");

  const filtered = useMemo(() => {
    return episodes.filter((ep) => {
      if (!isMixesItem(ep)) return false;
      const user = users.find((u) => u.id === ep.userId);
      const matchesGenre = genre === "All" || ep.genre === genre;
      const matchesSearch =
        !q ||
        ep.title.toLowerCase().includes(q.toLowerCase()) ||
        (user?.username || "").toLowerCase().includes(q.toLowerCase());
      return matchesGenre && matchesSearch;
    });
  }, [episodes, users, genre, q]);

  return (
    <div
      className="fade-in"
      style={{
        padding: isCompact ? "16px 12px" : "32px 36px",
        paddingBottom: 100,
      }}
    >
      <PageHeader title="MIXES" large marginBottom={12} />
      <p
        style={{
          margin: `0 0 ${isCompact ? 16 : 28}px`,
          color: "var(--text2)",
          fontSize: isCompact ? 13 : 14,
          maxWidth: 520,
          lineHeight: 1.5,
        }}
      >
        Full-length mixes and sessions. Singles are on Discover.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: isCompact ? 16 : 28, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: isCompact ? 6 : 6, flexWrap: "wrap" }}>
          {["All", ...GENRES.slice(0, 6)].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(g)}
              style={{
                padding: isCompact ? "6px 10px" : "8px 14px",
                borderRadius: 8,
                fontSize: isCompact ? 12 : 13,
                fontWeight: 500,
                background: genre === g ? "var(--accent2)" : "var(--surface)",
                color: genre === g ? "#07090F" : "var(--text2)",
                border: genre === g ? "none" : "1px solid var(--border)",
                transition: "all 0.18s",
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text3)" }}>
          <Icon name="music" size={40} color="var(--text3)" />
          <p style={{ marginTop: 12 }}>No mixes found</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(auto-fill, minmax(220px, 1fr))",
            gap: isCompact ? 10 : 16,
          }}
        >
          {filtered.map((ep) => (
            <TrackCard
              key={ep.id}
              episode={ep}
              users={users}
              isActive={player.currentTrack?.id === ep.id}
              isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
              onPlay={player.playTrack}
              compact={isCompact}
            />
          ))}
        </div>
      )}
    </div>
  );
}
