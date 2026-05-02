import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GENRES } from "../constants/genres.js";
import Icon from "./Icon.jsx";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import { useApp } from "../context/AppContext.jsx";

export default function AuthModal({ onClose }) {
  const navigate = useNavigate();
  const { auth } = useApp();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    genre: "Tech House",
  });
  const [busy, setBusy] = useState(false);
  const [registerInfo, setRegisterInfo] = useState(null);
  const [forgotSent, setForgotSent] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    auth.clearAuthError();
    setRegisterInfo(null);
    setForgotSent(false);
  };

  const handleSubmit = async () => {
    if (!isSupabaseConfigured()) return;
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
    mode === "login" ? "SIGN IN" : mode === "register" ? "CREATE ACCOUNT" : "RESET PASSWORD";
  const subtitle =
    mode === "login"
      ? "Welcome back to Dropzone"
      : mode === "register"
        ? "Join the Dropzone community"
        : "We’ll email you a link to set a new password";

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--ff-display)",
                fontSize: 28,
                letterSpacing: "0.04em",
              }}
            >
              {title}
            </div>
            <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>{subtitle}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", color: "var(--text3)", padding: 4 }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {!isSupabaseConfigured() ? (
          <p style={{ color: "var(--orange)", fontSize: 14, lineHeight: 1.6 }}>
            Add <code style={{ color: "var(--accent)" }}>VITE_SUPABASE_URL</code> and{" "}
            <code style={{ color: "var(--accent)" }}>VITE_SUPABASE_ANON_KEY</code> to{" "}
            <code style={{ color: "var(--accent)" }}>.env.local</code> and restart the dev server.
          </p>
        ) : null}

        {auth.authError ? (
          <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>{auth.authError}</p>
        ) : null}

        {registerInfo ? (
          <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 14, lineHeight: 1.55 }}>{registerInfo}</p>
        ) : null}

        {forgotSent ? (
          <p style={{ color: "var(--green)", fontSize: 13, marginBottom: 14, lineHeight: 1.55 }}>
            If an account exists for that email, you’ll receive a reset link shortly. Add{" "}
            <code style={{ color: "var(--accent)" }}>/reset-password</code> to Supabase redirect URLs.
          </p>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          {mode === "register" && (
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
          )}

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

          {mode !== "forgot" && (
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
                Password
              </label>
              <input
                className="inp"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          )}

          {mode === "register" && (
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
          )}
        </div>

        <button
          className="btn btn-primary"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "12px",
            marginBottom: 16,
          }}
          onClick={handleSubmit}
          disabled={
            busy ||
            !isSupabaseConfigured() ||
            !form.email ||
            (mode !== "forgot" && !form.password)
          }
        >
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign In"
              : mode === "forgot"
                ? "Send reset link"
                : "Create Account"}
        </button>

        <div style={{ textAlign: "center", fontSize: 13, color: "var(--text3)" }}>
          {mode === "login" ? (
            <>
              <button
                type="button"
                style={{
                  display: "block",
                  width: "100%",
                  background: "none",
                  color: "var(--text2)",
                  marginBottom: 12,
                  fontSize: 13,
                }}
                onClick={() => switchMode("forgot")}
              >
                Forgot password?
              </button>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                style={{ background: "none", color: "var(--accent)", fontWeight: 600 }}
                onClick={() => {
                  onClose();
                  navigate("/register");
                }}
              >
                Register
              </button>
            </>
          ) : mode === "forgot" ? (
            <>
              <button
                type="button"
                style={{ background: "none", color: "var(--accent)", fontWeight: 600 }}
                onClick={() => switchMode("login")}
              >
                Back to sign in
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
