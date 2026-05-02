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
      display:flex; align-items:center; gap:10px;
      padding: 10px 14px; border-radius:8px;
      color: var(--text2); font-size:14px; font-weight:500;
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
    .modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r2); padding: 32px;
      max-width: 520px; width:100%; max-height:90vh; overflow-y:auto;
      box-shadow: 0 24px 80px rgba(0,0,0,0.8);
    }

    /* Player bar */
    .player-bar {
      position:fixed; bottom:0; left:0; right:0;
      background: rgba(7,9,15,0.95); backdrop-filter:blur(20px);
      border-top: 1px solid var(--border);
      z-index:800; padding: 12px 24px;
      padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
    }
    @media (max-width: 720px) {
      .player-bar { padding: 10px 12px; padding-bottom: max(10px, env(safe-area-inset-bottom, 0px)); }
    }

    /* Mobile nav drawer */
    .mobile-nav-backdrop {
      position: fixed; inset: 0; z-index: 850;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
      transition: opacity 0.2s ease;
    }
    .mobile-nav-drawer {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 860;
      width: min(300px, 88vw);
      max-width: 100%;
      background: var(--bg2);
      border-right: 1px solid var(--border);
      box-shadow: 8px 0 40px rgba(0,0,0,0.45);
      display: flex; flex-direction: column;
      transition: transform 0.22s ease;
      padding-bottom: env(safe-area-inset-bottom, 0px);
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
  `}</style>
);

