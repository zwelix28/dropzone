import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import Icon from "../components/Icon.jsx";
import FollowButton from "../components/FollowButton.jsx";
import MixCrateCard from "../components/MixCrateCard.jsx";
import ProfileListeningStats from "../components/ProfileListeningStats.jsx";
import TrackCard from "../components/TrackCard.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import { FEATURE_COMMUNITY, signedInHomePath } from "../featureFlags.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { profileRowToUser } from "../lib/maps.js";
import { fmt } from "../lib/format.js";
import { scrollAppMainToTop } from "../lib/scrollAppMain.js";

const MOBILE_MIXES_PAGE_SIZE = 10;

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { auth, episodes, users, player, refreshProfiles } = useApp();
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [remoteUser, setRemoteUser] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [fetchDone, setFetchDone] = useState(false);
  const [mixPage, setMixPage] = useState(1);

  const fromList = useMemo(() => (userId ? users.find((u) => u.id === userId) : null), [users, userId]);
  const fromListId = fromList?.id || null;

  useEffect(() => {
    if (!userId) return;
    if (fromListId) {
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
  }, [userId, fromListId]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;
    const channel = supabase
      .channel(`profile-view-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        async (payload) => {
          const row = payload?.new;
          if (row && !fromListId) {
            setRemoteUser(profileRowToUser(row));
          } else {
            void refreshProfiles();
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, fromListId, refreshProfiles]);

  const profileUser = fromList || remoteUser;

  const usersForCards = useMemo(() => {
    const pu = fromList || remoteUser;
    if (!pu) return users;
    if (users.some((u) => u.id === pu.id)) return users;
    return [...users, pu];
  }, [users, fromList, remoteUser]);

  const userEps = useMemo(
    () => (profileUser ? episodes.filter((e) => e.userId === profileUser.id) : []),
    [episodes, profileUser],
  );
  const totalMixPages = isCompact
    ? Math.max(1, Math.ceil(userEps.length / MOBILE_MIXES_PAGE_SIZE))
    : 1;

  useEffect(() => {
    setMixPage(1);
  }, [profileUser?.id, isCompact, userEps.length]);

  useEffect(() => {
    if (mixPage > totalMixPages) setMixPage(totalMixPages);
  }, [mixPage, totalMixPages]);

  const visibleMixes = useMemo(() => {
    if (!isCompact) return userEps;
    const start = (mixPage - 1) * MOBILE_MIXES_PAGE_SIZE;
    return userEps.slice(start, start + MOBILE_MIXES_PAGE_SIZE);
  }, [userEps, isCompact, mixPage]);

  const goMixPage = (next) => {
    setMixPage(next);
    scrollAppMainToTop({ smooth: true });
  };

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
        <div style={{ marginTop: 16 }}>
          <BackButton to="/home" label="Home" />
        </div>
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
        <BackButton to="/home" label="Home" />
      </div>
    );
  }

  const avatarSize = isCompact ? 80 : 108;
  const pagePad = isCompact ? "16px 12px" : "32px 36px";
  const rangeStart = userEps.length === 0 ? 0 : (mixPage - 1) * MOBILE_MIXES_PAGE_SIZE + 1;
  const rangeEnd = Math.min(userEps.length, mixPage * MOBILE_MIXES_PAGE_SIZE);

  return (
    <div className="fade-in" style={{ padding: pagePad, paddingBottom: 120 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: isCompact ? 12 : 16 }}>
          <BackButton
            to={FEATURE_COMMUNITY ? "/community" : signedInHomePath()}
            label={FEATURE_COMMUNITY ? "Community" : "Back"}
          />
        </div>

        {isCompact ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <UserAvatar
                user={profileUser}
                size={avatarSize}
                expandable
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
              expandable
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

        {profileUser.bio ? (
          <p
            style={{
              color: "var(--text2)",
              maxWidth: 600,
              marginBottom: isCompact ? 16 : 20,
              lineHeight: 1.65,
              fontSize: isCompact ? 13 : 15,
            }}
          >
            {profileUser.bio}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: isCompact ? 6 : 8,
            marginBottom: isCompact ? 18 : 22,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {profileUser.genre ? (
            <span className="tag tag-blue" style={{ fontSize: isCompact ? 11 : 12 }}>
              {profileUser.genre}
            </span>
          ) : null}
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: isCompact ? 12 : 13, color: "var(--text3)" }}>
            <Icon name="people" size={isCompact ? 12 : 14} color="var(--text3)" />
            {fmt(profileUser.followers)} followers
          </span>
          <span style={{ fontSize: isCompact ? 12 : 13, color: "var(--text3)" }}>· {fmt(profileUser.following)} following</span>
        </div>

        <ProfileListeningStats user={profileUser} episodes={episodes} compact={isCompact} />

        {userEps.length > 0 ? (
          <>
            <h2
              style={{
                fontWeight: 700,
                margin: isCompact ? "22px 0 12px" : "28px 0 16px",
                fontSize: isCompact ? 15 : 17,
              }}
            >
              Mixes
              <span style={{ color: "var(--text3)", fontWeight: 500, marginLeft: 8, fontSize: isCompact ? 12 : 14 }}>
                {userEps.length}
              </span>
            </h2>
            {isCompact && totalMixPages > 1 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 10,
                  fontSize: 11,
                  color: "var(--text3)",
                }}
              >
                <span>
                  Showing {rangeStart}–{rangeEnd} of {userEps.length}
                </span>
                <span>
                  Page {mixPage} of {totalMixPages}
                </span>
              </div>
            ) : null}

            <div
              className={isCompact ? undefined : "profile-mixes-crate-grid"}
              style={
                isCompact
                  ? {
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: 8,
                    }
                  : undefined
              }
            >
              {visibleMixes.map((ep) =>
                isCompact ? (
                  <TrackCard
                    key={ep.id}
                    episode={ep}
                    users={usersForCards}
                    compact
                    layout="row"
                    isActive={player.currentTrack?.id === ep.id}
                    isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
                    onPlay={player.playTrack}
                  />
                ) : (
                  <MixCrateCard
                    key={ep.id}
                    episode={ep}
                    isActive={player.currentTrack?.id === ep.id}
                    isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
                    onPlay={player.playTrack}
                    onOpen={(mix) =>
                      navigate(`/mix/${mix.id}`, { state: { from: `/user/${userId}` } })
                    }
                  />
                ),
              )}
            </div>

            {isCompact && totalMixPages > 1 ? (
              <nav className="mixes-pager" aria-label="Mixes pages">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={mixPage <= 1}
                  onClick={() => goMixPage(Math.max(1, mixPage - 1))}
                >
                  <Icon name="chevronLeft" size={16} />
                  Previous
                </button>
                <div className="mixes-pager-pages">
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>
                    {mixPage} / {totalMixPages}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={mixPage >= totalMixPages}
                  onClick={() => goMixPage(Math.min(totalMixPages, mixPage + 1))}
                >
                  Next
                </button>
              </nav>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
