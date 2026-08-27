import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GENRES } from "../constants/genres.js";
import Icon from "../components/Icon.jsx";
import PasswordField from "../components/PasswordField.jsx";
import { signedInHomePath } from "../featureFlags.js";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import { useApp } from "../context/AppContext.jsx";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { auth } = useApp();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    genre: "Tech House",
  });
  const [busy, setBusy] = useState(false);
  const [registerInfo, setRegisterInfo] = useState(null);
  const [localError, setLocalError] = useState(null);

  const passwordsMatch = form.password === form.confirmPassword;
  const confirmTouched = form.confirmPassword.length > 0;
  const passwordMismatch = confirmTouched && !passwordsMatch;

  const canSubmit = useMemo(
    () =>
      Boolean(
        form.email.trim() &&
          form.password &&
          form.confirmPassword &&
          passwordsMatch &&
          form.password.length >= 6,
      ),
    [form.email, form.password, form.confirmPassword, passwordsMatch],
  );

  useEffect(() => {
    if (auth.authLoading) return;
    if (auth.session?.user?.id) navigate(signedInHomePath(), { replace: true });
  }, [auth.authLoading, auth.session?.user?.id, navigate]);

  const goSignIn = () => {
    navigate("/");
    auth.setShowAuth(true);
  };

  const handleSubmit = async () => {
    if (!isSupabaseConfigured()) return;
    setLocalError(null);
    if (form.password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (!passwordsMatch) {
      setLocalError("Passwords do not match.");
      return;
    }
    setBusy(true);
    auth.clearAuthError();
    setRegisterInfo(null);
    try {
      const result = await auth.signUp(form.email.trim(), form.password, {
        username: form.username.trim(),
        genre: form.genre,
      });
      if (result.ok) {
        if (result.needsEmailConfirmation) {
          setRegisterInfo(
            "Check your email to confirm your address, then sign in. (You can disable “Confirm email” in Supabase for instant login while testing.)",
          );
        } else {
          navigate(signedInHomePath(), { replace: true });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (auth.authLoading) {
    return (
      <div className="landing-page" style={{ color: "var(--text2)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="landing-page is-ready register-page">
      <div className="landing-atmosphere" aria-hidden>
        <div className="landing-atmosphere-image" />
        <div className="landing-atmosphere-wash" />
        <div className="landing-atmosphere-grid" />
        <div className="landing-atmosphere-orb landing-atmosphere-orb-a" />
        <div className="landing-atmosphere-orb landing-atmosphere-orb-b" />
      </div>

      <div className="modal-overlay register-modal-overlay" role="dialog" aria-label="Create account">
        <div
          className="modal"
          style={{
            width: "100%",
            maxWidth: 420,
            position: "relative",
            margin: 0,
          }}
        >
          <Link
            to="/"
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              background: "none",
              color: "var(--text3)",
              padding: 4,
              lineHeight: 0,
            }}
            aria-label="Close"
          >
            <Icon name="x" size={20} />
          </Link>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <img
              src="/logo.png"
              alt="Music Vault"
              width={90}
              height={90}
              style={{
                width: 90,
                height: 90,
                borderRadius: 10,
                objectFit: "contain",
              }}
            />
          </div>

          <div style={{ marginBottom: 28, paddingRight: 28 }}>
            <div
              style={{
                fontFamily: "var(--ff-display)",
                fontSize: 28,
                letterSpacing: "0.04em",
              }}
            >
              CREATE ACCOUNT
            </div>
            <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>Join Music Vault</p>
          </div>

          {!isSupabaseConfigured() ? (
            <p style={{ color: "var(--orange)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              Add <code style={{ color: "var(--accent)" }}>VITE_SUPABASE_URL</code> and{" "}
              <code style={{ color: "var(--accent)" }}>VITE_SUPABASE_ANON_KEY</code> to{" "}
              <code style={{ color: "var(--accent)" }}>.env.local</code> and restart the dev server.
            </p>
          ) : null}

          {localError || auth.authError ? (
            <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
              {localError || auth.authError}
            </p>
          ) : null}

          {registerInfo ? (
            <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 14, lineHeight: 1.55 }}>{registerInfo}</p>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 5,
                  color: "var(--text2)",
                }}
              >
                Display name
              </label>
              <input
                className="inp"
                placeholder="Your DJ name"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 5,
                  color: "var(--text2)",
                }}
              >
                Email
              </label>
              <input
                className="inp"
                type="email"
                placeholder="dj@yourlabel.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <PasswordField
              label="Password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => {
                setLocalError(null);
                setForm((f) => ({ ...f, password: e.target.value }));
              }}
              hint="At least 6 characters"
            />

            <PasswordField
              label="Confirm password"
              name="confirmPassword"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => {
                setLocalError(null);
                setForm((f) => ({ ...f, confirmPassword: e.target.value }));
              }}
              error={passwordMismatch ? "Passwords do not match" : undefined}
              hint={confirmTouched && passwordsMatch ? "Passwords match" : undefined}
            />

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 5,
                  color: "var(--text2)",
                }}
              >
                Primary genre
              </label>
              <select
                className="inp"
                value={form.genre}
                onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "12px",
              marginBottom: 16,
            }}
            onClick={() => void handleSubmit()}
            disabled={busy || !isSupabaseConfigured() || !canSubmit}
          >
            {busy ? "Please wait…" : "Create Account"}
          </button>

          <div style={{ textAlign: "center", fontSize: 13, color: "var(--text3)" }}>
            Already have an account?{" "}
            <button
              type="button"
              style={{ background: "none", color: "var(--accent)", fontWeight: 600 }}
              onClick={goSignIn}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
