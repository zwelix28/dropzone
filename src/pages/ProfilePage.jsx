import { useMemo } from "react";
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

  const userEps = useMemo(
    () => (user ? episodes.filter((e) => e.userId === user.id) : []),
    [episodes, user],
  );

  const totals = useMemo(() => {
    return userEps.reduce(
      (acc, ep) => {
        acc.plays += ep.plays || 0;
        acc.downloads += ep.downloads || 0;
        return acc;
      },
      { plays: 0, downloads: 0 },
    );
  }, [userEps]);

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
          Your public profile, mixes, and audience stats live here once you sign in.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => auth.setShowAuth(true)}>
          Sign In / Register
        </button>
      </div>
    );
  }

  const pagePad = isCompact ? "16px 12px" : "32px 36px";
  const avatarSize = isCompact ? 72 : 88;

  const statTiles = [
    { label: "Mixes", value: userEps.length, icon: "music" },
    { label: "Plays", value: fmt(totals.plays), icon: "headphones" },
    { label: "Downloads", value: fmt(totals.downloads), icon: "download" },
    { label: "Followers", value: fmt(user.followers || 0), icon: "people" },
  ];

  return (
    <div className="fade-in" style={{ padding: pagePad, paddingBottom: 120 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Icon name="user" size={isCompact ? 22 : 26} color="var(--accent)" />
          <h1
            style={{
              fontFamily: "var(--ff-display)",
              fontSize: isCompact ? 26 : 32,
              letterSpacing: "0.04em",
              margin: 0,
            }}
          >
            MY PROFILE
          </h1>
        </div>
        <p
          style={{
            color: "var(--text2)",
            marginBottom: isCompact ? 18 : 24,
            fontSize: isCompact ? 13 : 15,
            lineHeight: 1.55,
            maxWidth: 520,
          }}
        >
          Your public artist page — mixes, bio, and how listeners find you on Music Vault by DHLab.
        </p>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: isCompact ? 12 : 16,
            padding: isCompact ? "14px" : "18px 20px",
            marginBottom: isCompact ? 14 : 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: isCompact ? "flex-start" : "center",
              gap: isCompact ? 12 : 18,
              flexDirection: isCompact ? "column" : "row",
            }}
          >
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: isCompact ? 18 : 22 }}>{user.username}</span>
                {user.verified ? (
                  <>
                    <VerifiedBadge size={15} />
                    <span className="tag tag-green" style={{ fontSize: 10 }}>
                      Verified artist
                    </span>
                  </>
                ) : null}
                {user.genre ? (
                  <span className="tag tag-blue" style={{ fontSize: 10 }}>
                    {user.genre}
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: isCompact ? 12 : 13, color: "var(--text2)" }}>
                {user.handle}
                {user.location ? ` · ${user.location}` : ""}
              </div>
              {user.bio ? (
                <p
                  style={{
                    color: "var(--text2)",
                    margin: "10px 0 0",
                    lineHeight: 1.55,
                    fontSize: isCompact ? 13 : 14,
                    maxWidth: 560,
                  }}
                >
                  {user.bio}
                </p>
              ) : null}
            </div>
            <Link
              to="/settings"
              className="btn btn-ghost"
              style={{
                textDecoration: "none",
                flexShrink: 0,
                width: isCompact ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              <Icon name="settings" size={14} />
              Edit profile
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
            gap: isCompact ? 8 : 10,
            marginBottom: isCompact ? 14 : 18,
          }}
        >
          {statTiles.map((tile) => (
            <div
              key={tile.label}
              className="stat-card"
              style={{
                textAlign: "center",
                padding: isCompact ? "10px 8px" : "14px 12px",
                borderRadius: isCompact ? 10 : 12,
              }}
            >
              <Icon name={tile.icon} size={isCompact ? 12 : 14} color="var(--accent)" />
              <div
                style={{
                  fontSize: isCompact ? 16 : 20,
                  fontWeight: 800,
                  marginTop: isCompact ? 4 : 6,
                  fontFamily: "var(--ff-mono)",
                  lineHeight: 1.1,
                }}
              >
                {tile.value}
              </div>
              <div style={{ fontSize: isCompact ? 10 : 11, color: "var(--text3)", marginTop: 2 }}>{tile.label}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: isCompact ? 18 : 24,
          }}
        >
          <Link to="/connections" className="btn btn-ghost" style={{ textDecoration: "none", fontSize: isCompact ? 12 : 13 }}>
            <Icon name="people" size={14} />
            Connections
          </Link>
          <Link to="/stats" className="btn btn-ghost" style={{ textDecoration: "none", fontSize: isCompact ? 12 : 13 }}>
            <Icon name="bar2" size={14} />
            Statistics
          </Link>
          <Link to="/upload" className="btn btn-primary" style={{ textDecoration: "none", fontSize: isCompact ? 12 : 13 }}>
            <Icon name="upload" size={14} />
            Upload mix
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: isCompact ? 12 : 16,
          }}
        >
          <h2 style={{ fontWeight: 700, margin: 0, fontSize: isCompact ? 15 : 17 }}>
            Your mixes
            {userEps.length > 0 ? (
              <span style={{ color: "var(--text3)", fontWeight: 500, marginLeft: 8, fontSize: isCompact ? 12 : 14 }}>
                {userEps.length}
              </span>
            ) : null}
          </h2>
          <Link
            to="/connections?tab=following"
            style={{ fontSize: isCompact ? 11 : 12, color: "var(--text3)", textDecoration: "none" }}
          >
            {fmt(user.following || 0)} following
          </Link>
        </div>

        {userEps.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: isCompact ? 12 : 16,
              padding: isCompact ? "24px 16px" : "32px 24px",
              textAlign: "center",
            }}
          >
            <Icon name="music" size={isCompact ? 32 : 40} color="var(--text3)" />
            <p style={{ color: "var(--text2)", marginTop: 12, marginBottom: 16, fontSize: isCompact ? 13 : 14 }}>
              No mixes on your profile yet. Upload your first set to get started.
            </p>
            <Link to="/upload" className="btn btn-primary" style={{ textDecoration: "none" }}>
              <Icon name="upload" size={15} />
              Upload a mix
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
        )}
      </div>
    </div>
  );
}
