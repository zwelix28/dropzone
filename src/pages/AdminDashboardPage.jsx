import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import AdminInsightsPanel from "../components/admin/AdminInsightsPanel.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { PLAN_FREE, PLAN_PAID, PLAN_PRO } from "../constants/plans.js";
import { profileRowToUser } from "../lib/maps.js";

const TABS = [
  { id: "insights", label: "Insights", icon: "trending" },
  { id: "overview", label: "Overview", icon: "bar2" },
  { id: "users", label: "Users", icon: "people" },
  { id: "mixes", label: "Mixes", icon: "music" },
  { id: "logs", label: "Audit log", icon: "list" },
];

function tableShell(children, compact) {
  return (
    <div
      style={{
        overflowX: "auto",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: compact ? 8 : 12,
        WebkitOverflowScrolling: "touch",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: compact ? 11 : 13 }}>
        {children}
      </table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { auth, episodes, refreshMixes, refreshProfiles } = useApp();
  const adminId = auth.session?.user?.id;
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [tab, setTab] = useState("insights");
  const [profiles, setProfiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const loadProfiles = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const { data, error: err } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setProfiles((data || []).map(profileRowToUser).filter(Boolean));
  }, []);

  const loadLogs = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const { data, error: err } = await supabase
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (err) {
      setError(err.message);
      return;
    }
    setLogs(data || []);
  }, []);

  useEffect(() => {
    loadProfiles();
    loadLogs();
  }, [loadProfiles, loadLogs]);

  const writeLog = useCallback(
    async (action, targetKind, targetId, detail = {}) => {
      if (!adminId) return;
      await supabase.from("admin_logs").insert({
        admin_id: adminId,
        action,
        target_kind: targetKind,
        target_id: targetId != null ? String(targetId) : null,
        detail,
      });
      await loadLogs();
    },
    [adminId, loadLogs],
  );

  const overview = useMemo(() => {
    const banned = profiles.filter((p) => p.isBanned).length;
    const verified = profiles.filter((p) => p.verified).length;
    const admins = profiles.filter((p) => p.isAdmin).length;
    return {
      users: profiles.length,
      mixes: episodes.length,
      banned,
      verifiedArtists: verified,
      admins,
    };
  }, [profiles, episodes]);

  const setVerified = async (userId, value) => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("profiles").update({ verified: value }).eq("id", userId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await writeLog(value ? "verify_artist" : "unverify_artist", "profile", userId, { verified: value });
    await loadProfiles();
    await refreshProfiles();
  };

  const setBanned = async (userId, value) => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("profiles").update({ is_banned: value }).eq("id", userId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await writeLog(value ? "ban_user" : "unban_user", "profile", userId, { is_banned: value });
    await loadProfiles();
    await refreshProfiles();
  };

  const setPlan = async (userId, plan) => {
    const next = plan === PLAN_PAID || plan === PLAN_PRO ? plan : PLAN_FREE;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("profiles").update({ plan: next }).eq("id", userId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await writeLog("set_plan", "profile", userId, { plan: next });
    await loadProfiles();
    await refreshProfiles();
    if (userId === adminId) {
      await auth.refreshProfile();
    }
  };

  const setAdminFlag = async (userId, value) => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("profiles").update({ is_admin: value }).eq("id", userId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await writeLog(value ? "grant_admin" : "revoke_admin", "profile", userId, { is_admin: value });
    await loadProfiles();
    await refreshProfiles();
    if (userId === adminId && !value) {
      await auth.refreshProfile();
    }
  };

  const removeUserContent = async (userId) => {
    if (!window.confirm("Delete all mixes for this user, ban the profile, and scrub their display name?")) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("admin_remove_user_content", { p_user_id: userId });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await writeLog("remove_user_content", "profile", userId, {});
    await loadProfiles();
    await refreshProfiles();
    await refreshMixes();
  };

  const deleteMix = async (mixId, title) => {
    if (!window.confirm(`Permanently delete mix “${title}”?`)) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("mixes").delete().eq("id", mixId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await writeLog("delete_mix", "mix", mixId, { title });
    await refreshMixes();
  };

  const tp = isCompact
    ? { thL: "8px 10px", thS: "8px 6px", tdL: "8px 10px", tdS: "8px 6px" }
    : { thL: "12px 14px", thS: "12px 8px", tdL: "10px 14px", tdS: "10px 8px" };

  const pagePad = isCompact ? "16px 12px" : "32px 36px";

  return (
    <div className="fade-in" style={{ padding: pagePad, paddingBottom: 120 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <PageHeader icon="shield" title="ADMIN" />

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: isCompact ? "10px 12px" : "12px 14px",
              borderRadius: 10,
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "var(--red)",
              fontSize: isCompact ? 12 : 13,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 4,
            marginBottom: isCompact ? 16 : 20,
            width: "100%",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: isCompact ? "0 0 auto" : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: isCompact ? "8px 12px" : "8px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                background: tab === t.id ? "var(--accent2)" : "transparent",
                color: tab === t.id ? "#07090F" : "var(--text2)",
                transition: "all 0.2s",
              }}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "insights" && <AdminInsightsPanel />}

        {tab === "overview" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))",
              gap: isCompact ? 8 : 12,
            }}
          >
            {[
              { label: "Users", value: overview.users, icon: "people", color: "var(--accent)" },
              { label: "Mixes", value: overview.mixes, icon: "music", color: "#A78BFA" },
              { label: "Banned", value: overview.banned, icon: "x", color: "var(--red)" },
              { label: "Verified", value: overview.verifiedArtists, icon: "award", color: "var(--orange)" },
              { label: "Admins", value: overview.admins, icon: "shield", color: "var(--green)" },
            ].map((c) => (
              <div
                key={c.label}
                className="stat-card"
                style={{
                  padding: isCompact ? "12px 10px" : "16px 14px",
                  borderRadius: isCompact ? 12 : 14,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: isCompact ? 28 : 32,
                    height: isCompact ? 28 : 32,
                    borderRadius: 8,
                    background: `${c.color}18`,
                    border: `1px solid ${c.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 8px",
                  }}
                >
                  <Icon name={c.icon} size={isCompact ? 13 : 15} color={c.color} />
                </div>
                <div
                  style={{
                    fontSize: isCompact ? 18 : 22,
                    fontWeight: 800,
                    fontFamily: "var(--ff-mono)",
                    lineHeight: 1.1,
                  }}
                >
                  {c.value}
                </div>
                <div style={{ fontSize: isCompact ? 10 : 11, color: "var(--text3)", marginTop: 2 }}>{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "users" && (
          <section>
            <h2 style={{ fontWeight: 700, margin: "0 0 12px", fontSize: isCompact ? 14 : 16 }}>User management</h2>
            {tableShell(
          <>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>User</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Plan</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Verified</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Banned</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Admin</th>
                <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const isSelf = p.id === adminId;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: tp.tdL }}>
                      <div style={{ fontWeight: 600 }}>{p.username}</div>
                      <div
                        style={{
                          fontSize: isCompact ? 9 : 11,
                          color: "var(--text3)",
                          fontFamily: "var(--ff-mono)",
                          wordBreak: "break-all",
                        }}
                      >
                        {p.id}
                      </div>
                      <div style={{ fontSize: isCompact ? 11 : 12, color: "var(--accent)" }}>{p.handle}</div>
                    </td>
                    <td style={{ padding: tp.tdS }}>
                      <select
                        className="inp"
                        style={{
                          padding: isCompact ? "4px 6px" : "6px 8px",
                          fontSize: isCompact ? 11 : 12,
                          minWidth: isCompact ? 72 : 88,
                        }}
                        disabled={busy}
                        value={p.plan || PLAN_FREE}
                        onChange={(e) => setPlan(p.id, e.target.value)}
                        title="Account tier"
                      >
                        <option value={PLAN_FREE}>Free</option>
                        <option value={PLAN_PAID}>Paid</option>
                        <option value={PLAN_PRO}>Pro</option>
                      </select>
                    </td>
                    <td style={{ padding: tp.tdS }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: isCompact ? "4px 8px" : "6px 10px", fontSize: isCompact ? 11 : 12 }}
                        disabled={busy}
                        onClick={() => setVerified(p.id, !p.verified)}
                        title="Toggle verified artist badge"
                      >
                        {p.verified ? (
                          <span style={{ color: "var(--green)" }}>
                            <Icon name="check" size={isCompact ? 12 : 14} /> Yes
                          </span>
                        ) : (
                          "No"
                        )}
                      </button>
                    </td>
                    <td style={{ padding: tp.tdS }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: isCompact ? "4px 8px" : "6px 10px", fontSize: isCompact ? 11 : 12 }}
                        disabled={busy || isSelf}
                        onClick={() => setBanned(p.id, !p.isBanned)}
                      >
                        {p.isBanned ? <span style={{ color: "var(--red)" }}>Banned</span> : "Active"}
                      </button>
                    </td>
                    <td style={{ padding: tp.tdS }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: isCompact ? "4px 8px" : "6px 10px", fontSize: isCompact ? 11 : 12 }}
                        disabled={busy || isSelf}
                        onClick={() => setAdminFlag(p.id, !p.isAdmin)}
                      >
                        {p.isAdmin ? "Yes" : "No"}
                      </button>
                    </td>
                    <td style={{ padding: tp.tdL }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{
                          padding: isCompact ? "4px 8px" : "6px 10px",
                          fontSize: isCompact ? 11 : 12,
                          color: "var(--red)",
                          borderColor: "rgba(239,68,68,0.35)",
                        }}
                        disabled={busy || isSelf}
                        onClick={() => removeUserContent(p.id)}
                      >
                        Remove content
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </>,
              isCompact,
            )}
          </section>
        )}

        {tab === "mixes" && (
          <section>
            <h2 style={{ fontWeight: 700, margin: "0 0 12px", fontSize: isCompact ? 14 : 16 }}>Mix catalog</h2>
            {tableShell(
          <>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>Mix</th>
                <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>Owner</th>
                <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }} />
              </tr>
            </thead>
            <tbody>
              {episodes.map((ep) => {
                const owner = profiles.find((u) => u.id === ep.userId);
                return (
                  <tr key={ep.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: tp.tdL }}>
                      <Link
                        to={`/mix/${ep.id}`}
                        style={{ fontWeight: 600, color: "var(--accent2)", fontSize: isCompact ? 12 : 14 }}
                      >
                        {ep.title}
                      </Link>
                      <div
                        style={{
                          fontSize: isCompact ? 9 : 11,
                          color: "var(--text3)",
                          fontFamily: "var(--ff-mono)",
                          wordBreak: "break-all",
                        }}
                      >
                        {ep.id}
                      </div>
                    </td>
                    <td style={{ padding: tp.tdL, fontSize: isCompact ? 11 : 12 }}>
                      {owner ? (
                        <>
                          {owner.username}
                          <div style={{ color: "var(--text3)" }}>{owner.handle}</div>
                        </>
                      ) : (
                        <span style={{ fontFamily: "var(--ff-mono)", fontSize: isCompact ? 9 : 11 }}>{ep.userId}</span>
                      )}
                    </td>
                    <td style={{ padding: tp.tdL }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: isCompact ? 11 : 12, color: "var(--red)", padding: isCompact ? "4px 8px" : undefined }}
                        disabled={busy}
                        onClick={() => deleteMix(ep.id, ep.title)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </>,
              isCompact,
            )}
          </section>
        )}

        {tab === "logs" && (
          <section>
            <h2 style={{ fontWeight: 700, margin: "0 0 12px", fontSize: isCompact ? 14 : 16 }}>Audit log</h2>
            {tableShell(
          <>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>When</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Action</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Target</th>
                <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td
                    style={{
                      padding: tp.tdL,
                      fontSize: isCompact ? 10 : 12,
                      color: "var(--text2)",
                      whiteSpace: isCompact ? "normal" : "nowrap",
                    }}
                  >
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </td>
                  <td style={{ padding: tp.tdS, fontSize: isCompact ? 10 : 12 }}>{row.action}</td>
                  <td
                    style={{
                      padding: tp.tdS,
                      fontSize: isCompact ? 9 : 11,
                      fontFamily: "var(--ff-mono)",
                      wordBreak: "break-all",
                    }}
                  >
                    {row.target_kind || "—"}
                    {row.target_id ? ` · ${row.target_id}` : ""}
                  </td>
                  <td style={{ padding: tp.tdL, fontSize: isCompact ? 9 : 11, color: "var(--text3)", wordBreak: "break-word" }}>
                    {row.detail && Object.keys(row.detail).length ? JSON.stringify(row.detail) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </>,
              isCompact,
            )}
          </section>
        )}
      </div>
    </div>
  );
}
