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
        gap: compact ? 10 : 14,
        padding: compact ? "10px 12px" : "12px 16px",
        borderRadius: 12,
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <Link to={`/user/${user.id}`} style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 14, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
        <UserAvatar user={user} size={compact ? 40 : 48} showVerified={false} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: compact ? 14 : 15 }}>{user.username}</span>
            {user.verified ? <VerifiedBadge size={compact ? 14 : 16} /> : null}
          </div>
          <div style={{ fontSize: compact ? 12 : 13, color: "var(--accent)", marginTop: 2 }}>{user.handle}</div>
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
  const emptyMsg =
    tab === "following"
      ? "You’re not following anyone yet. Discover DJs on Discover and tap Follow."
      : "No followers yet. Share your profile and mixes to grow your audience.";

  return (
    <div className="fade-in" style={{ padding: isCompact ? "16px 12px" : "32px 36px", paddingBottom: 100, maxWidth: 560 }}>
      <div style={{ marginBottom: isCompact ? 14 : 20 }}>
        <Link to="/profile" style={{ color: "var(--text2)", fontSize: isCompact ? 12 : 13 }}>
          ← Back to profile
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Icon name="people" size={isCompact ? 22 : 26} color="var(--accent)" />
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: isCompact ? 26 : 32, letterSpacing: "0.04em", margin: 0 }}>
          CONNECTIONS
        </h1>
      </div>
      <p style={{ color: "var(--text2)", marginBottom: isCompact ? 18 : 24, fontSize: isCompact ? 13 : 15, lineHeight: 1.55 }}>
        People who follow you and accounts you follow.
      </p>

      {!isSupabaseConfigured() ? (
        <p style={{ color: "var(--text3)", fontSize: 14 }}>Connect Supabase in <code className="inp" style={{ padding: "2px 6px", fontSize: 12 }}>.env.local</code> to load lists.</p>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: isCompact ? 6 : 8, marginBottom: isCompact ? 16 : 20, flexWrap: "wrap" }}>
        <button
          type="button"
          className={tab === "followers" ? "btn btn-primary" : "btn btn-ghost"}
          style={{ padding: isCompact ? "6px 12px" : "8px 16px", fontSize: isCompact ? 12 : 13 }}
          onClick={() => setTab("followers")}
        >
          Followers
          <span style={{ opacity: 0.85, marginLeft: 6 }}>({followers.length})</span>
        </button>
        <button
          type="button"
          className={tab === "following" ? "btn btn-primary" : "btn btn-ghost"}
          style={{ padding: isCompact ? "6px 12px" : "8px 16px", fontSize: isCompact ? 12 : 13 }}
          onClick={() => setTab("following")}
        >
          Following
          <span style={{ opacity: 0.85, marginLeft: 6 }}>({following.length})</span>
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text2)", fontSize: 14 }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.length === 0 ? (
            <p style={{ color: "var(--text3)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{emptyMsg}</p>
          ) : (
            list.map(({ user }) => <UserRow key={user.id} user={user} compact={isCompact} onFollowChange={() => void loadLists()} />)
          )}
        </div>
      )}
    </div>
  );
}
