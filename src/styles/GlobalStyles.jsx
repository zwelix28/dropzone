/* eslint-disable react/no-unknown-property */
export const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@500;600;700&family=Outfit:wght@400;500;600;700&display=swap');
  `}</style>
);

export const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:        #07090F;
      --bg2:       #0C1018;
      --surface:   #111827;
      --surface2:  #1A2235;
      --border:    #1E2D45;
      --accent:    #38BDF8;
      --accent2:   #0EA5E9;
      --accent3:   #7DD3FC;
      --glow:      rgba(56,189,248,0.18);
      --glow2:     rgba(56,189,248,0.06);
      --text:      #E2E8F0;
      --text2:     #94A3B8;
      --text3:     #475569;
      --red:       #F87171;
      --green:     #34D399;
      --orange:    #FB923C;
      --ff-display: 'Bebas Neue', sans-serif;
      --ff-body:    'DM Sans', sans-serif;
      --ff-mono:    'JetBrains Mono', monospace;
      /* Uber Move–like geometric sans for brand wordmark (Uber Move is proprietary). */
      --ff-brand:   'Manrope', sans-serif;
      --r:         10px;
      --r2:        16px;
      --desktop-sidebar-width: 264px;
      --mobile-tab-nav-height: 52px;
    }
    html, body, #root { height: 100%; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--ff-body);
      font-size: 15px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
      -webkit-tap-highlight-color: transparent;
    }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: var(--bg2); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--accent2); }
    .now-playing-scroll {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .now-playing-scroll::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    button { cursor: pointer; border: none; outline: none; font-family: var(--ff-body); }
    input, textarea, select { font-family: var(--ff-body); outline: none; }
    a { text-decoration: none; color: inherit; }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Animations */
    @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeInSoft { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
    @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
    @keyframes lab-vinyl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes wave {
      0%   { height: 4px; }
      25%  { height: 18px; }
      50%  { height: 8px; }
      75%  { height: 22px; }
      100% { height: 4px; }
    }
    @keyframes ripple { 0% { transform:scale(0.8); opacity:1; } 100% { transform:scale(2.4); opacity:0; } }
    @keyframes slideIn { from { transform:translateX(-20px); opacity:0; } to { transform:translateX(0); opacity:1; } }
    @keyframes glow { 0%,100% { box-shadow: 0 0 12px var(--glow); } 50% { box-shadow: 0 0 28px rgba(56,189,248,0.4); } }

    .fade-in { animation: fadeIn 0.4s ease both; }
    .slide-in { animation: slideIn 0.3s ease both; }
    /* Mobile tab switches: opacity only — no vertical slide (avoids profile/nav glitch). */
    @media (max-width: 720px) {
      .fade-in { animation: fadeInSoft 0.18s ease both; }
    }

    /* Guest landing — brand-first, no app chrome */
    @keyframes landingRise {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes landingOrbDrift {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(3%, -4%) scale(1.06); }
    }
    @keyframes landingLogoBreath {
      0%, 100% { filter: drop-shadow(0 0 18px rgba(56,189,248,0.22)); }
      50% { filter: drop-shadow(0 0 34px rgba(14,165,233,0.45)); }
    }
    .landing-page {
      position: relative;
      min-height: 100dvh;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--bg);
      padding: max(24px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right))
        max(28px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
    }
    .landing-atmosphere {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }
    .landing-atmosphere-image {
      position: absolute;
      inset: -4%;
      background-image: url("/images/landing-banner.jpg");
      background-size: cover;
      background-position: center;
      transform: scale(1.06);
      filter: saturate(1.05) brightness(0.55);
      opacity: 0.55;
    }
    .landing-atmosphere-wash {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 70% 55% at 50% 28%, rgba(14,165,233,0.18), transparent 62%),
        linear-gradient(180deg, rgba(7,9,15,0.35) 0%, rgba(7,9,15,0.72) 48%, rgba(7,9,15,0.94) 100%);
    }
    .landing-atmosphere-grid {
      position: absolute;
      inset: 0;
      opacity: 0.12;
      background-image:
        linear-gradient(rgba(56,189,248,0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px);
      background-size: 56px 56px;
      mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 20%, transparent 75%);
    }
    .landing-atmosphere-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(48px);
      animation: landingOrbDrift 14s ease-in-out infinite;
    }
    .landing-atmosphere-orb-a {
      width: min(48vw, 420px);
      height: min(48vw, 420px);
      top: 8%;
      left: 4%;
      background: rgba(14,165,233,0.22);
    }
    .landing-atmosphere-orb-b {
      width: min(42vw, 360px);
      height: min(42vw, 360px);
      right: 0;
      bottom: 6%;
      background: rgba(56,189,248,0.14);
      animation-delay: -5s;
    }
    .landing-frame {
      position: relative;
      z-index: 1;
      width: min(560px, 100%);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: clamp(28px, 6vw, 40px);
    }
    .landing-brand-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .landing-logo-wrap {
      width: clamp(96px, 24vw, 132px);
      height: clamp(96px, 24vw, 132px);
      border-radius: 50%;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: rgba(7, 9, 15, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
      animation: landingLogoBreath 5.5s ease-in-out infinite;
    }
    .landing-logo {
      width: 86%;
      height: 86%;
      object-fit: contain;
      border-radius: 0;
      display: block;
    }
    .landing-product {
      margin: 6px 0 0;
      font-family: var(--ff-display);
      font-size: clamp(2.1rem, 8vw, 3.1rem);
      letter-spacing: 0.14em;
      line-height: 1;
      color: var(--text);
      text-transform: uppercase;
      font-weight: 400;
    }
    .landing-tagline {
      margin: 8px 0 0;
      max-width: 34ch;
      font-size: clamp(14px, 3.2vw, 16px);
      line-height: 1.55;
      color: var(--text2);
      font-weight: 400;
    }
    .landing-cta-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
    }
    .landing-cta {
      min-height: 52px;
      padding: 14px 28px;
      font-size: 15px;
      letter-spacing: 0.02em;
      border-radius: 10px;
      width: min(100%, 300px);
      justify-content: center;
      box-shadow: 0 10px 36px rgba(14,165,233,0.28);
    }
    .landing-cta:hover {
      box-shadow: 0 14px 44px rgba(56,189,248,0.38);
    }
    .landing-cta-hint {
      margin: 0;
      font-size: 12px;
      color: var(--text3);
      letter-spacing: 0.02em;
    }
    .landing-page.is-ready .landing-logo-wrap {
      animation: landingLogoBreath 5.5s ease-in-out infinite, landingRise 0.7s ease both;
    }
    .landing-page.is-ready .landing-product {
      animation: landingRise 0.7s ease 0.08s both;
    }
    .landing-page.is-ready .landing-tagline {
      animation: landingRise 0.7s ease 0.16s both;
    }
    .landing-page.is-ready .landing-cta-block {
      animation: landingRise 0.75s ease 0.24s both;
    }
    .pending-approval-copy {
      max-width: 36ch;
      text-align: center;
      margin: 0 auto;
    }
    .pending-approval-copy p {
      margin: 0;
      font-size: clamp(14px, 3.2vw, 15px);
      line-height: 1.55;
      color: var(--text2);
    }
    .pending-approval-hint {
      margin-top: 10px !important;
      font-size: 13px !important;
      color: var(--text3) !important;
    }
    .pending-approval-logout {
      box-shadow: none;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(7, 9, 15, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .pending-approval-logout:hover {
      box-shadow: none;
      border-color: rgba(56, 189, 248, 0.35);
      background: rgba(7, 9, 15, 0.6);
    }
    .landing-page.is-ready .pending-approval-copy {
      animation: landingRise 0.7s ease 0.2s both;
    }
    @media (prefers-reduced-motion: reduce) {
      .landing-atmosphere-orb,
      .landing-logo-wrap,
      .landing-page.is-ready .landing-logo-wrap,
      .landing-page.is-ready .landing-product,
      .landing-page.is-ready .landing-tagline,
      .landing-page.is-ready .landing-cta-block,
      .landing-page.is-ready .pending-approval-copy {
        animation: none !important;
      }
    }

    /* Guest landing — mirrors in-app Now Spinning glow, still brand-first */
    @keyframes landingSitePulse {
      0%, 100% { box-shadow: 0 0 22px rgba(56, 189, 248, 0.16), inset 0 0 0 1px rgba(56, 189, 248, 0.22); }
      50% { box-shadow: 0 0 34px rgba(56, 189, 248, 0.28), inset 0 0 0 1px rgba(56, 189, 248, 0.38); }
    }
    .landing-site {
      position: relative;
      isolation: isolate;
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      background: #07090F;
      color: #F5F5F2;
      font-family: Outfit, system-ui, sans-serif;
      box-sizing: border-box;
      overflow-x: hidden;
    }
    .landing-site-glow {
      position: absolute;
      inset: 0 0 auto;
      height: min(70vh, 640px);
      pointer-events: none;
      z-index: 0;
      background:
        radial-gradient(70% 80% at 50% 0%, rgba(56, 189, 248, 0.18), transparent 58%),
        radial-gradient(40% 50% at 85% 20%, rgba(14, 165, 233, 0.1), transparent 60%);
    }
    .landing-site > *:not(.landing-site-glow) { position: relative; z-index: 1; }
    .landing-site-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: max(16px, env(safe-area-inset-top)) 20px 8px;
    }
    .landing-site-mark {
      display: inline-flex;
      line-height: 0;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.22);
    }
    .landing-site-mark img {
      width: 44px;
      height: 44px;
      object-fit: cover;
      display: block;
    }
    .landing-site-nav {
      display: none;
      align-items: center;
      gap: 6px;
    }
    .landing-site-nav a,
    .landing-site-nav button:not(.landing-site-btn) {
      font: inherit;
      background: transparent;
      border: 1px solid transparent;
      color: #A9B0BD;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      min-height: 40px;
      padding: 0 14px;
      border-radius: 999px;
      cursor: pointer;
      transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .landing-site-nav a:hover,
    .landing-site-nav button:not(.landing-site-btn):hover {
      color: #F5F5F2;
      background: rgba(56, 189, 248, 0.08);
      border-color: rgba(56, 189, 248, 0.28);
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.12);
    }
    .landing-site-btn {
      background: #F29A80;
      color: #07090F;
      font-family: inherit;
      font-weight: 600;
      font-size: 16px;
      border: 0;
      border-radius: 28px;
      height: 52px;
      padding: 0 28px;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .landing-site-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(242, 154, 128, 0.35);
    }
    .landing-site-btn-ghost {
      background: transparent;
      color: #F5F5F2;
      border: 1.5px solid rgba(56, 189, 248, 0.55);
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.12);
    }
    .landing-site-btn-ghost:hover {
      border-color: var(--accent);
      background: rgba(56, 189, 248, 0.08);
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.22);
    }
    .landing-site-menu {
      height: 44px;
      padding: 0 18px;
      font-size: 14px;
    }
    .landing-site-sheet {
      padding: 8px 20px 16px;
      animation: landingRise 0.35s ease both;
    }
    .landing-site-sheet-panel {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      border-radius: 20px;
      border: 1px solid rgba(56, 189, 248, 0.28);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.2), transparent 55%),
        linear-gradient(160deg, #1A2230, #0E131D);
      box-shadow:
        0 0 28px rgba(56, 189, 248, 0.14),
        0 18px 40px rgba(0, 0, 0, 0.45);
    }
    .landing-site-sheet-kicker {
      margin: 0 0 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--accent);
      text-shadow: 0 0 14px rgba(56, 189, 248, 0.35);
    }
    .landing-site-sheet-link {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      min-height: 48px;
      padding: 0 16px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      background: rgba(7, 9, 15, 0.35);
      color: #F5F5F2;
      font: inherit;
      font-size: 15px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      box-sizing: border-box;
      transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    }
    .landing-site-sheet-link:hover,
    .landing-site-sheet-link:focus-visible {
      border-color: rgba(56, 189, 248, 0.4);
      background: rgba(56, 189, 248, 0.1);
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.16);
      outline: none;
    }
    .landing-site-sheet-cta {
      width: 100%;
      margin-top: 4px;
      height: 48px;
      font-size: 15px;
      box-shadow: 0 0 22px rgba(242, 154, 128, 0.28);
    }
    .landing-site main {
      flex: 1;
      width: min(1120px, 100%);
      margin: 0 auto;
      padding: 8px 20px 8px;
      box-sizing: border-box;
    }
    .landing-site-hero {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .landing-site-art-wrap {
      width: min(100%, 420px);
      margin-inline: auto;
      border-radius: 24px;
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.22), transparent 55%),
        linear-gradient(160deg, #1A2230, #0E131D);
      border: 1px solid rgba(56, 189, 248, 0.22);
      box-shadow: 0 0 36px rgba(56, 189, 248, 0.16);
      overflow: hidden;
    }
    .landing-site-art {
      width: 100%;
      aspect-ratio: 1;
      height: auto;
      object-fit: cover;
      object-position: center;
      display: block;
      background: #141414;
    }
    .landing-site-copy {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 8px 0 4px;
    }
    .landing-site-copy h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    .landing-site-copy > p:not(.landing-site-note) {
      margin: 0;
      color: #A9B0BD;
      font-size: 15px;
      line-height: 1.5;
    }
    .landing-site-actions {
      display: flex;
      gap: 12px;
    }
    .landing-site-actions .landing-site-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .landing-site-note {
      margin: 0;
      color: #A9B0BD;
      font-size: 13px;
      line-height: 1.45;
    }
    .landing-site-why {
      padding-top: 8px;
    }
    .landing-site-why h2 {
      margin: 0;
      padding: 24px 0 6px;
      font-size: 18px;
      font-weight: 600;
    }
    .landing-site-why-lede {
      margin: 0 0 14px;
      color: #A9B0BD;
      font-size: 14px;
      line-height: 1.45;
    }
    .landing-site-cards {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .landing-site-card {
      border-radius: 20px;
      padding: 18px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.1), transparent 55%),
        linear-gradient(160deg, #171E2B, #10151F);
    }
    .landing-site-card h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    .landing-site-card.is-glow {
      border-color: rgba(56, 189, 248, 0.32);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.22), transparent 55%),
        linear-gradient(160deg, #1A2230, #0E131D);
      animation: landingSitePulse 4.5s ease-in-out infinite;
    }
    .landing-site-card.is-glow h3 { color: var(--accent); }
    .landing-site-card.is-soft h3 { color: #F29A80; }
    .landing-site-card p {
      margin: 6px 0 0;
      color: #A9B0BD;
      font-size: 13px;
      line-height: 1.45;
    }
    .landing-site-close {
      display: flex;
      justify-content: center;
      padding: 22px 0 8px;
    }
    .landing-site-close .landing-site-btn {
      min-width: min(100%, 260px);
      box-shadow: 0 0 22px rgba(242, 154, 128, 0.28);
    }
    .landing-site-foot {
      margin-top: auto;
      padding: 24px 20px max(24px, env(safe-area-inset-bottom));
      border-top: 1px solid #1E2634;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #A9B0BD;
      font-size: 13px;
      width: min(1120px, 100%);
      margin-left: auto;
      margin-right: auto;
      box-sizing: border-box;
    }
    .landing-site-foot img {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: cover;
      display: block;
    }
    @media (prefers-reduced-motion: reduce) {
      .landing-site-card.is-glow { animation: none; }
      .landing-site-btn { transition: none; }
    }
    @media (min-width: 900px) {
      .landing-site-bar {
        width: min(1120px, 100%);
        margin: 0 auto;
        padding-top: 28px;
        padding-bottom: 8px;
      }
      .landing-site-menu,
      .landing-site-sheet { display: none; }
      .landing-site-nav {
        display: flex;
        align-items: center;
      }
      .landing-site-nav a,
      .landing-site-nav button:not(.landing-site-btn) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 40px;
        min-height: 40px;
        line-height: 1;
        box-sizing: border-box;
      }
      .landing-site-nav .landing-site-btn {
        height: 44px;
        padding: 0 20px;
        font-size: 14px;
        margin-left: 10px;
        box-shadow: 0 0 18px rgba(242, 154, 128, 0.22);
      }
      .landing-site main { padding-top: 28px; }
      .landing-site-hero {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) minmax(320px, 1fr);
        align-items: center;
        gap: 56px;
      }
      .landing-site-art-wrap {
        width: 100%;
        margin-inline: 0;
      }
      .landing-site-copy h1 {
        font-size: clamp(40px, 4.2vw, 56px);
      }
      .landing-site-copy > p:not(.landing-site-note) {
        font-size: 18px;
        max-width: 36ch;
      }
      .landing-site-actions { max-width: 440px; }
      .landing-site-actions .landing-site-btn { flex: 0 1 200px; }
      .landing-site-why { padding-top: 36px; }
      .landing-site-why h2 { font-size: 28px; padding: 12px 0 8px; }
      .landing-site-why-lede { font-size: 16px; margin-bottom: 18px; }
      .landing-site-cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }
      .landing-site-card { padding: 22px; min-height: 148px; }
      .landing-site-card h3 { font-size: 18px; }
      .landing-site-card p { font-size: 15px; }
      .landing-site-close { padding-top: 32px; }
      .landing-site-foot { padding-top: 28px; }
    }

    /* Admin console */
    .admin-shell {
      max-width: 1100px;
      margin: 0 auto;
    }
    .admin-hero {
      margin-bottom: 18px;
      padding: 18px 20px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.16), transparent 55%),
        linear-gradient(160deg, var(--surface2), var(--surface));
    }
    .admin-lede {
      margin: 0;
      max-width: 58ch;
      color: var(--text2);
      font-size: 14px;
      line-height: 1.55;
    }
    .admin-error {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.25);
      color: var(--red);
      font-size: 13px;
    }
    .admin-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 20px;
      padding: 6px;
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
      scrollbar-width: none;
    }
    .admin-tabs::-webkit-scrollbar { display: none; }
    .admin-tab {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: max-content;
      padding: 9px 12px;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--text2);
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
    }
    .admin-tab.is-on {
      background: var(--accent2);
      color: #07090F;
    }
    .admin-tab-badge {
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(7, 9, 15, 0.18);
      font-size: 10px;
      font-weight: 800;
    }
    .admin-tab.is-on .admin-tab-badge {
      background: rgba(7, 9, 15, 0.2);
      color: #07090F;
    }
    .admin-stat-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .admin-stat-grid-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .admin-stat-card {
      text-align: center;
      padding: 16px 14px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background:
        radial-gradient(120% 140% at 50% 0%, rgba(56, 189, 248, 0.08), transparent 55%),
        var(--surface);
      transition: border-color 0.2s ease, transform 0.2s ease;
    }
    @media (hover: hover) and (pointer: fine) {
      .admin-stat-card:hover {
        border-color: rgba(56, 189, 248, 0.35);
        transform: translateY(-2px);
      }
    }
    .admin-stat-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 8px;
    }
    .admin-stat-value {
      font-size: 22px;
      font-weight: 800;
      font-family: var(--ff-mono);
      line-height: 1.1;
    }
    .admin-stat-label {
      font-size: 11px;
      color: var(--text3);
      margin-top: 2px;
    }
    .admin-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px 20px;
    }
    .admin-panel-title {
      margin: 0 0 12px;
      font-weight: 700;
      font-size: 16px;
    }
    .admin-panel-note {
      margin-left: 8px;
      color: var(--orange);
      font-weight: 600;
      font-size: 13px;
    }
    .admin-panel-desc {
      margin: 0 0 14px;
      color: var(--text3);
      font-size: 13px;
      line-height: 1.5;
    }
    .admin-dj-panel {
      max-width: 640px;
    }
    .admin-floor-panel {
      max-width: 980px;
    }
    .admin-floor-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: 22px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .admin-floor-layout {
        grid-template-columns: 1fr;
      }
    }
    .admin-empty {
      margin: 0;
      color: var(--text3);
      font-size: 13px;
    }
    .admin-table-shell {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--bg2);
    }
    .admin-table-shell.is-compact {
      border-radius: 8px;
    }
    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .admin-table th {
      background: rgba(17, 24, 39, 0.85);
      color: var(--text3);
      font-weight: 600;
      text-align: left;
    }
    .admin-table tr {
      border-bottom: 1px solid var(--border);
    }
    .admin-table tr:last-child {
      border-bottom: 0;
    }
    .admin-insights {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .admin-insights-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .admin-insights-toolbar p {
      margin: 0;
      color: var(--text3);
      font-size: 12px;
    }
    .admin-rank-rows {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .admin-submission-browser {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .admin-submission-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .admin-submission-nav .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .admin-submission-count {
      flex: 1 1 auto;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: var(--text3);
      letter-spacing: 0.02em;
    }
    .admin-submission-card {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .admin-submission-hero {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .admin-submission-cover {
      width: 112px;
      height: 112px;
      border-radius: 12px;
      object-fit: cover;
      flex-shrink: 0;
      background: var(--surface2);
    }
    .admin-submission-meta {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .admin-submission-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--accent2);
      text-decoration: none;
      line-height: 1.25;
    }
    .admin-submission-title:hover {
      text-decoration: underline;
    }
    .admin-submission-sub {
      font-size: 12px;
      color: var(--text3);
    }
    .admin-submission-owner {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 10px;
      font-size: 13px;
      color: var(--text2);
    }
    .admin-submission-owner strong {
      color: var(--text);
      font-weight: 700;
    }
    .admin-submission-owner span {
      color: var(--text3);
    }
    .admin-submission-note,
    .admin-submission-desc {
      margin: 4px 0 0;
      font-size: 13px;
      line-height: 1.45;
      color: var(--text2);
    }
    .admin-submission-note {
      color: var(--text3);
    }
    .admin-submission-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .admin-submission-actions .btn {
      font-size: 13px;
    }
    .admin-submission-next-inline {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .admin-submission-edit {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 620px;
      padding-top: 4px;
      border-top: 1px solid var(--border);
    }
    @media (max-width: 720px) {
      .admin-hero {
        padding: 14px;
        border-radius: 12px;
        margin-bottom: 14px;
      }
      .admin-lede { font-size: 13px; }
      .admin-tabs {
        margin-bottom: 16px;
        border-radius: 12px;
      }
      .admin-tab {
        flex: 0 0 auto;
        padding: 8px 12px;
      }
      .admin-stat-grid,
      .admin-stat-grid-4 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .admin-stat-card {
        padding: 12px 10px;
        border-radius: 12px;
      }
      .admin-stat-value { font-size: 18px; }
      .admin-stat-label { font-size: 10px; }
      .admin-panel {
        padding: 12px;
        border-radius: 12px;
      }
      .admin-panel-title { font-size: 14px; }
      .admin-panel-note { font-size: 12px; }
      .admin-panel-desc { font-size: 12px; }
      .admin-table { font-size: 11px; }
      .admin-insights { gap: 14px; }
      .admin-insights-toolbar p { font-size: 11px; }
      .admin-submission-nav .btn { font-size: 12px; padding: 6px 10px; }
      .admin-submission-count { font-size: 11px; width: 100%; order: -1; }
      .admin-submission-card { padding: 12px; border-radius: 12px; gap: 12px; }
      .admin-submission-hero { gap: 12px; }
      .admin-submission-cover { width: 84px; height: 84px; border-radius: 10px; }
      .admin-submission-title { font-size: 15px; }
      .admin-submission-sub,
      .admin-submission-owner,
      .admin-submission-note,
      .admin-submission-desc { font-size: 12px; }
      .admin-submission-actions .btn { font-size: 12px; padding: 6px 10px; }
      .admin-submission-next-inline { margin-left: 0; width: 100%; justify-content: center; }
    }

    /* Settings */
    .settings-shell {
      max-width: 760px;
      margin: 0 auto;
    }
    .settings-lede {
      color: var(--text2);
      font-size: 14px;
      line-height: 1.55;
      margin: 0 0 20px;
      max-width: 560px;
    }
    .settings-plan-card {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
      padding: 18px 20px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.16), transparent 55%),
        linear-gradient(160deg, var(--surface2), var(--surface));
    }
    .settings-plan-card.is-pro {
      border-color: rgba(52, 211, 153, 0.35);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(52, 211, 153, 0.16), transparent 55%),
        linear-gradient(160deg, var(--surface2), var(--surface));
    }
    .settings-plan-kicker {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text3);
    }
    .settings-plan-name {
      margin-top: 4px;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .settings-plan-note {
      margin: 6px 0 0;
      font-size: 12px;
      color: var(--text2);
      line-height: 1.45;
      max-width: 42ch;
    }
    .settings-plan-badge {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #fff;
      background: rgb(22, 163, 74);
      padding: 6px 10px;
      border-radius: 8px;
    }
    .settings-section {
      position: relative;
      overflow: hidden;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px 20px;
      margin-bottom: 14px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .settings-section::before {
      content: "";
      position: absolute;
      left: 0;
      top: 14px;
      bottom: 14px;
      width: 2px;
      border-radius: 2px;
      background: rgba(56, 189, 248, 0.35);
    }
    @media (hover: hover) and (pointer: fine) {
      .settings-section:hover {
        border-color: rgba(56, 189, 248, 0.28);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }
    }
    .settings-section.is-compact {
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .settings-section-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
      padding-left: 8px;
    }
    .settings-section-icon {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.22);
    }
    .settings-section-titles {
      min-width: 0;
      flex: 1;
    }
    .settings-section-titles h2 {
      font-weight: 700;
      font-size: 16px;
      margin: 0 0 4px;
    }
    .settings-section-titles p {
      font-size: 12px;
      color: var(--text3);
      margin: 0;
      line-height: 1.5;
    }
    .settings-section.is-compact .settings-section-titles h2 { font-size: 14px; }
    .settings-section.is-compact .settings-section-titles p { font-size: 11px; }
    .settings-section-body {
      padding-left: 8px;
    }
    @media (max-width: 720px) {
      .settings-lede {
        font-size: 13px;
        margin-bottom: 16px;
      }
      .settings-plan-card {
        padding: 14px;
        border-radius: 12px;
        margin-bottom: 14px;
      }
      .settings-plan-name { font-size: 18px; }
      .settings-section-head { gap: 10px; }
      .settings-section-icon {
        width: 28px;
        height: 28px;
        border-radius: 8px;
      }
    }

    /* Connections */
    .connections-shell {
      max-width: 920px;
      margin: 0 auto;
    }
    .connections-lede {
      color: var(--text2);
      font-size: 14px;
      line-height: 1.55;
      margin: 0 0 22px;
      max-width: 560px;
    }
    .connections-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 18px;
    }
    .connections-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 16px 18px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.12), transparent 55%),
        var(--surface);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    .connections-stat:hover {
      border-color: rgba(56, 189, 248, 0.35);
    }
    .connections-stat.is-on {
      border-color: var(--accent2);
      box-shadow: 0 0 0 1px rgba(14, 165, 233, 0.25);
    }
    .connections-stat-value {
      font-family: var(--ff-mono);
      font-size: 28px;
      font-weight: 700;
      line-height: 1;
      color: var(--text);
    }
    .connections-stat-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text3);
    }
    .connections-tabs {
      margin: 0 0 14px;
    }
    .connections-search {
      position: relative;
      margin-bottom: 18px;
      max-width: 420px;
    }
    .connections-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }
    .connections-search .inp {
      width: 100%;
      padding-left: 36px;
    }
    .connections-error {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.25);
      color: var(--red);
      font-size: 13px;
    }
    .connections-empty {
      padding: 40px 24px;
      text-align: center;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      max-width: 460px;
    }
    .connections-empty-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 14px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
    }
    .connections-empty h3 {
      margin: 0 0 8px;
      font-size: 17px;
      font-weight: 700;
    }
    .connections-empty p {
      color: var(--text2);
      font-size: 14px;
      line-height: 1.55;
      margin: 0 0 18px;
    }
    .connections-empty-soft {
      padding: 28px 16px;
      max-width: none;
    }
    .connections-empty-soft p {
      margin: 12px 0 0;
      color: var(--text3);
    }
    .connections-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
    }
    .connections-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 16px;
      border-radius: 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }
    @media (hover: hover) and (pointer: fine) {
      .connections-card:hover {
        border-color: rgba(56, 189, 248, 0.35);
        transform: translateY(-2px);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
      }
    }
    .connections-card-main {
      display: flex;
      gap: 12px;
      min-width: 0;
      text-decoration: none;
      color: inherit;
    }
    .connections-card-copy {
      min-width: 0;
      flex: 1;
    }
    .connections-card-name {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      font-weight: 700;
      font-size: 15px;
    }
    .connections-card-handle {
      font-size: 12px;
      color: var(--accent);
      margin-top: 2px;
    }
    .connections-card-meta {
      font-size: 11px;
      color: var(--text3);
      margin-top: 4px;
    }
    .connections-card-bio {
      margin: 8px 0 0;
      font-size: 12px;
      color: var(--text2);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .connections-card-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: auto;
    }
    .connections-card-genre {
      font-size: 10px;
    }
    @media (max-width: 720px) {
      .connections-lede {
        font-size: 13px;
        margin-bottom: 16px;
      }
      .connections-stats {
        gap: 8px;
        margin-bottom: 14px;
      }
      .connections-stat {
        padding: 12px 14px;
        border-radius: 12px;
      }
      .connections-stat-value { font-size: 22px; }
      .connections-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .connections-card { padding: 12px; gap: 12px; border-radius: 12px; }
      .connections-card-name { font-size: 14px; }
      .connections-empty {
        padding: 28px 16px;
        border-radius: 12px;
      }
      .connections-empty h3 { font-size: 15px; }
      .connections-empty p { font-size: 13px; }
    }

    /* Signed-in Home — mock structure, app theme */
    .lab-home {
      padding: 16px 16px 28px;
      max-width: 1120px;
    }
    .lab-home-chips {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      margin: 0 0 16px;
      padding-bottom: 2px;
      scrollbar-width: none;
    }
    .lab-home-chips::-webkit-scrollbar { display: none; }
    .lab-home-chip {
      height: 40px;
      padding: 0 16px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      flex: none;
    }
    .lab-home-chip.is-on {
      background: var(--accent2);
      border-color: var(--accent2);
      color: var(--bg);
      font-weight: 600;
    }
    .lab-home-hero {
      position: relative;
      overflow: hidden;
      min-height: 210px;
      border-radius: 24px;
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.22), transparent 55%),
        linear-gradient(160deg, var(--surface2), var(--bg2));
      border: 1px solid var(--border);
      padding: 20px;
      margin-bottom: 8px;
    }
    .lab-home-kicker,
    .lab-home-title,
    .lab-home-meta,
    .lab-home-play {
      position: relative;
      z-index: 1;
    }
    .lab-home-kicker {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: var(--accent);
    }
    .lab-home-title {
      margin: 8px 0 4px;
      max-width: 16ch;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    .lab-home-meta {
      margin: 0;
      color: var(--text2);
      font-size: 13px;
    }
    .lab-home-play {
      margin-top: 18px;
      height: 44px;
      padding: 0 22px;
      border: 0;
      border-radius: 22px;
      background: var(--accent2);
      color: var(--bg);
      font: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .lab-home-play:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .lab-home-vinyl {
      position: absolute;
      right: -56px;
      top: 0;
      width: 210px;
      height: 210px;
      pointer-events: none;
    }
    .lab-home-vinyl-disc {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: repeating-radial-gradient(circle, #0A0C11 0 2px, #1A202B 2px 3px);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
      animation: lab-vinyl-spin 18s linear infinite;
      animation-play-state: paused;
      will-change: transform;
    }
    .lab-home-vinyl-disc.is-playing {
      animation-play-state: running;
    }
    .lab-home-vinyl span {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 74px;
      height: 74px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid #0A0C11;
      background: #141414;
    }
    .lab-home-vinyl img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    @media (prefers-reduced-motion: reduce) {
      .lab-home-vinyl-disc {
        animation: none;
      }
    }
    .lab-home-sec {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin: 0;
      padding: 18px 0 12px;
      font-size: 18px;
      font-weight: 600;
    }
    .lab-home-sec a {
      color: var(--text2);
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
    }
    .lab-home-sec a:hover { color: var(--accent); }
    .lab-home-crates {
      display: flex;
      gap: 14px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 4px;
      scrollbar-width: none;
    }
    .lab-home-crates::-webkit-scrollbar { display: none; }
    .lab-home-crate {
      position: relative;
      width: 148px;
      flex: none;
      scroll-snap-align: start;
      text-decoration: none;
      color: inherit;
    }
    .lab-home-crate-vinyl {
      position: absolute;
      left: 34px;
      top: 6px;
      width: 108px;
      height: 108px;
      border-radius: 50%;
      background: repeating-radial-gradient(circle, #0A0C11 0 2px, #1A202B 2px 3px);
    }
    .lab-home-crate-vinyl span {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 36px;
      height: 36px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid #0A0C11;
    }
    .lab-home-crate-vinyl img,
    .lab-home-crate-cover {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .lab-home-crate-cover {
      position: relative;
      width: 118px;
      height: 118px;
      border-radius: 14px;
      background: #141414;
    }
    .lab-home-crate b {
      display: block;
      margin-top: 8px;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lab-home-row {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      min-height: 52px;
      padding: 6px 0;
      background: none;
      border: 0;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .lab-home-row .n {
      width: 22px;
      color: var(--accent);
      font-weight: 700;
      font-size: 18px;
      font-variant-numeric: tabular-nums;
    }
    .lab-home-row .who { flex: 1; min-width: 0; }
    .lab-home-row .who b {
      display: block;
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lab-home-row .who span,
    .lab-home-row .dur {
      color: var(--text2);
      font-size: 13px;
    }
    .lab-home-row .dur { font-variant-numeric: tabular-nums; }
    .lab-home-empty {
      color: var(--text2);
      font-size: 14px;
      padding: 12px 0 4px;
    }
    .lab-home-shelves {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .lab-home-shelf {
      display: flex;
      gap: 14px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 4px;
      scrollbar-width: none;
    }
    .lab-home-shelf::-webkit-scrollbar { display: none; }
    .lab-home-shelf-card {
      width: 148px;
      flex: none;
      scroll-snap-align: start;
      text-decoration: none;
      color: inherit;
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .lab-home-shelf-art {
      position: relative;
      display: block;
      width: 148px;
      height: 148px;
    }
    .lab-home-shelf-art .lab-home-crate-vinyl { display: none; }
    .lab-home-shelf-card .lab-home-shelf-art img {
      width: 100%;
      height: 100%;
      border-radius: 0;
      object-fit: cover;
      display: block;
      background: #141414;
    }
    .lab-home-shelf-card .lab-home-shelf-art img.lab-home-crate-cover {
      width: 148px;
      height: 148px;
      border-radius: 14px;
    }
    .lab-home-shelf-card b {
      display: block;
      margin-top: 8px;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lab-home-shelf-card .sub {
      display: block;
      margin-top: 2px;
      color: var(--text2);
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lab-home-progress {
      display: block;
      margin-top: 8px;
      height: 3px;
      border-radius: 99px;
      background: rgba(255, 255, 255, 0.12);
      overflow: hidden;
    }
    .lab-home-progress span {
      display: block;
      height: 100%;
      background: var(--accent);
    }
    .lab-home-month { display: none; }
    .lab-home-month-card {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      border-radius: 24px;
      border: 1px solid var(--border);
      background:
        radial-gradient(120% 80% at 50% 0%, rgba(56, 189, 248, 0.16), transparent 60%),
        linear-gradient(180deg, var(--surface2), var(--bg2));
      overflow: hidden;
    }
    .lab-home-month-art {
      width: 100%;
      aspect-ratio: 1.15;
      object-fit: cover;
      display: block;
      background: #141414;
    }
    .lab-home-month-copy {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 16px 18px 18px;
    }
    .lab-home-month-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }
    .lab-home-month-handle {
      color: var(--accent);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
    }
    .lab-home-month-handle:hover { color: var(--accent3); }
    .lab-home-month-bio {
      margin: 6px 0 0;
      color: var(--text2);
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      overflow: visible;
    }
    .lab-home-month-mix {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      margin-top: 12px;
    }
    .lab-home-month-mix img {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
      background: #141414;
    }
    .lab-home-month-mix div { flex: 1; min-width: 0; }
    .lab-home-month-mix b {
      display: block;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lab-home-month-mix span {
      color: var(--text2);
      font-size: 12px;
    }
    .lab-home-month-mix .lab-home-play {
      margin-top: 0;
      height: 36px;
      padding: 0 14px;
      flex-shrink: 0;
    }
    @media (max-width: 720px) {
      .lab-home-hero {
        height: 210px;
        min-height: 210px;
        max-height: 210px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        box-sizing: border-box;
      }
      .lab-home-title {
        flex: 1 1 auto;
        min-height: 0;
        margin: 8px 0 12px;
        max-width: 60%;
        font-size: 16px;
        line-height: 1.25;
        overflow: hidden;
        white-space: normal;
        word-break: break-word;
        display: block;
      }
      .lab-home-meta {
        display: none;
      }
      .lab-home-play {
        margin-top: auto;
        flex-shrink: 0;
      }
      .lab-home-vinyl {
        top: 50%;
        left: auto;
        right: 0;
        transform: translate(26.67%, -50%);
      }
      .lab-home-sec { font-weight: 500; }
      .lab-home-crate b,
      .lab-home-shelf-card b { font-weight: 500; }
      .lab-home-ranks-list {
        display: flex;
        flex-direction: column;
        gap: 1px;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--border);
      }
      .lab-home-ranks .lab-home-row {
        position: relative;
        gap: 12px;
        min-height: 0;
        padding: 12px 14px 12px 12px;
        border: 0;
        border-radius: 0;
        background: var(--surface);
        transition: background 0.15s ease;
      }
      .lab-home-ranks .lab-home-row::before {
        content: "";
        position: absolute;
        left: 0;
        top: 10px;
        bottom: 10px;
        width: 2px;
        border-radius: 2px;
        background: rgba(56, 189, 248, 0.2);
      }
      .lab-home-ranks .lab-home-row:first-child::before {
        background: var(--accent);
      }
      .lab-home-ranks .lab-home-row:active {
        background: rgba(56, 189, 248, 0.06);
      }
      .lab-home-ranks .lab-home-row .n {
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: 1px solid rgba(56, 189, 248, 0.3);
        background: rgba(56, 189, 248, 0.1);
        color: var(--accent);
        font-weight: 700;
        font-size: 11px;
      }
      .lab-home-ranks .lab-home-row:first-child .n {
        border-color: var(--accent2);
        background: var(--accent2);
        color: var(--bg);
      }
      .lab-home-ranks .lab-home-row .who {
        padding-right: 12px;
      }
      .lab-home-ranks .lab-home-row .who b {
        font-weight: 700;
        font-size: 12px;
        line-height: 1.3;
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lab-home-ranks .lab-home-row .who span { display: none; }
      .lab-home-ranks .lab-home-row::after {
        content: "›";
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text3);
        font-size: 16px;
        line-height: 1;
        pointer-events: none;
      }
      .lab-home-shelf-art {
        width: 148px;
        height: 118px;
      }
      .lab-home-shelf-art .lab-home-crate-vinyl { display: block; }
      .lab-home-shelf-card .lab-home-shelf-art img.lab-home-crate-cover {
        width: 118px;
        height: 118px;
      }
      .lab-home-shelf-card .sub { display: none; }

      /* Continue listening — framed window panes, half-size art */
      .lab-home-continue-pane {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1px;
        overflow: hidden;
        scroll-snap-type: none;
        padding: 0;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--border);
      }
      .lab-home-continue-pane .lab-home-shelf-card {
        width: auto;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px;
        scroll-snap-align: none;
        background: var(--surface);
      }
      .lab-home-continue-pane .lab-home-shelf-card:last-child:nth-child(odd) {
        grid-column: 1 / -1;
      }
      .lab-home-continue-pane .lab-home-shelf-art {
        width: 53px;
        height: 53px;
        flex-shrink: 0;
      }
      .lab-home-continue-pane .lab-home-shelf-art .lab-home-crate-vinyl {
        display: none;
      }
      .lab-home-continue-pane .lab-home-shelf-card .lab-home-shelf-art img.lab-home-crate-cover {
        width: 53px;
        height: 53px;
        border-radius: 7px;
      }
      .lab-home-continue-copy {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .lab-home-continue-pane .lab-home-shelf-card b {
        margin-top: 0;
        font-size: 12px;
        font-weight: 700;
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lab-home-continue-pane .lab-home-progress {
        margin-top: 2px;
      }

      /* Fresh crates — separated rounded squares in a horizontal slider */
      .lab-home-crates-pane {
        display: flex;
        gap: 9px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding: 0 0 4px;
        border: 0;
        border-radius: 0;
        background: transparent;
        scrollbar-width: none;
      }
      .lab-home-crates-pane::-webkit-scrollbar { display: none; }
      .lab-home-crates-pane .lab-home-crate {
        width: 106px;
        flex: none;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 7px;
        padding: 9px;
        scroll-snap-align: start;
        border: 1px solid var(--border);
        border-radius: 13px;
        background: var(--surface);
      }
      .lab-home-crates-pane .lab-home-crate-vinyl {
        display: none;
      }
      .lab-home-crates-pane .lab-home-crate-cover {
        position: static;
        width: 88%;
        height: auto;
        aspect-ratio: 1;
        flex-shrink: 0;
        align-self: center;
        border-radius: 9px;
      }
      .lab-home-crate-copy {
        min-width: 0;
      }
      .lab-home-crates-pane .lab-home-crate b {
        margin-top: 0;
        font-size: 12px;
        font-weight: 700;
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }
    @media (min-width: 1080px) {
      .lab-home { max-width: none; padding: 28px 36px 40px; }
      .lab-home-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
        column-gap: 28px;
        row-gap: 0;
        align-items: start;
      }
      .lab-home-main {
        grid-column: 1;
        grid-row: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      /* Shorter Now Spinning — leaves vertical room; Top 5 titles get full width below */
      .lab-home-hero {
        height: 200px;
        min-height: 200px;
        max-height: 200px;
        margin-bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        box-sizing: border-box;
      }
      .lab-home-title {
        flex: 1 1 auto;
        min-height: 0;
        margin: 8px 0 12px;
        max-width: 58%;
        font-size: 22px;
        font-weight: 700;
        line-height: 1.25;
        overflow: hidden;
        white-space: normal;
        word-break: break-word;
      }
      .lab-home-meta { display: none; }
      .lab-home-play {
        margin-top: auto;
        flex-shrink: 0;
      }
      .lab-home-vinyl {
        top: 50%;
        bottom: auto;
        height: 200px;
        width: 200px;
        right: 0;
        transform: translate(26.67%, -50%);
      }
      .lab-home-vinyl span {
        width: 35.24%;
        height: auto;
        aspect-ratio: 1;
      }

      .lab-home-rail {
        display: flex;
        flex-direction: column;
        gap: 18px;
        grid-column: 2;
        grid-row: 1;
        align-self: start;
        min-width: 0;
      }
      .lab-home-month {
        display: flex;
        flex-direction: column;
        min-width: 0;
        height: auto;
      }
      .lab-home-month .lab-home-sec,
      .lab-home-floor .lab-home-sec {
        padding: 0 0 8px;
        line-height: 1.15;
        min-height: 0;
        align-items: center;
      }
      .lab-home-month-card {
        flex: 0 0 auto;
        height: auto;
        min-height: 0;
      }
      .lab-home-month-copy {
        flex: 0 0 auto;
      }

      /* This week on the floor — curated event promo rail */
      .lab-home-floor {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .lab-home-floor-card {
        border-radius: 16px;
        border: 1px solid var(--border);
        background:
          radial-gradient(120% 80% at 50% 0%, rgba(242, 154, 128, 0.12), transparent 58%),
          linear-gradient(180deg, var(--surface2), var(--bg2));
        overflow: hidden;
        padding: 10px;
      }
      .lab-home-floor-featured {
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: inherit;
        border-radius: 14px;
        overflow: hidden;
      }
      .lab-home-floor-featured-art {
        width: 100%;
        border: 0;
        padding: 0;
        border-radius: 10px;
        overflow: hidden;
        line-height: 0;
        display: flex;
        justify-content: center;
        background: transparent;
        cursor: zoom-in;
      }
      .lab-home-floor-featured img {
        width: auto;
        max-width: 100%;
        max-height: 220px;
        height: auto;
        display: block;
        border-radius: 10px;
        pointer-events: none;
      }
      .lab-home-floor-featured-copy {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 0 2px 2px;
      }
      .lab-home-floor-kicker {
        color: var(--accent);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .lab-home-floor-featured-copy b {
        font-size: 15px;
        font-weight: 700;
        line-height: 1.3;
        word-break: break-word;
      }
      .lab-home-floor-featured-copy span {
        color: var(--text2);
        font-size: 12px;
        line-height: 1.4;
      }
      .lab-home-floor-list {
        list-style: none;
        margin: 12px 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .lab-home-floor-row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 8px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: rgba(7, 9, 15, 0.35);
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: zoom-in;
      }
      .lab-home-floor-row:hover {
        border-color: rgba(56, 189, 248, 0.35);
      }
      .lab-home-floor-row img {
        width: 40px;
        height: auto;
        aspect-ratio: 9 / 16;
        object-fit: cover;
        object-position: center top;
        border-radius: 8px;
        flex-shrink: 0;
        background: var(--surface2);
      }
      .lab-home-floor-row-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .lab-home-floor-row-copy b {
        font-size: 12px;
        font-weight: 700;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lab-home-floor-row-copy span {
        color: var(--text3);
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lab-home-floor-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 0;
      }
      .lab-home-floor-head .lab-home-sec {
        margin: 0;
        flex: 1;
        min-width: 0;
      }
      .lab-home-floor-nav {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }
      .lab-home-floor-nav-btn {
        width: 30px;
        height: 30px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
      }
      .lab-home-floor-nav-btn:hover {
        border-color: rgba(56, 189, 248, 0.4);
        color: var(--accent);
      }
      .lab-home-floor-slider {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        overscroll-behavior-x: contain;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding: 2px 2px 6px;
        scrollbar-width: none;
      }
      .lab-home-floor-slider::-webkit-scrollbar { display: none; }
      .lab-home-floor-slide {
        flex: none;
        width: 100%;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: zoom-in;
      }
      .lab-home-floor-slide-art {
        position: relative;
        display: flex;
        justify-content: center;
        width: 100%;
        border-radius: 12px;
        overflow: hidden;
        background: #141414;
        border: 1px solid var(--border);
      }
      .lab-home-floor-slide-art img {
        width: auto;
        max-width: 100%;
        max-height: 260px;
        height: auto;
        display: block;
        object-fit: contain;
      }
      .lab-home-floor-slide-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(248, 113, 113, 0.16);
        border: 1px solid rgba(248, 113, 113, 0.55);
        color: var(--red);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .lab-home-floor-slide-badge.is-live {
        background: rgba(7, 9, 15, 0.78);
        border-color: rgba(52, 211, 153, 0.45);
        color: var(--green);
      }
      .lab-home-floor-slide-copy {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 0 2px 2px;
      }
      .lab-home-floor-slide-copy b {
        font-size: 15px;
        font-weight: 700;
        line-height: 1.3;
        word-break: break-word;
      }
      .lab-home-floor-slide-copy span {
        color: var(--text2);
        font-size: 12px;
        line-height: 1.4;
      }
      .lab-home-floor-slider-hint {
        margin: 4px 2px 0;
        color: var(--text3);
        font-size: 11px;
      }
      .lab-home-floor-promote {
        margin: 12px 2px 2px;
        color: var(--text3);
        font-size: 11px;
        line-height: 1.45;
      }
      .lab-home-floor-promote a {
        color: var(--accent);
        font-weight: 600;
        text-decoration: none;
      }
      .lab-home-floor-promote a:hover { color: var(--accent3); }


      /* Same order as mobile: Continue → Fresh → Top 5 */
      .lab-home-shelves,
      .lab-home-crates-block,
      .lab-home-ranks {
        width: 100%;
        max-width: none;
      }
      .lab-home-main .lab-home-sec {
        padding: 10px 0 8px;
      }
      .lab-home-sec { font-weight: 500; }

      /* Continue listening — Spotify-style horizontal resume rail */
      .lab-home-continue-pane.is-desktop-rail {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        gap: 14px;
        overflow-x: auto;
        overflow-y: hidden;
        overscroll-behavior-x: contain;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding: 2px 2px 8px;
        border: 0;
        border-radius: 0;
        background: transparent;
        scrollbar-width: none;
      }
      .lab-home-continue-pane.is-desktop-rail::-webkit-scrollbar { display: none; }
      .lab-home-continue-card {
        width: 156px;
        flex: none;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .lab-home-continue-art {
        position: relative;
        display: block;
        width: 156px;
        height: 156px;
        border-radius: 12px;
        overflow: hidden;
        background: var(--surface2);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
      }
      .lab-home-continue-art img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .lab-home-continue-play {
        position: absolute;
        right: 10px;
        bottom: 14px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--accent2);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45), 0 0 20px var(--glow);
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.18s ease, transform 0.18s ease;
        pointer-events: none;
        z-index: 2;
      }
      .lab-home-continue-card:hover .lab-home-continue-play,
      .lab-home-continue-card.is-active .lab-home-continue-play,
      .lab-home-continue-card:focus-visible .lab-home-continue-play {
        opacity: 1;
        transform: translateY(0);
      }
      .lab-home-continue-progress {
        position: absolute;
        left: 10px;
        right: 10px;
        bottom: 8px;
        margin: 0;
        height: 3px;
        border-radius: 99px;
        background: rgba(255, 255, 255, 0.22);
        z-index: 1;
      }
      .lab-home-continue-progress span {
        background: var(--accent2);
      }
      .lab-home-continue-card.is-active .lab-home-continue-art {
        box-shadow:
          0 0 0 1px rgba(56, 189, 248, 0.45),
          0 8px 28px rgba(0, 0, 0, 0.35);
      }
      .lab-home-continue-pane.is-desktop-rail .lab-home-continue-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .lab-home-continue-pane.is-desktop-rail .lab-home-continue-copy b {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.3;
        color: var(--text);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        white-space: normal;
        word-break: break-word;
      }
      .lab-home-continue-pane.is-desktop-rail .lab-home-continue-copy .sub {
        display: block;
        margin: 0;
        color: var(--text2);
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lab-home-continue-left {
        color: var(--text3);
        font-size: 11px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }

      /* Fresh crates — match Continue Listening streaming rail */
      .lab-home-crates-pane.is-desktop-rail {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        gap: 14px;
        max-height: none;
        overflow-x: auto;
        overflow-y: hidden;
        overscroll-behavior-x: contain;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding: 2px 2px 8px;
        border: 0;
        border-radius: 0;
        background: transparent;
        scrollbar-width: none;
      }
      .lab-home-crates-pane.is-desktop-rail::-webkit-scrollbar { display: none; }
      .lab-home-crate-card {
        width: 156px;
        flex: none;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .lab-home-crate-art {
        position: relative;
        display: block;
        width: 156px;
        height: 156px;
        border-radius: 12px;
        overflow: hidden;
        background: var(--surface2);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
      }
      .lab-home-crate-art img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .lab-home-crate-play {
        position: absolute;
        right: 10px;
        bottom: 10px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--accent2);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45), 0 0 20px var(--glow);
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.18s ease, transform 0.18s ease;
        pointer-events: none;
        z-index: 2;
      }
      .lab-home-crate-card:hover .lab-home-crate-play,
      .lab-home-crate-card.is-active .lab-home-crate-play,
      .lab-home-crate-card:focus-visible .lab-home-crate-play {
        opacity: 1;
        transform: translateY(0);
      }
      .lab-home-crate-card.is-active .lab-home-crate-art {
        box-shadow:
          0 0 0 1px rgba(56, 189, 248, 0.45),
          0 8px 28px rgba(0, 0, 0, 0.35);
      }
      .lab-home-crates-pane.is-desktop-rail .lab-home-crate-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .lab-home-crates-pane.is-desktop-rail .lab-home-crate-copy b {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.3;
        color: var(--text);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        white-space: normal;
        word-break: break-word;
      }
      .lab-home-crates-pane.is-desktop-rail .lab-home-crate-copy .sub {
        display: block;
        margin: 0;
        color: var(--text2);
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lab-home-crate-meta {
        color: var(--text3);
        font-size: 11px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }

      /* Top 5 — full-width ranked list, titles wrap end-to-end */
      .lab-home-ranks-list {
        display: flex;
        flex-direction: column;
        gap: 1px;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--border);
      }
      .lab-home-ranks .lab-home-row {
        position: relative;
        width: 100%;
        max-width: none;
        gap: 14px;
        min-height: 0;
        padding: 14px 36px 14px 14px;
        border: 0;
        border-radius: 0;
        background: var(--surface);
        transition: background 0.15s ease;
      }
      .lab-home-ranks .lab-home-row::before {
        content: "";
        position: absolute;
        left: 0;
        top: 12px;
        bottom: 12px;
        width: 2px;
        border-radius: 2px;
        background: rgba(56, 189, 248, 0.2);
      }
      .lab-home-ranks .lab-home-row:first-child::before {
        background: var(--accent);
      }
      .lab-home-ranks .lab-home-row:hover {
        background: rgba(56, 189, 248, 0.06);
      }
      .lab-home-ranks .lab-home-row .n {
        width: 30px;
        height: 30px;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: 1px solid rgba(56, 189, 248, 0.3);
        background: rgba(56, 189, 248, 0.1);
        color: var(--accent);
        font-weight: 700;
        font-size: 12px;
      }
      .lab-home-ranks .lab-home-row:first-child .n {
        border-color: var(--accent2);
        background: var(--accent2);
        color: var(--bg);
      }
      .lab-home-ranks .lab-home-row .who {
        padding-right: 8px;
      }
      .lab-home-ranks .lab-home-row .who b {
        font-weight: 700;
        font-size: 14px;
        line-height: 1.35;
        white-space: normal;
        overflow: visible;
        display: block;
        word-break: break-word;
        text-overflow: unset;
      }
      .lab-home-ranks .lab-home-row .who span { display: none; }
      .lab-home-ranks .lab-home-row::after {
        content: "›";
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text3);
        font-size: 18px;
        line-height: 1;
        pointer-events: none;
      }
    }


    /* Promote / on-the-floor submit — global (must not live inside desktop-only media) */
    .floor-submit-page {
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
    .floor-submit-shell {
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .floor-submit-lede {
      margin: 0 0 20px;
      max-width: 54ch;
      font-size: 14px;
      line-height: 1.55;
      color: var(--text2);
    }
    .floor-submit-notice {
      margin: 0 0 14px;
      font-size: 13px;
      line-height: 1.45;
    }
    .floor-submit-notice.is-warn { color: var(--orange); }
    .floor-submit-notice.is-error { color: var(--red); }
    .floor-submit-notice code { color: var(--accent); }
    .floor-submit-link {
      appearance: none;
      border: 0;
      background: none;
      padding: 0;
      color: var(--accent);
      font: inherit;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .floor-submit-link:hover { color: var(--accent3); }
    .floor-submit-stack {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .floor-submit-fields {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .floor-submit-label {
      display: block;
      margin: 0 0 6px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text3);
    }
    .floor-submit-flyer-drop {
      width: 100%;
      max-width: 220px;
      aspect-ratio: 3 / 4;
      padding: 0;
      border-radius: 14px;
      border: 1px dashed rgba(56, 189, 248, 0.35);
      background:
        radial-gradient(120% 140% at 50% 0%, rgba(56, 189, 248, 0.1), transparent 55%),
        var(--surface2);
      overflow: hidden;
      display: grid;
      place-items: center;
      cursor: pointer;
      color: inherit;
      font: inherit;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .floor-submit-flyer-drop:hover:not(:disabled),
    .floor-submit-flyer-drop:focus-visible {
      border-color: rgba(56, 189, 248, 0.55);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12);
      outline: none;
    }
    .floor-submit-flyer-drop:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .floor-submit-flyer-drop.has-art {
      border-style: solid;
      border-color: var(--border);
      background: #141414;
    }
    .floor-submit-flyer-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .floor-submit-flyer-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 18px 14px;
      text-align: center;
      color: var(--text3);
      font-size: 12px;
      line-height: 1.4;
    }
    .floor-submit-flyer-empty strong {
      color: var(--text2);
      font-size: 13px;
      font-weight: 600;
    }
    .floor-submit-replace {
      margin-top: 10px;
    }
    .floor-submit-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .floor-submit-grid > div { min-width: 0; }
    .floor-submit-check {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 2px;
      font-size: 14px;
      color: var(--text2);
      cursor: pointer;
      line-height: 1.4;
    }
    .floor-submit-check input {
      margin-top: 3px;
      flex-shrink: 0;
    }
    .floor-submit-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
    }
    /* Shared success card — Promote + Submit Mix */
    .floor-submit-confirm,
    .lab-confirm {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      max-width: 520px;
      margin: 0 auto;
      padding: 28px 24px 24px;
      border-radius: 20px;
      border: 1px solid rgba(52, 211, 153, 0.28);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(52, 211, 153, 0.16), transparent 55%),
        linear-gradient(160deg, var(--surface2), var(--surface));
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28);
      outline: none;
      text-align: left;
    }
    .lab-confirm.is-review {
      border-color: rgba(251, 146, 60, 0.32);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(251, 146, 60, 0.16), transparent 55%),
        linear-gradient(160deg, var(--surface2), var(--surface));
    }
    .floor-submit-confirm-glow {
      position: absolute;
      inset: 0 0 auto;
      height: 140px;
      pointer-events: none;
      z-index: 0;
      background: radial-gradient(70% 100% at 20% 0%, rgba(56, 189, 248, 0.12), transparent 70%);
    }
    .floor-submit-confirm > *:not(.floor-submit-confirm-glow) {
      position: relative;
      z-index: 1;
    }
    .floor-submit-confirm-icon {
      width: 64px;
      height: 64px;
      margin: 0 0 16px;
      border-radius: 50%;
      border: 2px solid var(--green);
      background: rgba(52, 211, 153, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px rgba(52, 211, 153, 0.18);
    }
    .floor-submit-confirm-kicker {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--green);
    }
    .floor-submit-confirm-title {
      margin: 0 0 10px;
      font-family: var(--ff-display);
      font-size: 32px;
      letter-spacing: 0.03em;
      line-height: 1.1;
    }
    .floor-submit-confirm-copy {
      margin: 0;
      color: var(--text2);
      font-size: 14px;
      line-height: 1.55;
      max-width: 42ch;
    }
    .floor-submit-confirm-steps {
      list-style: none;
      margin: 18px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .floor-submit-confirm-steps li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(7, 9, 15, 0.28);
      color: var(--text2);
      font-size: 13px;
      line-height: 1.35;
    }
    .floor-submit-confirm-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }

    
    .lab-confirm-glow {
      position: absolute;
      inset: 0 0 auto;
      height: 140px;
      pointer-events: none;
      z-index: 0;
      background: radial-gradient(70% 100% at 20% 0%, rgba(56, 189, 248, 0.12), transparent 70%);
    }
    .lab-confirm > *:not(.lab-confirm-glow) {
      position: relative;
      z-index: 1;
    }
    .lab-confirm-icon {
      width: 64px;
      height: 64px;
      margin: 0 0 16px;
      border-radius: 50%;
      border: 2px solid var(--green);
      background: rgba(52, 211, 153, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px rgba(52, 211, 153, 0.18);
    }
    .lab-confirm.is-review .lab-confirm-icon {
      border-color: var(--orange);
      background: rgba(251, 146, 60, 0.12);
      box-shadow: 0 0 24px rgba(251, 146, 60, 0.16);
    }
    .lab-confirm-kicker {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--green);
    }
    .lab-confirm.is-review .lab-confirm-kicker { color: var(--orange); }
    .lab-confirm-title {
      margin: 0 0 10px;
      font-family: var(--ff-display);
      font-size: 32px;
      letter-spacing: 0.03em;
      line-height: 1.1;
    }
    .lab-confirm-copy {
      margin: 0;
      color: var(--text2);
      font-size: 14px;
      line-height: 1.55;
      max-width: 42ch;
    }
    .lab-confirm-steps {
      list-style: none;
      margin: 18px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .lab-confirm-steps li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(7, 9, 15, 0.28);
      color: var(--text2);
      font-size: 13px;
      line-height: 1.35;
    }
    .lab-confirm-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }
    .submit-mix-page .floor-submit-shell { max-width: 760px; }
    .submit-mix-page .settings-section {
      overflow: visible;
    }
    .submit-mix-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      padding: 4px;
      margin-bottom: 18px;
      border-radius: 14px;
      border: 1px solid rgba(56, 189, 248, 0.22);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.12), transparent 55%),
        rgba(7, 9, 15, 0.45);
    }
    .submit-mix-tab {
      min-height: 42px;
      border: 0;
      border-radius: 11px;
      cursor: pointer;
      font: inherit;
      font-size: 14px;
      font-weight: 650;
      color: var(--text2);
      background: transparent;
    }
    .submit-mix-tab.is-on {
      color: #07090F;
      background: var(--accent2);
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.28);
    }
    .submit-mix-stepper {
      display: flex;
      gap: 0;
      margin-bottom: 18px;
      width: 100%;
    }

    /* Club-night date/time picker */
    .event-dt {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }
    .event-dt.is-disabled { opacity: 0.55; pointer-events: none; }
    .event-dt-summary {
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid rgba(56, 189, 248, 0.22);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.14), transparent 55%),
        linear-gradient(160deg, var(--surface2), var(--surface));
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--text);
    }
    .event-dt-block { min-width: 0; }
    .event-dt-label {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text3);
    }
    .event-dt-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .event-dt-chip {
      height: 34px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text);
      font: inherit;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .event-dt-chip:hover:not(:disabled) {
      border-color: rgba(56, 189, 248, 0.4);
      color: var(--accent3);
    }
    .event-dt-chip.is-on {
      background: var(--accent2);
      border-color: var(--accent2);
      color: var(--bg);
      font-weight: 600;
    }
    .event-dt-chip:disabled { opacity: 0.45; cursor: not-allowed; }
    .event-dt-calendar {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface2);
      padding: 12px;
      max-width: 340px;
    }
    .event-dt-cal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
    }
    .event-dt-cal-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .event-dt-nav {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }
    .event-dt-nav:hover:not(:disabled) {
      border-color: rgba(56, 189, 248, 0.4);
      color: var(--accent);
    }
    .event-dt-cal-weekdays,
    .event-dt-cal-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 4px;
    }
    .event-dt-cal-weekdays {
      margin-bottom: 4px;
    }
    .event-dt-cal-weekdays span {
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text3);
      padding: 4px 0;
    }
    .event-dt-day {
      aspect-ratio: 1;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--text);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .event-dt-day.is-out { color: var(--text3); opacity: 0.45; }
    .event-dt-day.is-today {
      box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.45);
    }
    .event-dt-day.is-on {
      background: var(--accent2);
      color: var(--bg);
      font-weight: 700;
      box-shadow: none;
    }
    .event-dt-day:hover:not(:disabled):not(.is-on) {
      background: rgba(56, 189, 248, 0.12);
    }
    .event-dt-day:disabled {
      opacity: 0.28;
      cursor: not-allowed;
    }
    .event-dt-custom-time {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
      max-width: 240px;
    }
    .event-dt-custom-time label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text3);
    }
    .event-dt-custom-time .inp {
      text-transform: none;
      letter-spacing: 0;
      font-weight: 500;
    }

    @media (max-width: 720px) {
      .floor-submit-page.is-compact {
        padding-bottom: 28px;
      }
      .floor-submit-mobile-title {
        margin: 0 0 8px;
        font-family: var(--ff-display);
        font-size: 28px;
        letter-spacing: 0.04em;
        line-height: 1.1;
      }
      .floor-submit-lede {
        font-size: 13px;
        margin-bottom: 16px;
      }
      .floor-submit-page .settings-section {
        overflow: visible;
      }
      .floor-submit-flyer-drop {
        max-width: min(200px, 56vw);
        width: 100%;
      }
      .floor-submit-actions {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        margin-top: 8px;
        padding-bottom: 8px;
      }
      .floor-submit-actions .btn {
        width: 100%;
        justify-content: center;
      }
      .floor-submit-confirm {
        margin-top: 4px;
        padding: 22px 16px 18px;
        border-radius: 16px;
        text-align: center;
      }
      .floor-submit-confirm-icon {
        margin-left: auto;
        margin-right: auto;
      }
      .floor-submit-confirm-title {
        font-size: 28px;
      }
      .floor-submit-confirm-copy {
        margin-left: auto;
        margin-right: auto;
        font-size: 13px;
      }
      .floor-submit-confirm-steps li {
        text-align: left;
      }
      .floor-submit-confirm-actions {
        display: grid;
        grid-template-columns: 1fr;
      }
      .floor-submit-confirm-actions .btn {
        width: 100%;
        justify-content: center;
      }

      .lab-confirm {
        margin-top: 4px;
        padding: 22px 16px 18px;
        border-radius: 16px;
        text-align: center;
      }
      .lab-confirm-icon {
        margin-left: auto;
        margin-right: auto;
      }
      .lab-confirm-title { font-size: 28px; }
      .lab-confirm-copy {
        margin-left: auto;
        margin-right: auto;
        font-size: 13px;
      }
      .lab-confirm-steps li { text-align: left; }
      .lab-confirm-actions {
        display: grid;
        grid-template-columns: 1fr;
      }
      .lab-confirm-actions .btn {
        width: 100%;
        justify-content: center;
      }
      .submit-mix-tab { font-size: 13px; }

      .event-dt-calendar {
        max-width: none;
        width: 100%;
        box-sizing: border-box;
      }
      .event-dt-chips {
        gap: 8px;
      }
      .event-dt-chip {
        min-height: 36px;
        height: auto;
        padding: 8px 12px;
      }
      .event-dt-custom-time {
        max-width: none;
        width: 100%;
      }
      .event-dt-day {
        min-height: 40px;
        font-size: 14px;
      }
    }
    @media (max-width: 560px) {
      .floor-submit-grid { grid-template-columns: 1fr; }
    }

    /* Floor flyer lightbox — global (mobile + desktop) */
    .floor-flyer-lightbox {
      position: fixed;
      inset: 0;
      z-index: 1200;
      background: rgba(3, 5, 10, 0.9);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px));
      animation: fadeIn 0.18s ease;
    }
    .floor-flyer-lightbox-close {
      position: absolute;
      top: max(12px, env(safe-area-inset-top, 0px));
      right: max(12px, env(safe-area-inset-right, 0px));
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--border);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .floor-flyer-lightbox-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      max-width: min(96vw, 560px);
      max-height: 100%;
    }
    .floor-flyer-lightbox-stage img {
      width: auto;
      max-width: min(96vw, 560px);
      max-height: min(78vh, 820px);
      height: auto;
      object-fit: contain;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 18px 60px rgba(0,0,0,0.55);
      background: #0a0c12;
    }
    @media (max-width: 720px) {
      .floor-flyer-lightbox {
        align-items: flex-end;
        padding: max(12px, env(safe-area-inset-top, 0px)) 12px max(16px, env(safe-area-inset-bottom, 0px));
      }
      .floor-flyer-lightbox-stage {
        width: 100%;
        max-width: none;
      }
      .floor-flyer-lightbox-stage img {
        width: 100%;
        max-width: none;
        max-height: min(68vh, 640px);
        border-radius: 16px;
      }
    }
    .floor-flyer-lightbox-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      text-align: center;
      max-width: 100%;
    }
    .floor-flyer-lightbox-meta b {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
    }
    .floor-flyer-lightbox-meta span {
      font-size: 13px;
      color: var(--text2);
    }
    .floor-flyer-lightbox-meta .btn {
      margin-top: 10px;
      text-decoration: none;
    }


    /* On the floor — mobile Home street rail */
    .lab-home-floor-mobile {
      margin: 8px 0 4px;
      min-width: 0;
    }
    .lab-home-floor-mobile-lede {
      margin: -4px 0 12px;
      color: var(--text2);
      font-size: 13px;
      line-height: 1.45;
    }
    .lab-home-floor-street {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      padding: 2px 2px 10px;
      scrollbar-width: none;
    }
    .lab-home-floor-street::-webkit-scrollbar { display: none; }
    .lab-home-floor-street-card {
      flex: none;
      width: 148px;
      scroll-snap-align: start;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .lab-home-floor-street-art {
      position: relative;
      display: block;
      width: 148px;
      aspect-ratio: 3 / 4;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border);
      background:
        radial-gradient(120% 80% at 50% 0%, rgba(242, 154, 128, 0.16), transparent 58%),
        var(--surface2);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
    }
    .lab-home-floor-street-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      display: block;
    }
    .lab-home-floor-street-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(248, 113, 113, 0.16);
      border: 1px solid rgba(248, 113, 113, 0.55);
      color: var(--red);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      backdrop-filter: blur(6px);
    }
    .lab-home-floor-street-badge.is-live {
      background: rgba(7, 9, 15, 0.78);
      border-color: rgba(52, 211, 153, 0.45);
      color: var(--green);
    }
    .lab-home-floor-street-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding: 0 2px;
    }
    .lab-home-floor-street-copy b {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .lab-home-floor-street-copy span {
      color: var(--text3);
      font-size: 11px;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lab-home-floor-mobile .lab-home-floor-promote {
      margin: 4px 2px 8px;
      color: var(--text3);
      font-size: 12px;
      line-height: 1.45;
    }
    .lab-home-floor-mobile .lab-home-floor-promote a {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }

    /* On the Floor browse page */
    .floor-page {
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
    .floor-page-shell {
      width: 100%;
      max-width: 1080px;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .floor-page-mobile-title {
      margin: 0 0 8px;
      font-family: var(--ff-display);
      font-size: 28px;
      letter-spacing: 0.04em;
      line-height: 1.1;
    }
    .floor-page-lede {
      margin: 0 0 20px;
      max-width: 54ch;
      font-size: 14px;
      line-height: 1.55;
      color: var(--text2);
    }
    .floor-page-empty {
      margin: 12px 0;
      color: var(--text3);
      font-size: 14px;
    }
    .floor-page-empty-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      padding: 20px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text2);
      font-size: 14px;
      line-height: 1.5;
      max-width: 420px;
    }
    .floor-page-empty-card p { margin: 0; }
    .floor-page-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 18px 14px;
    }
    .floor-page-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      min-width: 0;
    }
    .floor-page-card-art {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: 3 / 4;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border);
      background:
        radial-gradient(120% 80% at 50% 0%, rgba(242, 154, 128, 0.16), transparent 58%),
        var(--surface2);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
    }
    .floor-page-card-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      display: block;
    }
    .floor-page-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(248, 113, 113, 0.16);
      border: 1px solid rgba(248, 113, 113, 0.55);
      color: var(--red);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      backdrop-filter: blur(6px);
    }
    .floor-page-badge.is-live {
      background: rgba(7, 9, 15, 0.78);
      border-color: rgba(52, 211, 153, 0.45);
      color: var(--green);
    }
    .floor-page-card-copy {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      padding: 0 2px;
    }
    .floor-page-card-copy b {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .floor-page-card-copy span {
      color: var(--text3);
      font-size: 12px;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .floor-page-promote {
      margin: 18px 2px 0;
      color: var(--text3);
      font-size: 13px;
      line-height: 1.45;
    }
    .floor-page-promote a {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }
    .floor-page-promote a:hover { color: var(--accent3); }
    .floor-flyer-lightbox-lineup {
      max-width: 42ch;
      color: var(--text3) !important;
      font-size: 12px !important;
      line-height: 1.4;
      white-space: normal;
    }
    @media (max-width: 720px) {
      .floor-page-lede {
        font-size: 13px;
        margin-bottom: 16px;
      }
      .floor-page-grid.is-street {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        overscroll-behavior-x: contain;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding: 2px 2px 12px;
        scrollbar-width: none;
      }
      .floor-page-grid.is-street::-webkit-scrollbar { display: none; }
      .floor-page-grid.is-street .floor-page-card {
        flex: none;
        width: 156px;
        scroll-snap-align: start;
        gap: 8px;
      }
      .floor-page-grid.is-street .floor-page-card-copy b { font-size: 13px; }
      .floor-page-grid.is-street .floor-page-card-copy span { font-size: 11px; }
    }


    /* Noise texture overlay */
    .noise::after {
      content:''; position:absolute; inset:0; pointer-events:none; opacity:0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 180px;
    }

    /* Glass card */
    .glass {
      background: rgba(17,24,39,0.7);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border);
    }

    /* Btn styles */
    .btn {
      display:inline-flex; align-items:center; gap:8px;
      padding: 10px 22px; border-radius: 8px;
      font-size:14px; font-weight:600;
      transition: all 0.2s;
    }
    .btn-primary {
      background: var(--accent2); color: var(--bg);
    }
    .btn-primary:hover { background: var(--accent); transform: translateY(-1px); box-shadow: 0 4px 20px var(--glow); }
    .btn-ghost {
      background: transparent; color: var(--text2);
      border: 1px solid var(--border);
    }
    .btn-ghost:hover { border-color: var(--accent); color: var(--accent); background: var(--glow2); }
    .btn-danger { background: rgba(248,113,113,0.12); color: var(--red); border: 1px solid rgba(248,113,113,0.25); }
    .btn-danger:hover { background: rgba(248,113,113,0.22); }

    /* Input styles */
    .inp {
      width:100%; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--r);
      color: var(--text); padding: 11px 14px; font-size:14px;
      transition: border-color 0.2s;
    }
    .inp:focus { border-color: var(--accent2); box-shadow: 0 0 0 3px rgba(14,165,233,0.12); }
    .inp::placeholder { color: var(--text3); }
    textarea.inp { resize: vertical; min-height: 100px; }

    /* Tags */
    .tag {
      display: inline-flex; align-items:center; gap:5px;
      background: var(--surface2); border: 1px solid var(--border);
      color: var(--text2); font-size:12px; font-weight:500;
      padding: 4px 10px; border-radius: 20px;
    }
    .tag-blue { background: rgba(56,189,248,0.1); border-color: rgba(56,189,248,0.25); color: var(--accent); }
    .tag-green { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.25); color: var(--green); }
    .tag-red { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.25); color: var(--red); }
    .tag-orange { background: rgba(251,146,60,0.1); border-color: rgba(251,146,60,0.25); color: var(--orange); }

    /* Back control — same pill shape as genre tags */
    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(56,189,248,0.1);
      border: 1px solid rgba(56,189,248,0.25);
      color: var(--accent);
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px 6px 8px;
      border-radius: 20px;
      text-decoration: none;
      line-height: 1.2;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .back-btn:hover {
      background: rgba(56,189,248,0.18);
      border-color: rgba(56,189,248,0.4);
      color: var(--accent3);
    }
    .back-btn:active {
      transform: translateY(1px);
    }

    /* Waveform bars */
    .wave-bar {
      width:3px; background: var(--accent);
      border-radius:2px; animation: wave 0.8s ease-in-out infinite;
    }
    .wave-bar:nth-child(2) { animation-delay:0.1s; }
    .wave-bar:nth-child(3) { animation-delay:0.2s; }
    .wave-bar:nth-child(4) { animation-delay:0.15s; }
    .wave-bar:nth-child(5) { animation-delay:0.05s; }

    /* Progress bar */
    .progress-wrap {
      width:100%; height:4px; background:var(--surface2);
      border-radius:2px; cursor:pointer; position:relative;
    }
    .progress-fill {
      height:100%; background: linear-gradient(90deg, var(--accent2), var(--accent));
      border-radius:2px; transition:width 0.1s linear; position:relative;
    }
    .progress-fill::after {
      content:''; position:absolute; right:-5px; top:50%;
      transform:translateY(-50%); width:10px; height:10px;
      background: var(--accent); border-radius:50%;
      box-shadow: 0 0 8px var(--accent2);
    }

    /* Avatar */
    .avatar {
      border-radius:50%; object-fit:cover;
      border: 2px solid var(--border);
    }
    .avatar-sq { border-radius: var(--r); }

    .avatar-lightbox {
      position: fixed;
      inset: 0;
      z-index: 1200;
      background: rgba(3, 5, 10, 0.88);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px));
      animation: fadeIn 0.18s ease;
    }
    .avatar-lightbox-close {
      position: absolute;
      top: max(12px, env(safe-area-inset-top, 0px));
      right: max(12px, env(safe-area-inset-right, 0px));
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--border);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .avatar-lightbox-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      max-width: min(92vw, 520px);
      max-height: 100%;
    }
    .avatar-lightbox-stage img {
      width: min(92vw, 520px);
      height: min(92vw, 520px);
      max-height: min(72vh, 520px);
      object-fit: cover;
      border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.12);
      box-shadow: 0 18px 60px rgba(0,0,0,0.55);
      background: var(--surface);
    }
    .avatar-lightbox-caption {
      font-size: 15px;
      font-weight: 700;
      color: var(--text);
      text-align: center;
    }

    /* Live badge */
    .live-badge {
      display:inline-flex; align-items:center; gap:5px;
      background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.3);
      color: var(--red); font-size:11px; font-weight:700;
      padding: 3px 9px; border-radius:20px; letter-spacing:0.05em;
    }
    .live-dot {
      width:6px; height:6px; background:var(--red);
      border-radius:50%; animation: pulse 1s ease-in-out infinite;
    }

    /* Stat card */
    .stat-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r2); padding: 20px 24px;
      transition: border-color 0.2s, transform 0.2s;
    }
    .stat-card:hover { border-color: var(--accent); transform: translateY(-2px); }

    /* Track card */
    .mix-live-listeners {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 700;
      color: #4ade80;
      letter-spacing: 0.02em;
      line-height: 1;
      white-space: nowrap;
    }
    .mix-live-listeners-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.55);
      animation: mix-live-pulse 1.6s ease-out infinite;
      flex-shrink: 0;
    }
    @keyframes mix-live-pulse {
      0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.55); }
      70% { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
      100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }
    .mix-live-listeners-count {
      font-variant-numeric: tabular-nums;
    }

    /* Mixes catalog */
    .mixes-page {
      padding: 32px 36px 100px;
    }
    .mixes-page.is-compact {
      padding: 16px 12px 100px;
    }
    .mixes-lede {
      margin: 0 0 20px;
      color: var(--text2);
      font-size: 14px;
      line-height: 1.5;
      max-width: 560px;
    }
    .mixes-page .lab-home-chips {
      margin-bottom: 22px;
    }
    .mixes-toolbar {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      color: var(--text3);
      font-size: 12px;
      font-weight: 600;
    }
    .mixes-empty {
      text-align: center;
      padding: 80px 0;
      color: var(--text3);
    }
    .mixes-empty p { margin-top: 12px; }
    .mixes-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .mixes-row {
      display: grid;
      grid-template-columns: 176px minmax(0, 1fr);
      gap: 22px;
      align-items: stretch;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.92), rgba(10, 14, 23, 0.96));
    }
    .mixes-row.is-active {
      border-color: rgba(56, 189, 248, 0.45);
      box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.18);
    }
    .mixes-row-art {
      position: relative;
      width: 176px;
      height: 176px;
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
      background: var(--surface2);
    }
    .mixes-row-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .mixes-row-play {
      position: absolute;
      inset: 0;
      margin: auto;
      width: 52px;
      height: 52px;
      border: none;
      border-radius: 50%;
      background: var(--accent2);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px var(--glow);
      opacity: 0;
      transform: scale(0.94);
      transition: opacity 0.18s ease, transform 0.18s ease;
      cursor: pointer;
    }
    .mixes-row:hover .mixes-row-play,
    .mixes-row.is-active .mixes-row-play,
    .mixes-row-play:focus-visible {
      opacity: 1;
      transform: scale(1);
    }
    .mixes-row-body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .mixes-row-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .mixes-row-copy {
      min-width: 0;
      flex: 1;
    }
    .mixes-row-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.3;
      word-break: break-word;
      color: var(--text);
    }
    .mixes-row-artist {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text2);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      min-width: 0;
    }
    .mixes-row-artist:hover { color: var(--accent2); }
    .mixes-row-desc {
      margin: 0;
      color: var(--text2);
      font-size: 14px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .mixes-row-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 14px;
      color: var(--text3);
      font-size: 12px;
    }
    .mixes-row-meta span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .mixes-row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: auto;
      padding-top: 4px;
    }
    .mixes-row-actions .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .mixes-mobile-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .mixes-pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 22px;
      padding-top: 8px;
    }
    .mixes-pager .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .mixes-pager .btn:disabled {
      opacity: 0.4;
      cursor: default;
      pointer-events: none;
    }
    .mixes-pager-pages {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .mixes-pager-num {
      min-width: 34px;
      height: 34px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text2);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .mixes-pager-num.is-on {
      background: var(--accent2);
      border-color: transparent;
      color: #07090f;
    }
    .mixes-pager-gap {
      color: var(--text3);
      padding: 0 2px;
    }
    .mixes-page.is-compact .mixes-lede {
      font-size: 13px;
      margin-bottom: 14px;
    }
    .mixes-page.is-compact .lab-home-chips {
      margin-bottom: 14px;
    }
    .mixes-page.is-compact .mixes-toolbar {
      font-size: 11px;
      margin-bottom: 10px;
    }
    .mixes-page.is-compact .mixes-pager .btn {
      font-size: 12px;
      padding: 6px 10px;
    }
    @media (max-width: 900px) {
      .mixes-row {
        grid-template-columns: 140px minmax(0, 1fr);
        gap: 16px;
        padding: 14px;
      }
      .mixes-row-art {
        width: 140px;
        height: 140px;
      }
      .mixes-row-title { font-size: 17px; }
    }

    /* Library catalog (shares Mixes row language) */
    .library-row-remove {
      padding: 6px;
      flex-shrink: 0;
    }
    .library-row-progress {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .library-row-progress-meta {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text3);
    }
    .library-status {
      color: var(--text3);
      font-size: 14px;
    }
    .library-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      max-width: 420px;
      margin: 0 auto;
    }
    .library-empty p {
      margin: 0;
      line-height: 1.6;
    }
    .library-mobile-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .library-mobile-row {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 8px 10px 8px 8px;
    }
    .library-mobile-art {
      position: relative;
      flex-shrink: 0;
      width: 72px;
      height: 72px;
      border-radius: 8px;
      overflow: hidden;
      border: none;
      padding: 0;
      cursor: pointer;
      background: var(--bg2);
    }
    .library-mobile-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .library-mobile-art-overlay {
      position: absolute;
      inset: 0;
      background: rgba(7, 9, 15, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .library-mobile-play {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent2);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px var(--glow);
    }
    .library-mobile-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-left: 10px;
      justify-content: center;
    }
    .library-mobile-top {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: flex-start;
    }
    .library-mobile-title {
      color: var(--text);
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      line-height: 1.35;
      word-break: break-word;
      min-width: 0;
      flex: 1;
    }
    .library-mobile-top .btn {
      padding: 6px;
      flex-shrink: 0;
      margin-top: -2px;
    }

    .track-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r2); overflow:hidden;
      transition: all 0.25s; cursor:pointer;
    }
    .track-card:hover { border-color: rgba(56,189,248,0.4); transform:translateY(-3px); box-shadow: 0 12px 36px rgba(0,0,0,0.5); }
    .track-card.track-card-row:hover { transform: none; box-shadow: none; }
    .track-card.active { border-color: var(--accent2); box-shadow: 0 0 0 1px var(--accent2), 0 8px 32px var(--glow); }
    .track-card-play-layer {
      z-index: 3;
    }
    .track-card:not(.active) .track-card-play-btn {
      opacity: 0.92;
      transform: scale(0.96);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    @media (hover: hover) and (pointer: fine) {
      .track-card:not(.active) .track-card-play-layer {
        background: rgba(7,9,15,0) !important;
      }
      .track-card:not(.active) .track-card-play-btn {
        opacity: 0;
        transform: scale(0.9);
      }
      .track-card:not(.active):hover .track-card-play-layer {
        background: rgba(7,9,15,0.28) !important;
      }
      .track-card:not(.active):hover .track-card-play-btn {
        opacity: 1;
        transform: scale(1);
      }
    }
    .track-card-play-btn:hover {
      filter: brightness(1.06);
    }
    .track-card-play-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
      opacity: 1 !important;
      transform: scale(1) !important;
    }

    /* Top 10 rank */
    .rank-num {
      font-family: var(--ff-display);
      font-size: 32px; line-height:1;
      color: var(--text3);
      min-width:42px;
    }
    .rank-num.top3 { color: var(--accent); }

    /* Nav — Lab console links (sidebar + drawer) */
    .nav-link {
      position: relative;
      display: flex;
      align-items: center;
      gap: 11px;
      width: 100%;
      padding: 11px 14px;
      border: 1px solid transparent;
      border-radius: 14px;
      background: transparent;
      color: var(--text2);
      font-size: 15px;
      font-weight: 500;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
      transition: color 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
    }
    .nav-link.is-compact {
      gap: 10px;
      padding: 10px 12px;
      font-size: 14px;
      border-radius: 12px;
    }
    .nav-link-icon {
      display: grid;
      place-items: center;
      width: 22px;
      flex-shrink: 0;
      color: inherit;
      opacity: 0.88;
    }
    .nav-link-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .nav-link-pro {
      flex-shrink: 0;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #07120a;
      background: linear-gradient(135deg, #4ade80, #16a34a);
      padding: 3px 7px;
      border-radius: 6px;
      line-height: 1.1;
    }
    .nav-link:hover {
      color: var(--text);
      background: rgba(56, 189, 248, 0.07);
      border-color: rgba(56, 189, 248, 0.16);
    }
    .nav-link.active {
      color: var(--accent);
      background:
        radial-gradient(120% 140% at 0% 50%, rgba(56, 189, 248, 0.18), transparent 55%),
        rgba(56, 189, 248, 0.1);
      border-color: rgba(56, 189, 248, 0.35);
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.14);
      font-weight: 600;
    }
    .nav-link.active .nav-link-icon {
      opacity: 1;
      filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.55));
    }

    /* Direct Messages */
    .dm-wrap { max-width: 980px; margin: 0 auto; padding-bottom: 110px; }
    .dm-header {
      display:flex; align-items:flex-end; justify-content:space-between; gap:14px;
      margin-bottom: 18px;
    }
    .dm-title { font-family: var(--ff-display); letter-spacing: 0.04em; line-height: 1; }
    .dm-subtitle { color: var(--text2); font-size: 13px; margin-top: 6px; line-height: 1.55; }

    .dm-list { display:flex; flex-direction:column; gap:10px; }
    .dm-row {
      display:flex; align-items:center; gap:10px;
      border: 1px solid var(--border);
      background: rgba(17,24,39,0.72);
      border-radius: 14px;
      overflow: hidden;
      transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }
    .dm-row:hover { transform: translateY(-2px); border-color: rgba(56,189,248,0.35); box-shadow: 0 16px 42px rgba(0,0,0,0.4); }
    .dm-row-link {
      flex: 1;
      display:flex; align-items:center; gap:12px;
      padding: 14px 14px;
      min-width: 0;
    }
    .dm-row-meta { flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; }
    .dm-row-top { display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .dm-peer { display:flex; align-items:center; gap:8px; min-width:0; }
    .dm-peer-name { font-weight: 800; font-size: 15px; line-height: 1.15; }
    .dm-peer-handle { font-size: 12px; color: var(--text3); }
    .dm-preview { font-size: 13px; color: var(--text2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .dm-row-right { display:flex; align-items:center; gap:10px; flex-shrink:0; padding-right: 10px; }
    .dm-unread-pill {
      min-width: 24px; height: 24px; padding: 0 8px;
      border-radius: 999px;
      background: var(--accent2); color: #07090f;
      font-size: 12px; font-weight: 900;
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 0 18px rgba(14,165,233,0.24);
    }
    .dm-time { font-size: 11px; color: var(--text3); font-variant-numeric: tabular-nums; }

    .dm-thread {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: rgba(17,24,39,0.72);
      overflow: hidden;
      box-shadow: 0 18px 60px rgba(0,0,0,0.42);
    }
    .dm-thread-head {
      position: sticky; top: 0; z-index: 2;
      background: rgba(7,9,15,0.72);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(30,45,69,0.7);
      padding: 12px 12px;
      display:flex; align-items:center; gap:12px;
    }
    .dm-thread-body {
      padding: 14px 14px;
      height: 520px;
      overflow-y: auto;
    }
    .dm-bubble-row { display:flex; margin-bottom: 10px; }
    .dm-bubble {
      display: inline-block;
      max-width: 72%;
      padding: 11px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .dm-bubble.mine {
      margin-left: auto;
      background: linear-gradient(135deg, var(--accent2), rgba(56,189,248,0.8));
      color: #07090f;
      box-shadow: 0 10px 30px rgba(14,165,233,0.22);
    }
    .dm-bubble.theirs { background: rgba(26,34,53,0.9); border: 1px solid rgba(30,45,69,0.9); color: var(--text); }
    .dm-bubble-meta { font-size: 11px; color: var(--text3); margin-top: 5px; font-variant-numeric: tabular-nums; }
    .dm-compose {
      display:flex; gap:10px; align-items:flex-end;
      padding: 12px 12px;
      border-top: 1px solid rgba(30,45,69,0.7);
      background: rgba(12,16,24,0.55);
      backdrop-filter: blur(14px);
    }
    .dm-compose textarea.inp {
      min-height: 44px;
      resize: none;
      border-radius: 14px;
      background: rgba(17,24,39,0.9);
    }
    .dm-send-btn {
      width: 46px; height: 46px;
      border-radius: 14px;
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 10px 30px rgba(14,165,233,0.22);
    }

    @media (min-width: 721px) {
      .dm-thread-body { height: min(64vh, 640px); }
    }

    @media (max-width: 720px) {
      .dm-wrap { padding-bottom: 120px; }
      .dm-row-link { padding: 12px 12px; gap: 10px; }
      .dm-row-meta { gap: 5px; }
      .dm-row-top { align-items: flex-start; }
      .dm-peer { flex-direction: column; align-items: flex-start; gap: 2px; }
      .dm-peer-name { font-size: 14px; }
      /* Show full handle (wrap) without overlapping other elements */
      .dm-peer-handle {
        display: block;
        white-space: normal;
        overflow: visible;
        text-overflow: unset;
        line-height: 1.2;
      }
      .dm-preview { font-size: 12px; }
      .dm-time { font-size: 10px; }
      .dm-row-right { gap: 8px; padding-right: 8px; }
      .dm-unread-pill { min-width: 22px; height: 22px; font-size: 11px; }
      /* Give the toggle button a little breathing room */
      .dm-row > .btn.btn-ghost { margin-right: 8px !important; }

      /* iOS/Safari: avoid “warped/blurred” text while typing on translucent+blur backdrops */
      .dm-compose { backdrop-filter: none; }
      .dm-compose textarea.inp {
        font-size: 16px; /* prevents iOS zoom + improves text rasterization */
        line-height: 1.35;
        background: var(--surface);
        color: var(--text);
        padding: 10px 12px;
        -webkit-text-size-adjust: 100%;
      }
    }

    /* Modal */
    .modal-overlay {
      position:fixed; inset:0;
      background: rgba(0,0,0,0.75); backdrop-filter:blur(4px);
      z-index:900; display:flex; align-items:center; justify-content:center;
      padding: 20px; animation: fadeIn 0.2s ease;
    }
    /* Auth — same glow language as landing-site */
    .auth-overlay {
      background:
        radial-gradient(70% 60% at 50% 0%, rgba(56, 189, 248, 0.14), transparent 55%),
        rgba(7, 9, 15, 0.72);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .register-page .register-modal-overlay {
      position: absolute;
      z-index: 2;
      background:
        radial-gradient(70% 55% at 50% 8%, rgba(56, 189, 248, 0.12), transparent 55%),
        rgba(7, 9, 15, 0.35);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .register-page.landing-site {
      min-height: 100vh;
      min-height: 100dvh;
    }
    .auth-loading {
      display: grid;
      place-items: center;
      font-family: Outfit, system-ui, sans-serif;
    }
    .modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r2); padding: 32px;
      max-width: 520px; width:100%; max-height:90vh; overflow-y:auto;
      box-shadow: 0 24px 80px rgba(0,0,0,0.8);
    }
    .modal.auth-card {
      position: relative;
      max-width: 420px;
      padding: 28px 24px 24px;
      font-family: Outfit, system-ui, sans-serif;
      color: #F5F5F2;
      border-radius: 24px;
      border: 1px solid rgba(56, 189, 248, 0.28);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.2), transparent 55%),
        linear-gradient(160deg, #1A2230, #0E131D);
      box-shadow:
        0 0 36px rgba(56, 189, 248, 0.16),
        0 24px 80px rgba(0, 0, 0, 0.55);
    }
    .auth-brand {
      display: flex;
      justify-content: center;
      margin-bottom: 18px;
    }
    .auth-brand img {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      object-fit: cover;
      display: block;
      box-shadow: 0 0 22px rgba(56, 189, 248, 0.28);
    }
    .auth-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 22px;
    }
    .auth-head-solo { padding-right: 28px; }
    .auth-title {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }
    .auth-sub {
      margin: 6px 0 0;
      font-size: 13px;
      color: #A9B0BD;
      line-height: 1.45;
    }
    .auth-close {
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      margin: -6px -6px 0 0;
      padding: 0;
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: #A9B0BD;
      cursor: pointer;
      text-decoration: none;
    }
    .auth-close:hover { color: #F5F5F2; background: rgba(56, 189, 248, 0.1); }
    .auth-close-abs {
      position: absolute;
      top: 14px;
      right: 14px;
      margin: 0;
    }
    .auth-notice {
      margin: 0 0 14px;
      font-size: 13px;
      line-height: 1.55;
      color: #A9B0BD;
    }
    .auth-notice.is-warn { color: var(--orange); }
    .auth-notice.is-error { color: var(--red); }
    .auth-notice.is-ok { color: var(--green); }
    .auth-notice code { color: var(--accent); }
    .auth-fields {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 18px;
    }
    .auth-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 5px;
      color: #A9B0BD;
    }
    .auth-genre {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }
    .auth-genre legend.auth-label {
      padding: 0;
      float: none;
    }
    .auth-genre-slider {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      padding: 4px 2px 10px;
      margin: 0 -2px;
      scrollbar-width: none;
    }
    .auth-genre-slider::-webkit-scrollbar { display: none; }
    .auth-genre-chip {
      position: relative;
      flex: none;
      scroll-snap-align: start;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 16px;
      border-radius: 20px;
      border: 1px solid rgba(56, 189, 248, 0.22);
      background: rgba(7, 9, 15, 0.45);
      color: #F5F5F2;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
      transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
    }
    .auth-genre-chip input {
      position: absolute;
      opacity: 0;
      width: 1px;
      height: 1px;
      margin: 0;
      pointer-events: none;
    }
    .auth-genre-chip.is-on {
      border-color: rgba(56, 189, 248, 0.65);
      background: rgba(56, 189, 248, 0.16);
      color: var(--accent);
      font-weight: 600;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.22);
    }
    .auth-genre-chip:focus-within {
      outline: 2px solid rgba(56, 189, 248, 0.45);
      outline-offset: 2px;
    }
    .auth-genre-select { display: none; }
    @media (min-width: 721px) {
      .auth-genre-slider { display: none; }
      .auth-genre-select { display: block; }
    }
    .auth-card .inp,
    .auth-card select.inp {
      background: rgba(7, 9, 15, 0.55);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 14px;
      color: #F5F5F2;
    }
    .auth-card .inp:focus {
      border-color: rgba(56, 189, 248, 0.55);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.14), 0 0 16px rgba(56, 189, 248, 0.12);
    }
    .auth-card label {
      color: #A9B0BD;
    }
    .auth-submit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 52px;
      margin-bottom: 16px;
      padding: 0 28px;
      border: 0;
      border-radius: 28px;
      background: #F29A80;
      color: #07090F;
      font-family: inherit;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 0 22px rgba(242, 154, 128, 0.28);
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
    }
    .auth-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(242, 154, 128, 0.35);
    }
    .auth-submit:disabled {
      opacity: 0.45;
      cursor: default;
      box-shadow: none;
    }
    .auth-foot {
      text-align: center;
      font-size: 13px;
      color: #A9B0BD;
    }
    .auth-foot p { margin: 0; }
    .auth-link,
    .auth-link-muted {
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      cursor: pointer;
    }
    .auth-link {
      color: var(--accent);
      font-weight: 600;
      text-shadow: 0 0 12px rgba(56, 189, 248, 0.35);
    }
    .auth-link:hover { color: var(--accent3); }
    .auth-link-muted {
      display: block;
      width: 100%;
      margin-bottom: 12px;
      color: #A9B0BD;
      font-size: 13px;
    }
    .auth-link-muted:hover { color: #F5F5F2; }
    @media (prefers-reduced-motion: reduce) {
      .auth-submit { transition: none; }
    }

    /* For You vertical feed */
    .for-you-feed {
      scrollbar-width: none;
      height: 100%;
      overflow-y: auto;
      scroll-snap-type: y mandatory;
      overscroll-behavior-y: contain;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
    }
    .for-you-feed::-webkit-scrollbar { display: none; }

    /* For You — compact comments panel (left inset sheet) */
    .for-you-comments-backdrop {
      position: fixed;
      inset: 0;
      z-index: 900;
      background: rgba(0, 0, 0, 0.38);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      animation: forYouCommentsBackdropIn 0.22s ease;
    }
    @keyframes forYouCommentsBackdropIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .for-you-comments-panel {
      position: fixed;
      z-index: 910;
      left: max(10px, env(safe-area-inset-left, 0px));
      top: max(56px, env(safe-area-inset-top, 0px));
      bottom: max(88px, env(safe-area-inset-bottom, 0px));
      width: min(340px, calc(100vw - 48px));
      max-width: 78vw;
      display: flex;
      flex-direction: column;
      background: rgba(10, 13, 22, 0.92);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 8px 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.35);
      overflow: hidden;
      animation: forYouCommentsPanelIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @media (min-width: 721px) {
      .for-you-comments-panel {
        left: calc(var(--desktop-sidebar-width) + max(16px, env(safe-area-inset-left, 0px)));
        top: max(72px, env(safe-area-inset-top, 0px));
        bottom: max(32px, env(safe-area-inset-bottom, 0px));
        width: 360px;
        max-width: none;
      }
    }
    @keyframes forYouCommentsPanelIn {
      from {
        transform: translateX(calc(-100% - 16px));
        opacity: 0.6;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .for-you-comments-backdrop,
      .for-you-comments-panel {
        animation: none;
      }
    }
    .for-you-comments-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 14px 12px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .for-you-comments-header-title {
      font-weight: 700;
      font-size: 15px;
      line-height: 1.2;
    }
    .for-you-comments-header-meta {
      font-size: 11px;
      color: var(--text3);
      margin-top: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 220px;
    }
    .for-you-comments-header-hint {
      font-size: 10px;
      color: var(--text3);
      margin-top: 4px;
      opacity: 0.85;
    }
    .for-you-comments-close {
      padding: 6px;
      flex-shrink: 0;
      margin: -4px -4px 0 0;
    }
    .for-you-comments-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 10px 12px;
      -webkit-overflow-scrolling: touch;
    }
    .for-you-comments-empty {
      color: var(--text3);
      font-size: 13px;
      text-align: center;
      margin: 20px 8px;
      line-height: 1.45;
    }
    .for-you-comments-item {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .for-you-comments-item:last-child {
      margin-bottom: 0;
    }
    .for-you-comments-item.is-highlighted {
      background: rgba(56, 189, 248, 0.12);
      border-radius: 10px;
      margin-left: -6px;
      margin-right: -6px;
      padding: 6px;
      animation: forYouCommentHighlight 1.6s ease;
    }
    @keyframes forYouCommentHighlight {
      0%, 100% { box-shadow: none; }
      20% { box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.45); }
    }
    .for-you-comments-item-body {
      min-width: 0;
      flex: 1;
    }
    .for-you-comments-item-head {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
    }
    .for-you-comments-item-author {
      font-weight: 600;
      font-size: 12px;
    }
    .for-you-comments-item-time {
      font-size: 10px;
      color: var(--text3);
    }
    .for-you-comments-item-text {
      font-size: 13px;
      color: var(--text2);
      margin-top: 2px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .for-you-comments-compose {
      flex-shrink: 0;
      padding: 10px 12px 12px;
      border-top: 1px solid var(--border);
      background: rgba(7, 9, 15, 0.55);
    }
    .for-you-comments-compose-error {
      color: var(--red);
      font-size: 11px;
      margin: 0 0 8px;
    }
    .for-you-comments-compose-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .for-you-comments-textarea {
      flex: 1;
      min-height: 38px;
      max-height: 96px;
      resize: none;
      padding: 9px 12px;
      font-size: 13px;
      line-height: 1.35;
    }
    .for-you-comments-send {
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .for-you-comments-guest {
      flex-shrink: 0;
      padding: 12px;
      border-top: 1px solid var(--border);
      background: rgba(7, 9, 15, 0.55);
      text-align: center;
    }
    .for-you-comments-guest p {
      font-size: 12px;
      color: var(--text2);
      margin: 0 0 10px;
      line-height: 1.4;
    }
    .for-you-comments-guest-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Mix detail — inline comments (same data as For You panel) */
    .mix-comments-section {
      margin-top: 22px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
    }
    .mix-comments-list {
      max-height: min(52vh, 420px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .mix-comments-empty {
      padding: 20px 16px;
      margin: 0;
      font-size: 13px;
      color: var(--text3);
      line-height: 1.55;
      text-align: center;
    }
    .mix-comments-item {
      display: flex;
      gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .mix-comments-item:last-child {
      border-bottom: none;
    }
    .mix-comments-item.is-highlighted {
      background: rgba(56,189,248,0.08);
      box-shadow: inset 0 0 0 1px rgba(56,189,248,0.25);
    }
    .mix-comments-item.is-own {
      background: rgba(255,255,255,0.02);
    }
    .mix-comments-avatar-link {
      flex-shrink: 0;
      display: inline-flex;
      border-radius: 999px;
      line-height: 0;
      text-decoration: none;
    }
    .mix-comments-avatar-link:hover,
    .mix-comments-avatar-link:focus-visible {
      outline: 2px solid rgba(56,189,248,0.45);
      outline-offset: 2px;
    }
    .mix-comments-item-body {
      min-width: 0;
      flex: 1;
    }
    .mix-comments-item-head {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }
    .mix-comments-item-author {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
      font-weight: 700;
      font-size: 13px;
      color: var(--text);
      text-decoration: none;
    }
    a.mix-comments-item-author:hover .mix-comments-item-name,
    a.mix-comments-item-author:focus-visible .mix-comments-item-name {
      color: var(--accent);
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .mix-comments-item-name {
      color: inherit;
    }
    .mix-comments-item-handle {
      font-weight: 500;
      font-size: 12px;
      color: var(--text3);
    }
    a.mix-comments-item-author:hover .mix-comments-item-handle,
    a.mix-comments-item-author:focus-visible .mix-comments-item-handle {
      color: var(--text2);
    }
    .mix-comments-you-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--accent);
      background: rgba(56,189,248,0.12);
      border: 1px solid rgba(56,189,248,0.25);
      padding: 2px 6px;
      border-radius: 999px;
    }
    .mix-comments-item-time {
      font-size: 11px;
      color: var(--text3);
      margin-left: auto;
    }
    .mix-comments-compose {
      padding: 12px 16px 14px;
      border-top: 1px solid var(--border);
      background: rgba(7,9,15,0.35);
    }
    .mix-comments-compose-error {
      color: var(--red);
      font-size: 12px;
      margin: 0 0 8px;
    }
    .mix-comments-compose-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .mix-comments-send {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      min-width: 44px;
      padding: 0;
      justify-content: center;
      border-radius: 12px;
    }
    .mix-comments-compose-hint {
      margin: 8px 0 0;
      font-size: 11px;
      color: var(--text3);
    }
    .mix-comments-guest {
      padding: 16px;
      border-top: 1px solid var(--border);
      text-align: center;
    }
    .mix-comments-guest p {
      font-size: 13px;
      color: var(--text2);
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .mix-comments-guest-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 280px;
      margin: 0 auto;
    }

    .comment-mention {
      color: var(--accent3);
      font-weight: 600;
      text-decoration: none;
    }
    .comment-mention:hover {
      text-decoration: underline;
    }
    .comment-mention-unknown {
      color: var(--accent3);
      opacity: 0.75;
      font-weight: 600;
    }
    .mention-textarea-wrap {
      position: relative;
      flex: 1;
      min-width: 0;
    }
    .mention-suggestions {
      position: absolute;
      left: 0;
      right: 0;
      bottom: calc(100% + 6px);
      margin: 0;
      padding: 6px;
      list-style: none;
      background: rgba(12, 16, 24, 0.98);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
      max-height: 180px;
      overflow-y: auto;
      z-index: 2;
    }
    .mention-suggestion {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text);
      cursor: pointer;
      text-align: left;
    }
    .mention-suggestion.active,
    .mention-suggestion:hover {
      background: rgba(56, 189, 248, 0.12);
    }
    .mention-suggestion-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .mention-suggestion-name {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.2;
    }
    .mention-suggestion-handle {
      font-size: 11px;
      color: var(--text3);
    }

    /* Desktop mini / expanded player — reuse mobile glow control language */
    .dnp-control,
    .dnp-utility {
      border: 0;
      background: transparent;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
    }
    .player-bar .dnp-control {
      width: 36px;
      height: 36px;
    }
    .player-bar .dnp-control-main {
      width: 46px;
      height: 46px;
      margin: 0 2px;
    }
    .player-bar .dnp-utility {
      width: 32px;
      height: 32px;
      filter: drop-shadow(0 0 5px rgba(242, 154, 128, 0.65)) drop-shadow(0 0 12px rgba(242, 154, 128, 0.35));
    }
    .player-bar .dnp-utility.is-liked {
      filter: none;
    }
    .player-bar .mnp-utility-glow.is-on {
      color: #F29A80;
    }

    /* Player bar — full-bleed; sidebar ends above it on desktop so nav stays clear */
    .player-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(7,9,15,0.95);
      backdrop-filter: blur(20px);
      border-top: 1px solid var(--border);
      z-index: 800;
      padding: 12px 24px;
      padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
    }
    .player-bar.is-desktop-expanded {
      /* Sit above the expanded-player dim layer so the bar isn’t cut off */
      z-index: 860;
    }
    @media (max-width: 720px) {
      .player-bar {
        background: var(--bg2);
        backdrop-filter: none;
        padding: 8px 12px;
        padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
      }
      .player-bar.player-bar-above-tabs {
        bottom: calc(var(--mobile-tab-nav-height) + env(safe-area-inset-bottom, 0px));
        padding-bottom: 8px;
        border-bottom: none;
      }
    }

    /* Mix detail — mobile action row + seek slider */
    .mix-detail-mobile-actions {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
    }
    .mix-detail-action-row {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }
    .mix-detail-action-btn {
      flex: 1;
      min-width: 0;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px 6px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text2);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.02em;
      line-height: 1.1;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .mix-detail-action-btn.is-primary,
    .mix-detail-action-btn.is-on {
      color: var(--bg);
      background: var(--accent2);
      border-color: var(--accent2);
    }
    /* Mobile primary tab bar — under mini player */
    .mobile-bottom-nav {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 810;
      display: flex;
      align-items: stretch;
      justify-content: space-around;
      gap: 4px;
      height: calc(var(--mobile-tab-nav-height) + env(safe-area-inset-bottom, 0px));
      padding: 4px 8px env(safe-area-inset-bottom, 0px);
      background: var(--bg2);
      border-top: 1px solid var(--border);
      box-sizing: border-box;
    }
    .mobile-bottom-nav-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-width: 0;
      min-height: 0;
      height: 100%;
      padding: 2px 6px;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: var(--text3);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .mobile-bottom-nav-btn.is-active {
      color: var(--accent2);
    }
    .mobile-bottom-nav-icon-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 24px;
    }
    .mobile-bottom-nav-badge {
      position: absolute;
      top: -1px;
      right: -2px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--red);
      border: 1px solid var(--bg2);
    }
    .mobile-bottom-nav-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.02em;
      line-height: 1;
    }

    /* Desktop bottom player — sliding mix title when truncated */
    .marquee-title {
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      min-width: 0;
    }
    .marquee-title-measure {
      position: absolute;
      visibility: hidden;
      pointer-events: none;
      white-space: nowrap;
      font: inherit;
      font-weight: inherit;
      letter-spacing: inherit;
    }
    .marquee-title-track {
      display: inline-flex;
      width: max-content;
      will-change: transform;
    }
    .marquee-title-item {
      display: inline-block;
      white-space: nowrap;
      padding-right: 2.25rem;
      box-sizing: content-box;
    }
    .marquee-title:not(.is-overflowing) .marquee-title-item {
      padding-right: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .marquee-title.is-overflowing .marquee-title-track {
      animation: player-title-marquee 14s linear infinite;
    }
    .marquee-title.is-overflowing:hover .marquee-title-track,
    .marquee-title.is-overflowing:active .marquee-title-track {
      animation-play-state: paused;
    }
    @keyframes player-title-marquee {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .marquee-title.is-overflowing .marquee-title-track {
        animation: none;
      }
      .marquee-title.is-overflowing .marquee-title-item:last-child {
        display: none;
      }
      .marquee-title.is-overflowing .marquee-title-item {
        padding-right: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    /* App sidebar + mobile drawer — same Lab atmosphere as landing tiles */
    .sidebar-shell {
      position: relative;
      isolation: isolate;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      color: #F5F5F2;
      background:
        radial-gradient(120% 90% at 0% 0%, rgba(56, 189, 248, 0.16), transparent 55%),
        linear-gradient(180deg, #121820 0%, #0A0E16 55%, #07090F 100%);
      border: 1px solid rgba(56, 189, 248, 0.16);
    }
    .sidebar-shell-glow {
      position: absolute;
      inset: 0 0 auto;
      height: 180px;
      pointer-events: none;
      z-index: 0;
      background: radial-gradient(70% 100% at 30% 0%, rgba(56, 189, 248, 0.14), transparent 70%);
    }
    .sidebar-shell > *:not(.sidebar-shell-glow) { position: relative; z-index: 1; }
    .sidebar-desktop {
      width: var(--desktop-sidebar-width);
      max-height: calc(100dvh - 16px);
      position: fixed;
      top: 0;
      left: 0;
      z-index: 250;
      flex-shrink: 0;
      padding: 0 12px 16px;
      border-right: 1px solid rgba(56, 189, 248, 0.16);
      border-bottom: 1px solid rgba(56, 189, 248, 0.12);
      border-radius: 0 0 22px 0;
      box-shadow:
        0 0 40px rgba(56, 189, 248, 0.08),
        10px 18px 40px rgba(0, 0, 0, 0.35);
    }
    .sidebar-desktop.has-player {
      /* Keep account nav above the full-bleed mini player */
      max-height: calc(100dvh - 104px);
    }
    .sidebar-drawer {
      width: 100%;
      max-height: calc(100dvh - 8px);
      padding: 0 10px 10px;
      border-radius: 0 0 18px 18px;
      border-right: none;
      box-shadow: 0 22px 48px rgba(0, 0, 0, 0.45);
      /* Prefer fitting the full menu; scroll only if the phone is very short. */
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .sidebar-drawer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 2px 6px;
      margin-bottom: 2px;
      border-bottom: 1px solid rgba(56, 189, 248, 0.14);
      flex-shrink: 0;
    }
    .sidebar-drawer-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      text-shadow: 0 0 14px rgba(56, 189, 248, 0.4);
    }
    .sidebar-drawer-close {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 1px solid rgba(56, 189, 248, 0.22);
      border-radius: 10px;
      background: rgba(7, 9, 15, 0.35);
      color: #A9B0BD;
      cursor: pointer;
    }
    .sidebar-drawer-close:hover {
      color: #F5F5F2;
      border-color: rgba(56, 189, 248, 0.45);
      background: rgba(56, 189, 248, 0.1);
    }
    .sidebar-brand {
      padding: 20px 8px 16px;
      margin-bottom: 10px;
      border-bottom: 1px solid rgba(56, 189, 248, 0.12);
      flex-shrink: 0;
    }
    .sidebar-brand.is-drawer {
      padding: 2px 2px 6px;
      margin-bottom: 2px;
      border-bottom: none;
    }
    .sidebar-brand-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: inherit;
      min-width: 0;
    }
    .sidebar-brand-mark {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      object-fit: contain;
      flex-shrink: 0;
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.28);
    }
    .sidebar-drawer .sidebar-brand-mark {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.22);
    }
    .sidebar-brand-name {
      font-family: var(--ff-brand);
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.15;
      min-width: 0;
    }
    .sidebar-drawer .sidebar-brand-name { font-size: 14px; }
    .sidebar-nav-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
      min-height: 0;
    }
    .sidebar-drawer .sidebar-nav-body {
      gap: 6px;
      flex: 0 0 auto;
    }
    .sidebar-nav-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sidebar-drawer .sidebar-nav-group { gap: 0; }
    .sidebar-nav-heading {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #7B8494;
      padding: 0 12px 6px;
    }
    .sidebar-drawer .sidebar-nav-heading {
      font-size: 9px;
      letter-spacing: 0.12em;
      padding: 2px 10px 3px;
    }
    .sidebar-drawer .nav-link.is-compact {
      gap: 8px;
      padding: 7px 10px;
      min-height: 0;
      font-size: 14.5px;
      border-radius: 10px;
    }
    .sidebar-drawer .nav-link-icon { width: 19px; }
    .sidebar-drawer .nav-link-pro {
      font-size: 8px;
      padding: 2px 5px;
    }
    .sidebar-account-footer { margin-top: auto; padding-top: 8px; }
    .sidebar-drawer .sidebar-account-footer {
      margin-top: 6px;
      padding-top: 4px;
      flex-shrink: 0;
    }
    .sidebar-user-card {
      padding: 12px;
      border-radius: 16px;
      border: 1px solid rgba(56, 189, 248, 0.22);
      background:
        radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.14), transparent 55%),
        rgba(7, 9, 15, 0.45);
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.08);
    }
    .sidebar-drawer .sidebar-user-card {
      padding: 8px 9px;
      border-radius: 12px;
    }
    .sidebar-user-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      min-width: 0;
    }
    .sidebar-drawer .sidebar-user-row {
      gap: 8px;
      margin-bottom: 7px;
    }
    .sidebar-user-meta { min-width: 0; overflow: hidden; }
    .sidebar-user-name {
      font-weight: 600;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sidebar-drawer .sidebar-user-name { font-size: 13px; }
    .sidebar-user-handle {
      font-size: 12px;
      color: var(--accent);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sidebar-drawer .sidebar-user-handle { font-size: 11px; }
    .sidebar-logout {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 40px;
      border: 1.5px solid rgba(56, 189, 248, 0.4);
      border-radius: 999px;
      background: transparent;
      color: #F5F5F2;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.1);
      transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    }
    .sidebar-drawer .sidebar-logout {
      height: 34px;
      font-size: 12px;
      gap: 6px;
    }
    .sidebar-logout:hover {
      border-color: var(--accent);
      background: rgba(56, 189, 248, 0.1);
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.2);
    }
    .sidebar-signin {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 46px;
      border: 0;
      border-radius: 999px;
      background: #F29A80;
      color: #07090F;
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 0 22px rgba(242, 154, 128, 0.28);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .sidebar-signin:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(242, 154, 128, 0.35);
    }

    .mobile-nav-backdrop {
      position: fixed;
      inset: 0;
      z-index: 850;
      background:
        radial-gradient(70% 50% at 0% 0%, rgba(56, 189, 248, 0.12), transparent 55%),
        rgba(7, 9, 15, 0.62);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: opacity 0.22s ease;
    }
    .mobile-nav-drawer {
      position: fixed;
      top: 0;
      left: 0;
      bottom: auto;
      z-index: 860;
      width: min(236px, 66vw);
      max-width: 100%;
      max-height: calc(100dvh - 8px);
      height: auto;
      background: transparent;
      border-right: none;
      box-shadow: none;
      display: flex;
      flex-direction: column;
      transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
      padding-bottom: 0;
      overflow: hidden;
      border-radius: 0 0 18px 18px;
    }
    .mobile-nav-drawer.closed { transform: translateX(-105%); pointer-events: none; }
    .mobile-nav-drawer.open { transform: translateX(0); }
    .mobile-nav-backdrop.hidden { opacity: 0; pointer-events: none; }
    .mobile-nav-backdrop.visible { opacity: 1; }
    @media (prefers-reduced-motion: reduce) {
      .landing-site-sheet { animation: none; }
      .mobile-nav-drawer,
      .mobile-nav-backdrop { transition: none; }
      .sidebar-signin { transition: none; }
    }

    /* Upload drop zone */
    .drop-zone {
      border: 2px dashed var(--border); border-radius: var(--r2);
      padding: 40px; text-align:center; cursor:pointer;
      transition: all 0.2s;
    }
    .drop-zone:hover, .drop-zone.dragging {
      border-color: var(--accent2); background: var(--glow2);
    }

    /* Mobile full-player transport — uniform size, press-only highlight */
    .dz-transport-btn {
      width: 52px;
      height: 52px;
      min-width: 52px;
      min-height: 52px;
      padding: 0;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text2);
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }
    .dz-transport-btn:hover {
      border-color: rgba(56, 189, 248, 0.45);
      color: var(--text);
    }
    .dz-transport-btn:active {
      background: var(--glow2);
      border-color: var(--accent);
      color: var(--accent);
      box-shadow: 0 0 14px var(--glow);
    }
    .dz-transport-btn[aria-pressed="true"] {
      background: var(--glow2);
      border-color: var(--accent);
      color: var(--accent);
      box-shadow: 0 0 14px var(--glow);
    }
    .dz-transport-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
      padding-bottom: 2px;
    }
    .mnp-screen {
      position: fixed;
      inset: 0;
      z-index: 875;
      display: flex;
      flex-direction: column;
      height: 100dvh;
      max-height: 100dvh;
      overflow: hidden;
      background:
        radial-gradient(ellipse at 50% -20%, rgba(56, 189, 248, 0.16), transparent 48%),
        var(--bg);
      color: var(--text);
    }
    .mnp-page {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      width: min(100%, 480px);
      margin: 0 auto;
      padding: max(12px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
    }
    .mnp-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;
      margin-bottom: 16px;
    }
    .mnp-wordmark {
      font-family: var(--ff-brand);
      font-size: 21px;
      line-height: 0.92;
      font-weight: 700;
      letter-spacing: -0.06em;
    }
    .mnp-wordmark span { color: var(--accent); }
    .mnp-live {
      display: flex;
      align-items: center;
      gap: 7px;
      color: var(--text2);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    .mnp-live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text3);
    }
    .mnp-live-dot.is-on {
      background: var(--accent);
      box-shadow: 0 0 12px var(--glow);
    }
    .mnp-card {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 4px 0 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    .mnp-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      margin-bottom: 14px;
      color: var(--text2);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
    }
    .mnp-icon-btn,
    .mnp-control,
    .mnp-utility,
    .mnp-artist,
    .mnp-next {
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      padding: 0;
    }
    .mnp-icon-btn {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      color: var(--text);
    }
    .mnp-art {
      width: min(100%, 36dvh);
      height: auto;
      margin: 0 auto;
      aspect-ratio: 1;
      flex: 0 0 auto;
      align-self: center;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--bg2);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    }
    .mnp-art img,
    .mnp-art-fallback {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .mnp-art-fallback {
      display: grid;
      place-items: center;
    }
    .mnp-info {
      flex-shrink: 0;
      margin-top: 16px;
      text-align: center;
    }
    .mnp-genre {
      display: inline-flex;
      align-items: center;
      padding: 5px 10px;
      border: 1px solid rgba(56, 189, 248, 0.45);
      border-radius: 30px;
      color: var(--accent);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .mnp-title {
      width: 100%;
      margin: 10px 0 4px;
      min-width: 0;
      font-size: 21px;
      font-weight: 650;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }
    .mnp-title .marquee-title {
      font: inherit;
      font-weight: inherit;
      letter-spacing: inherit;
      line-height: inherit;
    }
    .mnp-title .marquee-title.is-overflowing .marquee-title-track {
      /* Larger type than the desktop bar; stretch duration so glide speed matches. */
      animation-duration: 24s;
    }
    .mnp-title .marquee-title:not(.is-overflowing) {
      text-align: center;
    }
    button.mnp-artist {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 8px;
      padding: 6px 14px;
      border: 1px solid rgba(56, 189, 248, 0.45);
      border-radius: 30px;
      color: var(--accent);
      font-size: 13px;
      font-weight: 650;
      max-width: 100%;
    }
    button.mnp-artist .mnp-artist-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    button.mnp-artist:hover,
    button.mnp-artist:focus-visible {
      border-color: var(--accent);
      background: rgba(56, 189, 248, 0.12);
    }
    div.mnp-artist {
      color: var(--text2);
      font-size: 13px;
    }
    .mnp-timeline { flex-shrink: 0; margin-top: 16px; }
    .mnp-progress-hit {
      /* Side padding so the thumb isn’t clipped by .mnp-card overflow at 0%/100%. */
      padding: 8px 6px;
      cursor: pointer;
      touch-action: none;
    }
    .mnp-progress-track {
      position: relative;
      height: 4px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.12);
      overflow: visible;
    }
    .mnp-progress-fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent2), var(--accent));
      box-shadow: 0 0 10px var(--glow);
    }
    .mnp-progress-thumb {
      position: absolute;
      top: 50%;
      width: 10px;
      height: 10px;
      margin-left: -5px;
      transform: translateY(-50%);
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 9px var(--glow);
      pointer-events: none;
    }
    .mnp-times {
      display: flex;
      justify-content: space-between;
      color: var(--text3);
      font-size: 10px;
      font-variant-numeric: tabular-nums;
    }
    .mnp-transport {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-shrink: 0;
      margin-top: 12px;
    }
    .mnp-control {
      display: grid;
      place-items: center;
      width: 36px;
      height: 38px;
      color: var(--text);
    }
    .mnp-control.is-on { color: var(--accent); }
    .mnp-control-glow {
      width: 44px;
      height: 44px;
      color: #F29A80;
      filter: drop-shadow(0 0 6px rgba(242, 154, 128, 0.75)) drop-shadow(0 0 14px rgba(242, 154, 128, 0.45));
    }
    .mnp-control-glow.is-on {
      color: var(--accent);
      filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.95)) drop-shadow(0 0 18px rgba(56, 189, 248, 0.55));
    }
    .mnp-control-main {
      width: 64px;
      height: 64px;
      border: 2px solid #F29A80 !important;
      border-radius: 50%;
      color: #F29A80;
      box-shadow:
        0 0 18px rgba(242, 154, 128, 0.55),
        0 0 32px rgba(242, 154, 128, 0.28),
        inset 0 0 14px rgba(242, 154, 128, 0.16);
      filter: none;
    }
    .mnp-utilities {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      margin: 12px 0 14px;
    }
    .mnp-utility {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      color: var(--text2);
    }
    .mnp-utility:disabled { opacity: 0.4; cursor: default; }
    .mnp-utility.is-on { color: var(--accent); }
    .mnp-utility.is-liked { color: #f87171; }
    .mnp-utility-glow {
      width: 44px;
      height: 44px;
      color: #F29A80;
      filter: drop-shadow(0 0 6px rgba(242, 154, 128, 0.75)) drop-shadow(0 0 14px rgba(242, 154, 128, 0.45));
    }
    .mnp-utility-glow.is-on {
      color: #F29A80;
      filter: drop-shadow(0 0 8px rgba(242, 154, 128, 0.9)) drop-shadow(0 0 18px rgba(242, 154, 128, 0.55));
    }
    .mnp-next {
      display: flex;
      align-items: center;
      gap: 11px;
      flex-shrink: 0;
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border) !important;
      border-radius: 12px;
      background: linear-gradient(110deg, var(--surface), var(--bg2));
      text-align: left;
    }
    .mnp-next img,
    .mnp-next-mark {
      width: 43px;
      height: 43px;
      border-radius: 7px;
      object-fit: cover;
      flex: 0 0 43px;
    }
    .mnp-next-mark {
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--accent2), var(--accent));
      color: var(--bg);
      font-size: 10px;
      font-weight: 800;
    }
    .mnp-next-copy { min-width: 0; flex: 1; }
    .mnp-next-kicker {
      display: block;
      margin-bottom: 4px;
      color: var(--text3);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .mnp-next-title {
      display: block;
      overflow: hidden;
      color: var(--text);
      font-size: 12px;
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mnp-next-arrow {
      color: var(--accent);
      font-size: 22px;
      line-height: 1;
    }
    .mnp-toast {
      position: absolute;
      left: 50%;
      bottom: max(24px, env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      z-index: 10;
      max-width: calc(100% - 32px);
      padding: 10px 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: rgba(17, 24, 39, 0.92);
      font-size: 13px;
      text-align: center;
    }
    .mnp-queue-overlay {
      position: absolute;
      inset: 0;
      z-index: 5;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 16px 12px max(16px, env(safe-area-inset-bottom, 0px));
      background: rgba(7, 9, 15, 0.45);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      animation: mnpQueueOverlayIn 0.22s ease;
    }
    @keyframes mnpQueueOverlayIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .mnp-queue {
      width: min(100%, 420px);
      max-height: min(58dvh, 420px);
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px 20px 16px 16px;
      background: rgba(12, 16, 24, 0.78);
      backdrop-filter: blur(22px);
      -webkit-backdrop-filter: blur(22px);
      box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.45);
      padding: 10px 14px 14px;
      animation: mnpQueueSheetIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @keyframes mnpQueueSheetIn {
      from {
        opacity: 0.7;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .mnp-queue-handle {
      width: 40px;
      height: 4px;
      margin: 2px auto 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.22);
      flex-shrink: 0;
    }
    .mnp-queue-bar {
      display: grid;
      grid-template-columns: 64px 1fr 64px;
      align-items: center;
      flex-shrink: 0;
      margin-bottom: 10px;
    }
    .mnp-queue-text {
      border: 0;
      background: transparent;
      color: var(--accent);
      font: inherit;
      font-size: 13px;
      font-weight: 650;
      cursor: pointer;
      padding: 6px 0;
    }
    .mnp-queue-text:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .mnp-queue-bar .mnp-queue-text:last-child { justify-self: end; }
    .mnp-queue-heading {
      text-align: center;
    }
    .mnp-queue-heading span {
      display: block;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .mnp-queue-heading small,
    .mnp-queue-main small {
      color: var(--text3);
      font-size: 11px;
    }
    .mnp-queue-empty {
      margin: 18px 0 8px;
      color: var(--text2);
      text-align: center;
      font-size: 13px;
    }
    .mnp-queue-list {
      list-style: none;
      margin: 0;
      padding: 0;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      -webkit-overflow-scrolling: touch;
    }
    .mnp-queue-list li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      min-height: 0;
      padding: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      background: rgba(17, 24, 39, 0.55);
    }
    .mnp-queue-list li.is-current {
      border-color: rgba(56, 189, 248, 0.5);
      background: rgba(56, 189, 248, 0.12);
    }
    .mnp-queue-grip {
      width: 24px;
      height: 40px;
      margin-top: 2px;
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 3px;
      flex-shrink: 0;
      border: 0;
      background: transparent;
      color: var(--text3);
      cursor: grab;
      touch-action: none;
      padding: 0;
    }
    .mnp-queue-grip span {
      display: block;
      width: 12px;
      height: 2px;
      border-radius: 2px;
      background: currentColor;
    }
    .mnp-queue-main {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      padding: 0;
    }
    .mnp-queue-main img {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
      background: #141414;
    }
    .mnp-queue-main span { min-width: 0; flex: 1; }
    .mnp-queue-main b {
      display: block;
      white-space: normal;
      overflow: visible;
      word-break: break-word;
      font-size: 13px;
      font-weight: 650;
      line-height: 1.3;
    }
    .mnp-queue-now {
      color: var(--accent);
      font-weight: 700;
      white-space: nowrap;
    }
    @media (max-height: 740px) {
      .mnp-topbar { margin-bottom: 8px; }
      .mnp-card { padding: 0; }
      .mnp-art { width: min(100%, 30dvh); }
      .mnp-info { margin-top: 10px; }
      .mnp-title { font-size: 18px; margin-top: 6px; }
      .mnp-timeline { margin-top: 8px; }
      .mnp-transport { margin-top: 4px; }
      .mnp-utilities { margin: 6px 8px 8px; }
    }
  `}</style>
);

