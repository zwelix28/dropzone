import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PasswordField from "../components/PasswordField.jsx";
import { signedInHomePath } from "../featureFlags.js";
import {
  clearPasswordRecoveryPending,
  isPasswordRecoveryPending,
  markPasswordRecoveryPending,
  urlLooksLikePasswordRecovery,
} from "../lib/passwordRecovery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { useApp } from "../context/AppContext.jsx";

const ART = "/DeepHouseLabLogo.png";

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const { auth } = useApp();
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const passwordsMatch = password === confirm;
  const confirmTouched = confirm.length > 0;
  const passwordMismatch = confirmTouched && !passwordsMatch;

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setChecking(false);
      return undefined;
    }

    if (urlLooksLikePasswordRecovery() || isPasswordRecoveryPending()) {
      markPasswordRecoveryPending();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        markPasswordRecoveryPending();
        setRecoveryReady(true);
        setChecking(false);
        return;
      }
      if (session && isPasswordRecoveryPending()) {
        setRecoveryReady(true);
        setChecking(false);
      }
    });

    let cancelled = false;
    (async () => {
      // Give detectSessionInUrl a moment to exchange hash/PKCE tokens.
      await new Promise((r) => window.setTimeout(r, 350));
      if (cancelled) return;

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session && (isPasswordRecoveryPending() || urlLooksLikePasswordRecovery())) {
        markPasswordRecoveryPending();
        setRecoveryReady(true);
      }
      setChecking(false);
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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
    const { ok, error: upErr } = await auth.updatePassword(password);
    setBusy(false);
    if (!ok) {
      setError(upErr || "Could not update password.");
      return;
    }
    clearPasswordRecoveryPending();
    setDone(true);
    window.setTimeout(() => navigate(signedInHomePath(), { replace: true }), 1600);
  };

  const shell = (body) => (
    <div className="landing-site register-page">
      <div className="landing-site-glow" aria-hidden="true" />
      <div className="modal-overlay register-modal-overlay auth-overlay" role="dialog" aria-label="Reset password">
        <div className="modal auth-card">{body}</div>
      </div>
    </div>
  );

  if (!isSupabaseConfigured()) {
    return shell(
      <>
        <div className="auth-brand">
          <img src={ART} alt="Deep House Lab" width={72} height={72} />
        </div>
        <p className="auth-notice is-warn">Sign-in isn’t available right now. Please try again later.</p>
        <Link to="/" className="auth-submit" style={{ textAlign: "center", textDecoration: "none" }}>
          Back to Home
        </Link>
      </>,
    );
  }

  if (done) {
    return shell(
      <>
        <div className="auth-brand">
          <img src={ART} alt="Deep House Lab" width={72} height={72} />
        </div>
        <div className="auth-head auth-head-solo">
          <div>
            <h2 className="auth-title">Password updated</h2>
            <p className="auth-sub">You’re back in — taking you into the Lab.</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <Icon name="check" size={36} color="var(--green)" />
        </div>
        <Link to={signedInHomePath()} className="auth-submit" style={{ textAlign: "center", textDecoration: "none" }}>
          Continue
        </Link>
      </>,
    );
  }

  if (checking) {
    return shell(
      <>
        <div className="auth-brand">
          <img src={ART} alt="Deep House Lab" width={72} height={72} />
        </div>
        <p className="auth-notice">Checking your reset link…</p>
      </>,
    );
  }

  if (!recoveryReady) {
    return shell(
      <>
        <Link to="/" className="auth-close auth-close-abs" aria-label="Close">
          <Icon name="x" size={20} />
        </Link>
        <div className="auth-brand">
          <img src={ART} alt="Deep House Lab" width={72} height={72} />
        </div>
        <div className="auth-head auth-head-solo">
          <div>
            <h2 className="auth-title">Reset password</h2>
            <p className="auth-sub">
              Open the link from your email on this device. If you already did, request a new reset from Sign in.
            </p>
          </div>
        </div>
        {import.meta.env.DEV ? (
          <p className="auth-notice is-warn">
            Dev: confirm Site URL and Redirect URL include <code>/reset-password</code> in Supabase Auth settings.
          </p>
        ) : null}
        <button
          type="button"
          className="auth-submit"
          onClick={() => {
            clearPasswordRecoveryPending();
            navigate("/", { replace: true });
            auth.setShowAuth(true);
          }}
        >
          Back to sign in
        </button>
      </>,
    );
  }

  return shell(
    <>
      <div className="auth-brand">
        <img src={ART} alt="Deep House Lab" width={72} height={72} />
      </div>
      <div className="auth-head auth-head-solo">
        <div>
          <h2 className="auth-title">New password</h2>
          <p className="auth-sub">Choose a new password for your Deep House Lab account.</p>
        </div>
      </div>

      {error ? <p className="auth-notice is-error">{error}</p> : null}

      <div className="auth-fields">
        <PasswordField
          label="New password"
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setError(null);
            setPassword(e.target.value);
          }}
          hint="At least 6 characters"
        />
        <PasswordField
          label="Confirm password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setError(null);
            setConfirm(e.target.value);
          }}
          error={passwordMismatch ? "Passwords do not match" : undefined}
          hint={confirmTouched && passwordsMatch ? "Passwords match" : undefined}
        />
      </div>

      <button
        type="button"
        className="auth-submit"
        disabled={busy || !password || !confirm || !passwordsMatch}
        onClick={() => void submit()}
      >
        {busy ? "Saving…" : "Update password"}
      </button>
    </>,
  );
}
