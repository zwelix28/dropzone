import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import TrackCard from "../components/TrackCard.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { fmt } from "../lib/format.js";

export default function ProfilePage() {
  const { auth, episodes, users, player } = useApp();
  const user = auth.currentUser;
  const isCompact = useMediaQuery("(max-width: 720px)");

  if (!user) {
    return (
      <div
        className="fade-in"
        style={{
          padding: isCompact ? "20px 14px" : "32px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
          textAlign: "center",
        }}
      >
        <Icon name="user" size={isCompact ? 36 : 48} color="var(--text3)" />
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: isCompact ? 20 : 24 }}>Sign in to view your profile</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24, fontSize: isCompact ? 14 : 15, maxWidth: 320 }}>
          Your profile is available once you sign in.
        </p>
        <button className="btn btn-primary" onClick={() => auth.setShowAuth(true)}>
          Sign In / Register
        </button>
      </div>
    );
  }

  const userEps = episodes.filter((e) => e.userId === user.id);

  const avatarSize = isCompact ? 80 : 108;

  return (
    <div className="fade-in" style={{ paddingBottom: 100 }}>
      <div style={{ padding: isCompact ? "16px 12px 0" : "32px 36px 0" }}>
        {isCompact ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <UserAvatar
                user={user}
                size={avatarSize}
                style={{
                  border: "3px solid var(--bg)",
                  boxShadow: "0 0 0 2px var(--accent2)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{user.username}</h1>
                  {user.verified ? (
                    <>
                      <VerifiedBadge size={16} />
                      <span className="tag tag-green" style={{ fontSize: 9 }}>
                        Verified artist
                      </span>
                    </>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)" }}>
                  {user.handle} · {user.location}
                </div>
              </div>
            </div>
            <Link
              to="/settings"
              className="btn btn-ghost"
              style={{ width: "100%", justifyContent: "center", textDecoration: "none", padding: "10px 14px" }}
            >
              <Icon name="edit" size={14} />
              Edit Profile
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 20 }}>
            <UserAvatar
              user={user}
              size={avatarSize}
              style={{
                border: "4px solid var(--bg)",
                boxShadow: "0 0 0 2px var(--accent2)",
              }}
            />
            <div style={{ flex: 1, paddingBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>{user.username}</h1>
                {user.verified ? (
                  <>
                    <VerifiedBadge size={18} />
                    <span className="tag tag-green" style={{ fontSize: 11 }}>
                      Verified artist
                    </span>
                  </>
                ) : null}
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>
                {user.handle} · {user.location}
              </div>
            </div>
            <Link to="/settings" className="btn btn-ghost" style={{ marginBottom: 8, textDecoration: "none" }}>
              <Icon name="edit" size={14} />
              Edit Profile
            </Link>
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
          {user.bio}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: isCompact ? 6 : 8,
            marginBottom: isCompact ? 20 : 28,
            alignItems: "center",
          }}
        >
          <span className="tag tag-blue" style={{ fontSize: isCompact ? 11 : 12 }}>
            {user.genre}
          </span>
          <Link
            to="/connections"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: isCompact ? 12 : 13,
              color: "var(--text3)",
              textDecoration: "none",
            }}
          >
            <Icon name="people" size={isCompact ? 12 : 14} color="var(--text3)" />
            {fmt(user.followers)} followers
          </Link>
          <Link
            to="/connections?tab=following"
            style={{ fontSize: isCompact ? 12 : 13, color: "var(--text3)", textDecoration: "none" }}
          >
            · {fmt(user.following)} following
          </Link>
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
              users={users}
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
