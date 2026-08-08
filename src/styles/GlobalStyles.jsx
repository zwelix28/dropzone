/* eslint-disable react/no-unknown-property */
export const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
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
      --r:         10px;
      --r2:        16px;
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

    /* Animations */
    @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
    @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
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
    .landing-logo {
      width: clamp(88px, 22vw, 120px);
      height: clamp(88px, 22vw, 120px);
      object-fit: contain;
      border-radius: 18px;
      animation: landingLogoBreath 5.5s ease-in-out infinite;
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
    .landing-page.is-ready .landing-logo {
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
    @media (prefers-reduced-motion: reduce) {
      .landing-atmosphere-orb,
      .landing-logo,
      .landing-page.is-ready .landing-logo,
      .landing-page.is-ready .landing-product,
      .landing-page.is-ready .landing-tagline,
      .landing-page.is-ready .landing-cta-block {
        animation: none !important;
      }
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
    .track-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r2); overflow:hidden;
      transition: all 0.25s; cursor:pointer;
    }
    .track-card:hover { border-color: rgba(56,189,248,0.4); transform:translateY(-3px); box-shadow: 0 12px 36px rgba(0,0,0,0.5); }
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

    /* Nav */
    .nav-link {
      display:flex; align-items:center; gap:12px;
      padding: 12px 17px; border-radius:10px;
      color: var(--text2); font-size:17px; font-weight:500;
      transition: all 0.18s; cursor:pointer; border:none;
      background:transparent; width:100%; text-align:left;
    }
    .nav-link:hover { background: var(--surface2); color: var(--text); }
    .nav-link.active { background: rgba(56,189,248,0.1); color: var(--accent); border-left: 2px solid var(--accent); }

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
    /* Register sits on the landing atmosphere; blur matches AuthModal */
    .register-page .register-modal-overlay {
      position: absolute;
      z-index: 2;
      background: rgba(7,9,15,0.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r2); padding: 32px;
      max-width: 520px; width:100%; max-height:90vh; overflow-y:auto;
      box-shadow: 0 24px 80px rgba(0,0,0,0.8);
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

    /* Player bar */
    .player-bar {
      position:fixed; bottom:0; left:0; right:0;
      background: rgba(7,9,15,0.95); backdrop-filter:blur(20px);
      border-top: 1px solid var(--border);
      z-index:800; padding: 12px 24px;
      padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
    }
    @media (max-width: 720px) {
      .player-bar {
        background: var(--bg2);
        backdrop-filter: none;
        padding: 8px 12px;
        padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
      }
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

    /* Mobile nav drawer */
    .mobile-nav-backdrop {
      position: fixed; inset: 0; z-index: 850;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
      transition: opacity 0.2s ease;
    }
    .mobile-nav-drawer {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 860;
      width: min(240px, 70vw);
      max-width: 100%;
      background: var(--bg2);
      border-right: 1px solid var(--border);
      box-shadow: 8px 0 40px rgba(0,0,0,0.45);
      display: flex; flex-direction: column;
      transition: transform 0.22s ease;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    .sidebar-drawer .nav-link {
      gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
    }
    .mobile-nav-drawer.closed { transform: translateX(-105%); pointer-events: none; }
    .mobile-nav-drawer.open { transform: translateX(0); }
    .mobile-nav-backdrop.hidden { opacity: 0; pointer-events: none; }
    .mobile-nav-backdrop.visible { opacity: 1; }

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
    .mobile-now-playing .dz-transport-btn {
      background: rgba(7,9,15,0.48);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .mobile-now-playing .dz-transport-btn:active,
    .mobile-now-playing .dz-transport-btn[aria-pressed="true"] {
      background: rgba(56,189,248,0.12);
      border-color: var(--accent);
      color: var(--accent);
      box-shadow: 0 0 14px var(--glow);
    }
    .mobile-now-playing-controls {
      position: relative;
      z-index: 3;
      flex-shrink: 0;
      width: 100%;
      background: transparent;
      border: none;
      padding-top: 8px;
      padding-bottom: max(6px, env(safe-area-inset-bottom, 0px));
    }
    .mobile-now-playing-controls-inner {
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
      padding: 0 2px;
    }
    .mobile-np-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 14px;
      min-height: 36px;
    }
    .mobile-np-float-chip {
      background: rgba(7,9,15,0.42) !important;
      border: 1px solid rgba(255,255,255,0.12) !important;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 10px 28px rgba(0,0,0,0.28);
      border-radius: 999px;
    }
    .mobile-now-playing .mobile-np-float-like.btn-ghost {
      background: rgba(7,9,15,0.42);
      border: 1px solid rgba(255,255,255,0.12);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 10px 28px rgba(0,0,0,0.28);
      border-radius: 999px;
    }
    .mobile-np-progress-hit {
      padding: 8px 0 10px;
    }
    .mobile-now-playing .mobile-np-float-progress.progress-wrap {
      height: 5px;
      border-radius: 999px;
      background: rgba(7,9,15,0.42);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 10px 28px rgba(0,0,0,0.28);
    }
    .mobile-now-playing .mobile-np-float-progress .progress-fill {
      border-radius: 999px;
    }
    .mobile-np-times {
      display: flex;
      justify-content: space-between;
      margin-bottom: 14px;
      font-size: 11px;
      color: rgba(255,255,255,0.72);
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      text-shadow: 0 2px 12px rgba(0,0,0,0.55);
    }
    .mobile-now-playing .mobile-np-transport.dz-transport-row {
      padding-bottom: 2px;
    }
    .mobile-now-playing .mobile-np-transport .dz-transport-btn {
      box-shadow: 0 10px 28px rgba(0,0,0,0.32);
    }
    @media (max-height: 700px) {
      .mobile-now-playing-art {
        width: min(100%, 300px, 28dvh) !important;
      }
      .mobile-now-playing-hero {
        gap: 8px !important;
      }
    }
  `}</style>
);

