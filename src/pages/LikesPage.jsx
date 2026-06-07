import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
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
      <PageHeader icon="heart" title="LIKES" />

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
