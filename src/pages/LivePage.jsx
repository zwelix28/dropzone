import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon.jsx";
import LiveCard from "../components/LiveCard.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function LivePage() {
  const { liveStreams, users } = useApp();
  const [activeStream, setActiveStream] = useState(liveStreams[0] || null);
  const [listeners, setListeners] = useState(activeStream?.listeners || 0);

  useEffect(() => {
    const t = setInterval(() => setListeners((l) => l + Math.floor(Math.random() * 8 - 3)), 3000);
    return () => clearInterval(t);
  }, [activeStream]);

  const streamUser = useMemo(
    () => (activeStream ? users.find((u) => u.id === activeStream.userId) : null),
    [activeStream, users],
  );

  return (
    <div className="fade-in" style={{ padding: "32px 36px", paddingBottom: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span className="live-badge">
          <span className="live-dot" />
          LIVE
        </span>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 40, letterSpacing: "0.04em" }}>LIVE STREAMS</h1>
      </div>
      <p style={{ color: "var(--text2)", marginBottom: 32 }}>Real-time DJ sets and radio shows</p>

      {activeStream && (
          <div
          style={{
            background: "var(--surface)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: 32,
            boxShadow: "0 0 40px rgba(248,113,113,0.06)",
          }}
        >
          <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 380px", position: "relative" }}>
              <img
                src={activeStream.coverUrl}
                alt={activeStream.title}
                style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, transparent 50%, rgba(7,9,15,0.9) 100%)" }} />
              <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8 }}>
                <span className="live-badge">
                  <span className="live-dot" />
                  LIVE
                </span>
              </div>
            </div>

            <div style={{ flex: 1, padding: 28, minWidth: 280 }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{activeStream.title}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {streamUser ? (
                    <>
                      <UserAvatar user={streamUser} size={32} showVerified />
                      <span style={{ fontWeight: 600 }}>{streamUser.username}</span>
                    </>
                  ) : null}
                  <span className="tag tag-blue">{activeStream.genre}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, padding: "14px 20px", flex: 1 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--red)", fontFamily: "var(--ff-mono)" }}>
                    {listeners.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Listening Now</div>
                </div>
                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 20px", flex: 1 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", fontFamily: "var(--ff-mono)" }}>
                    {activeStream.startedAt}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Stream Duration</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 40, marginBottom: 20 }}>
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: "var(--accent2)",
                      borderRadius: 2,
                      height: `${20 + Math.random() * 80}%`,
                      opacity: 0.4 + Math.random() * 0.5,
                      animation: `wave ${0.6 + Math.random() * 0.6}s ease-in-out infinite`,
                      animationDelay: `${Math.random() * 0.5}s`,
                    }}
                  />
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary">
                  <Icon name="headphones" size={15} />
                  Join Stream
                </button>
                <button className="btn btn-ghost">
                  <Icon name="share" size={15} />
                  Share
                </button>
                <button className="btn btn-ghost">
                  <Icon name="heart" size={15} />
                  Follow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>All Live Streams</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {liveStreams.map((s) => (
          <LiveCard
            key={s.id}
            stream={s}
            users={users}
            onJoin={(s2) => {
              setActiveStream(s2);
              setListeners(s2.listeners);
            }}
          />
        ))}
      </div>
    </div>
  );
}

