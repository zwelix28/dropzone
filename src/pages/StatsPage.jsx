import Icon from "../components/Icon.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { fmt } from "../lib/format.js";

export default function StatsPage() {
  const { auth, episodes } = useApp();
  const currentUser = auth.currentUser;
  const isCompact = useMediaQuery("(max-width: 720px)");

  if (!currentUser) {
    return (
      <div
        className="fade-in"
        style={{
          padding: isCompact ? "20px 14px" : "32px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
          textAlign: "center",
        }}
      >
        <Icon name="bar2" size={isCompact ? 36 : 48} color="var(--text3)" />
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: isCompact ? 20 : 24 }}>Sign in to see your stats</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24, fontSize: isCompact ? 14 : 15, maxWidth: 320 }}>
          Stats are available once you sign in.
        </p>
        <button className="btn btn-primary" onClick={() => auth.setShowAuth(true)}>
          Sign In / Register
        </button>
      </div>
    );
  }

  const userEps = episodes.filter((e) => e.userId === currentUser.id);
  const totalDownloads = userEps.reduce((s, e) => s + e.downloads, 0);
  const totalPlays = userEps.reduce((s, e) => s + e.plays, 0);

  return (
    <div className="fade-in" style={{ padding: isCompact ? "16px 12px" : "32px 36px", paddingBottom: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Icon name="bar2" size={isCompact ? 20 : 24} color="var(--accent)" />
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: isCompact ? 28 : 40, letterSpacing: "0.04em" }}>MY STATS</h1>
      </div>
      <p style={{ color: "var(--text2)", marginBottom: isCompact ? 20 : 32, fontSize: isCompact ? 13 : 15 }}>
        Your audience insights and performance data
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px, 1fr))",
          gap: isCompact ? 10 : 16,
          marginBottom: isCompact ? 20 : 36,
        }}
      >
        {[
          { label: "Total Plays", value: fmt(totalPlays), icon: "headphones", color: "var(--accent)", delta: "+12.4%" },
          { label: "Downloads", value: fmt(totalDownloads), icon: "download", color: "var(--green)", delta: "+8.7%" },
          { label: "Followers", value: fmt(currentUser.followers || 0), icon: "people", color: "var(--orange)", delta: "+3.2%" },
          { label: "Mixes Published", value: userEps.length, icon: "music", color: "#A78BFA", delta: "0" },
        ].map((s) => (
          <div
            key={s.label}
            className="stat-card"
            style={{
              padding: isCompact ? "12px 12px" : undefined,
              borderRadius: isCompact ? 12 : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: isCompact ? 8 : 12 }}>
              <div
                style={{
                  width: isCompact ? 30 : 40,
                  height: isCompact ? 30 : 40,
                  borderRadius: 8,
                  background: `${s.color}18`,
                  border: `1px solid ${s.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={s.icon} size={isCompact ? 14 : 18} color={s.color} />
              </div>
              <span style={{ fontSize: isCompact ? 10 : 12, color: "var(--green)", fontWeight: 600 }}>{s.delta}</span>
            </div>
            <div
              style={{
                fontSize: isCompact ? 20 : 28,
                fontWeight: 800,
                fontFamily: "var(--ff-mono)",
                marginBottom: 2,
                lineHeight: 1.1,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: isCompact ? 10 : 12, color: "var(--text3)", lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: isCompact ? 12 : 16,
          padding: isCompact ? 14 : 24,
        }}
      >
        <h3 style={{ fontWeight: 700, marginBottom: isCompact ? 12 : 20, fontSize: isCompact ? 15 : 17 }}>Your Top Performing Mixes</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: isCompact ? 6 : 3 }}>
          {userEps.length === 0 ? (
            <p style={{ color: "var(--text3)", fontSize: isCompact ? 13 : 14 }}>Publish a mix to see rankings here.</p>
          ) : (
            userEps
              .slice()
              .sort((a, b) => b.plays - a.plays)
              .slice(0, 5)
              .map((ep, i) => (
                <div
                  key={ep.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isCompact ? 8 : 14,
                    padding: isCompact ? "8px 10px" : "10px 12px",
                    borderRadius: isCompact ? 8 : 10,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--ff-mono)",
                      fontSize: isCompact ? 13 : 16,
                      fontWeight: 700,
                      color: i < 3 ? "var(--accent)" : "var(--text3)",
                      minWidth: isCompact ? 20 : 24,
                      flexShrink: 0,
                    }}
                  >
                    #{i + 1}
                  </span>
                  <img
                    src={ep.coverUrl}
                    alt=""
                    style={{
                      width: isCompact ? 36 : 42,
                      height: isCompact ? 36 : 42,
                      borderRadius: 6,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: isCompact ? 12 : 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ep.title}
                    </div>
                    <span className="tag tag-blue" style={{ fontSize: isCompact ? 9 : 10, marginTop: 2, display: "inline-block" }}>
                      {ep.genre}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: isCompact ? 10 : 20, textAlign: "right", flexShrink: 0 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontFamily: "var(--ff-mono)", fontSize: isCompact ? 12 : 14 }}>{fmt(ep.plays)}</div>
                      <div style={{ fontSize: isCompact ? 9 : 10, color: "var(--text3)" }}>plays</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontFamily: "var(--ff-mono)", fontSize: isCompact ? 12 : 14 }}>{fmt(ep.downloads)}</div>
                      <div style={{ fontSize: isCompact ? 9 : 10, color: "var(--text3)" }}>dls</div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
