import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import FollowButton from "../components/FollowButton.jsx";
import LikeButton from "../components/LikeButton.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { GENRES } from "../constants/genres.js";
import { episodeHasAudioSource, resolveMixDownloadUrl } from "../lib/audioUrls.js";

export default function MixDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { auth, episodes, users, player, trackEvent, updateMix } = useApp();
  const isCompact = useMediaQuery("(max-width: 720px)");

  const episode = useMemo(() => episodes.find((e) => e.id === id) || null, [episodes, id]);
  const user = useMemo(() => (episode ? users.find((u) => u.id === episode.userId) : null), [episode, users]);

  const browseRoot = auth.session?.user?.id ? "/discover" : "/";

  if (!episode) {
    return (
      <div className="fade-in" style={{ padding: isCompact ? "16px 12px" : "32px 36px", paddingBottom: 100 }}>
        <h2 style={{ marginBottom: 8, fontSize: isCompact ? 20 : 24 }}>Mix not found</h2>
        <p style={{ color: "var(--text2)", marginBottom: 18, fontSize: isCompact ? 14 : 15 }}>
          This mix may have been removed, or the link is wrong.
        </p>
        <Link className="btn btn-ghost" to={browseRoot}>
          {auth.session?.user?.id ? "Back to Discover" : "Back to Home"}
        </Link>
      </div>
    );
  }

  const loggedIn = Boolean(auth.session?.user?.id);
  if (!loggedIn) {
    return (
      <div className="fade-in" style={{ padding: isCompact ? "16px 12px" : "32px 36px", paddingBottom: 100, maxWidth: 520 }}>
        <div style={{ marginBottom: isCompact ? 14 : 20 }}>
          <Link to={location.state?.from || "/"} style={{ color: "var(--text2)", fontSize: isCompact ? 12 : 13 }}>
            ← Back
          </Link>
        </div>
        <Icon name="eye" size={isCompact ? 32 : 40} color="var(--text3)" />
        <h1 style={{ fontSize: isCompact ? 20 : 24, fontWeight: 800, marginTop: 16, marginBottom: 10 }}>Mix details</h1>
        <p style={{ color: "var(--text2)", lineHeight: 1.65, marginBottom: 24, fontSize: isCompact ? 14 : 15 }}>
          Sign in or create an account to view full track information and download mixes. While browsing as a guest, the player streams at most the first 20 seconds of each mix.
        </p>
        <button type="button" className="btn btn-primary" style={isCompact ? { width: "100%", justifyContent: "center" } : undefined} onClick={() => auth.setShowAuth(true)}>
          Sign in / Register
        </button>
      </div>
    );
  }

  const canEdit = Boolean(auth.currentUser && auth.currentUser.id === episode.userId);
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState({
    title: episode.title || "",
    description: episode.description || "",
    genre: episode.genre || "Tech House",
    tags: Array.isArray(episode.tags) ? episode.tags.join(", ") : "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEdit({
      title: episode.title || "",
      description: episode.description || "",
      genre: episode.genre || "Tech House",
      tags: Array.isArray(episode.tags) ? episode.tags.join(", ") : "",
    });
  }, [episode.description, episode.genre, episode.tags, episode.title]);

  const canDownload = episodeHasAudioSource(episode);
  const handleDownload = async () => {
    if (!canDownload) return;
    const url = await resolveMixDownloadUrl(episode, episode.title);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    a.target = "_blank";
    a.download = `${(episode.title || "mix").replace(/[^\w\s-]/g, "").trim()}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    void trackEvent({ kind: "download", episodeId: episode.id, actorUserId: auth.currentUser?.id });
  };

  const handleSave = async () => {
    if (!canEdit) return;
    const next = {
      title: (edit.title || "").trim() || "Untitled Mix",
      description: edit.description || "",
      genre: edit.genre || "Tech House",
      tags: (edit.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
    };

    const { ok, error } = await updateMix(episode.id, next);
    if (!ok) {
      console.warn(error || "update failed");
      return;
    }
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="fade-in" style={{ padding: isCompact ? "16px 12px" : "32px 36px", paddingBottom: 120, maxWidth: isCompact ? undefined : 1040, width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isCompact ? 12 : 18 }}>
        <Link to={location.state?.from || "/discover"} style={{ color: "var(--text2)", fontSize: isCompact ? 12 : 13 }}>
          ← Back
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "minmax(200px, 280px) minmax(0, 1fr)",
          alignItems: "start",
          gap: isCompact ? 14 : 28,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: isCompact ? 12 : 16,
          padding: isCompact ? 14 : 24,
          marginBottom: isCompact ? 16 : 22,
        }}
      >
        <div style={{ width: "100%", alignSelf: "start" }}>
          <img
            src={episode.coverUrl}
            alt={episode.title}
            style={{
              width: isCompact ? 140 : "100%",
              maxWidth: isCompact ? 140 : "100%",
              height: "auto",
              margin: isCompact ? "0 auto" : undefined,
              display: "block",
              aspectRatio: "1 / 1",
              borderRadius: isCompact ? 10 : 12,
              objectFit: "cover",
              border: "1px solid var(--border)",
            }}
          />
        </div>

        <div style={{ minWidth: 0, width: "100%", overflow: "visible" }}>
          <div
            style={{
              display: "flex",
              alignItems: isCompact ? "stretch" : "flex-start",
              justifyContent: "space-between",
              gap: isCompact ? 12 : 20,
              flexDirection: isCompact ? "column" : "row",
              flexWrap: isCompact ? "nowrap" : "wrap",
            }}
          >
            <div
              style={{
                minWidth: 0,
                flex: isCompact ? undefined : "1 1 240px",
                width: isCompact ? "100%" : undefined,
                overflow: "visible",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: isCompact ? 6 : 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: isCompact ? 6 : 8,
                }}
              >
                <span className="tag tag-blue" style={{ fontSize: isCompact ? 10 : undefined, padding: isCompact ? "2px 8px" : undefined }}>
                  {episode.genre}
                </span>
                {Array.isArray(episode.tags) &&
                  episode.tags.slice(0, isCompact ? 4 : 6).map((t) => (
                    <span key={t} className="tag" style={{ fontSize: isCompact ? 10 : undefined, padding: isCompact ? "2px 8px" : undefined }}>
                      {t}
                    </span>
                  ))}
              </div>

              <h1
                style={{
                  fontSize: isCompact ? 19 : 28,
                  fontWeight: 850,
                  lineHeight: 1.2,
                  marginBottom: isCompact ? 8 : 12,
                  marginTop: 0,
                  ...(isCompact
                    ? { overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }
                    : { wordBreak: "break-word", overflowWrap: "anywhere" }),
                }}
              >
                {episode.title}
              </h1>

              {user ? (
                <div style={{ display: "flex", alignItems: "center", gap: isCompact ? 8 : 10, marginBottom: isCompact ? 0 : 12, flexWrap: "wrap" }}>
                  <Link
                    to={`/user/${user.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: isCompact ? 8 : 10,
                      textDecoration: "none",
                      color: "inherit",
                      minWidth: 0,
                      flex: isCompact ? 1 : undefined,
                    }}
                  >
                    <UserAvatar user={user} size={isCompact ? 28 : 34} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: isCompact ? 12 : 13 }}>{user.username}</span>
                        {user.verified ? <VerifiedBadge size={isCompact ? 13 : 15} /> : null}
                      </div>
                      <div style={{ fontSize: isCompact ? 11 : 12, color: "var(--text3)" }}>{user.handle}</div>
                    </div>
                  </Link>
                  <FollowButton targetUserId={user.id} variant="compact" />
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: isCompact ? "grid" : "flex",
                gridTemplateColumns: isCompact ? "minmax(0, 1fr) minmax(0, 1fr)" : undefined,
                gap: isCompact ? 10 : 10,
                flexShrink: 0,
                flexWrap: isCompact ? undefined : "wrap",
                width: isCompact ? "100%" : "auto",
                justifyContent: isCompact ? undefined : "flex-end",
                alignItems: isCompact ? "stretch" : undefined,
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() => {
                  player.playTrack(episode);
                  trackEvent({ kind: "play", episodeId: episode.id, actorUserId: auth.currentUser?.id });
                }}
                title={episodeHasAudioSource(episode) ? "Play" : "No audio source available for this mix"}
                style={{
                  opacity: episodeHasAudioSource(episode) ? 1 : 0.6,
                  minWidth: 0,
                  width: isCompact ? "100%" : undefined,
                  boxSizing: "border-box",
                  padding: isCompact ? "8px 10px" : undefined,
                  fontSize: isCompact ? 12 : undefined,
                  justifyContent: "center",
                }}
              >
                <Icon
                  name={player.currentTrack?.id === episode.id && player.isPlaying ? "pause" : "play"}
                  size={isCompact ? 14 : 16}
                />
                {player.currentTrack?.id === episode.id && player.isPlaying ? "Pause" : "Play"}
              </button>
              <div
                style={{
                  minWidth: 0,
                  width: isCompact ? "100%" : undefined,
                  display: "flex",
                  justifyContent: isCompact ? "stretch" : "flex-start",
                }}
              >
                <LikeButton
                  mixId={episode.id}
                  variant="inline"
                  size={isCompact ? "sm" : "md"}
                  style={isCompact ? { width: "100%", minWidth: 0, boxSizing: "border-box" } : undefined}
                />
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => void handleDownload()}
                disabled={!canDownload}
                title={canDownload ? "Download" : "No audio available to download"}
                style={{
                  opacity: canDownload ? 1 : 0.55,
                  cursor: canDownload ? "pointer" : "not-allowed",
                  minWidth: 0,
                  width: isCompact ? "100%" : undefined,
                  boxSizing: "border-box",
                  gridColumn: isCompact && !canEdit ? "1 / -1" : undefined,
                  padding: isCompact ? "8px 10px" : undefined,
                  fontSize: isCompact ? 12 : undefined,
                  justifyContent: "center",
                }}
              >
                <Icon name="download" size={isCompact ? 14 : 16} />
                Download
              </button>
              {canEdit ? (
                <button
                  className="btn btn-ghost"
                  onClick={() => setIsEditing((v) => !v)}
                  title="Edit mix details"
                  style={{
                    minWidth: 0,
                    width: isCompact ? "100%" : undefined,
                    boxSizing: "border-box",
                    padding: isCompact ? "8px 10px" : undefined,
                    fontSize: isCompact ? 12 : undefined,
                    justifyContent: "center",
                  }}
                >
                  <Icon name="edit" size={isCompact ? 14 : 16} />
                  {isEditing ? "Close" : "Edit"}
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: isCompact ? 12 : 20, width: "100%" }}>
            <div style={{ fontSize: isCompact ? 10 : 11, color: "var(--text3)", marginBottom: 8, letterSpacing: "0.08em", fontWeight: 700 }}>
              DESCRIPTION
            </div>
            {isEditing ? (
              <div style={{ display: "grid", gap: isCompact ? 10 : 14 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: isCompact ? 11 : 12,
                      fontWeight: 700,
                      color: "var(--text3)",
                      marginBottom: 6,
                    }}
                  >
                    Title
                  </label>
                  <input
                    className="inp"
                    value={edit.title}
                    onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: isCompact ? 11 : 12,
                      fontWeight: 700,
                      color: "var(--text3)",
                      marginBottom: 6,
                    }}
                  >
                    Genre
                  </label>
                  <select
                    className="inp"
                    value={edit.genre}
                    onChange={(e) => setEdit((s) => ({ ...s, genre: e.target.value }))}
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: isCompact ? 11 : 12,
                      fontWeight: 700,
                      color: "var(--text3)",
                      marginBottom: 6,
                    }}
                  >
                    Tags (comma separated)
                  </label>
                  <input
                    className="inp"
                    value={edit.tags}
                    onChange={(e) => setEdit((s) => ({ ...s, tags: e.target.value }))}
                    placeholder="techhouse, underground, capetown"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: isCompact ? 11 : 12,
                      fontWeight: 700,
                      color: "var(--text3)",
                      marginBottom: 6,
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    className="inp"
                    value={edit.description}
                    onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
                    style={{ minHeight: isCompact ? 96 : 140 }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: isCompact ? 8 : 10,
                    alignItems: "center",
                    flexDirection: isCompact ? "column-reverse" : "row",
                  }}
                >
                  <button
                    className="btn btn-primary"
                    style={isCompact ? { width: "100%", justifyContent: "center" } : undefined}
                    onClick={handleSave}
                  >
                    {saved ? "Saved!" : "Save"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={isCompact ? { width: "100%", justifyContent: "center" } : undefined}
                    onClick={() => {
                      setIsEditing(false);
                      setEdit({
                        title: episode.title || "",
                        description: episode.description || "",
                        genre: episode.genre || "Tech House",
                        tags: Array.isArray(episode.tags) ? episode.tags.join(", ") : "",
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  color: "var(--text2)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.75,
                  fontSize: isCompact ? 13 : 15,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  maxWidth: "100%",
                }}
              >
                {episode.description || "No description yet."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

