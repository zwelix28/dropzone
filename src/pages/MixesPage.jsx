import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import TrackCard from "../components/TrackCard.jsx";
import { GENRES } from "../constants/genres.js";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isMixesItem } from "../lib/contentType.js";

const CHIP_GENRES = ["All", ...GENRES.slice(0, 6)];

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
      <PageHeader title="MIXES" large marginBottom={isCompact ? 16 : 28} />

      <div className="lab-home-chips" role="tablist" aria-label="Genres" style={{ marginBottom: isCompact ? 16 : 28 }}>
        {CHIP_GENRES.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={genre === name}
            className={`lab-home-chip${genre === name ? " is-on" : ""}`}
            onClick={() => setGenre(name)}
          >
            {name}
          </button>
        ))}
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
              ? "1fr"
              : "repeat(auto-fill, minmax(176px, 1fr))",
            gap: isCompact ? 8 : 14,
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
              layout={isCompact ? "row" : "stack"}
              fullTitle={!isCompact}
            />
          ))}
        </div>
      )}
    </div>
  );
}
