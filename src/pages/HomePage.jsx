import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import LiveCard from "../components/LiveCard.jsx";
import TrackCard from "../components/TrackCard.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";

export default function HomePage() {
  const navigate = useNavigate();
  const { episodes, users, liveStreams, player, auth } = useApp();
  /** Larger trending tiles + full TrackCard on desktop */
  const trendingDesktop = useMediaQuery("(min-width: 900px)");
  const mobileHero = useMediaQuery("(max-width: 640px)");

  const recent = episodes.slice(0, 8);

  const pagePad = "clamp(16px, 4vw, 32px) clamp(16px, 4vw, 36px)";
  const tileGap = "clamp(8px, 2vw, 12px)";

  return (
    <div className="fade-in" style={{ padding: pagePad, paddingBottom: 100 }}>
      <div
        style={{
          marginBottom: "clamp(24px, 5vw, 40px)",
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(56,189,248,0.22)",
          boxShadow: "0 18px 56px rgba(2,132,199,0.2)",
          minHeight: trendingDesktop ? 360 : mobileHero ? undefined : 260,
          backgroundColor: mobileHero ? "var(--bg)" : undefined,
        }}
      >
        <img
          src="/images/landing-banner.png"
          alt="Music Vault by DHLab landing banner"
          style={{
            width: "100%",
            height: mobileHero ? "auto" : "100%",
            minHeight: trendingDesktop ? 360 : mobileHero ? undefined : 260,
            objectFit: mobileHero ? "contain" : "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: mobileHero
              ? "linear-gradient(to top, rgba(7,9,15,0.88) 0%, rgba(7,9,15,0.22) 42%, rgba(7,9,15,0.04) 100%)"
              : "linear-gradient(to top, rgba(7,9,15,0.9) 8%, rgba(7,9,15,0.45) 45%, rgba(7,9,15,0.12) 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "clamp(16px, 3vw, 26px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="live-badge">
              <span className="live-dot" />
              LIVE NOW
            </span>
            {!mobileHero ? <span style={{ fontSize: 13, color: "var(--text2)" }}>{liveStreams.length} streams active</span> : null}
          </div>

          {!mobileHero ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                style={{ padding: "12px 28px", fontSize: 15, justifyContent: "center" }}
                onClick={() => navigate("/upload")}
              >
                <Icon name="upload" size={16} />
                Upload Your Mix
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: "12px 24px", fontSize: 15, justifyContent: "center" }}
                onClick={() => navigate("/register")}
              >
                <Icon name="user" size={16} />
                Register
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: "12px 24px", fontSize: 15, justifyContent: "center" }}
                onClick={() => auth.setShowAuth(true)}
              >
                <Icon name="compass" size={16} />
                Sign In
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {liveStreams.length > 0 && (
        <section style={{ marginBottom: "clamp(24px, 5vw, 40px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "clamp(12px, 3vw, 20px)" }}>
            <span className="live-badge">
              <span className="live-dot" />
              LIVE
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Live Right Now</h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(150px, 46vw), 1fr))",
              gap: tileGap,
            }}
          >
            {liveStreams.map((s) => (
              <LiveCard key={s.id} stream={s} users={users} compact onJoin={() => navigate("/live")} />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: "clamp(24px, 5vw, 40px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "clamp(12px, 3vw, 20px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="fire" size={18} color="var(--orange)" />
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Trending Now</h2>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: trendingDesktop
              ? "repeat(auto-fill, minmax(220px, 1fr))"
              : "repeat(auto-fill, minmax(min(124px, 44vw), 1fr))",
            gap: trendingDesktop ? "clamp(14px, 2vw, 20px)" : tileGap,
          }}
        >
          {recent.map((ep) => (
            <TrackCard
              key={ep.id}
              episode={ep}
              users={users}
              compact={!trendingDesktop}
              isActive={player.currentTrack?.id === ep.id}
              isPlaying={player.isPlaying && player.currentTrack?.id === ep.id}
              onPlay={player.playTrack}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

