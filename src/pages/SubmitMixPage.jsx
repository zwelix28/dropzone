import { useCallback, useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { mixStatusColor, mixStatusLabel, normalizeMixStatus } from "../lib/mixStatus.js";
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    void load();
  }, [load]);

  return (
    <div>
      {uid ? (
        <div
          style={{
            padding: isCompact ? "14px 12px 0" : "24px 36px 0",
            maxWidth: isCompact ? "100%" : 760,
          }}
        >
          <div
            role="tablist"
            aria-label="Submit mix sections"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              padding: 4,
              borderRadius: 14,
              border: "1px solid rgba(56, 189, 248, 0.22)",
              background:
                "radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.12), transparent 55%), rgba(7, 9, 15, 0.45)",
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={panel === "submit"}
              onClick={() => setPanel("submit")}
              style={{
                minHeight: 42,
                border: 0,
                borderRadius: 11,
                cursor: "pointer",
                font: "inherit",
                fontSize: isCompact ? 13 : 14,
                fontWeight: 650,
                color: panel === "submit" ? "#07090F" : "var(--text2)",
                background: panel === "submit" ? "var(--accent2)" : "transparent",
                boxShadow: panel === "submit" ? "0 0 16px rgba(56, 189, 248, 0.28)" : "none",
              }}
            >
              New submission
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panel === "history"}
              onClick={openHistory}
              style={{
                minHeight: 42,
                border: 0,
                borderRadius: 11,
                cursor: "pointer",
                font: "inherit",
                fontSize: isCompact ? 13 : 14,
                fontWeight: 650,
                color: panel === "history" ? "#07090F" : "var(--text2)",
                background: panel === "history" ? "var(--accent2)" : "transparent",
                boxShadow: panel === "history" ? "0 0 16px rgba(56, 189, 248, 0.28)" : "none",
              }}
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
          style={{
            padding: isCompact ? "16px 12px 100px" : "20px 36px 100px",
            maxWidth: isCompact ? "100%" : 760,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: isCompact ? 15 : 17, fontWeight: 700, margin: 0 }}>Your submissions</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setPanel("submit");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{ height: 40, padding: "0 16px", fontSize: 13 }}
            >
              <Icon name="plus" size={14} />
              New mix
            </button>
          </div>

          {reviewSetupMissing ? (
            <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>
              Mix review is not set up on this project yet. Run supabase/mix-submissions.sql in the Supabase SQL Editor.
            </p>
          ) : loading ? (
            <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Loading…</p>
          ) : submissions.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isCompact ? "stretch" : "flex-start",
                gap: 12,
                padding: isCompact ? "14px 12px" : "16px",
                background: "var(--surface)",
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
                background: "var(--surface)",
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
      ) : null}
    </div>
  );
}
