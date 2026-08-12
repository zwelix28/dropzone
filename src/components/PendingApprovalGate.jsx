import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";

/** Full-screen gate while an account awaits admin approval — matches guest landing theme. */
export default function PendingApprovalGate({ username, onLogout }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(t);
  }, []);

  return (
    <div className={`landing-page pending-approval-page ${ready ? "is-ready" : ""}`} role="main">
      <div className="landing-atmosphere" aria-hidden>
        <div className="landing-atmosphere-image" />
        <div className="landing-atmosphere-wash" />
        <div className="landing-atmosphere-grid" />
        <div className="landing-atmosphere-orb landing-atmosphere-orb-a" />
        <div className="landing-atmosphere-orb landing-atmosphere-orb-b" />
      </div>

      <div className="landing-frame">
        <header className="landing-brand-block">
          <img className="landing-logo" src="/logo.png" alt="Music Vault" width={120} height={120} />
          <h1 className="landing-product">Music Vault</h1>
          <p className="landing-tagline">Awaiting approval</p>
        </header>

        <div className="pending-approval-copy">
          <p>
            {username ? `Hi ${username}. ` : ""}
            Your account is signed in, but an administrator must approve it before you can enter the vault.
          </p>
          <p className="pending-approval-hint">
            You’ll get access as soon as you’re approved — no need to sign up again. You can close this tab and come
            back later.
          </p>
        </div>

        <div className="landing-cta-block">
          <button type="button" className="btn btn-ghost landing-cta pending-approval-logout" onClick={onLogout}>
            <Icon name="logout" size={18} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
