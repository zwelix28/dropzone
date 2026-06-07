import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import WaveAnim from "../components/WaveAnim.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { fmt } from "../lib/format.js";

const PLAY_MILESTONES = [10, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000];

function nextPlayMilestone(totalPlays) {
  const v = Number(totalPlays) || 0;
  return PLAY_MILESTONES.find((m) => m > v) ?? null;
}

export default function StatsPage() {
  const { auth, episodes, player } = useApp();
  const currentUser = auth.currentUser;
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [rankTab, setRankTab] = useState("plays");

  const userEps = useMemo(
    () => (currentUser ? episodes.filter((e) => e.userId === currentUser.id) : []),
    [episodes, currentUser],
  );

  const totals = useMemo(() => {
    return userEps.reduce(
      (acc, ep) => {
        acc.plays += ep.plays || 0;
        acc.downloads += ep.downloads || 0;
        acc.shares += ep.shares || 0;
        acc.likes += ep.likesCount || 0;
        return acc;
      },
      { plays: 0, downloads: 0, shares: 0, likes: 0 },
    );
  }, [userEps]);

  const rankedMixes = useMemo(() => {
    const key = rankTab === "downloads" ? "downloads" : "plays";
    return [...userEps].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, 8);
  }, [userEps, rankTab]);

  const nextMilestone = nextPlayMilestone(totals.plays);
  const milestoneProgress =
    nextMilestone && totals.plays > 0
      ? Math.min(100, (totals.plays / nextMilestone) * 100)
      : nextMilestone
        ? 0
        : 100;

  if (!currentUser) {
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
        <Icon name="bar2" size={isCompact ? 36 : 48} color="var(--text3)" />
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: isCompact ? 20 : 24 }}>Sign in to see your stats</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24, fontSize: isCompact ? 14 : 15, maxWidth: 320 }}>
          Track plays, downloads, and how your mixes perform across Music Vault by DHLab.
        </p>
        <button className="btn btn-primary" type="button" onClick={() => auth.setShowAuth(true)}>
          Sign In / Register
        </button>
      </div>
    );
  }

  const pagePad = isCompact ? "16px 12px" : "32px 36px";
  const avatarSize = isCompact ? 64 : 80;

  const statTiles = [
    { label: "Total plays", value: fmt(totals.plays), icon: "headphones" },
    { label: "Downloads", value: fmt(totals.downloads), icon: "download" },
    { label: "Shares", value: fmt(totals.shares), icon: "share" },
    { label: "Mixes", value: userEps.length, icon: "music" },
  ];

  return (
    <div className="fade-in" style={{ padding: pagePad, paddingBottom: 120 }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <PageHeader icon="bar2" title="STATISTICS" />

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: isCompact ? 12 : 16,
            padding: isCompact ? "14px 14px" : "18px 20px",
            marginBottom: isCompact ? 16 : 20,
            display: "flex",
            alignItems: "center",
            gap: isCompact ? 12 : 16,
          }}
        >
          <UserAvatar
            user={currentUser}
            size={avatarSize}
            style={{
              border: "3px solid var(--bg)",
              boxShadow: "0 0 0 2px var(--accent2)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontWeight: 800, fontSize: isCompact ? 16 : 18 }}>{currentUser.username}</span>
              {currentUser.verified ? <VerifiedBadge size={14} /> : null}
              {currentUser.genre ? (
                <span className="tag tag-blue" style={{ fontSize: 10 }}>
                  {currentUser.genre}
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: isCompact ? 12 : 13, color: "var(--text2)" }}>
              {currentUser.handle}
              {currentUser.location ? ` · ${currentUser.location}` : ""}
            </div>
            <div
              style={{
                display: "flex",
                gap: isCompact ? 10 : 14,
                marginTop: 8,
                fontSize: isCompact ? 11 : 12,
                color: "var(--text3)",
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="people" size={12} color="var(--text3)" />
                {fmt(currentUser.followers || 0)} followers
              </span>
              <span>{fmt(currentUser.following || 0)} following</span>
              {totals.likes > 0 ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="heart" size={12} color="var(--text3)" />
                  {fmt(totals.likes)} likes
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
            gap: isCompact ? 8 : 10,
            marginBottom: isCompact ? 16 : 20,
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
                  color: "var(--text)",
                }}
              >
                {tile.value}
              </div>
              <div style={{ fontSize: isCompact ? 10 : 11, color: "var(--text3)", marginTop: 2 }}>{tile.label}</div>
            </div>
          ))}
        </div>

        {userEps.length > 0 && nextMilestone ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: isCompact ? 12 : 14,
              padding: isCompact ? "12px 14px" : "16px 18px",
              marginBottom: isCompact ? 16 : 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="award" size={16} color="var(--orange)" />
                <span style={{ fontWeight: 700, fontSize: isCompact ? 13 : 14 }}>Next play milestone</span>
              </div>
              <span style={{ fontSize: isCompact ? 11 : 12, color: "var(--text3)", fontFamily: "var(--ff-mono)" }}>
                {fmt(totals.plays)} / {fmt(nextMilestone)}
              </span>
            </div>
            <div className="progress-wrap" style={{ height: 6 }}>
              <div className="progress-fill" style={{ width: `${milestoneProgress}%`, height: "100%" }} />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: isCompact ? 11 : 12, color: "var(--text3)", lineHeight: 1.45 }}>
              {nextMilestone - totals.plays} more play{nextMilestone - totals.plays === 1 ? "" : "s"} until you hit{" "}
              {fmt(nextMilestone)} total plays.
            </p>
          </div>
        ) : null}

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: isCompact ? 12 : 16,
            padding: isCompact ? "14px" : "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: isCompact ? "stretch" : "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: isCompact ? 12 : 16,
              flexDirection: isCompact ? "column" : "row",
            }}
          >
            <h2 style={{ fontWeight: 700, margin: 0, fontSize: isCompact ? 15 : 17 }}>Top performing mixes</h2>
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "var(--surface2)",
                borderRadius: 10,
                padding: 4,
                width: isCompact ? "100%" : "auto",
              }}
            >
              {[
                ["plays", "Plays"],
                ["downloads", "Downloads"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRankTab(val)}
                  style={{
                    flex: 1,
                    padding: "7px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: rankTab === val ? "var(--accent2)" : "transparent",
                    color: rankTab === val ? "#07090F" : "var(--text2)",
                    transition: "all 0.2s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {userEps.length === 0 ? (
            <div style={{ textAlign: "center", padding: isCompact ? "20px 8px" : "28px 16px" }}>
              <Icon name="upload" size={isCompact ? 28 : 36} color="var(--text3)" />
              <p style={{ color: "var(--text2)", marginTop: 12, marginBottom: 16, fontSize: isCompact ? 13 : 14 }}>
                Publish your first mix to start tracking performance here.
              </p>
              <Link to="/upload" className="btn btn-primary" style={{ textDecoration: "none" }}>
                <Icon name="upload" size={15} />
                Upload a mix
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: isCompact ? 8 : 10 }}>
              {rankedMixes.map((ep, i) => {
                const isActive = player.currentTrack?.id === ep.id;
                const isPlaying = isActive && player.isPlaying;
                const metric = rankTab === "downloads" ? ep.downloads : ep.plays;

                return (
                  <Link
                    key={ep.id}
                    to={`/mix/${ep.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: isCompact ? 10 : 14,
                      padding: isCompact ? "10px 10px" : "12px 14px",
                      borderRadius: isCompact ? 10 : 12,
                      background: "var(--surface2)",
                      border: `1px solid ${isActive ? "var(--accent2)" : "var(--border)"}`,
                      textDecoration: "none",
                      color: "inherit",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                  >
                    <span
                      className={i < 3 ? "rank-num top3" : "rank-num"}
                      style={{
                        fontSize: isCompact ? 18 : 22,
                        minWidth: isCompact ? 28 : 36,
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <img
                      src={ep.coverUrl}
                      alt=""
                      style={{
                        width: isCompact ? 44 : 52,
                        height: isCompact ? 44 : 52,
                        borderRadius: 8,
                        objectFit: "cover",
                        flexShrink: 0,
                        background: "var(--surface)",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: isCompact ? 13 : 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: 4,
                        }}
                      >
                        {ep.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {ep.genre ? (
                          <span className="tag tag-blue" style={{ fontSize: 10 }}>
                            {ep.genre}
                          </span>
                        ) : null}
                        {isPlaying ? <WaveAnim active /> : null}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontFamily: "var(--ff-mono)",
                          fontSize: isCompact ? 14 : 16,
                          color: rankTab === "downloads" ? "var(--green)" : "var(--accent)",
                        }}
                      >
                        {fmt(metric)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                        {rankTab === "downloads" ? "downloads" : "plays"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {userEps.length > 0 ? (
          <div
            style={{
              marginTop: isCompact ? 16 : 20,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/profile" className="btn btn-ghost" style={{ textDecoration: "none" }}>
              View my profile
            </Link>
            <Link to="/top10" className="btn btn-ghost" style={{ textDecoration: "none" }}>
              <Icon name="award" size={14} />
              Top 10 chart
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
