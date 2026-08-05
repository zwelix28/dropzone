import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import { fetchListenerProfileStats, formatListenHours } from "../lib/playbackProgress.js";
import { fmt } from "../lib/format.js";

function StatTile({ label, value, hint, icon, color = "var(--accent)", compact }) {
  return (
    <div
      className="stat-card"
      style={{
        textAlign: "left",
        padding: compact ? "12px 12px" : "14px 16px",
        borderRadius: compact ? 10 : 12,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 6 : 8 }}>
        <Icon name={icon} size={compact ? 13 : 14} color={color} />
        <span style={{ fontSize: compact ? 10 : 11, color: "var(--text3)", fontWeight: 600, letterSpacing: "0.04em" }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: compact ? 18 : 22,
          fontWeight: 800,
          fontFamily: "var(--ff-mono)",
          color: "var(--text)",
          lineHeight: 1.15,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      {hint ? (
        <div style={{ fontSize: compact ? 11 : 12, color: "var(--text2)", marginTop: 6, lineHeight: 1.4 }}>{hint}</div>
      ) : null}
    </div>
  );
}

/**
 * High-level listening behaviour for non-admin profiles.
 */
export default function ProfileListeningStats({ user, episodes, likedMixIds, compact = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const next = await fetchListenerProfileStats(user?.id, episodes, likedMixIds);
      if (!cancelled) {
        setStats(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, episodes, likedMixIds]);

  if (loading) {
    return (
      <p style={{ color: "var(--text3)", fontSize: compact ? 13 : 14, margin: "8px 0 0" }}>Loading your listening stats…</p>
    );
  }

  const preference = user?.genre || "—";
  const hours = formatListenHours(stats?.hoursListened);
  const likedGenre = stats?.mostLikedGenre || "—";
  const listenedGenre = stats?.mostListenedGenre || "—";
  const mixesStarted = stats?.mixesStarted || 0;
  const likes = stats?.likesCount || 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: compact ? 12 : 16,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ fontWeight: 700, margin: 0, fontSize: compact ? 15 : 17 }}>Your listening</h2>
        <span style={{ fontSize: compact ? 11 : 12, color: "var(--text3)" }}>
          {fmt(user?.following || 0)} following
        </span>
      </div>

      <p
        style={{
          margin: `0 0 ${compact ? 12 : 16}px`,
          color: "var(--text2)",
          fontSize: compact ? 13 : 14,
          lineHeight: 1.5,
          maxWidth: 520,
        }}
      >
        How you listen on Music Vault — come back for more of what you love.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr 1fr" : "repeat(2, minmax(0, 1fr))",
          gap: compact ? 8 : 10,
          marginBottom: compact ? 12 : 14,
        }}
      >
        <StatTile
          label="Hours listened"
          value={hours}
          hint="All-time"
          icon="headphones"
          color="var(--accent)"
          compact={compact}
        />
        <StatTile
          label="Mixes started"
          value={fmt(mixesStarted)}
          hint="Sessions tracked"
          icon="music"
          color="var(--accent2)"
          compact={compact}
        />
        <StatTile
          label="Most listened"
          value={listenedGenre}
          hint="By time spent"
          icon="trending"
          color="var(--green)"
          compact={compact}
        />
        <StatTile
          label="Most liked"
          value={likedGenre}
          hint={`${fmt(likes)} likes`}
          icon="heart"
          color="var(--red)"
          compact={compact}
        />
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: compact ? 12 : 14,
          padding: compact ? "12px 14px" : "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.08em" }}>
            PREFERENCE
          </div>
          <div style={{ fontWeight: 700, fontSize: compact ? 14 : 16, marginTop: 4 }}>{preference}</div>
          <div style={{ fontSize: compact ? 12 : 13, color: "var(--text2)", marginTop: 4 }}>
            Your primary genre on profile
          </div>
        </div>
        <Link
          to="/foryou"
          className="btn btn-primary"
          style={{ textDecoration: "none", justifyContent: "center", flexShrink: 0 }}
        >
          <Icon name="zap" size={14} />
          Keep listening
        </Link>
      </div>
    </div>
  );
}
