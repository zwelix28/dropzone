import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { GENRES } from "../constants/genres.js";
import { MIX_TITLE_PREFIX, mixTitleBody, withMixTitlePrefix } from "../constants/mixTitle.js";
import { isProPlan } from "../constants/plans.js";
import { useApp } from "../context/AppContext.jsx";
import { signedInHomePath } from "../featureFlags.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { getAudioFileDurationSec } from "../lib/audioDuration.js";
import { MIX_STATUS_APPROVED, MIX_STATUS_PENDING } from "../lib/mixStatus.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { readMaxAudioMb, uploadMixAudio } from "../lib/uploadMixAudio.js";
import { randomUUID } from "../lib/uuid.js";

function formatStorageError(err) {
  const msg = err?.message || String(err);
  if (/exceeded the maximum allowed size|maximum allowed size|Payload too large|413|Entity Too Large|file size/i.test(msg)) {
    return `${msg} Raise “Global file size limit” under Supabase Dashboard → Storage → Settings (Pro supports large mix files). Match VITE_MAX_AUDIO_MB in .env.local to that limit.`;
  }
  if (/Failed to fetch|NetworkError|network|timeout|aborted/i.test(msg)) {
    return `${msg} Large uploads need a stable connection. Try again — resumable upload will continue from where it left off when possible.`;
  }
  return msg;
}

/** Columns added by later migrations; dropped one by one if the project has not run them yet. */
const OPTIONAL_MIX_COLUMNS = ["submitted_at", "status", "is_for_sale", "price_zar", "content_type"];

/**
 * Insert a mix, retrying without columns the database does not know about so a
 * large upload is never lost. A submission is never retried without `status`,
 * because that would publish it without review.
 */
async function insertMixRow(row, { isSubmission }) {
  let payload = { ...row };

  for (let attempt = 0; attempt <= OPTIONAL_MIX_COLUMNS.length; attempt += 1) {
    const { data, error } = await supabase.from("mixes").insert(payload).select("id").single();
    if (!error) return data;

    const message = error.message || "";
    const missing = OPTIONAL_MIX_COLUMNS.filter(
      (column) => column in payload && new RegExp(`\\b${column}\\b`, "i").test(message),
    );
    if (!missing.length) throw error;
    if (isSubmission && missing.includes("status")) {
      throw new Error(
        "Mix review is not set up on this project yet. Run supabase/mix-submissions.sql in the Supabase SQL Editor, then submit again.",
      );
    }

    payload = { ...payload };
    for (const column of missing) delete payload[column];
    console.warn(`Saved without ${missing.join(", ")}. Apply the matching migration in supabase/.`);
  }

  throw new Error("Could not save the mix details.");
}

function defaultMixDescription(title) {
  const t = mixTitleBody(title);
  if (!t) return "";
  return `Listen to ${t} on Deep House Lab - Music Vault.`;
}

/**
 * The upload wizard. In "submission" mode any approved member can use it, but the
 * mix is saved as pending and stays off the site until an admin approves it.
 *
 * @param {{ mode?: 'admin' | 'submission', onSubmitted?: () => void }} props
 */
export default function UploadPage({ mode = "admin", onSubmitted } = {}) {
  const navigate = useNavigate();
  const { auth, refreshMixes } = useApp();
  const currentUser = auth.currentUser;
  const uid = auth.session?.user?.id;
  const isCompact = useMediaQuery("(max-width: 720px)");
  const isSubmission = mode === "submission";

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: MIX_TITLE_PREFIX,
    description: "",
    tracklist: "",
    genre: "Tech House",
    tags: "",
    audioFile: null,
    coverFile: null,
    coverPreview: null,
    isForSale: false,
    priceZar: "",
    contentType: "", // "single" | "mix" — required before publish
    durationSecs: 0,
  });
  const [drag, setDrag] = useState(false);
  const [dragCover, setDragCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [publishedMixId, setPublishedMixId] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [audioFileError, setAudioFileError] = useState(null);
  const descriptionManuallyEditedRef = useRef(false);
  const audioInputRef = useRef(null);
  const uploadAbortRef = useRef(null);
  const maxAudioMb = readMaxAudioMb();

  const pickAudioFile = async (file) => {
    if (!file) return;
    if (maxAudioMb != null && file.size > maxAudioMb * 1024 * 1024) {
      setAudioFileError(
        `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB, over your client limit of ${maxAudioMb} MB (VITE_MAX_AUDIO_MB). Raise that value and the Storage global file size limit in Supabase to match.`,
      );
      return;
    }
    setAudioFileError(null);
    const durationSecs = await getAudioFileDurationSec(file);
    setForm((f) => ({ ...f, audioFile: file, durationSecs }));
  };

  const chooseContentTypeAndBrowse = (contentType) => {
    setForm((f) => ({ ...f, contentType }));
    requestAnimationFrame(() => {
      audioInputRef.current?.click();
    });
  };

  const handleCoverChange = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) =>
      setForm((f) => ({ ...f, coverFile: file, coverPreview: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!uid || !form.audioFile) {
      auth.setShowAuth(true);
      return;
    }
    if (audioFileError) return;
    if (maxAudioMb != null && form.audioFile.size > maxAudioMb * 1024 * 1024) {
      setPublishError(`Audio must be under ${maxAudioMb} MB (VITE_MAX_AUDIO_MB).`);
      return;
    }
    if (!isSupabaseConfigured()) {
      setPublishError("Configure Supabase in .env.local first.");
      return;
    }
    if (form.contentType !== "single" && form.contentType !== "mix") {
      setPublishError("Choose whether you are uploading a Single or a Mix.");
      return;
    }
    if (!mixTitleBody(form.title)) {
      setPublishError(`Add a mix name after “${MIX_TITLE_PREFIX.trim()}”.`);
      return;
    }
    if (!isSubmission && !currentUser?.isAdmin) {
      setPublishError("Only administrators can upload mixes.");
      return;
    }
    if (isSubmission && currentUser?.isApproved === false) {
      setPublishError("Your account is still awaiting approval, so you cannot submit a mix yet.");
      return;
    }
    setPublishError(null);
    setSubmitting(true);
    setProgress(2);
    setProgressLabel("Starting upload…");

    const abort = new AbortController();
    uploadAbortRef.current = abort;

    try {
      const audioExt = (form.audioFile.name.split(".").pop() || "mp3").toLowerCase();
      const audioPath = `${uid}/${randomUUID()}.${audioExt}`;

      setProgressLabel(
        form.audioFile.size >= 6 * 1024 * 1024
          ? "Uploading audio (resumable)…"
          : "Uploading audio…",
      );

      await uploadMixAudio({
        file: form.audioFile,
        path: audioPath,
        signal: abort.signal,
        onProgress: (pct) => {
          // Map audio transfer to 5–70% of overall publish progress
          setProgress(Math.max(5, Math.round(5 + (pct / 100) * 65)));
        },
      });
      setProgress(72);
      setProgressLabel("Uploading cover…");

      let coverUrl = "";
      if (form.coverFile) {
        const coverExt = (form.coverFile.name.split(".").pop() || "jpg").toLowerCase();
        const coverPath = `${uid}/${randomUUID()}.${coverExt}`;
        const { error: coverErr } = await supabase.storage.from("mix-covers").upload(coverPath, form.coverFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (coverErr) throw new Error(formatStorageError(coverErr));
        coverUrl = supabase.storage.from("mix-covers").getPublicUrl(coverPath).data.publicUrl;
      }
      setProgress(85);
      setProgressLabel("Saving mix details…");

      const tracklist = (form.tracklist || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const tags = (form.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const isPro = isProPlan(currentUser);
      const isForSale = isPro && form.isForSale && Number(form.priceZar) > 0;
      const priceZar = isForSale ? Math.round(Number(form.priceZar) * 100) / 100 : null;

      setProgressLabel("Reading audio length…");
      let durationSecs = Number(form.durationSecs) || 0;
      if (durationSecs < 1 && form.audioFile) {
        durationSecs = await getAudioFileDurationSec(form.audioFile);
      }

      const row = {
        user_id: uid,
        title: withMixTitlePrefix(form.title).trim(),
        description: form.description || "",
        genre: form.genre || "Tech House",
        tags,
        tracklist,
        cover_url: coverUrl,
        audio_url: "",
        audio_storage_path: audioPath,
        audio_preview_path: "",
        duration_secs: durationSecs > 0 ? durationSecs : 0,
        content_type: form.contentType === "single" ? "single" : "mix",
        status: isSubmission ? MIX_STATUS_PENDING : MIX_STATUS_APPROVED,
      };

      if (isSubmission) row.submitted_at = new Date().toISOString();

      if (isForSale) {
        row.is_for_sale = true;
        row.price_zar = priceZar;
      }

      const inserted = await insertMixRow(row, { isSubmission });
      setPublishedMixId(inserted.id);
      setProgress(100);
      setProgressLabel("Done");
      await refreshMixes();
      onSubmitted?.();
      setDone(true);
    } catch (e) {
      console.error(e);
      setPublishError(formatStorageError(e) || "Upload failed");
      setProgressLabel("");
    } finally {
      uploadAbortRef.current = null;
      setSubmitting(false);
    }
  };

  if (!currentUser)
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
        <Icon name="upload" size={isCompact ? 36 : 48} color="var(--text3)" />
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: isCompact ? 20 : 24 }}>
          {isSubmission ? "Sign in to submit a mix" : "Sign in to Upload"}
        </h2>
        <p style={{ color: "var(--text2)", marginBottom: 24, fontSize: isCompact ? 14 : 15, maxWidth: 320 }}>
          You need an account to {isSubmission ? "submit" : "upload"} mixes to Music Vault by DHLab
        </p>
        <button className="btn btn-primary" onClick={() => auth.setShowAuth(true)}>
          Sign In / Register
        </button>
      </div>
    );

  if (!isSubmission && !currentUser.isAdmin)
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
        <Icon name="upload" size={isCompact ? 36 : 48} color="var(--text3)" />
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: isCompact ? 20 : 24 }}>Uploads are admin-only</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24, fontSize: isCompact ? 14 : 15, maxWidth: 360 }}>
          Only administrators can publish mixes on Music Vault by DHLab.
        </p>
        <button className="btn btn-primary" type="button" onClick={() => navigate(signedInHomePath())}>
          Back to catalog
        </button>
      </div>
    );

  if (done)
    return (
      <div
        className="fade-in"
        style={{
          padding: isCompact ? "20px 14px" : "32px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: isSubmission ? "42vh" : "70vh",
        }}
      >
        <div
          style={{
            width: isCompact ? 64 : 80,
            height: isCompact ? 64 : 80,
            borderRadius: "50%",
            background: isSubmission ? "rgba(251,146,60,0.15)" : "rgba(52,211,153,0.15)",
            border: `2px solid ${isSubmission ? "var(--orange)" : "var(--green)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Icon
            name={isSubmission ? "send" : "check"}
            size={isCompact ? 28 : 36}
            color={isSubmission ? "var(--orange)" : "var(--green)"}
          />
        </div>
        <h2 style={{ fontSize: isCompact ? 22 : 28, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
          {isSubmission ? "Sent for review" : "Upload Successful!"}
        </h2>
        <p
          style={{
            color: "var(--text2)",
            marginBottom: 24,
            textAlign: "center",
            maxWidth: 400,
            fontSize: isCompact ? 14 : 15,
            padding: isCompact ? "0 8px" : 0,
          }}
        >
          {isSubmission ? (
            <>
              "<strong>{form.title || "Untitled"}</strong>" is with our team. It stays private until an administrator
              approves it, and you will get a notification either way.
            </>
          ) : (
            <>
              Your {form.contentType === "single" ? "single" : "mix"} "<strong>{form.title || "Untitled"}</strong>" is now
              processing and will appear on {form.contentType === "single" ? "Discover" : "Mixes"} shortly.
            </>
          )}
        </p>
        <div style={{ display: "flex", gap: isCompact ? 8 : 12, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 360 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setDone(false);
              setStep(1);
              setPublishedMixId(null);
              setPublishError(null);
              setAudioFileError(null);
              descriptionManuallyEditedRef.current = false;
              setForm({
                title: MIX_TITLE_PREFIX,
                description: "",
                tracklist: "",
                genre: "Tech House",
                tags: "",
                audioFile: null,
                coverFile: null,
                coverPreview: null,
                isForSale: false,
                priceZar: "",
                contentType: "",
                durationSecs: 0,
              });
              setProgress(0);
            }}
          >
            {isSubmission ? "Submit Another" : "Upload Another"}
          </button>
          {isSubmission ? null : (
            <button
              className="btn btn-primary"
              disabled={!publishedMixId}
              onClick={() => {
                if (publishedMixId) navigate(`/mix/${publishedMixId}`, { state: { from: "/upload" } });
              }}
            >
              View Mix
            </button>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => {
              setDone(false);
              if (!isSubmission) navigate("/profile");
            }}
          >
            {isSubmission ? "View My Submissions" : "View My Uploads"}
          </button>
        </div>
      </div>
    );

  const dzPad = isCompact ? "18px 14px" : undefined;
  const stepLabels = isCompact ? ["Audio", "Details", "Review"] : ["Audio File", "Details", "Review"];

  return (
    <div
      className="fade-in"
      style={{
        padding: isCompact ? "16px 12px" : "32px 36px",
        paddingBottom: isSubmission ? 28 : 100,
        maxWidth: isCompact ? "100%" : 760,
        margin: isCompact ? 0 : undefined,
      }}
    >
      <PageHeader title={isSubmission ? "SUBMIT MIX" : "UPLOAD MIX"} large marginBottom={isSubmission ? 18 : 32} />

      {isSubmission ? (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: isCompact ? "10px 12px" : "12px 14px",
            borderRadius: 10,
            background: "rgba(251,146,60,0.1)",
            border: "1px solid rgba(251,146,60,0.25)",
            marginBottom: isCompact ? 20 : 30,
          }}
        >
          <Icon name="shield" size={16} color="var(--orange)" />
          <p style={{ margin: 0, fontSize: isCompact ? 12 : 13, color: "var(--text2)", lineHeight: 1.5 }}>
            Submit mix for review
          </p>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 0, marginBottom: isCompact ? 20 : 36, width: "100%" }}>
        {stepLabels.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: isCompact ? 6 : 8, flexShrink: 0 }}>
              <div
                style={{
                  width: isCompact ? 26 : 30,
                  height: isCompact ? 26 : 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isCompact ? 11 : 13,
                  fontWeight: 700,
                  background:
                    step > i + 1
                      ? "var(--green)"
                      : step === i + 1
                        ? "var(--accent2)"
                        : "var(--surface2)",
                  color: step >= i + 1 ? "#07090F" : "var(--text3)",
                  border: step === i + 1 ? "none" : "1px solid var(--border)",
                }}
              >
                {step > i + 1 ? <Icon name="check" size={isCompact ? 12 : 14} color="#07090F" /> : i + 1}
              </div>
              <span
                style={{
                  fontSize: isCompact ? 10 : 13,
                  fontWeight: step === i + 1 ? 600 : 400,
                  color: step === i + 1 ? "var(--text)" : "var(--text3)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: isCompact ? 72 : "none",
                }}
              >
                {s}
              </span>
            </div>
            {i < 2 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: "var(--border)",
                  margin: isCompact ? "0 6px" : "0 12px",
                  minWidth: isCompact ? 6 : 12,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="slide-in">
          <input
            ref={audioInputRef}
            id="audio-inp"
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={(e) => {
              pickAudioFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text2)" }}>
              Upload a mix *
            </label>
            <p style={{ fontSize: isCompact ? 12 : 13, color: "var(--text3)", margin: "0 0 12px", lineHeight: 1.45 }}>
              Click Mix to browse and select your audio file.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 10,
                maxWidth: isCompact ? undefined : 420,
              }}
            >
              {[
                {
                  value: "mix",
                  title: "Mix",
                  desc: "A full-length mix or session. Appears on Mixes.",
                  icon: "music",
                },
              ].map((opt) => {
                const selected = form.contentType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => chooseContentTypeAndBrowse(opt.value)}
                    style={{
                      textAlign: "left",
                      padding: isCompact ? "14px" : "16px 18px",
                      borderRadius: 12,
                      border: selected ? "2px solid var(--accent2)" : "1px solid var(--border)",
                      background: selected ? "var(--surface)" : "var(--surface2)",
                      cursor: "pointer",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <Icon name={opt.icon} size={20} color={selected ? "var(--accent2)" : "var(--text3)"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: isCompact ? 14 : 15, marginBottom: 4 }}>{opt.title}</div>
                      <div style={{ fontSize: isCompact ? 12 : 13, color: "var(--text2)", lineHeight: 1.45 }}>{opt.desc}</div>
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          fontWeight: 600,
                          color: selected ? "var(--accent2)" : "var(--text3)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Icon name="upload" size={13} color={selected ? "var(--accent2)" : "var(--text3)"} />
                        Browse audio file
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {form.contentType ? (
            <>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text2)" }}>
                  Audio File *
                </label>
                <div
                  className={`drop-zone ${drag ? "dragging" : ""}`}
                  style={dzPad ? { padding: dzPad } : undefined}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    const f = e.dataTransfer.files[0];
                    if (f) pickAudioFile(f);
                  }}
                  onClick={() => audioInputRef.current?.click()}
                >
                  {form.audioFile ? (
                    <div>
                      <Icon name="music" size={isCompact ? 28 : 36} color="var(--accent)" />
                      <p style={{ marginTop: 10, fontWeight: 600, fontSize: isCompact ? 13 : 15, wordBreak: "break-word" }}>
                        {form.audioFile.name}
                      </p>
                      <p style={{ fontSize: isCompact ? 11 : 12, color: "var(--text3)", marginTop: 4 }}>
                        {(form.audioFile.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                        {form.contentType === "single" ? "Single" : "Mix"}
                      </p>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ marginTop: isCompact ? 12 : 16, fontSize: isCompact ? 13 : 14 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          audioInputRef.current?.click();
                        }}
                      >
                        Change file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Icon name="upload" size={isCompact ? 28 : 36} color="var(--text3)" />
                      <p style={{ marginTop: 10, fontWeight: 500, fontSize: isCompact ? 13 : 15 }}>
                        Drag & drop your audio file here
                      </p>
                      <p style={{ fontSize: isCompact ? 12 : 13, color: "var(--text3)", marginTop: 4 }}>
                        MP3, WAV, FLAC, AAC
                      </p>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ marginTop: isCompact ? 12 : 16, fontSize: isCompact ? 13 : 14 }}
                      >
                        Browse Files
                      </button>
                    </div>
                  )}
                </div>
                {audioFileError ? (
                  <p style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>{audioFileError}</p>
                ) : null}
                {maxAudioMb != null ? (
                  <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
                    Client limit: {maxAudioMb} MB. Also raise Dashboard → Storage → Settings → Global file size limit to at least this value (Pro).
                  </p>
                ) : null}
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text2)" }}>
                  Cover Art
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: isCompact ? 12 : 16,
                    alignItems: "flex-start",
                    flexDirection: isCompact ? "column" : "row",
                  }}
                >
                  <div
                    className={`drop-zone ${dragCover ? "dragging" : ""}`}
                    style={{ flex: 1, width: isCompact ? "100%" : undefined, padding: dzPad || undefined }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragCover(true);
                    }}
                    onDragLeave={() => setDragCover(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragCover(false);
                      handleCoverChange(e.dataTransfer.files[0]);
                    }}
                    onClick={() => document.getElementById("cover-inp").click()}
                  >
                    <input
                      id="cover-inp"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleCoverChange(e.target.files[0])}
                    />
                    <Icon name="img" size={isCompact ? 24 : 30} color="var(--text3)" />
                    <p style={{ marginTop: 10, fontSize: isCompact ? 12 : 13, color: "var(--text2)" }}>Upload cover artwork</p>
                    <p style={{ fontSize: isCompact ? 10 : 11, color: "var(--text3)", marginTop: 3 }}>
                      JPG, PNG — min 500×500px
                    </p>
                  </div>
                  {form.coverPreview && (
                    <img
                      src={form.coverPreview}
                      alt="Cover preview"
                      style={{
                        width: isCompact ? 88 : 120,
                        height: isCompact ? 88 : 120,
                        borderRadius: 12,
                        objectFit: "cover",
                        border: "2px solid var(--accent2)",
                        flexShrink: 0,
                        alignSelf: isCompact ? "center" : "flex-start",
                      }}
                    />
                  )}
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ padding: isCompact ? "10px 20px" : "12px 32px", width: isCompact ? "100%" : "auto" }}
                onClick={() => setStep(2)}
                disabled={!form.audioFile || !form.contentType}
              >
                Continue <Icon name="skip" size={15} />
              </button>
            </>
          ) : null}
        </div>
      )}

      {step === 2 && (
        <div className="slide-in">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
              }}
            >
              <Icon name={form.contentType === "single" ? "zap" : "music"} size={16} color="var(--accent2)" />
              <span style={{ fontSize: isCompact ? 12 : 13, color: "var(--text2)" }}>
                Uploading as <strong style={{ color: "var(--text)" }}>{form.contentType === "single" ? "Single" : "Mix"}</strong>
                {form.audioFile ? ` · ${form.audioFile.name}` : ""}
              </span>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                Title *
              </label>
              <input
                className="inp"
                placeholder={`${MIX_TITLE_PREFIX}Summer Deep House Session Vol. 5`}
                value={form.title}
                onChange={(e) => {
                  const title = withMixTitlePrefix(e.target.value);
                  setForm((f) => ({
                    ...f,
                    title,
                    ...(descriptionManuallyEditedRef.current
                      ? {}
                      : { description: defaultMixDescription(title) }),
                  }));
                }}
              />
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                “{MIX_TITLE_PREFIX.trim()}” is added automatically — type your mix name after it.
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                Description{" "}
                <span style={{ color: "var(--text3)", fontWeight: 400 }}>
                  (unlimited characters — add full tracklist, notes, etc.)
                </span>
              </label>
              <textarea
                className="inp"
                placeholder="Describe your mix, add tracklist, venues, shoutouts..."
                value={form.description}
                onChange={(e) => {
                  descriptionManuallyEditedRef.current = true;
                  setForm((f) => ({ ...f, description: e.target.value }));
                }}
                style={{ minHeight: isCompact ? 100 : 160 }}
              />
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                {form.description.length} characters
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                Tracklist <span style={{ color: "var(--text3)", fontWeight: 400 }}>(one per line)</span>
              </label>
              <textarea
                className="inp"
                placeholder={"01. Artist - Track\n02. Artist - Track\n03. Artist - Track"}
                value={form.tracklist}
                onChange={(e) => setForm((f) => ({ ...f, tracklist: e.target.value }))}
                style={{ minHeight: isCompact ? 90 : 140 }}
              />
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                {form.tracklist.split("\n").map((l) => l.trim()).filter(Boolean).length} items
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                Genre
              </label>
              <select
                className="inp"
                value={form.genre}
                onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                Tags <span style={{ color: "var(--text3)", fontWeight: 400 }}>(comma separated)</span>
              </label>
              <input
                className="inp"
                placeholder="deephouse, ibiza, underground"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>

            {/* Pricing — Pro users only */}
            {isProPlan(currentUser) ? (
              <div
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: isCompact ? "12px" : "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: form.isForSale ? 12 : 0 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: isCompact ? 13 : 14 }}>Sell this mix</div>
                    <div style={{ fontSize: isCompact ? 11 : 12, color: "var(--text3)", marginTop: 2 }}>
                      Listeners pay to download. You keep 80% after our 20% platform fee.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isForSale: !f.isForSale, priceZar: f.isForSale ? "" : f.priceZar }))}
                    style={{
                      width: 42,
                      height: 24,
                      borderRadius: 12,
                      border: "none",
                      background: form.isForSale ? "var(--green)" : "var(--border)",
                      position: "relative",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "background 0.2s",
                    }}
                    aria-label={form.isForSale ? "Disable paid download" : "Enable paid download"}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 3,
                        left: form.isForSale ? 21 : 3,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "#fff",
                        transition: "left 0.2s",
                      }}
                    />
                  </button>
                </div>
                {form.isForSale ? (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                      Price (ZAR)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)" }}>R</span>
                      <input
                        className="inp"
                        type="number"
                        min="10"
                        step="1"
                        placeholder="e.g. 50"
                        value={form.priceZar}
                        onChange={(e) => setForm((f) => ({ ...f, priceZar: e.target.value }))}
                        style={{ flex: 1 }}
                      />
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                      Minimum R10. You receive R{form.priceZar ? (Number(form.priceZar) * 0.8).toFixed(2) : "0.00"} per sale.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 24,
              flexDirection: isCompact ? "column-reverse" : "row",
            }}
          >
            <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ width: isCompact ? "100%" : "auto" }}>
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setStep(3)}
              disabled={!mixTitleBody(form.title)}
              style={{ width: isCompact ? "100%" : "auto" }}
            >
              Review <Icon name="skip" size={15} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="slide-in">
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: isCompact ? 12 : 16,
              padding: isCompact ? 14 : 24,
              marginBottom: isCompact ? 16 : 24,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: isCompact ? 12 : 20,
                marginBottom: isCompact ? 14 : 20,
                flexDirection: isCompact ? "column" : "row",
                alignItems: isCompact ? "center" : "flex-start",
              }}
            >
              {form.coverPreview ? (
                <img
                  src={form.coverPreview}
                  alt="Cover"
                  style={{
                    width: isCompact ? 72 : 100,
                    height: isCompact ? 72 : 100,
                    borderRadius: 10,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: isCompact ? 72 : 100,
                    height: isCompact ? 72 : 100,
                    borderRadius: 10,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="music" size={isCompact ? 24 : 32} color="var(--text3)" />
                </div>
              )}
              <div style={{ width: isCompact ? "100%" : "auto", textAlign: isCompact ? "center" : "left" }}>
                <h3 style={{ fontSize: isCompact ? 16 : 18, fontWeight: 700, marginBottom: 4 }}>{form.title || "Untitled"}</h3>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", justifyContent: isCompact ? "center" : "flex-start" }}>
                  <span className="tag" style={{ fontSize: isCompact ? 10 : 12 }}>
                    {isSubmission
                      ? "Goes to review"
                      : form.contentType === "single"
                        ? "Single → Discover"
                        : "Mix → Mixes"}
                  </span>
                  <span className="tag tag-blue" style={{ fontSize: isCompact ? 10 : 12 }}>
                    {form.genre}
                  </span>
                  {form.tags
                    .split(",")
                    .filter((t) => t.trim())
                    .slice(0, 3)
                    .map((t) => (
                      <span key={t} className="tag" style={{ fontSize: isCompact ? 10 : 12 }}>
                        {t.trim()}
                      </span>
                    ))}
                </div>
                {form.audioFile && (
                  <div style={{ fontSize: isCompact ? 11 : 12, color: "var(--text3)", wordBreak: "break-word" }}>
                    {"🎵"} {form.audioFile.name} — {(form.audioFile.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                )}
              </div>
            </div>
            {form.description && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: isCompact ? 12 : 16 }}>
                <div style={{ fontSize: isCompact ? 10 : 12, color: "var(--text3)", marginBottom: 6 }}>DESCRIPTION</div>
                <p
                  style={{
                    fontSize: isCompact ? 12 : 13,
                    color: "var(--text2)",
                    whiteSpace: "pre-wrap",
                    maxHeight: isCompact ? 96 : 120,
                    overflow: "hidden",
                  }}
                >
                  {form.description}
                </p>
              </div>
            )}
          </div>

          {publishError ? (
            <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{publishError}</p>
          ) : null}

          {submitting && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text2)" }}>
                  {progressLabel || "Uploading…"}
                </span>
                <span style={{ fontSize: 13, color: "var(--accent)", fontFamily: "var(--ff-mono)", flexShrink: 0 }}>
                  {Math.floor(progress)}%
                </span>
              </div>
              <div className="progress-wrap" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${progress}%`, transition: "width 0.2s linear" }} />
              </div>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8, marginBottom: 0 }}>
                Large mixes upload in 6 MB chunks. Keep this tab open until it finishes.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexDirection: isCompact ? "column-reverse" : "row" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setStep(2)}
              disabled={submitting}
              style={{ width: isCompact ? "100%" : "auto" }}
            >
              Back
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: isCompact ? "10px 20px" : "12px 32px", width: isCompact ? "100%" : "auto" }}
              onClick={() => void handleSubmit()}
              disabled={submitting || !isSupabaseConfigured()}
            >
              {submitting ? "Uploading..." : (
                <>
                  <Icon name={isSubmission ? "send" : "upload"} size={15} />
                  {isSubmission ? "Submit for Review" : "Publish Mix"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

