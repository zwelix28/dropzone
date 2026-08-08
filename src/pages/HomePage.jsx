import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import { useApp } from "../context/AppContext.jsx";

/**
 * Guest-only marketing surface — no catalog, sidebar, or player chrome.
 * Brand-first, one CTA into auth / the vault.
 */
export default function HomePage() {
  const { auth } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(t);
  }, []);

  const enterVault = () => {
    auth.setShowAuth(true);
  };

  return (
    <div className={`landing-page ${ready ? "is-ready" : ""}`} role="main">
      <div className="landing-atmosphere" aria-hidden>
        <div className="landing-atmosphere-image" />
        <div className="landing-atmosphere-wash" />
        <div className="landing-atmosphere-grid" />
        <div className="landing-atmosphere-orb landing-atmosphere-orb-a" />
        <div className="landing-atmosphere-orb landing-atmosphere-orb-b" />
      </div>

      <div className="landing-frame">
        <header className="landing-brand-block">
          <img
            className="landing-logo"
            src="/logo.png"
            alt="Music Vault"
            width={120}
            height={120}
          />
          <h1 className="landing-product">Music Vault</h1>
          <p className="landing-tagline">
            Stream exclusive deep house mixes from the vault — sign in to enter.
          </p>
        </header>

        <div className="landing-cta-block">
          <button type="button" className="btn btn-primary landing-cta" onClick={enterVault}>
            <Icon name="compass" size={18} color="#07090F" />
            Enter Music Vault
          </button>
          <p className="landing-cta-hint">Access the site and sign in with one step</p>
        </div>
      </div>
    </div>
  );
}
