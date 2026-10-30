import { useEffect, useMemo, useState } from "react";
import { getDjOfMonth, saveDjOfMonth } from "../../lib/djOfMonth.js";
import { isLocalMode } from "../../lib/localMode.js";

export default function DjOfMonthPanel({ users, episodes, adminId }) {
  const [profileId, setProfileId] = useState("");
  const [mixId, setMixId] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    getDjOfMonth().then(({ row, error: loadError }) => {
      if (!live) return;
      if (loadError) setError(loadError);
      if (!row) return;
      setProfileId(row.profileId || "");
      setMixId(row.mixId || "");
      setBio(row.bio || "");
      setPhotoUrl(row.photoUrl || "");
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handles = useMemo(() => {
    return [...users].sort((a, b) => (a.username || "").localeCompare(b.username || ""));
  }, [users]);

  const mixes = useMemo(() => {
    const list = [...episodes];
    list.sort((a, b) => {
      const aOwn = a.userId === profileId ? 0 : 1;
      const bOwn = b.userId === profileId ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return (a.title || "").localeCompare(b.title || "");
    });
    return list;
  }, [episodes, profileId]);

  const artistName = (episode) => users.find((user) => user.id === episode.userId)?.username || "Deep House Lab";

  const onSave = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await saveDjOfMonth({ profileId, mixId, bio, file, adminId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPhotoUrl(result.row.photoUrl);
    setFile(null);
    setSaved(true);
  };

  const shownPhoto = preview || photoUrl;

  return (
    <section className="admin-panel admin-dj-panel">
      <h2 className="admin-panel-title">DJ of the month</h2>
      <p className="admin-panel-desc">
        This is the desktop Home card next to Top 5 this week. Choose a Deep House Lab profile, one published mix,
        a photo, and a short bio.
      </p>
      {isLocalMode() ? (
        <p style={{ color: "var(--orange)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          Supabase is paused, so this save stays in this browser. Run supabase/dj-of-month.sql before cloud login is
          turned back on.
        </p>
      ) : null}

      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>DJ photo</label>
      {shownPhoto ? (
        <img
          src={shownPhoto}
          alt=""
          style={{
            width: 160,
            height: 160,
            objectFit: "cover",
            borderRadius: 16,
            display: "block",
            marginBottom: 10,
            background: "#141414",
          }}
        />
      ) : null}
      <input
        className="inp"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          setSaved(false);
          setFile(event.target.files?.[0] || null);
        }}
      />

      <label style={{ display: "block", fontSize: 12, fontWeight: 600, margin: "16px 0 6px" }}>
        Handle
      </label>
      <select
        className="inp"
        value={profileId}
        onChange={(event) => {
          setSaved(false);
          setProfileId(event.target.value);
        }}
      >
        <option value="">Choose a Deep House Lab profile</option>
        {handles.map((user) => (
          <option key={user.id} value={user.id}>
            {user.username} ({user.handle})
          </option>
        ))}
      </select>

      <label style={{ display: "block", fontSize: 12, fontWeight: 600, margin: "16px 0 6px" }}>
        Their mix
      </label>
      <select
        className="inp"
        value={mixId}
        onChange={(event) => {
          setSaved(false);
          setMixId(event.target.value);
        }}
      >
        <option value="">Choose an uploaded mix</option>
        {mixes.map((episode) => (
          <option key={episode.id} value={episode.id}>
            {episode.title} — {artistName(episode)}
          </option>
        ))}
      </select>

      <label style={{ display: "block", fontSize: 12, fontWeight: 600, margin: "16px 0 6px" }}>Bio</label>
      <textarea
        className="inp"
        maxLength={280}
        rows={4}
        value={bio}
        placeholder="A short line about this DJ."
        onChange={(event) => {
          setSaved(false);
          setBio(event.target.value);
        }}
      />
      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>{bio.trim().length}/280</div>

      {error ? (
        <p style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>{error}</p>
      ) : null}
      {saved ? (
        <p style={{ color: "var(--green)", fontSize: 13, marginTop: 12 }}>
          Saved. Open Home on a desktop window to see DJ of the month.
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 16 }}
        disabled={busy}
        onClick={() => void onSave()}
      >
        {busy ? "Saving…" : "Save DJ of the month"}
      </button>
    </section>
  );
}
