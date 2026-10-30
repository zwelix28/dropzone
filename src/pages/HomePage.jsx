import { useState } from "react";
import { IosInstructions } from "../components/InstallAppButton.jsx";
import { useApp } from "../context/AppContext.jsx";
import useInstallPrompt from "../hooks/useInstallPrompt.js";

const REASONS = [
  {
    title: "Curated sets",
    tone: "glow",
    copy: "Hand-picked deep house mixes, ready when the night starts.",
  },
  {
    title: "Resident DJs",
    tone: "glow",
    copy: "Follow the artists behind the sets and catch every new drop.",
  },
  {
    title: "Always streaming",
    tone: "soft",
    copy: "Press play anytime — long nights, late sessions, no rush to finish.",
  },
];

const ART = "/DeepHouseLabLogo.png";

/**
 * Guest landing — marketing surface into sign-in.
 */
export default function HomePage() {
  const { auth } = useApp();
  const { canPrompt, promptInstall, isIos, canInstall } = useInstallPrompt();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [installNote, setInstallNote] = useState("");

  const listenNow = () => {
    setMenuOpen(false);
    auth.setShowAuth(true);
  };

  const getTheApp = () => {
    setMenuOpen(false);
    setInstallNote("");
    if (canPrompt) {
      void promptInstall();
      return;
    }
    if (isIos && canInstall) {
      setShowIosSteps(true);
      return;
    }
    setInstallNote("Open this site in Chrome or Safari, then add Deep House Lab to your home screen.");
  };

  return (
    <div className="landing-site">
      <div className="landing-site-glow" aria-hidden="true" />
      <header className="landing-site-bar">
        <a href="#top" className="landing-site-mark" aria-label="Deep House Lab">
          <img src={ART} alt="" width={44} height={44} />
        </a>
        <nav className="landing-site-nav" aria-label="Landing">
          <a href="#inside-the-lab">Inside the Lab</a>
          <button type="button" onClick={getTheApp}>
            Get the app
          </button>
          <button type="button" className="landing-site-btn" onClick={listenNow}>
            Listen now
          </button>
        </nav>
        <button
          type="button"
          className="landing-site-btn landing-site-btn-ghost landing-site-menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>

      {menuOpen ? (
        <div className="landing-site-sheet" role="navigation" aria-label="Menu">
          <div className="landing-site-sheet-panel">
            <p className="landing-site-sheet-kicker">Navigate</p>
            <a href="#inside-the-lab" className="landing-site-sheet-link" onClick={() => setMenuOpen(false)}>
              Inside the Lab
            </a>
            <button type="button" className="landing-site-sheet-link" onClick={getTheApp}>
              Get the app
            </button>
            <button type="button" className="landing-site-btn landing-site-sheet-cta" onClick={listenNow}>
              Listen now
            </button>
          </div>
        </div>
      ) : null}

      <main id="top">
        <section className="landing-site-hero">
          <div className="landing-site-art-wrap">
            <img className="landing-site-art" src={ART} alt="Deep House Lab turntable logo" width={720} height={720} />
          </div>
          <div className="landing-site-copy">
            <h1>Deep house, streamed from the lab.</h1>
            <p>Sets, mixes and new releases for every late night.</p>
            <div className="landing-site-actions">
              <button type="button" className="landing-site-btn" onClick={listenNow}>
                Listen now
              </button>
              <button type="button" className="landing-site-btn landing-site-btn-ghost" onClick={getTheApp}>
                Get the app
              </button>
            </div>
            {installNote ? <p className="landing-site-note">{installNote}</p> : null}
          </div>
        </section>

        <section id="inside-the-lab" className="landing-site-why">
          <h2>Inside the Lab</h2>
          <p className="landing-site-why-lede">What Deep House Lab is built for.</p>
          <div className="landing-site-cards">
            {REASONS.map((item) => (
              <article key={item.title} className={`landing-site-card is-${item.tone}`}>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
          <div className="landing-site-close">
            <button type="button" className="landing-site-btn" onClick={listenNow}>
              Start listening
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-site-foot">
        <img src={ART} alt="" width={40} height={40} />
        <span>deephouselab.co.za</span>
      </footer>

      {showIosSteps ? <IosInstructions onClose={() => setShowIosSteps(false)} /> : null}
    </div>
  );
}
