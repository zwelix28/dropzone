import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import FollowButton from "../components/FollowButton.jsx";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { fmt } from "../lib/format.js";
import { COMMUNITY_GENRE_FILTERS, rankCommunityUsers } from "../lib/community.js";

export default function CommunityPage() {
  const { auth, users, episodes } = useApp();
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");

  const ranked = useMemo(
    () =>
      rankCommunityUsers({
        users,
        episodes,
        currentUser: auth.currentUser,
        query,
        genreFilter: genre,
      }),
    [users, episodes, auth.currentUser, query, genre],
  );

  if (!auth.session?.user?.id) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="fade-in"
      style={{
        padding: isCompact ? "16px 12px" : "32px 36px",
        paddingBottom: 120,
        maxWidth: 920,
      }}
    >
      <PageHeader icon="community" title="COMMUNITY" />
      <p
        style={{
          color: "var(--text2)",
          fontSize: isCompact ? 13 : 14,
          lineHeight: 1.55,
          margin: isCompact ? "0 0 16px" : "0 0 22px",
          maxWidth: 560,
        }}
      >
        Discover DJs and listeners on Music Vault. Follow people who share your taste — they show up under Connections.
      </p>

      <div style={{ position: "relative", marginBottom: isCompact ? 12 : 16, maxWidth: 420 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <Icon name="search" size={15} color="var(--text3)" />
        </span>
        <input
          className="inp"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accounts…"
          style={{ width: "100%", paddingLeft: 36 }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: isCompact ? 16 : 22 }}>
        {COMMUNITY_GENRE_FILTERS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGenre(g)}
            style={{
              padding: isCompact ? "6px 10px" : "8px 14px",
              borderRadius: 8,
              fontSize: isCompact ? 12 : 13,
              fontWeight: 500,
              background: genre === g ? "var(--accent2)" : "var(--surface)",
              color: genre === g ? "#07090F" : "var(--text2)",
              border: genre === g ? "none" : "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {ranked.length === 0 ? (
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
          <Icon name="people" size={28} color="var(--text3)" />
          <p style={{ color: "var(--text3)", fontSize: isCompact ? 14 : 15, margin: "14px 0 0", lineHeight: 1.6 }}>
            No accounts match that search. Try another genre or name.
          </p>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
            gap: isCompact ? 10 : 12,
          }}
        >
          {ranked.map(({ user, reason, mixCount, topGenre }) => (
            <li
              key={user.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: isCompact ? 12 : 16,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
              }}
            >
              <Link
                to={`/user/${user.id}`}
                style={{
                  display: "flex",
                  gap: 12,
                  minWidth: 0,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <UserAvatar user={user} size={isCompact ? 48 : 56} showVerified={false} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: isCompact ? 14 : 15 }}>{user.username}</span>
                    {user.verified ? <VerifiedBadge size={13} /> : null}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 2 }}>{user.handle}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                    {fmt(user.followers || 0)} followers
                    {mixCount > 0 ? ` · ${mixCount} mix${mixCount === 1 ? "" : "es"}` : ""}
                  </div>
                </div>
              </Link>

              {user.bio ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--text2)",
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {user.bio}
                </p>
              ) : null}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
                <span className="tag tag-blue" style={{ fontSize: 10 }}>
                  {reason || topGenre || "Music Vault"}
                </span>
                <FollowButton targetUserId={user.id} variant="compact" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
