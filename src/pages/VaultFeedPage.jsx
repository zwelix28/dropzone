import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import TrackCard from "../components/TrackCard.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import { resolveDhlabUserId } from "../constants/dhlab.js";
import { fetchFollowingWithProfiles } from "../lib/followLists.js";
import { buildVaultFeed } from "../lib/vaultFeed.js";
import { fmt } from "../lib/format.js";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import useMediaQuery from "../hooks/useMediaQuery.js";

function formatFeedTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function VaultFeedPage() {
  const navigate = useNavigate();
  const { auth, episodes, users, player } = useApp();
  const uid = auth.session?.user?.id;
  const isCompact = useMediaQuery("(max-width: 720px)");

  const [followingIds, setFollowingIds] = useState(null);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFollowing = useCallback(async () => {
    if (!uid || !isSupabaseConfigured()) {
      setFollowingIds(new Set());
      setFollowingCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchFollowingWithProfiles(uid);
      const ids = new Set(list.map((row) => row.user?.id).filter(Boolean));
      setFollowingIds(ids);
      setFollowingCount(ids.size);
    } catch (e) {
      setError(e?.message || String(e));
      setFollowingIds(new Set());
      setFollowingCount(0);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void loadFollowing();
  }, [loadFollowing]);

  const dhlabUserId = useMemo(() => resolveDhlabUserId(users, episodes), [users, episodes]);

  const feed = useMemo(() => {
    try {
      return buildVaultFeed({
        episodes,
        followingIds: followingIds ?? new Set(),
        dhlabUserId,
        viewerUserId: uid,
      });
    } catch (e) {
      console.error("buildVaultFeed", e);
      return [];
    }
  }, [episodes, followingIds, dhlabUserId, uid]);

  if (auth.authLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text2)", fontSize: 14 }}>Loading your feed…</div>
    );
  }

  if (!uid) {
    return <Navigate to="/discover" replace />;
  }

  const showLoading = loading || followingIds === null;

  const pagePad = isCompact ? "16px 12px" : "32px 36px";

  return (
    <div className="fade-in" style={{ padding: pagePad, paddingBottom: 120 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader icon="list" title="VAULT FEED" />

        {error ? (
          <div
            style={{
              padding: "14px 16px",
              marginBottom: 20,
              borderRadius: 10,
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "var(--red)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        {showLoading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text3)", fontSize: 14 }}>Loading your feed…</div>
        ) : feed.length === 0 ? (
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
            <Icon name="music" size={36} color="var(--text3)" />
            <p style={{ color: "var(--text2)", fontSize: isCompact ? 14 : 15, margin: "16px 0", lineHeight: 1.6 }}>
              {followingCount === 0
                ? "Follow DJs and artists to personalize your feed. Deep House Lab releases will appear here as they publish."
                : "No releases yet from the artists you follow. Check back when they upload new mixes."}
            </p>
            <Link to="/discover" className="btn btn-ghost">
              {followingCount === 0 ? "Discover artists" : "Explore more on Discover"}
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: isCompact ? 18 : 22 }}>
            {followingCount === 0 ? (
              <p style={{ color: "var(--text3)", fontSize: isCompact ? 12 : 13, margin: "0 0 4px", lineHeight: 1.5 }}>
                Featuring Deep House Lab — follow more artists on Discover to grow your feed.
              </p>
            ) : null}
            {feed.map((ep) => {
              const artist = users.find((u) => u.id === ep.userId);
              return (
                <article
                  key={ep.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: isCompact ? 12 : 14,
                    padding: isCompact ? 12 : 16,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => artist && navigate(`/user/${artist.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      marginBottom: isCompact ? 10 : 12,
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      textAlign: "left",
                      color: "inherit",
                    }}
                  >
                    <UserAvatar user={artist} size={isCompact ? 34 : 40} showVerified={false} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: isCompact ? 14 : 15, color: "var(--text)" }}>
                          {artist?.username || "Artist"}
                        </span>
                        {artist?.verified ? <VerifiedBadge size={isCompact ? 13 : 14} /> : null}
                      </div>
                      <div
                        style={{
                          fontSize: isCompact ? 11 : 12,
                          color: "var(--text3)",
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {artist?.handle ? <span style={{ color: "var(--accent)" }}>{artist.handle}</span> : null}
                        {artist?.handle ? <span>·</span> : null}
                        <span>{formatFeedTime(ep.createdAt)}</span>
                      </div>
                    </div>
                  </button>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: isCompact ? 8 : 10,
                      fontSize: isCompact ? 11 : 12,
                      color: "var(--text3)",
                      fontWeight: 600,
                    }}
                  >
                    <Icon name="heart" size={isCompact ? 13 : 14} color="#f87171" />
                    <span>
                      {fmt(ep.likesCount ?? 0)} {(ep.likesCount ?? 0) === 1 ? "like" : "likes"}
                    </span>
                  </div>

                  <TrackCard
                    episode={ep}
                    users={users}
                    compact={isCompact}
                    isActive={player.currentTrack?.id === ep.id}
                    isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
                    onPlay={player.playTrack}
                  />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
