import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import TrackCard from "../components/TrackCard.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import FollowButton from "../components/FollowButton.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { profileRowToUser } from "../lib/maps.js";
import { fmt } from "../lib/format.js";

export default function UserProfilePage() {
  const { userId } = useParams();
  const { auth, episodes, users, player, refreshProfiles } = useApp();
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [remoteUser, setRemoteUser] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [fetchDone, setFetchDone] = useState(false);
  const [mutualFollow, setMutualFollow] = useState(false);

  const fromList = useMemo(() => (userId ? users.find((u) => u.id === userId) : null), [users, userId]);

  useEffect(() => {
    if (!userId) return;
    if (fromList) {
      setRemoteUser(null);
      setLoadError(null);
      setFetchDone(true);
      return;
    }
    let cancelled = false;
    setFetchDone(false);
    if (!isSupabaseConfigured()) {
      setRemoteUser(null);
      setLoadError(null);
      setFetchDone(true);
      return;
    }
    (async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setRemoteUser(null);
      } else {
        setLoadError(null);
        setRemoteUser(data ? profileRowToUser(data) : null);
      }
      setFetchDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, fromList]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;
    const channel = supabase
      .channel(`profile-view-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => void refreshProfiles(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refreshProfiles]);

  useEffect(() => {
    const uid = auth.session?.user?.id;
    const pid = fromList?.id || remoteUser?.id;
    if (!uid || !pid || uid === pid || !isSupabaseConfigured()) {
      setMutualFollow(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
        supabase.from("follows").select("follower_id").eq("follower_id", uid).eq("following_id", pid).maybeSingle(),
        supabase.from("follows").select("follower_id").eq("follower_id", pid).eq("following_id", uid).maybeSingle(),
      ]);
      if (!cancelled) setMutualFollow(Boolean(iFollow && theyFollow));
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.session?.user?.id, fromList?.id, remoteUser?.id]);

  const profileUser = fromList || remoteUser;

  const usersForCards = useMemo(() => {
    const pu = fromList || remoteUser;
    if (!pu) return users;
    if (users.some((u) => u.id === pu.id)) return users;
    return [...users, pu];
  }, [users, fromList, remoteUser]);

  if (auth.currentUser?.id && userId === auth.currentUser.id) {
    return <Navigate to="/profile" replace />;
  }

  if (!userId) {
    return <Navigate to={auth.session?.user?.id ? "/discover" : "/"} replace />;
  }

  if (!profileUser && loadError) {
    return (
      <div className="fade-in" style={{ padding: isCompact ? "16px 12px" : "32px 36px" }}>
        <p style={{ color: "var(--red)", fontSize: isCompact ? 14 : 15 }}>{loadError}</p>
        <Link to="/discover" className="btn btn-ghost" style={{ marginTop: 16 }}>
          Back to Discover
        </Link>
      </div>
    );
  }

  if (!profileUser && !fetchDone) {
    return (
      <div className="fade-in" style={{ padding: isCompact ? "32px 16px" : "48px 36px", textAlign: "center", color: "var(--text2)", fontSize: isCompact ? 14 : 15 }}>
        Loading…
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="fade-in" style={{ padding: isCompact ? "32px 16px" : "48px 36px", textAlign: "center" }}>
        <h2 style={{ marginBottom: 8, fontSize: isCompact ? 20 : 24 }}>User not found</h2>
        <p style={{ color: "var(--text2)", marginBottom: 20, fontSize: isCompact ? 14 : 15 }}>
          This account doesn’t exist or is no longer available.
        </p>
        <Link to="/discover" className="btn btn-ghost">
          Discover mixes
        </Link>
      </div>
    );
  }

  const userEps = episodes.filter((e) => e.userId === profileUser.id);
  const totalDownloads = userEps.reduce((s, e) => s + e.downloads, 0);
  const totalPlays = userEps.reduce((s, e) => s + e.plays, 0);
  const avatarSize = isCompact ? 80 : 108;

  const statTiles = [
    { label: "Mixes", value: userEps.length, icon: "music" },
    { label: "Total Plays", value: fmt(totalPlays), icon: "headphones" },
    { label: "Downloads", value: fmt(totalDownloads), icon: "download" },
    { label: "Followers", value: fmt(profileUser.followers), icon: "people" },
  ];

  return (
    <div className="fade-in" style={{ paddingBottom: 100 }}>
      <div style={{ padding: isCompact ? "16px 12px 0" : "32px 36px 0" }}>
        <div style={{ marginBottom: isCompact ? 12 : 16 }}>
          <Link to="/discover" style={{ color: "var(--text2)", fontSize: isCompact ? 12 : 13 }}>
            ← Back
          </Link>
        </div>

        {isCompact ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <UserAvatar
                user={profileUser}
                size={avatarSize}
                style={{
                  border: "3px solid var(--bg)",
                  boxShadow: "0 0 0 2px var(--accent2)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{profileUser.username}</h1>
                  {profileUser.verified ? (
                    <>
                      <VerifiedBadge size={16} />
                      <span className="tag tag-green" style={{ fontSize: 9 }}>
                        Verified artist
                      </span>
                    </>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)" }}>
                  {profileUser.handle} · {profileUser.location}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <FollowButton
                targetUserId={profileUser.id}
                variant="compact"
                style={{ flex: 1, minWidth: 120, justifyContent: "center" }}
              />
              {null}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
            <UserAvatar
              user={profileUser}
              size={avatarSize}
              style={{
                border: "4px solid var(--bg)",
                boxShadow: "0 0 0 2px var(--accent2)",
              }}
            />
            <div style={{ flex: 1, paddingBottom: 8, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>{profileUser.username}</h1>
                {profileUser.verified ? (
                  <>
                    <VerifiedBadge size={18} />
                    <span className="tag tag-green" style={{ fontSize: 11 }}>
                      Verified artist
                    </span>
                  </>
                ) : null}
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>
                {profileUser.handle} · {profileUser.location}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <FollowButton targetUserId={profileUser.id} />
              {null}
            </div>
          </div>
        )}

        <p
          style={{
            color: "var(--text2)",
            maxWidth: 600,
            marginBottom: isCompact ? 16 : 24,
            lineHeight: 1.65,
            fontSize: isCompact ? 13 : 15,
          }}
        >
          {profileUser.bio}
        </p>

        <div
          style={{
            display: "flex",
            gap: isCompact ? 6 : 8,
            marginBottom: isCompact ? 18 : 28,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span className="tag tag-blue" style={{ fontSize: isCompact ? 11 : 12 }}>
            {profileUser.genre}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: isCompact ? 12 : 13, color: "var(--text3)" }}>
            <Icon name="people" size={isCompact ? 12 : 14} color="var(--text3)" />
            {fmt(profileUser.followers)} followers
          </span>
          <span style={{ fontSize: isCompact ? 12 : 13, color: "var(--text3)" }}>· {fmt(profileUser.following)} following</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(4, 1fr)",
            gap: isCompact ? 6 : 8,
            marginBottom: isCompact ? 16 : 24,
          }}
        >
          {statTiles.map((s) => (
            <div
              key={s.label}
              className="stat-card"
              style={{
                textAlign: "center",
                padding: isCompact ? "6px 8px" : "10px 12px",
                borderRadius: isCompact ? 8 : 10,
              }}
            >
              <Icon name={s.icon} size={isCompact ? 10 : 12} color="var(--accent)" />
              <div
                style={{
                  fontSize: isCompact ? 11 : 12,
                  fontWeight: 800,
                  marginTop: isCompact ? 3 : 4,
                  fontFamily: "var(--ff-mono)",
                  lineHeight: 1.1,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 1, lineHeight: 1.2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fill, minmax(220px, 1fr))",
            gap: isCompact ? 10 : 16,
          }}
        >
          {userEps.map((ep) => (
            <TrackCard
              key={ep.id}
              episode={ep}
              users={usersForCards}
              compact={isCompact}
              isActive={player.currentTrack?.id === ep.id}
              isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
              onPlay={player.playTrack}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
