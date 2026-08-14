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

  return (
    <div>
      <UploadPage mode="submission" onSubmitted={load} />

      {uid ? (
        <div
          style={{
            padding: isCompact ? "0 12px 100px" : "0 36px 100px",
            maxWidth: isCompact ? "100%" : 760,
          }}
        >
          <h2 style={{ fontSize: isCompact ? 15 : 17, fontWeight: 700, margin: "0 0 12px" }}>Your submissions</h2>

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
                alignItems: "center",
                gap: 10,
                padding: isCompact ? "14px 12px" : "16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--text3)",
                fontSize: isCompact ? 12 : 13,
              }}
            >
              <Icon name="send" size={16} color="var(--text3)" />
              Nothing submitted yet. Your mixes and their review status will show up here.
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
