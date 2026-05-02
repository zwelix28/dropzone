import { useEffect, useRef, useState } from "react";
import { GENRES } from "../constants/genres.js";
import { isProPlan, planLabel } from "../constants/plans.js";
import UserAvatar, { isLikelyImageFile } from "../components/UserAvatar.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_STORAGE_PATH = "avatar";

export default function SettingsPage() {
  const { auth, refreshProfiles } = useApp();
  const currentUser = auth.currentUser;
  const isCompact = useMediaQuery("(max-width: 720px)");
  const uid = auth.session?.user?.id;
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    username: currentUser?.username || "",
    bio: currentUser?.bio || "",
    location: currentUser?.location || "",
    genre: currentUser?.genre || "Tech House",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  /** ~50% smaller than default `.btn` on mobile (padding + type scale). */
  const mobileBtn = isCompact
    ? {
        padding: "5px 11px",
        fontSize: 12,
        minHeight: 36,
        borderRadius: 6,
        justifyContent: "center",
      }
    : null;

  useEffect(() => {
    if (!currentUser?.id) return;
    setForm({
      username: currentUser.username || "",
      bio: currentUser.bio || "",
      location: currentUser.location || "",
      genre: currentUser.genre || "Tech House",
    });
  }, [currentUser?.id]);

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
        <h2 style={{ marginBottom: 8, fontSize: isCompact ? 20 : 24 }}>Sign in to manage settings</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24, fontSize: isCompact ? 14 : 15, maxWidth: 320 }}>
          Settings are available once you sign in.
        </p>
        <button className="btn btn-primary" style={mobileBtn || undefined} onClick={() => auth.setShowAuth(true)}>
          Sign In / Register
        </button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!isSupabaseConfigured() || !currentUser.id) return;
    setError(null);
    const handle = `@${(form.username || "dj").toLowerCase().replace(/\s/g, "")}`;
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        username: form.username.trim() || "DJ",
        handle,
        bio: form.bio || "",
        location: form.location || "",
        genre: form.genre || "Tech House",
      })
      .eq("id", currentUser.id);

    if (upErr) {
      setError(upErr.message);
      return;
    }
    await auth.refreshProfile();
    await refreshProfiles();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Use at least 6 characters.");
      return;
    }
    setPasswordBusy(true);
    auth.clearAuthError();
    const result = await auth.updatePassword(newPassword);
    setPasswordBusy(false);
    if (!result.ok) {
      setPasswordError(result.error || "Could not update password.");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2500);
  };

  const pickAvatarFile = async (file) => {
    if (!file || !uid) return;
    setAvatarError(null);
    if (!isLikelyImageFile(file)) {
      setAvatarError("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be 5 MB or smaller.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setAvatarError("Configure Supabase in .env.local first.");
      return;
    }

    const path = `${uid}/${AVATAR_STORAGE_PATH}`;
    setAvatarBusy(true);
    try {
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      const busted = `${publicUrl}?v=${Date.now()}`;

      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: busted }).eq("id", uid);
      if (dbErr) throw dbErr;

      await auth.refreshProfile();
      await refreshProfiles();
    } catch (e) {
      const msg = e?.message || String(e);
      if (/bucket|not found|404/i.test(msg)) {
        setAvatarError(
          "Storage bucket “avatars” is missing. Run the avatars section of supabase/schema.sql (or supabase/storage-avatars.sql) in the SQL Editor, or create the bucket in Dashboard → Storage.",
        );
      } else {
        setAvatarError(msg);
      }
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    if (!uid || !isSupabaseConfigured()) return;
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      await supabase.storage.from("avatars").remove([`${uid}/${AVATAR_STORAGE_PATH}`]);
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: "" }).eq("id", uid);
      if (dbErr) throw dbErr;
      await auth.refreshProfile();
      await refreshProfiles();
    } catch (e) {
      setAvatarError(e?.message || String(e));
    } finally {
      setAvatarBusy(false);
    }
  };

  const padX = isCompact ? 12 : 36;
  const padY = isCompact ? 16 : 32;

  return (
    <div className="fade-in" style={{ padding: `${padY}px ${padX}px`, paddingBottom: 100, maxWidth: isCompact ? "100%" : 600 }}>
      <h1
        style={{
          fontFamily: "var(--ff-display)",
          fontSize: isCompact ? 28 : 40,
          letterSpacing: "0.04em",
          marginBottom: 6,
        }}
      >
        SETTINGS
      </h1>
      <p style={{ color: "var(--text2)", marginBottom: isCompact ? 12 : 16, fontSize: isCompact ? 13 : 15 }}>
        Manage your profile and account preferences
      </p>

      <div
        style={{
          marginBottom: isCompact ? 18 : 28,
          padding: isCompact ? "8px 10px" : "12px 14px",
          borderRadius: isCompact ? 8 : 12,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: isCompact ? 6 : 10,
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: isCompact ? 9 : 11,
              fontWeight: 700,
              color: "var(--text3)",
              letterSpacing: "0.08em",
            }}
          >
            PLAN
          </div>
          <div style={{ fontSize: isCompact ? 13 : 16, fontWeight: 700, marginTop: isCompact ? 2 : 4 }}>
            {planLabel(currentUser?.plan)}
          </div>
        </div>
        {isProPlan(currentUser) ? (
          <span
            style={{
              fontSize: isCompact ? 8 : 10,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#fff",
              background: "rgb(22, 163, 74)",
              padding: isCompact ? "3px 6px" : "4px 8px",
              borderRadius: isCompact ? 4 : 6,
            }}
          >
            PRO
          </span>
        ) : null}
      </div>

      {error ? (
        <p style={{ color: "var(--red)", marginBottom: 16, fontSize: isCompact ? 12 : 14 }}>{error}</p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isCompact ? 12 : 16,
          marginBottom: isCompact ? 20 : 28,
          paddingBottom: isCompact ? 20 : 28,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <label style={{ display: "block", fontSize: isCompact ? 12 : 13, fontWeight: 600, color: "var(--text2)" }}>
          Profile photo
        </label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isCompact ? 12 : 20,
            flexWrap: "wrap",
            flexDirection: isCompact ? "column" : "row",
          }}
        >
          <UserAvatar user={currentUser} size={isCompact ? 64 : 88} showVerified />
          <div style={{ display: "flex", flexDirection: "column", gap: isCompact ? 6 : 8, width: isCompact ? "100%" : undefined }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickAvatarFile(f);
              }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: isCompact ? 6 : 8, width: isCompact ? "100%" : undefined }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={avatarBusy}
                onClick={() => fileInputRef.current?.click()}
                style={isCompact ? { width: "100%", ...mobileBtn } : undefined}
              >
                {avatarBusy ? "Working…" : currentUser.avatar ? "Change photo" : "Upload photo"}
              </button>
              {currentUser.avatar ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={avatarBusy}
                  onClick={() => void removeAvatar()}
                  style={isCompact ? { width: "100%", ...mobileBtn } : undefined}
                >
                  Remove photo
                </button>
              ) : null}
            </div>
            <p style={{ fontSize: isCompact ? 11 : 12, color: "var(--text3)", maxWidth: 360, margin: 0, lineHeight: 1.45 }}>
              JPG, PNG, WebP, or GIF · max 5 MB. Shown on your profile and in the header.
            </p>
          </div>
        </div>
        {avatarError ? (
          <p style={{ color: "var(--red)", fontSize: isCompact ? 12 : 13, margin: 0 }}>{avatarError}</p>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: isCompact ? 14 : 18 }}>
        <div>
          <label
            style={{ display: "block", fontSize: isCompact ? 12 : 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}
          >
            Display Name
          </label>
          <input className="inp" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
        </div>
        <div>
          <label
            style={{ display: "block", fontSize: isCompact ? 12 : 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}
          >
            Bio
          </label>
          <textarea
            className="inp"
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            style={{ minHeight: isCompact ? 88 : 120 }}
          />
        </div>
        <div>
          <label
            style={{ display: "block", fontSize: isCompact ? 12 : 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}
          >
            Location
          </label>
          <input className="inp" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="City, Country" />
        </div>
        <div>
          <label
            style={{ display: "block", fontSize: isCompact ? 12 : 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}
          >
            Primary Genre
          </label>
          <select className="inp" value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div style={{ paddingTop: isCompact ? 4 : 8 }}>
          <button
            className="btn btn-primary"
            style={
              isCompact
                ? { width: "100%", ...mobileBtn }
                : { padding: "12px 32px" }
            }
            onClick={() => void handleSave()}
          >
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: isCompact ? 24 : 36,
          paddingTop: isCompact ? 20 : 28,
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: isCompact ? 12 : 16,
          maxWidth: isCompact ? "100%" : 440,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--ff-display)",
            fontSize: isCompact ? 17 : 22,
            letterSpacing: "0.04em",
            marginBottom: 4,
          }}
        >
          PASSWORD
        </h2>
        <p style={{ fontSize: isCompact ? 12 : 13, color: "var(--text2)", margin: 0, lineHeight: 1.55 }}>
          Signed in as <strong>{auth.session?.user?.email}</strong>. Set a new password below, or use{" "}
          <button
            type="button"
            onClick={() => auth.setShowAuth(true)}
            style={{
              background: "none",
              color: "var(--accent)",
              fontWeight: 600,
              fontSize: isCompact ? 12 : "inherit",
              padding: isCompact ? "2px 4px" : undefined,
            }}
          >
            Forgot password
          </button>{" "}
          if you’re logged out.
        </p>
        {passwordError ? (
          <p style={{ color: "var(--red)", fontSize: isCompact ? 12 : 13, margin: 0 }}>{passwordError}</p>
        ) : null}
        {passwordSaved ? (
          <p style={{ color: "var(--green)", fontSize: isCompact ? 12 : 13, margin: 0 }}>Password updated.</p>
        ) : null}
        <div>
          <label
            style={{ display: "block", fontSize: isCompact ? 12 : 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}
          >
            New password
          </label>
          <input
            className="inp"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label
            style={{ display: "block", fontSize: isCompact ? 12 : 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}
          >
            Confirm new password
          </label>
          <input
            className="inp"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={
            isCompact
              ? { width: "100%", alignSelf: "stretch", ...mobileBtn }
              : { padding: "12px 28px", alignSelf: "flex-start" }
          }
          disabled={passwordBusy || !newPassword}
          onClick={() => void handlePasswordChange()}
        >
          {passwordBusy ? "Updating…" : "Update password"}
        </button>
      </div>
    </div>
  );
}
