import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ProUpgradePrompt from "../components/ProUpgradePrompt.jsx";
import { GENRES } from "../constants/genres.js";
import { isProPlan, planLabel } from "../constants/plans.js";
import UserAvatar, { isLikelyImageFile } from "../components/UserAvatar.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_STORAGE_PATH = "avatar";

/** Shows per-month earnings breakdown and a withdraw button for past months. */
function WithdrawPanel({ uid, onWithdraw, busy, compact }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !isSupabaseConfigured()) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("mix_purchases")
        .select("seller_net_zar, period_month, status")
        .eq("seller_user_id", uid)
        .eq("status", "paid")
        .order("period_month", { ascending: false });
      const byMonth = {};
      for (const row of data ?? []) {
        const k = String(row.period_month).slice(0, 7);
        byMonth[k] = (byMonth[k] ?? 0) + Number(row.seller_net_zar);
      }
      setRows(Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)));
      setLoading(false);
    })();
  }, [uid]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (loading) return <p style={{ fontSize: 12, color: "var(--text3)" }}>Loading earnings…</p>;
  if (!rows.length) return (
    <p style={{ fontSize: compact ? 12 : 13, color: "var(--text2)" }}>
      No earnings yet. Once a listener buys one of your mixes, their payment will appear here at the end of the calendar month.
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(([month, net]) => {
        const isPast = month < currentMonth;
        const label = new Date(`${month}-01`).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
        return (
          <div
            key={month}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: compact ? "10px 12px" : "12px 14px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: compact ? 13 : 14 }}>{label}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                Net earnings: <strong style={{ color: "var(--green)", fontFamily: "var(--ff-mono)" }}>R{net.toFixed(2)}</strong>
              </div>
            </div>
            {isPast ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => onWithdraw(month)}
                style={{ fontSize: compact ? 12 : 13, padding: "7px 14px" }}
              >
                {busy ? "Processing…" : "Withdraw"}
              </button>
            ) : (
              <span style={{ fontSize: 11, color: "var(--text3)" }}>
                Available after {new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, "")}/functions/v1`
  : null;

async function callEdgeFunction(fnName, body, session) {
  if (!SUPABASE_FUNCTIONS_URL) throw new Error("VITE_SUPABASE_URL not configured");
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Edge Function error ${res.status}`);
  return json;
}

export default function SettingsPage() {
  const { auth, refreshProfiles } = useApp();
  const currentUser = auth.currentUser;
  const isCompact = useMediaQuery("(max-width: 720px)");
  const uid = auth.session?.user?.id;
  const fileInputRef = useRef(null);
  const location = useLocation();

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

  // Pro & Payments state
  const [subLoading, setSubLoading] = useState(false);
  const [subToast, setSubToast] = useState(null);
  const [bankForm, setBankForm] = useState({ bankName: "", accountHolderName: "", accountNumberLast4: "", recipientCode: "" });
  const [bankSaved, setBankSaved] = useState(false);
  const [bankBusy, setBankBusy] = useState(false);
  const [bankError, setBankError] = useState(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawToast, setWithdrawToast] = useState(null);

  // Show success toast when returning from Paystack
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("subscription") === "success") {
      setSubToast("Payment received! Your plan will update to Pro shortly.");
    }
  }, [location.search]);

  // Load existing bank account
  const loadBankAccount = useCallback(async () => {
    if (!uid || !isSupabaseConfigured()) return;
    const { data } = await supabase.from("seller_bank_accounts").select("*").eq("user_id", uid).maybeSingle();
    if (data) {
      setBankForm({
        bankName: data.bank_name ?? "",
        accountHolderName: data.account_holder_name ?? "",
        accountNumberLast4: data.account_number_last4 ?? "",
        recipientCode: data.paystack_recipient_code ?? "",
      });
    }
  }, [uid]);

  useEffect(() => {
    void loadBankAccount();
  }, [loadBankAccount]);

  const handleSubscribe = async () => {
    if (!currentUser?.isAdmin) return;
    setSubLoading(true);
    setSubToast(null);
    try {
      const { authorization_url } = await callEdgeFunction(
        "create-checkout",
        { type: "pro_subscription" },
        auth.session,
      );
      window.location.href = authorization_url;
    } catch (e) {
      setSubToast(e?.message ?? "Checkout failed");
      setSubLoading(false);
    }
  };

  const handleSaveBankAccount = async () => {
    if (!uid || !bankForm.bankName || !bankForm.accountHolderName || !bankForm.accountNumberLast4) return;
    setBankBusy(true);
    setBankError(null);
    try {
      const { error: dbErr } = await supabase.from("seller_bank_accounts").upsert(
        {
          user_id: uid,
          bank_name: bankForm.bankName.trim(),
          account_holder_name: bankForm.accountHolderName.trim(),
          account_number_last4: bankForm.accountNumberLast4.trim().slice(-4),
          paystack_recipient_code: bankForm.recipientCode.trim() || null,
        },
        { onConflict: "user_id" },
      );
      if (dbErr) throw dbErr;
      setBankSaved(true);
      setTimeout(() => setBankSaved(false), 2000);
    } catch (e) {
      setBankError(e?.message ?? "Failed to save bank account");
    } finally {
      setBankBusy(false);
    }
  };

  const handleWithdraw = async (periodMonth) => {
    setWithdrawBusy(true);
    setWithdrawToast(null);
    try {
      const { amount_zar } = await callEdgeFunction(
        "request-withdrawal",
        { period_month: periodMonth },
        auth.session,
      );
      setWithdrawToast(`Withdrawal of R${Number(amount_zar).toFixed(2)} initiated. Funds arrive in 1–3 business days.`);
    } catch (e) {
      setWithdrawToast(e?.message ?? "Withdrawal failed");
    } finally {
      setWithdrawBusy(false);
    }
  };

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

        <PageHeader icon="settings" title="SETTINGS" />

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

        {/* ── Pro & Payments (admins only) ───────────────────────── */}
        {currentUser.isAdmin ? (
          !isProPlan(currentUser) ? (
            <div style={{ marginBottom: isCompact ? 14 : 16 }}>
              <ProUpgradePrompt
                title="Upgrade to Pro"
                description="Set your mixes for sale, earn money per download, and withdraw monthly. Pro is R99/month via Paystack — cancel any time."
                onUpgrade={() => void handleSubscribe()}
                loading={subLoading}
                compact={isCompact}
              />
              {subToast ? (
                <p style={{ color: subToast.startsWith("Payment") ? "var(--green)" : "var(--red)", fontSize: 12, marginTop: 8 }}>
                  {subToast}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <SettingsSection
                title="Pro & Payments"
                description="Manage your bank account for earnings withdrawals. Funds are available after each calendar month ends."
                compact={isCompact}
              >
                {subToast ? (
                  <p style={{ color: "var(--green)", fontSize: 12, marginBottom: 10 }}>{subToast}</p>
                ) : null}
                <div style={{ display: "flex", flexDirection: "column", gap: isCompact ? 12 : 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                      Bank name
                    </label>
                    <input
                      className="inp"
                      placeholder="e.g. FNB, Standard Bank, Capitec"
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                      Account holder name
                    </label>
                    <input
                      className="inp"
                      placeholder="Full name as on your account"
                      value={bankForm.accountHolderName}
                      onChange={(e) => setBankForm((f) => ({ ...f, accountHolderName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                      Last 4 digits of account number
                    </label>
                    <input
                      className="inp"
                      placeholder="e.g. 4589"
                      maxLength={4}
                      value={bankForm.accountNumberLast4}
                      onChange={(e) => setBankForm((f) => ({ ...f, accountNumberLast4: e.target.value.replace(/\D/g, "").slice(-4) }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                      Paystack Recipient Code{" "}
                      <span style={{ color: "var(--text3)", fontWeight: 400 }}>(from Paystack dashboard)</span>
                    </label>
                    <input
                      className="inp"
                      placeholder="RCP_xxxxxxxxxx"
                      value={bankForm.recipientCode}
                      onChange={(e) => setBankForm((f) => ({ ...f, recipientCode: e.target.value }))}
                    />
                  </div>
                  {bankError ? (
                    <p style={{ color: "var(--red)", fontSize: 12, margin: 0 }}>{bankError}</p>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={bankBusy || !bankForm.bankName || !bankForm.accountHolderName || !bankForm.accountNumberLast4}
                    onClick={() => void handleSaveBankAccount()}
                    style={isCompact ? { width: "100%" } : { alignSelf: "flex-start", padding: "10px 24px" }}
                  >
                    {bankBusy ? "Saving…" : bankSaved ? "Saved!" : "Save bank account"}
                  </button>
                </div>
              </SettingsSection>

              <SettingsSection
                title="Withdraw earnings"
                description="Earnings are held per calendar month. Once a month ends you can request a payout. Minimum payout is R50."
                compact={isCompact}
              >
                {withdrawToast ? (
                  <p style={{ fontSize: 12, marginBottom: 10, color: withdrawToast.startsWith("Withdrawal") ? "var(--green)" : "var(--red)" }}>
                    {withdrawToast}
                  </p>
                ) : null}
                <WithdrawPanel
                  uid={uid}
                  onWithdraw={handleWithdraw}
                  busy={withdrawBusy}
                  compact={isCompact}
                />
              </SettingsSection>
            </>
          )
        ) : null}

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
