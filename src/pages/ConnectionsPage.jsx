import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import FollowButton from "../components/FollowButton.jsx";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import { fmt } from "../lib/format.js";
import { fetchFollowersWithProfiles, fetchFollowingWithProfiles } from "../lib/followLists.js";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import useMediaQuery from "../hooks/useMediaQuery.js";

function ConnectionCard({ user, followedAt, onFollowChange, compact }) {
  const since = followedAt
    ? new Date(followedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <article className="connections-card">
      <Link to={`/user/${user.id}`} className="connections-card-main">
        <UserAvatar user={user} size={compact ? 48 : 56} showVerified={false} />
        <div className="connections-card-copy">
          <div className="connections-card-name">
            <span>{user.username}</span>
            {user.verified ? <VerifiedBadge size={compact ? 13 : 14} /> : null}
          </div>
          <div className="connections-card-handle">{user.handle}</div>
          <div className="connections-card-meta">
            {fmt(user.followers || 0)} followers
            {user.location ? ` · ${user.location}` : ""}
            {since ? ` · since ${since}` : ""}
          </div>
          {user.bio ? <p className="connections-card-bio">{user.bio}</p> : null}
        </div>
      </Link>
      <div className="connections-card-actions">
        {user.genre ? <span className="tag tag-blue connections-card-genre">{user.genre}</span> : null}
        <FollowButton targetUserId={user.id} variant="compact" onFollowChange={onFollowChange} />
      </div>
    </article>
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
  const [query, setQuery] = useState("");

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

  const list = tab === "following" ? following : followers;
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return list;
    return list.filter(({ user }) => {
      const hay = `${user.username || ""} ${user.handle || ""} ${user.bio || ""} ${user.genre || ""} ${user.location || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [list, q]);

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

  const pagePad = isCompact ? "16px 12px" : "32px 36px";

  return (
    <div className="fade-in connections-page" style={{ padding: pagePad, paddingBottom: 120 }}>
      <div className="connections-shell">
        <div style={{ marginBottom: isCompact ? 12 : 16 }}>
          <BackButton to="/profile" label="Profile" />
        </div>

        <PageHeader icon="people" title="CONNECTIONS" large marginBottom={isCompact ? 10 : 14} />
        <p className="connections-lede">
          People who follow you and accounts you follow. Jump into Community to find more listeners and DJs.
        </p>

        <div className="connections-stats" aria-label="Connection totals">
          <button
            type="button"
            className={`connections-stat${tab === "followers" ? " is-on" : ""}`}
            onClick={() => setTab("followers")}
          >
            <span className="connections-stat-value">{followers.length}</span>
            <span className="connections-stat-label">Followers</span>
          </button>
          <button
            type="button"
            className={`connections-stat${tab === "following" ? " is-on" : ""}`}
            onClick={() => setTab("following")}
          >
            <span className="connections-stat-value">{following.length}</span>
            <span className="connections-stat-label">Following</span>
          </button>
        </div>

        <div className="lab-home-chips connections-tabs" role="tablist" aria-label="Connection lists">
          {[
            ["followers", "Followers", followers.length],
            ["following", "Following", following.length],
          ].map(([val, label, count]) => (
            <button
              key={val}
              type="button"
              role="tab"
              aria-selected={tab === val}
              className={`lab-home-chip${tab === val ? " is-on" : ""}`}
              onClick={() => setTab(val)}
            >
              {label}
              <span style={{ opacity: 0.75, marginLeft: 6 }}>{count}</span>
            </button>
          ))}
        </div>

        <div className="connections-search">
          <span className="connections-search-icon">
            <Icon name="search" size={15} color="var(--text3)" />
          </span>
          <input
            className="inp"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "following" ? "Search following…" : "Search followers…"}
            aria-label="Search connections"
          />
        </div>

        {!isSupabaseConfigured() ? (
          <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 16 }}>
            Connect Supabase in <code className="inp" style={{ padding: "2px 6px", fontSize: 12 }}>.env.local</code> to
            load lists.
          </p>
        ) : null}

        {error ? (
          <div className="connections-error" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p style={{ color: "var(--text2)", fontSize: 14 }}>Loading connections…</p>
        ) : list.length === 0 ? (
          <div className="connections-empty">
            <div className="connections-empty-icon" aria-hidden="true">
              <Icon name="people" size={isCompact ? 28 : 32} color="var(--accent)" />
            </div>
            <h3>{tab === "following" ? "No one yet" : "Waiting on your first follower"}</h3>
            <p>
              {tab === "following"
                ? "You’re not following anyone yet. Open Community to find DJs who share your taste."
                : "No followers yet. Share your profile and mixes to grow your audience."}
            </p>
            <Link to="/community" className="btn btn-primary" style={{ textDecoration: "none" }}>
              <Icon name="community" size={14} />
              Find people
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="connections-empty connections-empty-soft">
            <Icon name="search" size={24} color="var(--text3)" />
            <p>No connections match that search.</p>
          </div>
        ) : (
          <div className="connections-grid">
            {visible.map(({ user, followedAt }) => (
              <ConnectionCard
                key={user.id}
                user={user}
                followedAt={followedAt}
                compact={isCompact}
                onFollowChange={() => void loadLists()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
