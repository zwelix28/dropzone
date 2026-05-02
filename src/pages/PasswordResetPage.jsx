import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
      }
    });

    const fromRecoveryUrl = () => {
      try {
        const h = window.location.hash || "";
        const s = window.location.search || "";
        if (h.includes("type=recovery")) return true;
        if (h.includes("access_token") && h.includes("recovery")) return true;
        if (s.includes("code=") && window.location.pathname.includes("reset-password")) return true;
        return false;
      } catch {
        return false;
      }
    };

    if (fromRecoveryUrl()) {
      setRecoveryReady(true);
    }

    const t = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && fromRecoveryUrl()) {
          setRecoveryReady(true);
        }
      });
    }, 500);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  const submit = async () => {
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setDone(true);
    window.setTimeout(() => navigate("/"), 1800);
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="fade-in" style={{ padding: "48px 36px", maxWidth: 480 }}>
        <p style={{ color: "var(--orange)" }}>Supabase is not configured.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="fade-in" style={{ padding: "48px 36px", maxWidth: 480, margin: "0 auto" }}>
        <Icon name="check" size={40} color="var(--green)" />
        <h1 style={{ fontSize: 24, marginTop: 16 }}>Password updated</h1>
        <p style={{ color: "var(--text2)", marginTop: 8 }}>Redirecting you home…</p>
        <Link to="/" style={{ display: "inline-block", marginTop: 20, color: "var(--accent)", fontWeight: 600 }}>
          Continue
        </Link>
      </div>
    );
  }

  if (!recoveryReady) {
    return (
      <div className="fade-in" style={{ padding: "48px 36px", maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 28, letterSpacing: "0.04em", marginBottom: 8 }}>
          RESET PASSWORD
        </h1>
        <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: 20 }}>
          Open the reset link from your email. If you just clicked it, wait a second for this page to update.
        </p>
        <p style={{ fontSize: 13, color: "var(--text3)" }}>
          In Supabase → Authentication → URL Configuration, add your site URL and{" "}
          <code style={{ color: "var(--accent)" }}>/reset-password</code> to Redirect URLs.
        </p>
        <Link to="/" style={{ display: "inline-block", marginTop: 24, color: "var(--accent)", fontWeight: 600 }}>
          ← Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: "48px 36px", maxWidth: 440, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 28, letterSpacing: "0.04em", marginBottom: 8 }}>
        NEW PASSWORD
      </h1>
      <p style={{ color: "var(--text2)", marginBottom: 24, fontSize: 14 }}>Choose a new password for your account.</p>

      {error ? <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>{error}</p> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text2)" }}>
            New password
          </label>
          <input
            className="inp"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text2)" }}>
            Confirm password
          </label>
          <input
            className="inp"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 8, padding: "12px 24px" }}
          disabled={busy || !password}
          onClick={() => void submit()}
        >
          {busy ? "Saving…" : "Update password"}
        </button>
      </div>
    </div>
  );
}
