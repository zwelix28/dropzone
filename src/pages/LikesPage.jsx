import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import TrackCard from "../components/TrackCard.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";

export default function LikesPage() {
  const { auth, episodes, users, player, likedMixIds } = useApp();
  const isCompact = useMediaQuery("(max-width: 720px)");

  const favoriteEpisodes = useMemo(() => {
    const byId = new Map(episodes.map((e) => [e.id, e]));
    return likedMixIds.map((id) => byId.get(id)).filter(Boolean);
  }, [likedMixIds, episodes]);

  if (!auth.session?.user?.id) {
    return <Navigate to="/discover" replace />;
  }

  return (
    <div className="fade-in" style={{ padding: isCompact ? "16px 12px" : "32px 36px", paddingBottom: 120 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Icon name="heart" size={isCompact ? 22 : 26} color="var(--accent)" />
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: isCompact ? 26 : 32, letterSpacing: "0.04em", margin: 0 }}>
          LIKES
        </h1>
      </div>
      <p style={{ color: "var(--text2)", marginBottom: isCompact ? 18 : 24, fontSize: isCompact ? 13 : 15, maxWidth: 520, lineHeight: 1.55 }}>
        Mixes you’ve saved. Tap a card to play — use the heart on any mix to add or remove it from this list.
      </p>

      {favoriteEpisodes.length === 0 ? (
        <div
          style={{
            padding: isCompact ? "28px 16px" : "40px 24px",
            textAlign: "center",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            maxWidth: 420,
          }}
        >
          <p style={{ color: "var(--text3)", fontSize: isCompact ? 14 : 15, marginBottom: 16, lineHeight: 1.6 }}>
            No likes yet. Explore Discover and tap the heart on mixes you want to replay anytime.
          </p>
          <Link to="/discover" className="btn btn-primary" style={isCompact ? { width: "100%", justifyContent: "center" } : undefined}>
            Go to Discover
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fill, minmax(220px, 1fr))",
            gap: isCompact ? 10 : 16,
          }}
        >
          {favoriteEpisodes.map((ep) => (
            <TrackCard
              key={ep.id}
              episode={ep}
              users={users}
              compact={isCompact}
              isActive={player.currentTrack?.id === ep.id}
              isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
              onPlay={player.playTrack}
            />
          ))}
        </div>
      )}
    </div>
  );
}
