import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import FollowButton from "../components/FollowButton.jsx";
import Icon from "../components/Icon.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import { fetchFollowersWithProfiles, fetchFollowingWithProfiles } from "../lib/followLists.js";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import useMediaQuery from "../hooks/useMediaQuery.js";

function UserRow({ user, onFollowChange, compact }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 10 : 12,
        padding: compact ? "10px 12px" : "12px 14px",
        borderRadius: compact ? 10 : 12,
        background: "var(--surface2)",
        border: "1px solid var(--border)",
      }}
    >
      <Link
        to={`/user/${user.id}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? 10 : 12,
          flex: 1,
          minWidth: 0,
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <UserAvatar user={user} size={compact ? 40 : 44} showVerified={false} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: compact ? 13 : 14 }}>{user.username}</span>
            {user.verified ? <VerifiedBadge size={compact ? 13 : 14} /> : null}
          </div>
          <div style={{ fontSize: compact ? 11 : 12, color: "var(--accent)", marginTop: 2 }}>{user.handle}</div>
          {user.genre ? (
            <span className="tag tag-blue" style={{ fontSize: 9, marginTop: 6, display: "inline-block" }}>
              {user.genre}
            </span>
          ) : null}
        </div>
      </Link>
      <FollowButton targetUserId={user.id} variant="compact" onFollowChange={onFollowChange} />
    </div>
  );
}

export default function ConnectionsPage() {
  const { auth } = useApp();
  const currentUser = auth.currentUser;
  const uid = auth.session?.user?.id;
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "following" ? "following" : "followers";

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLists = useCallback(async () => {
    if (!uid || !isSupabaseConfigured()) {
      setFollowers([]);
      setFollowing([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [f1, f2] = await Promise.all([fetchFollowersWithProfiles(uid), fetchFollowingWithProfiles(uid)]);
      setFollowers(f1);
      setFollowing(f2);
    } catch (e) {
      setError(e?.message || String(e));
      setFollowers([]);
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  if (!currentUser) {
    return <Navigate to="/discover" replace />;
  }

  const setTab = (next) => {
    const p = new URLSearchParams(searchParams);
    if (next === "following") {
      p.set("tab", "following");
    } else {
      p.delete("tab");
    }
    setSearchParams(p, { replace: true });
  };

  const list = tab === "following" ? following : followers;
  const pagePad = isCompact ? "16px 12px" : "32px 36px";

  return (
    <div className="fade-in" style={{ padding: pagePad, paddingBottom: 120 }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: isCompact ? 12 : 16 }}>
          <Link to="/profile" style={{ color: "var(--text2)", fontSize: isCompact ? 12 : 13, textDecoration: "none" }}>
            ← Profile
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Icon name="people" size={isCompact ? 22 : 26} color="var(--accent)" />
          <h1
            style={{
              fontFamily: "var(--ff-display)",
              fontSize: isCompact ? 26 : 32,
              letterSpacing: "0.04em",
              margin: 0,
            }}
          >
            CONNECTIONS
          </h1>
        </div>
        <p
          style={{
            color: "var(--text2)",
            marginBottom: isCompact ? 16 : 20,
            fontSize: isCompact ? 13 : 15,
            lineHeight: 1.55,
          }}
        >
          Followers and accounts you follow — the people powering your Vault Feed.
        </p>

        {!isSupabaseConfigured() ? (
          <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 16 }}>
            Connect Supabase in <code className="inp" style={{ padding: "2px 6px", fontSize: 12 }}>.env.local</code> to
            load lists.
          </p>
        ) : null}

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 14px",
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

        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 4,
            marginBottom: isCompact ? 16 : 20,
            width: "100%",
          }}
        >
          {[
            ["followers", "Followers", followers.length],
            ["following", "Following", following.length],
          ].map(([val, label, count]) => (
            <button
              key={val}
              type="button"
              onClick={() => setTab(val)}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: tab === val ? "var(--accent2)" : "transparent",
                color: tab === val ? "#07090F" : "var(--text2)",
                transition: "all 0.2s",
              }}
            >
              {label}
              <span style={{ opacity: 0.8, marginLeft: 5 }}>({count})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "var(--text2)", fontSize: 14 }}>Loading connections…</p>
        ) : list.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: isCompact ? 12 : 14,
              padding: isCompact ? "24px 16px" : "28px 24px",
              textAlign: "center",
            }}
          >
            <Icon name="people" size={isCompact ? 32 : 36} color="var(--text3)" />
            <p style={{ color: "var(--text2)", marginTop: 12, marginBottom: 16, fontSize: isCompact ? 13 : 14, lineHeight: 1.55 }}>
              {tab === "following"
                ? "You’re not following anyone yet. Discover DJs and tap Follow to fill your Vault Feed."
                : "No followers yet. Share your profile and mixes to grow your audience."}
            </p>
            <Link to="/discover" className="btn btn-primary" style={{ textDecoration: "none" }}>
              <Icon name="compass" size={14} />
              Discover mixes
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: isCompact ? 8 : 10 }}>
            {list.map(({ user }) => (
              <UserRow key={user.id} user={user} compact={isCompact} onFollowChange={() => void loadLists()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
