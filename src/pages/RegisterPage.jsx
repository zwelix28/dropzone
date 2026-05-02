import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GENRES } from "../constants/genres.js";
import Icon from "../components/Icon.jsx";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import { useApp } from "../context/AppContext.jsx";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { auth } = useApp();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    genre: "Tech House",
  });
  const [busy, setBusy] = useState(false);
  const [registerInfo, setRegisterInfo] = useState(null);

  useEffect(() => {
    if (auth.authLoading) return;
    if (auth.session?.user?.id) navigate("/discover", { replace: true });
  }, [auth.authLoading, auth.session?.user?.id, navigate]);

  const goSignIn = () => {
    navigate("/");
    auth.setShowAuth(true);
  };

  const handleSubmit = async () => {
    if (!isSupabaseConfigured()) return;
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
          navigate("/discover", { replace: true });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (auth.authLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text2)" }}>Loading…</div>
    );
  }

  return (
    <div
      className="fade-in"
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px 100px",
      }}
    >
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
          <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>Join the Dropzone community</p>
        </div>

        {!isSupabaseConfigured() ? (
          <p style={{ color: "var(--orange)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
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
          disabled={busy || !isSupabaseConfigured() || !form.email || !form.password}
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
  );
}
