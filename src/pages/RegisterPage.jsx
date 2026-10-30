import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GENRES } from "../constants/genres.js";
import Icon from "../components/Icon.jsx";
import PasswordField from "../components/PasswordField.jsx";
import { signedInHomePath } from "../featureFlags.js";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import { useApp } from "../context/AppContext.jsx";

const ART = "/DeepHouseLabLogo.png";

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
      <div className="landing-site auth-loading" style={{ color: "#A9B0BD" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="landing-site register-page">
      <div className="landing-site-glow" aria-hidden="true" />

      <div className="modal-overlay register-modal-overlay auth-overlay" role="dialog" aria-label="Create account">
        <div className="modal auth-card">
          <Link to="/" className="auth-close auth-close-abs" aria-label="Close">
            <Icon name="x" size={20} />
          </Link>

          <div className="auth-brand">
            <img src={ART} alt="Deep House Lab" width={72} height={72} />
          </div>

          <div className="auth-head auth-head-solo">
            <div>
              <h2 className="auth-title">Create account</h2>
              <p className="auth-sub">Join the Lab — same Home, crates, and player waiting inside.</p>
            </div>
          </div>

          {!isSupabaseConfigured() ? (
            <p className="auth-notice is-warn">
              Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to{" "}
              <code>.env.local</code> and restart the dev server.
            </p>
          ) : null}

          {localError || auth.authError ? (
            <p className="auth-notice is-error">{localError || auth.authError}</p>
          ) : null}

          {registerInfo ? <p className="auth-notice">{registerInfo}</p> : null}

          <div className="auth-fields">
            <div>
              <label className="auth-label" htmlFor="register-username">
                Display name
              </label>
              <input
                id="register-username"
                className="inp"
                placeholder="Your DJ name"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>

            <div>
              <label className="auth-label" htmlFor="register-email">
                Email
              </label>
              <input
                id="register-email"
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

            <fieldset className="auth-genre">
              <legend className="auth-label">Primary genre</legend>
              <div className="auth-genre-slider" role="radiogroup" aria-label="Primary genre">
                {GENRES.map((g) => {
                  const selected = form.genre === g;
                  return (
                    <label key={g} className={`auth-genre-chip${selected ? " is-on" : ""}`}>
                      <input
                        type="radio"
                        name="primary-genre"
                        value={g}
                        checked={selected}
                        onChange={() => setForm((f) => ({ ...f, genre: g }))}
                      />
                      <span>{g}</span>
                    </label>
                  );
                })}
              </div>
              <select
                className="inp auth-genre-select"
                value={form.genre}
                aria-label="Primary genre"
                onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </fieldset>
          </div>

          <button
            type="button"
            className="auth-submit"
            onClick={() => void handleSubmit()}
            disabled={busy || !isSupabaseConfigured() || !canSubmit}
          >
            {busy ? "Please wait…" : "Create account"}
          </button>

          <div className="auth-foot">
            <p>
              Already have an account?{" "}
              <button type="button" className="auth-link" onClick={goSignIn}>
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
