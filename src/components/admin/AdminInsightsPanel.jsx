import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../Icon.jsx";
import { fetchAdminAnalytics, formatRelativeTime } from "../../lib/adminAnalytics.js";
import { fmt } from "../../lib/format.js";
import useMediaQuery from "../../hooks/useMediaQuery.js";

function StatTile({ label, value, icon, color, compact }) {
  return (
    <div
      className="stat-card"
      style={{
        padding: compact ? "12px 10px" : "16px 14px",
        borderRadius: compact ? 12 : 14,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: compact ? 28 : 32,
          height: compact ? 28 : 32,
          borderRadius: 8,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 8px",
        }}
      >
        <Icon name={icon} size={compact ? 13 : 15} color={color} />
      </div>
      <div style={{ fontSize: compact ? 18 : 22, fontWeight: 800, fontFamily: "var(--ff-mono)", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: compact ? 10 : 11, color: "var(--text3)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function RankList({ title, rows, compact, renderRow }) {
  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: compact ? 12 : 14,
        padding: compact ? "12px" : "16px 18px",
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontWeight: 700, fontSize: compact ? 14 : 16 }}>{title}</h3>
      {rows?.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 10 }}>
          {rows.map((row, i) => renderRow(row, i))}
        </div>
      ) : (
        <p style={{ margin: 0, color: "var(--text3)", fontSize: compact ? 12 : 13 }}>No data yet.</p>
      )}
    </section>
  );
}

function MixRow({ rank, mix, metric, metricLabel, compact }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: compact ? "8px 10px" : "10px 12px",
        borderRadius: 10,
        background: "var(--surface2)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--ff-mono)",
          fontWeight: 800,
          fontSize: compact ? 12 : 13,
          color: rank < 3 ? "var(--accent)" : "var(--text3)",
          minWidth: 22,
        }}
      >
        {String(rank + 1).padStart(2, "0")}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/mix/${mix.id}`} style={{ fontWeight: 700, fontSize: compact ? 12 : 14, color: "var(--accent2)" }}>
          {mix.title}
        </Link>
        <div style={{ fontSize: compact ? 10 : 11, color: "var(--text3)", marginTop: 2 }}>
          {mix.artist}
          {mix.artist_handle ? ` · ${mix.artist_handle}` : ""}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--ff-mono)", fontWeight: 800, fontSize: compact ? 12 : 14 }}>{fmt(metric)}</div>
        <div style={{ fontSize: 9, color: "var(--text3)" }}>{metricLabel}</div>
      </div>
    </div>
  );
}

export default function AdminInsightsPanel() {
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchAdminAnalytics();
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      setData(null);
      return;
    }
    setData(result.data);
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading && !data) {
    return <p style={{ color: "var(--text2)", fontSize: 14 }}>Loading global insights…</p>;
  }

  if (error) {
    return (
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 10,
          background: "rgba(248,113,113,0.1)",
          border: "1px solid rgba(248,113,113,0.25)",
          color: "var(--red)",
          fontSize: 13,
        }}
      >
        <p style={{ margin: "0 0 8px" }}>{error}</p>
        <p style={{ margin: 0, color: "var(--text2)", fontSize: 12 }}>
          Run <code>supabase/admin-analytics.sql</code> in the Supabase SQL Editor if this is the first deploy.
        </p>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  const live = data?.live || {};
  const totals = data?.totals || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isCompact ? 14 : 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <p style={{ margin: 0, color: "var(--text3)", fontSize: isCompact ? 11 : 12 }}>
          Global site pulse · refreshes every 30s
          {data?.generated_at ? ` · ${formatRelativeTime(data.generated_at)}` : ""}
        </p>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
          gap: isCompact ? 8 : 12,
        }}
      >
        <StatTile label="Online now" value={live.online_now ?? 0} icon="people" color="var(--green)" compact={isCompact} />
        <StatTile label="Streaming now" value={live.streaming_now ?? 0} icon="headphones" color="var(--accent)" compact={isCompact} />
        <StatTile label="Logins (24h)" value={live.logins_24h ?? 0} icon="user" color="#A78BFA" compact={isCompact} />
        <StatTile label="Logins (7d)" value={live.logins_7d ?? 0} icon="bar2" color="var(--orange)" compact={isCompact} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
          gap: isCompact ? 8 : 12,
        }}
      >
        <StatTile label="Total users" value={fmt(totals.users ?? 0)} icon="people" color="var(--text2)" compact={isCompact} />
        <StatTile label="Total plays" value={fmt(totals.total_plays ?? 0)} icon="play" color="var(--accent)" compact={isCompact} />
        <StatTile label="Total downloads" value={fmt(totals.total_downloads ?? 0)} icon="download" color="var(--green)" compact={isCompact} />
        <StatTile label="Total follows" value={fmt(totals.total_follows ?? 0)} icon="heart" color="#f87171" compact={isCompact} />
      </div>

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: isCompact ? 12 : 14,
          padding: isCompact ? "12px" : "16px 18px",
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontWeight: 700, fontSize: isCompact ? 14 : 16 }}>Live activity</h3>
        {(data?.active_users || []).length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isCompact ? 11 : 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", color: "var(--text3)" }}>User</th>
                  <th style={{ padding: "8px 10px", color: "var(--text3)" }}>Location</th>
                  <th style={{ padding: "8px 10px", color: "var(--text3)" }}>Streaming</th>
                  <th style={{ padding: "8px 10px", color: "var(--text3)" }}>Page</th>
                  <th style={{ padding: "8px 10px", color: "var(--text3)" }}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data.active_users.map((row) => (
                  <tr key={row.user_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <Link to={`/user/${row.user_id}`} style={{ fontWeight: 600, color: "var(--accent2)" }}>
                        {row.username}
                      </Link>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>{row.handle}</div>
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text2)" }}>
                      {[row.country, row.timezone].filter(Boolean).join(" · ") || row.region || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {row.is_streaming ? (
                        <span style={{ color: "var(--green)", fontWeight: 600 }}>
                          <Icon name="headphones" size={12} /> {row.mix_title || "Yes"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text3)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text3)", fontSize: isCompact ? 10 : 11 }}>
                      {row.page_path || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text3)", whiteSpace: "nowrap" }}>
                      {formatRelativeTime(row.last_seen_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ margin: 0, color: "var(--text3)", fontSize: 13 }}>No users online in the last 2 minutes.</p>
        )}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: isCompact ? 12 : 16,
        }}
      >
        <RankList
          title="Top streamed"
          rows={data?.top_streamed}
          compact={isCompact}
          renderRow={(mix, i) => (
            <MixRow key={mix.id} rank={i} mix={mix} metric={mix.plays} metricLabel="plays" compact={isCompact} />
          )}
        />
        <RankList
          title="Top downloaded"
          rows={data?.top_downloaded}
          compact={isCompact}
          renderRow={(mix, i) => (
            <MixRow key={mix.id} rank={i} mix={mix} metric={mix.downloads} metricLabel="downloads" compact={isCompact} />
          )}
        />
        <RankList
          title="Trending"
          rows={data?.trending}
          compact={isCompact}
          renderRow={(mix, i) => (
            <MixRow key={mix.id} rank={i} mix={mix} metric={mix.plays} metricLabel="plays" compact={isCompact} />
          )}
        />
        <RankList
          title="Top followed accounts"
          rows={data?.top_followed}
          compact={isCompact}
          renderRow={(user, i) => (
            <div
              key={user.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: isCompact ? "8px 10px" : "10px 12px",
                borderRadius: 10,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ fontFamily: "var(--ff-mono)", fontWeight: 800, color: i < 3 ? "var(--accent)" : "var(--text3)", minWidth: 22 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/user/${user.id}`} style={{ fontWeight: 700, color: "var(--accent2)" }}>
                  {user.username}
                </Link>
                <div style={{ fontSize: 10, color: "var(--text3)" }}>{user.handle}</div>
              </div>
              <div style={{ fontFamily: "var(--ff-mono)", fontWeight: 800 }}>{fmt(user.followers_count ?? 0)}</div>
            </div>
          )}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: isCompact ? 12 : 16,
        }}
      >
        <RankList
          title="Top logins (7 days)"
          rows={data?.top_logins_7d}
          compact={isCompact}
          renderRow={(row, i) => (
            <div
              key={row.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: isCompact ? "8px 10px" : "10px 12px",
                borderRadius: 10,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{row.username}</div>
                <div style={{ fontSize: 10, color: "var(--text3)" }}>{row.handle}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--ff-mono)", fontWeight: 800 }}>{row.login_count}</div>
                <div style={{ fontSize: 9, color: "var(--text3)" }}>{formatRelativeTime(row.last_login)}</div>
              </div>
            </div>
          )}
        />
        <RankList
          title="Locations (7-day logins)"
          rows={data?.locations}
          compact={isCompact}
          renderRow={(row, i) => (
            <div
              key={`${row.label}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: isCompact ? "8px 10px" : "10px 12px",
                borderRadius: 10,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontFamily: "var(--ff-mono)", fontWeight: 800 }}>{row.sessions}</span>
            </div>
          )}
        />
      </div>

      {(data?.active_locations || []).length ? (
        <RankList
          title="Online by location"
          rows={data.active_locations}
          compact={isCompact}
          renderRow={(row, i) => (
            <div
              key={`${row.label}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: isCompact ? "8px 10px" : "10px 12px",
                borderRadius: 10,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontFamily: "var(--ff-mono)", fontWeight: 800, color: "var(--green)" }}>{row.online}</span>
            </div>
          )}
        />
      ) : null}
    </div>
  );
}
