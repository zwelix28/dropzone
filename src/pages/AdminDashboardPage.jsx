import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { PLAN_FREE, PLAN_PAID, PLAN_PRO } from "../constants/plans.js";
import { profileRowToUser } from "../lib/maps.js";

const TABS = [
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
  const [tab, setTab] = useState("overview");
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

  return (
    <div className="fade-in" style={{ padding: isCompact ? "16px 12px" : "32px 36px", paddingBottom: 120 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Icon name="shield" size={isCompact ? 22 : 28} color="var(--accent)" />
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: isCompact ? 28 : 36, letterSpacing: "0.04em" }}>ADMIN</h1>
      </div>
      <p style={{ color: "var(--text2)", marginBottom: isCompact ? 16 : 24, maxWidth: 640, fontSize: isCompact ? 13 : 15, lineHeight: 1.55 }}>
        Moderate users, verified artists, and mixes. Destructive actions are logged. Full Auth user deletion still
        requires the Supabase Dashboard.
      </p>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: isCompact ? "10px 12px" : "12px 14px",
            borderRadius: isCompact ? 8 : 10,
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "#fecaca",
            fontSize: isCompact ? 12 : 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: isCompact ? 6 : 8, marginBottom: isCompact ? 16 : 24 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "btn btn-primary" : "btn btn-ghost"}
            style={{ padding: isCompact ? "6px 10px" : "8px 14px", fontSize: isCompact ? 12 : 13 }}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={isCompact ? 13 : 15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fill, minmax(160px, 1fr))",
            gap: isCompact ? 10 : 14,
          }}
        >
          {[
            { label: "Users", value: overview.users, icon: "people", color: "var(--accent)" },
            { label: "Mixes", value: overview.mixes, icon: "music", color: "#A78BFA" },
            { label: "Banned", value: overview.banned, icon: "x", color: "var(--red)" },
            { label: "Verified artists", value: overview.verifiedArtists, icon: "award", color: "var(--orange)" },
            { label: "Admins", value: overview.admins, icon: "shield", color: "var(--green)" },
          ].map((c) => (
            <div
              key={c.label}
              className="stat-card"
              style={{
                padding: isCompact ? "12px 12px" : undefined,
                borderRadius: isCompact ? 12 : undefined,
              }}
            >
              <div
                style={{
                  width: isCompact ? 30 : 36,
                  height: isCompact ? 30 : 36,
                  borderRadius: 8,
                  background: `${c.color}18`,
                  border: `1px solid ${c.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: isCompact ? 8 : 10,
                }}
              >
                <Icon name={c.icon} size={isCompact ? 14 : 16} color={c.color} />
              </div>
              <div
                style={{
                  fontSize: isCompact ? 20 : 26,
                  fontWeight: 800,
                  fontFamily: "var(--ff-mono)",
                  lineHeight: 1.1,
                }}
              >
                {c.value}
              </div>
              <div style={{ fontSize: isCompact ? 10 : 12, color: "var(--text3)", marginTop: 2, lineHeight: 1.3 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "users" &&
        tableShell(
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

      {tab === "mixes" &&
        tableShell(
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

      {tab === "logs" &&
        tableShell(
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
    </div>
  );
}
