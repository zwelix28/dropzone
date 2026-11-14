import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GenrePicker from "../components/GenrePicker.jsx";
import Icon from "../components/Icon.jsx";
import PasswordField from "../components/PasswordField.jsx";
import { signedInHomePath } from "../featureFlags.js";
import { isPasswordRecoveryPending } from "../lib/passwordRecovery.js";
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
          form.username.trim() &&
          form.password &&
          form.confirmPassword &&
          passwordsMatch &&
          form.password.length >= 6,
      ),
    [form.email, form.username, form.password, form.confirmPassword, passwordsMatch],
  );

  useEffect(() => {
    if (auth.authLoading) return;
    if (isPasswordRecoveryPending()) {
      navigate("/reset-password", { replace: true });
      return;
    }
    if (auth.session?.user?.id) navigate(signedInHomePath(), { replace: true });
  }, [auth.authLoading, auth.session?.user?.id, navigate]);

  const goSignIn = () => {
    navigate("/");
    auth.setShowAuth(true);
  };

  const handleSubmit = async () => {
    if (!isSupabaseConfigured()) return;
    setLocalError(null);
    if (!form.username.trim()) {
      setLocalError("Choose a username.");
      return;
    }
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
        username: form.username.trim().replace(/^@+/, ""),
        genre: form.genre,
      });
      if (result.ok) {
        if (result.needsEmailConfirmation) {
          setRegisterInfo(
            import.meta.env.DEV
              ? "Check your email to confirm your address, then sign in. (You can disable “Confirm email” in Supabase for instant login while testing.)"
              : "Check your email to confirm your address, then sign in.",
          );
        } else {
          navigate(signedInHomePath(), { replace: true });
        }
      } else if (result.usernameTaken) {
        setLocalError(result.error || "That username is taken.");
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
              {import.meta.env.DEV ? (
                <>
                  Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to{" "}
                  <code>.env.local</code> and restart the dev server.
                </>
              ) : (
                <>Registration isn’t available right now. Please try again later.</>
              )}
            </p>
          ) : null}

          {localError || auth.authError ? (
            <p className="auth-notice is-error">{localError || auth.authError}</p>
          ) : null}

          {registerInfo ? <p className="auth-notice">{registerInfo}</p> : null}

          <div className="auth-fields">
            <div>
              <label className="auth-label" htmlFor="register-username">
                Username
              </label>
              <div className="auth-username-field">
                <span className="auth-username-at" aria-hidden="true">
                  @
                </span>
                <input
                  id="register-username"
                  className="inp"
                  autoComplete="username"
                  spellCheck={false}
                  value={form.username}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      username: e.target.value.replace(/^@+/, ""),
                    }));
                  }}
                />
              </div>
            </div>

            <div>
              <label className="auth-label" htmlFor="register-email">
                Email
              </label>
              <input
                id="register-email"
                className="inp"
                type="email"
                autoComplete="email"
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

            <GenrePicker
              id="register-genre"
              name="primary-genre"
              label="Primary genre"
              value={form.genre}
              onChange={(genre) => setForm((f) => ({ ...f, genre }))}
            />
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
