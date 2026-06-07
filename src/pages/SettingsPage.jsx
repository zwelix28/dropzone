import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { GENRES } from "../constants/genres.js";
import { isProPlan, planLabel } from "../constants/plans.js";
import UserAvatar, { isLikelyImageFile } from "../components/UserAvatar.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_STORAGE_PATH = "avatar";

function SettingsSection({ title, description, children, compact }) {
  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: compact ? 12 : 14,
        padding: compact ? "14px" : "18px 20px",
        marginBottom: compact ? 14 : 16,
      }}
    >
      <h2 style={{ fontWeight: 700, fontSize: compact ? 14 : 16, margin: "0 0 4px" }}>{title}</h2>
      {description ? (
        <p style={{ fontSize: compact ? 11 : 12, color: "var(--text3)", margin: "0 0 14px", lineHeight: 1.5 }}>
          {description}
        </p>
      ) : null}
      {children}
    </section>
  );
}

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

  useEffect(() => {
    if (!currentUser?.id) return;
    setForm({
      username: currentUser.username || "",
      bio: currentUser.bio || "",
      location: currentUser.location || "",
      genre: currentUser.genre || "Tech House",
    });
  }, [currentUser?.id, currentUser?.username, currentUser?.bio, currentUser?.location, currentUser?.genre]);

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
        <Icon name="settings" size={isCompact ? 36 : 48} color="var(--text3)" />
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: isCompact ? 20 : 24 }}>Sign in to manage settings</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24, fontSize: isCompact ? 14 : 15, maxWidth: 320 }}>
          Update your profile, photo, and account preferences once you sign in.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => auth.setShowAuth(true)}>
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
          "Storage bucket “avatars” is missing. Run supabase/schema.sql or storage-avatars.sql in the SQL Editor.",
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

  const pagePad = isCompact ? "16px 12px" : "32px 36px";
  const fieldGap = isCompact ? 12 : 14;

  return (
    <div className="fade-in" style={{ padding: pagePad, paddingBottom: 120 }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: isCompact ? 12 : 16 }}>
          <Link to="/profile" style={{ color: "var(--text2)", fontSize: isCompact ? 12 : 13, textDecoration: "none" }}>
            ← Profile
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Icon name="settings" size={isCompact ? 22 : 26} color="var(--accent)" />
          <h1
            style={{
              fontFamily: "var(--ff-display)",
              fontSize: isCompact ? 26 : 32,
              letterSpacing: "0.04em",
              margin: 0,
            }}
          >
            SETTINGS
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
          Manage your public profile, photo, and account security.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: isCompact ? 10 : 12,
            padding: isCompact ? "10px 12px" : "12px 16px",
            marginBottom: isCompact ? 14 : 16,
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.08em" }}>PLAN</div>
            <div style={{ fontSize: isCompact ? 14 : 16, fontWeight: 700, marginTop: 2 }}>{planLabel(currentUser?.plan)}</div>
          </div>
          {isProPlan(currentUser) ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "#fff",
                background: "rgb(22, 163, 74)",
                padding: "4px 8px",
                borderRadius: 6,
              }}
            >
              PRO
            </span>
          ) : null}
        </div>

        {error ? (
          <p style={{ color: "var(--red)", marginBottom: 14, fontSize: isCompact ? 12 : 13 }}>{error}</p>
        ) : null}

        <SettingsSection title="Profile photo" description="Shown on your profile, mixes, and in the header." compact={isCompact}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isCompact ? 12 : 16,
              flexWrap: "wrap",
              flexDirection: isCompact ? "column" : "row",
            }}
          >
            <UserAvatar user={currentUser} size={isCompact ? 64 : 80} showVerified />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, width: isCompact ? "100%" : undefined }}>
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, width: isCompact ? "100%" : undefined }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={avatarBusy}
                  onClick={() => fileInputRef.current?.click()}
                  style={isCompact ? { flex: 1, minWidth: 120 } : undefined}
                >
                  {avatarBusy ? "Working…" : currentUser.avatar ? "Change photo" : "Upload photo"}
                </button>
                {currentUser.avatar ? (
                  <button type="button" className="btn btn-ghost" disabled={avatarBusy} onClick={() => void removeAvatar()}>
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {avatarError ? (
            <p style={{ color: "var(--red)", fontSize: isCompact ? 12 : 13, margin: "10px 0 0" }}>{avatarError}</p>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Public profile" description="How you appear to listeners across Music Vault by DHLab." compact={isCompact}>
          <div style={{ display: "flex", flexDirection: "column", gap: fieldGap }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                Display name
              </label>
              <input className="inp" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                Bio
              </label>
              <textarea
                className="inp"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                style={{ minHeight: isCompact ? 88 : 110 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                Location
              </label>
              <input
                className="inp"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="City, Country"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                Primary genre
              </label>
              <select className="inp" value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={isCompact ? { width: "100%" } : { alignSelf: "flex-start", padding: "10px 24px" }}
              onClick={() => void handleSave()}
            >
              {saved ? "Saved!" : "Save changes"}
            </button>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Password"
          description={
            <>
              Signed in as <strong>{auth.session?.user?.email}</strong>. Set a new password below, or use{" "}
              <button
                type="button"
                onClick={() => auth.setShowAuth(true)}
                style={{ background: "none", color: "var(--accent)", fontWeight: 600, padding: 0 }}
              >
                Forgot password
              </button>{" "}
              if you&apos;re logged out.
            </>
          }
          compact={isCompact}
        >
          {passwordError ? (
            <p style={{ color: "var(--red)", fontSize: isCompact ? 12 : 13, margin: "0 0 10px" }}>{passwordError}</p>
          ) : null}
          {passwordSaved ? (
            <p style={{ color: "var(--green)", fontSize: 12, margin: "0 0 10px" }}>Password updated.</p>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: fieldGap }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
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
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
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
              style={isCompact ? { width: "100%" } : { alignSelf: "flex-start", padding: "10px 24px" }}
              disabled={passwordBusy || !newPassword}
              onClick={() => void handlePasswordChange()}
            >
              {passwordBusy ? "Updating…" : "Update password"}
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
