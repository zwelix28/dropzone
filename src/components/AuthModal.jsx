import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GENRES } from "../constants/genres.js";
import Icon from "./Icon.jsx";
import PasswordField from "./PasswordField.jsx";
import { isLocalMode, LOCAL_TEST_EMAIL, LOCAL_TEST_PASSWORD } from "../lib/localMode.js";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import { useApp } from "../context/AppContext.jsx";

const ART = "/DeepHouseLabLogo.png";

export default function AuthModal({ onClose }) {
  const navigate = useNavigate();
  const { auth } = useApp();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: isLocalMode() ? LOCAL_TEST_EMAIL : "",
    username: "",
    password: "",
    confirmPassword: "",
    genre: "Tech House",
  });
  const [busy, setBusy] = useState(false);
  const [registerInfo, setRegisterInfo] = useState(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [localError, setLocalError] = useState(null);

  const passwordsMatch = form.password === form.confirmPassword;
  const confirmTouched = form.confirmPassword.length > 0;
  const passwordMismatch = mode === "register" && confirmTouched && !passwordsMatch;

  const canSubmit = useMemo(() => {
    if (!form.email.trim()) return false;
    if (mode === "forgot") return true;
    if (!form.password) return false;
    if (mode === "register") {
      return Boolean(form.confirmPassword && passwordsMatch && form.password.length >= 6);
    }
    return true;
  }, [form.email, form.password, form.confirmPassword, passwordsMatch, mode]);

  const switchMode = (next) => {
    setMode(next);
    auth.clearAuthError();
    setRegisterInfo(null);
    setForgotSent(false);
    setLocalError(null);
  };

  const handleSubmit = async () => {
    if (!isLocalMode() && !isSupabaseConfigured()) return;
    setLocalError(null);
    if (mode === "register") {
      if (form.password.length < 6) {
        setLocalError("Password must be at least 6 characters.");
        return;
      }
      if (!passwordsMatch) {
        setLocalError("Passwords do not match.");
        return;
      }
    }
    setBusy(true);
    auth.clearAuthError();
    setRegisterInfo(null);
    try {
      if (mode === "login") {
        const { ok } = await auth.signInWithEmailPassword(form.email.trim(), form.password);
        if (ok) onClose();
      } else if (mode === "forgot") {
        const { ok } = await auth.requestPasswordReset(form.email.trim());
        if (ok) setForgotSent(true);
      } else {
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
            onClose();
          }
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Reset password";
  const subtitle =
    mode === "login"
      ? "Welcome back to the Lab"
      : mode === "register"
        ? "Join Deep House Lab"
        : "We’ll email you a link to set a new password";

  return (
    <div
      className="modal-overlay auth-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal auth-card" role="dialog" aria-label={title}>
        <div className="auth-brand">
          <img src={ART} alt="Deep House Lab" width={72} height={72} />
        </div>

        <div className="auth-head">
          <div>
            <h2 className="auth-title">{title}</h2>
            <p className="auth-sub">{subtitle}</p>
          </div>
          <button type="button" className="auth-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        {isLocalMode() ? (
          <p className="auth-notice is-warn">
            Local test account: <strong>{LOCAL_TEST_EMAIL}</strong>
            <br />
            Password: <strong>{LOCAL_TEST_PASSWORD}</strong>
          </p>
        ) : !isSupabaseConfigured() ? (
          <p className="auth-notice is-warn">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to{" "}
            <code>.env.local</code> and restart the dev server.
          </p>
        ) : null}

        {localError || auth.authError ? (
          <p className="auth-notice is-error">{localError || auth.authError}</p>
        ) : null}

        {registerInfo ? <p className="auth-notice">{registerInfo}</p> : null}

        {forgotSent ? (
          <p className="auth-notice is-ok">
            If an account exists for that email, you’ll receive a reset link shortly. Add{" "}
            <code>/reset-password</code> to Supabase redirect URLs.
          </p>
        ) : null}

        <div className="auth-fields">
          {mode === "register" && (
            <div>
              <label className="auth-label" htmlFor="auth-username">
                Display name
              </label>
              <input
                id="auth-username"
                className="inp"
                placeholder="Your DJ name"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
          )}

          <div>
            <label className="auth-label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className="inp"
              type="email"
              placeholder="dj@yourlabel.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          {mode !== "forgot" && (
            <PasswordField
              label="Password"
              name="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={form.password}
              onChange={(e) => {
                setLocalError(null);
                setForm((f) => ({ ...f, password: e.target.value }));
              }}
              hint={mode === "register" ? "At least 6 characters" : undefined}
            />
          )}

          {mode === "register" && (
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
          )}

          {mode === "register" && (
            <div>
              <label className="auth-label" htmlFor="auth-genre">
                Primary genre
              </label>
              <select
                id="auth-genre"
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
          )}
        </div>

        <button
          type="button"
          className="auth-submit"
          onClick={() => void handleSubmit()}
          disabled={busy || (!isLocalMode() && !isSupabaseConfigured()) || !canSubmit}
        >
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : mode === "forgot"
                ? "Send reset link"
                : "Create account"}
        </button>

        <div className="auth-foot">
          {mode === "login" ? (
            <>
              <button type="button" className="auth-link-muted" onClick={() => switchMode("forgot")}>
                Forgot password?
              </button>
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    onClose();
                    navigate("/register");
                  }}
                >
                  Register
                </button>
              </p>
            </>
          ) : mode === "forgot" ? (
            <button type="button" className="auth-link" onClick={() => switchMode("login")}>
              Back to sign in
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
