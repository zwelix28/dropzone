import { useCallback, useEffect, useState } from "react";
import BackButton from "../components/BackButton.jsx";
import Icon from "../components/Icon.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { mixStatusColor, mixStatusLabel, normalizeMixStatus } from "../lib/mixStatus.js";
import { scrollAppMainToTop } from "../lib/scrollAppMain.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import UploadPage from "./UploadPage.jsx";

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function SubmissionRow({ submission, compact, isLast }) {
  const status = normalizeMixStatus(submission.status);
  const color = mixStatusColor(status);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: compact ? "12px 12px" : "14px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: compact ? 13 : 15, wordBreak: "break-word" }}>
          {submission.title || "Untitled Mix"}
        </div>
        <div style={{ fontSize: compact ? 11 : 12, color: "var(--text3)", marginTop: 3 }}>
          Submitted {fmtDate(submission.submitted_at || submission.created_at)}
          {submission.genre ? ` · ${submission.genre}` : ""}
        </div>
        {status === "rejected" && submission.review_note ? (
          <div style={{ fontSize: compact ? 11 : 12, color: "var(--text2)", marginTop: 6, lineHeight: 1.5 }}>
            Reviewer note: {submission.review_note}
          </div>
        ) : null}
      </div>
      <span
        style={{
          flexShrink: 0,
          fontSize: compact ? 10 : 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color,
          background: `${color}18`,
          border: `1px solid ${color}35`,
          borderRadius: 999,
          padding: "4px 10px",
          whiteSpace: "nowrap",
        }}
      >
        {mixStatusLabel(status)}
      </span>
    </div>
  );
}

export default function SubmitMixPage() {
  const { auth } = useApp();
  const uid = auth.session?.user?.id;
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [panel, setPanel] = useState("submit");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewSetupMissing, setReviewSetupMissing] = useState(false);

  const load = useCallback(async () => {
    if (!uid || !isSupabaseConfigured()) {
      setSubmissions([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("mixes")
      .select("id, title, genre, status, review_note, submitted_at, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      setReviewSetupMissing(/status|review_note|submitted_at/i.test(error.message || ""));
      setSubmissions([]);
    } else {
      setReviewSetupMissing(false);
      setSubmissions(data || []);
    }
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const openHistory = useCallback(() => {
    setPanel("history");
    scrollAppMainToTop({ smooth: true });
    void load();
  }, [load]);

  return (
    <div className={`submit-mix-page${isCompact ? " is-compact" : ""}`}>
      {uid ? (
        <div
          className="floor-submit-shell"
          style={{
            padding: isCompact ? "16px 12px 0" : "28px 36px 0",
            maxWidth: isCompact ? "100%" : 760,
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: isCompact ? 10 : 14 }}>
            <BackButton to="/profile" label="Profile" />
          </div>
          <div className="submit-mix-tabs" role="tablist" aria-label="Submit mix sections">
            <button
              type="button"
              role="tab"
              aria-selected={panel === "submit"}
              className={`submit-mix-tab${panel === "submit" ? " is-on" : ""}`}
              onClick={() => setPanel("submit")}
            >
              New submission
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panel === "history"}
              className={`submit-mix-tab${panel === "history" ? " is-on" : ""}`}
              onClick={openHistory}
            >
              Your submissions
              {!loading && submissions.length ? ` (${submissions.length})` : ""}
            </button>
          </div>
        </div>
      ) : null}

      {panel === "submit" ? (
        <UploadPage
          mode="submission"
          onSubmitted={() => {
            void load();
          }}
          onViewHistory={openHistory}
        />
      ) : null}

      {uid && panel === "history" ? (
        <div
          className={`floor-submit-page submit-mix-page fade-in${isCompact ? " is-compact" : ""}`}
          style={{ padding: isCompact ? "8px 12px 28px" : "8px 36px 56px" }}
        >
          <div className="floor-submit-shell">
            <section className={`settings-section${isCompact ? " is-compact" : ""}`}>
              <div className="settings-section-head">
                <div className="settings-section-icon" aria-hidden="true">
                  <Icon name="list" size={isCompact ? 16 : 18} color="var(--accent)" />
                </div>
                <div className="settings-section-titles">
                  <h2>Your submissions</h2>
                  <p>Review status for mixes you’ve sent to the Lab</p>
                </div>
              </div>
              <div className="settings-section-body">
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setPanel("submit");
                      scrollAppMainToTop({ smooth: true });
                    }}
                    style={{ height: 40, padding: "0 16px", fontSize: 13 }}
                  >
                    <Icon name="plus" size={14} />
                    New mix
                  </button>
                </div>

                {reviewSetupMissing ? (
                  <p className="floor-submit-notice is-warn" style={{ marginBottom: 0 }}>
                    {import.meta.env.DEV ? (
                      <>
                        Mix review is not set up on this project yet. Run{" "}
                        <code>supabase/mix-submissions.sql</code> in the Supabase SQL Editor.
                      </>
                    ) : (
                      <>Mix submissions aren’t available right now. Please try again later.</>
                    )}
                  </p>
                ) : loading ? (
                  <p className="floor-submit-notice" style={{ marginBottom: 0 }}>
                    Loading…
                  </p>
                ) : submissions.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isCompact ? "stretch" : "flex-start",
                      gap: 12,
                      padding: isCompact ? "14px 12px" : "16px",
                      background: "rgba(7, 9, 15, 0.28)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--text3)",
                      fontSize: isCompact ? 12 : 13,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon name="send" size={16} color="var(--text3)" />
                      Nothing submitted yet. Your mixes and their review status will show up here.
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setPanel("submit")}
                      style={{ width: isCompact ? "100%" : "auto" }}
                    >
                      Start a submission
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      background: "rgba(7, 9, 15, 0.28)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    {submissions.map((submission, i) => (
                      <SubmissionRow
                        key={submission.id}
                        submission={submission}
                        compact={isCompact}
                        isLast={i === submissions.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
