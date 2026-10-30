import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import AdminInsightsPanel from "../components/admin/AdminInsightsPanel.jsx";
import DjOfMonthPanel from "../components/admin/DjOfMonthPanel.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { GENRES } from "../constants/genres.js";
import { PLAN_FREE, PLAN_PAID, PLAN_PRO } from "../constants/plans.js";
import { profileRowToUser } from "../lib/maps.js";
import { MIX_STATUS_APPROVED, MIX_STATUS_PENDING, MIX_STATUS_REJECTED } from "../lib/mixStatus.js";
import { uploadMixCover } from "../lib/uploadMixCover.js";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";

const TABS = [
  { id: "insights", label: "Insights", icon: "trending" },
  { id: "overview", label: "Overview", icon: "bar2" },
  { id: "users", label: "Users", icon: "people" },
  { id: "submissions", label: "Submissions", icon: "send" },
  { id: "mixes", label: "Mixes", icon: "music" },
  { id: "dj", label: "DJ of the month", icon: "user" },
  { id: "logs", label: "Audit log", icon: "list" },
];

function tableShell(children, compact) {
  return (
    <div className={`admin-table-shell${compact ? " is-compact" : ""}`}>
      <table className="admin-table">{children}</table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { auth, episodes, users, refreshMixes, refreshProfiles } = useApp();
  const adminId = auth.session?.user?.id;
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [tab, setTab] = useState("insights");
  const [profiles, setProfiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
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

  const loadSubmissions = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const { data, error: err } = await supabase
      .from("mixes")
      .select(
        "id, user_id, title, genre, description, tags, tracklist, cover_url, duration_secs, status, review_note, submitted_at, created_at",
      )
      .in("status", [MIX_STATUS_PENDING, MIX_STATUS_REJECTED])
      .order("created_at", { ascending: false })
      .limit(200);
    if (err) {
      // Projects that have not run supabase/mix-submissions.sql yet have no review columns.
      if (!/status|review_note|submitted_at/i.test(err.message || "")) setError(err.message);
      setSubmissions([]);
      return;
    }
    setSubmissions(data || []);
  }, []);

  useEffect(() => {
    loadProfiles();
    loadLogs();
    loadSubmissions();
  }, [loadProfiles, loadLogs, loadSubmissions]);

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
    const pending = profiles.filter((p) => !p.isBanned && p.isApproved === false).length;
    return {
      users: profiles.length,
      mixes: episodes.length,
      banned,
      verifiedArtists: verified,
      admins,
      pending,
    };
  }, [profiles, episodes]);

  const setApproved = async (userId, value) => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("profiles").update({ is_approved: value }).eq("id", userId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await writeLog(value ? "approve_user" : "revoke_approval", "profile", userId, { is_approved: value });
    await loadProfiles();
    await refreshProfiles();
  };

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

  const startEditSubmission = (submission) => {
    setEditingId(submission.id);
    setEditForm({
      title: submission.title || "",
      genre: submission.genre || "Tech House",
      description: submission.description || "",
      tags: Array.isArray(submission.tags) ? submission.tags.join(", ") : "",
      tracklist: Array.isArray(submission.tracklist) ? submission.tracklist.join("\n") : "",
      coverUrl: submission.cover_url || "",
      coverFile: null,
      coverPreview: "",
    });
  };

  const cancelEditSubmission = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveSubmissionEdits = async (submissionId) => {
    if (!editForm) return;
    setBusy(true);
    setError(null);
    const patch = {
      title: (editForm.title || "").trim() || "Untitled Mix",
      genre: editForm.genre || "Tech House",
      description: editForm.description || "",
      tags: (editForm.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
      tracklist: (editForm.tracklist || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    };
    if (editForm.coverFile) {
      try {
        patch.cover_url = await uploadMixCover(editForm.coverFile, adminId);
      } catch (err) {
        setBusy(false);
        setError(err?.message || "Cover artwork upload failed.");
        return;
      }
    }
    const { error: err } = await supabase.from("mixes").update(patch).eq("id", submissionId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await writeLog("edit_submission", "mix", submissionId, { title: patch.title });
    setEditingId(null);
    setEditForm(null);
    await loadSubmissions();
    await refreshMixes();
  };

  const reviewSubmission = async (submission, status) => {
    let note = submission.review_note || "";
    if (status === MIX_STATUS_REJECTED) {
      const input = window.prompt(
        `Why is “${submission.title}” not being added? This note is sent to the member.`,
        note,
      );
      if (input === null) return;
      note = input.trim();
    }

    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("mixes")
      .update({
        status,
        review_note: status === MIX_STATUS_REJECTED ? note : "",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
      })
      .eq("id", submission.id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await writeLog(status === MIX_STATUS_APPROVED ? "approve_mix" : "reject_mix", "mix", submission.id, {
      title: submission.title,
      review_note: note,
    });
    await loadSubmissions();
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
    await loadSubmissions();
    await refreshMixes();
  };

  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => s.status === MIX_STATUS_PENDING),
    [submissions],
  );

  const tp = isCompact
    ? { thL: "8px 10px", thS: "8px 6px", tdL: "8px 10px", tdS: "8px 6px" }
    : { thL: "12px 14px", thS: "12px 8px", tdL: "10px 14px", tdS: "10px 8px" };

  const pagePad = isCompact ? "16px 12px" : "32px 36px";

  return (
    <div className="fade-in admin-page" style={{ padding: pagePad, paddingBottom: 120 }}>
      <div className="admin-shell">
        <div className="admin-hero">
          <PageHeader icon="shield" title="ADMIN" large marginBottom={isCompact ? 8 : 10} />
          <p className="admin-lede">
            Site pulse, approvals, catalog control, and DJ of the month — run Deep House Lab from one console.
          </p>
        </div>

        {error ? (
          <div className="admin-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="admin-tabs" role="tablist" aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`admin-tab${tab === t.id ? " is-on" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={14} />
              <span>{t.label}</span>
              {t.id === "submissions" && pendingSubmissions.length > 0 ? (
                <span className="admin-tab-badge">{pendingSubmissions.length}</span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "insights" && <AdminInsightsPanel />}

        {tab === "overview" && (
          <div className="admin-stat-grid">
            {[
              { label: "Users", value: overview.users, icon: "people", color: "var(--accent)" },
              { label: "Pending", value: overview.pending, icon: "shield", color: "var(--orange)" },
              { label: "Mixes", value: overview.mixes, icon: "music", color: "#A78BFA" },
              { label: "In review", value: pendingSubmissions.length, icon: "send", color: "var(--orange)" },
              { label: "Banned", value: overview.banned, icon: "x", color: "var(--red)" },
              { label: "Verified", value: overview.verifiedArtists, icon: "award", color: "var(--orange)" },
              { label: "Admins", value: overview.admins, icon: "shield", color: "var(--green)" },
            ].map((c) => (
              <div key={c.label} className="admin-stat-card">
                <div
                  className="admin-stat-icon"
                  style={{ background: `${c.color}18`, borderColor: `${c.color}30` }}
                >
                  <Icon name={c.icon} size={isCompact ? 13 : 15} color={c.color} />
                </div>
                <div className="admin-stat-value">{c.value}</div>
                <div className="admin-stat-label">{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "users" && (
          <section className="admin-panel">
            <h2 className="admin-panel-title">
              User management
              {overview.pending > 0 ? (
                <span className="admin-panel-note">
                  · {overview.pending} awaiting approval
                </span>
              ) : null}
            </h2>
            {tableShell(
          <>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>User</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Approved</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Plan</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Verified</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Banned</th>
                <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Admin</th>
                <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...profiles]
                .sort((a, b) => Number(a.isApproved !== false) - Number(b.isApproved !== false))
                .map((p) => {
                const isSelf = p.id === adminId;
                const pending = p.isApproved === false && !p.isBanned;
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: pending ? "rgba(251,146,60,0.06)" : undefined,
                    }}
                  >
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
                      <button
                        type="button"
                        className={`btn ${pending ? "btn-primary" : "btn-ghost"}`}
                        style={{ padding: isCompact ? "4px 8px" : "6px 10px", fontSize: isCompact ? 11 : 12 }}
                        disabled={busy || isSelf || p.isAdmin}
                        onClick={() => setApproved(p.id, p.isApproved === false)}
                        title={pending ? "Approve this account" : "Revoke approval"}
                      >
                        {pending ? (
                          "Approve"
                        ) : (
                          <span style={{ color: "var(--green)" }}>
                            <Icon name="check" size={isCompact ? 12 : 14} /> Yes
                          </span>
                        )}
                      </button>
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

        {tab === "submissions" && (
          <section className="admin-panel">
            <h2 className="admin-panel-title">
              Mix submissions
              {pendingSubmissions.length > 0 ? (
                <span className="admin-panel-note">
                  · {pendingSubmissions.length} awaiting review
                </span>
              ) : null}
            </h2>
            <p className="admin-panel-desc">
              Submitted mixes stay off the site until you approve them. Approving publishes the mix and notifies the
              member; rejecting keeps it hidden and sends them your note.
            </p>
            {submissions.length === 0 ? (
              <div
                style={{
                  padding: isCompact ? "14px 12px" : "16px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text3)",
                  fontSize: isCompact ? 12 : 13,
                }}
              >
                No submissions to review right now.
              </div>
            ) : (
              tableShell(
                <>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>Mix</th>
                      <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>Submitted by</th>
                      <th style={{ padding: tp.thS, color: "var(--text3)", fontWeight: 600 }}>Status</th>
                      <th style={{ padding: tp.thL, color: "var(--text3)", fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((row) => {
                      const owner = profiles.find((u) => u.id === row.user_id);
                      const pending = row.status === MIX_STATUS_PENDING;
                      const isEditing = editingId === row.id;
                      return (
                        <Fragment key={row.id}>
                        <tr style={{ borderBottom: isEditing ? "none" : "1px solid var(--border)" }}>
                          <td style={{ padding: tp.tdL }}>
                            <Link
                              to={`/mix/${row.id}`}
                              style={{ fontWeight: 600, color: "var(--accent2)", fontSize: isCompact ? 12 : 14 }}
                            >
                              {row.title || "Untitled Mix"}
                            </Link>
                            <div style={{ fontSize: isCompact ? 10 : 11, color: "var(--text3)", marginTop: 2 }}>
                              {row.genre || "—"}
                              {row.submitted_at || row.created_at
                                ? ` · ${new Date(row.submitted_at || row.created_at).toLocaleDateString()}`
                                : ""}
                            </div>
                            {row.review_note ? (
                              <div style={{ fontSize: isCompact ? 10 : 11, color: "var(--text3)", marginTop: 4 }}>
                                Note: {row.review_note}
                              </div>
                            ) : null}
                          </td>
                          <td style={{ padding: tp.tdL, fontSize: isCompact ? 11 : 12 }}>
                            {owner ? (
                              <>
                                {owner.username}
                                <div style={{ color: "var(--text3)" }}>{owner.handle}</div>
                              </>
                            ) : (
                              <span style={{ fontFamily: "var(--ff-mono)", fontSize: isCompact ? 9 : 11 }}>
                                {row.user_id}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: tp.tdS }}>
                            <span
                              style={{
                                fontSize: isCompact ? 10 : 11,
                                fontWeight: 700,
                                color: pending ? "var(--orange)" : "var(--red)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {pending ? "Awaiting review" : "Rejected"}
                            </span>
                          </td>
                          <td style={{ padding: tp.tdL }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{
                                  fontSize: isCompact ? 11 : 12,
                                  padding: isCompact ? "4px 8px" : undefined,
                                  color: isEditing ? "var(--accent2)" : undefined,
                                }}
                                disabled={busy}
                                onClick={() => (isEditing ? cancelEditSubmission() : startEditSubmission(row))}
                              >
                                {isEditing ? "Close" : "Edit"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: isCompact ? 11 : 12, padding: isCompact ? "4px 10px" : "6px 12px" }}
                                disabled={busy}
                                onClick={() => reviewSubmission(row, MIX_STATUS_APPROVED)}
                              >
                                {pending ? "Approve" : "Publish"}
                              </button>
                              {pending ? (
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  style={{
                                    fontSize: isCompact ? 11 : 12,
                                    color: "var(--red)",
                                    padding: isCompact ? "4px 8px" : undefined,
                                  }}
                                  disabled={busy}
                                  onClick={() => reviewSubmission(row, MIX_STATUS_REJECTED)}
                                >
                                  Reject
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  style={{
                                    fontSize: isCompact ? 11 : 12,
                                    color: "var(--red)",
                                    padding: isCompact ? "4px 8px" : undefined,
                                  }}
                                  disabled={busy}
                                  onClick={() => deleteMix(row.id, row.title || "Untitled Mix")}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isEditing && editForm ? (
                          <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            <td colSpan={4} style={{ padding: isCompact ? "12px" : "16px 14px", background: "var(--surface2)" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 620 }}>
                                <div style={{ fontSize: isCompact ? 12 : 13, fontWeight: 700, color: "var(--text2)" }}>
                                  Edit details and cover before publishing
                                </div>
                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      marginBottom: 5,
                                      color: "var(--text2)",
                                    }}
                                  >
                                    Cover artwork
                                  </label>
                                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                                    <img
                                      src={
                                        editForm.coverPreview ||
                                        resolveMixArtwork(editForm.coverUrl)
                                      }
                                      alt="Cover preview"
                                      onError={handleArtworkError}
                                      style={{
                                        width: 88,
                                        height: 88,
                                        borderRadius: 10,
                                        objectFit: "cover",
                                      }}
                                    />
                                    <label className="btn btn-ghost" style={{ cursor: "pointer", fontSize: 12 }}>
                                      <Icon name="img" size={14} />
                                      Choose new cover
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        style={{ display: "none" }}
                                        onChange={(event) => {
                                          const file = event.target.files?.[0] || null;
                                          if (!file) {
                                            setEditForm((form) => ({
                                              ...form,
                                              coverFile: null,
                                              coverPreview: "",
                                            }));
                                            return;
                                          }
                                          const reader = new FileReader();
                                          reader.onload = () =>
                                            setEditForm((form) => ({
                                              ...form,
                                              coverFile: file,
                                              coverPreview: String(reader.result || ""),
                                            }));
                                          reader.readAsDataURL(file);
                                        }}
                                      />
                                    </label>
                                  </div>
                                  <p style={{ margin: "6px 0 0", color: "var(--text3)", fontSize: 11 }}>
                                    JPG, PNG or WebP, up to 10 MB.
                                  </p>
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text2)" }}>
                                    Title
                                  </label>
                                  <input
                                    className="inp"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text2)" }}>
                                    Genre
                                  </label>
                                  <select
                                    className="inp"
                                    value={editForm.genre}
                                    onChange={(e) => setEditForm((f) => ({ ...f, genre: e.target.value }))}
                                  >
                                    {GENRES.map((g) => (
                                      <option key={g} value={g}>
                                        {g}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text2)" }}>
                                    Description
                                  </label>
                                  <textarea
                                    className="inp"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                    style={{ minHeight: 90 }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text2)" }}>
                                    Tags <span style={{ color: "var(--text3)", fontWeight: 400 }}>(comma separated)</span>
                                  </label>
                                  <input
                                    className="inp"
                                    value={editForm.tags}
                                    onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                                    placeholder="deephouse, ibiza, underground"
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text2)" }}>
                                    Tracklist <span style={{ color: "var(--text3)", fontWeight: 400 }}>(one per line)</span>
                                  </label>
                                  <textarea
                                    className="inp"
                                    value={editForm.tracklist}
                                    onChange={(e) => setEditForm((f) => ({ ...f, tracklist: e.target.value }))}
                                    style={{ minHeight: 90 }}
                                    placeholder={"01. Artist - Track\n02. Artist - Track"}
                                  />
                                </div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ fontSize: isCompact ? 12 : 13 }}
                                    disabled={busy}
                                    onClick={() => saveSubmissionEdits(row.id)}
                                  >
                                    Save changes
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ fontSize: isCompact ? 12 : 13 }}
                                    disabled={busy}
                                    onClick={cancelEditSubmission}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </>,
                isCompact,
              )
            )}
          </section>
        )}

        {tab === "mixes" && (
          <section className="admin-panel">
            <h2 className="admin-panel-title">Mix catalog</h2>
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

        {tab === "dj" && <DjOfMonthPanel users={users} episodes={episodes} adminId={adminId} />}

        {tab === "logs" && (
          <section className="admin-panel">
            <h2 className="admin-panel-title">Audit log</h2>
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
