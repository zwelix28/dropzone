import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { GENRES } from "../constants/genres.js";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

function readMaxAudioMb() {
  const raw = import.meta.env.VITE_MAX_AUDIO_MB;
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatStorageError(err) {
  const msg = err?.message || String(err);
  if (/exceeded the maximum allowed size|maximum allowed size|Payload too large|413/i.test(msg)) {
    return `${msg} Supabase Free caps each file at 50 MB; Pro/Team can raise “Global file size limit” under Dashboard → Storage → Settings. You can also export a lower bitrate/smaller MP3 for testing.`;
  }
  return msg;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { auth, refreshMixes } = useApp();
  const currentUser = auth.currentUser;
  const uid = auth.session?.user?.id;
  const isCompact = useMediaQuery("(max-width: 720px)");

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "",
    description: "",
    tracklist: "",
    genre: "Tech House",
    tags: "",
    audioFile: null,
    previewAudioFile: null,
    coverFile: null,
    coverPreview: null,
  });
  const [drag, setDrag] = useState(false);
  const [dragCover, setDragCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [publishedMixId, setPublishedMixId] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [audioFileError, setAudioFileError] = useState(null);
  const maxAudioMb = readMaxAudioMb();

  const pickAudioFile = (file) => {
    if (!file) return;
    if (maxAudioMb != null && file.size > maxAudioMb * 1024 * 1024) {
      setAudioFileError(`This file is larger than your configured limit (${maxAudioMb} MB). Set VITE_MAX_AUDIO_MB in .env.local or use a smaller file.`);
      return;
    }
    setAudioFileError(null);
    setForm((f) => ({ ...f, audioFile: file }));
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
    setPublishError(null);
    setSubmitting(true);
    setProgress(5);

    try {
      const audioExt = (form.audioFile.name.split(".").pop() || "mp3").toLowerCase();
      const audioPath = `${uid}/${crypto.randomUUID()}.${audioExt}`;
      const { error: audioErr } = await supabase.storage.from("mix-audio").upload(audioPath, form.audioFile, {
        cacheControl: "3600",
        upsert: false,
      });
      if (audioErr) throw new Error(formatStorageError(audioErr));
      setProgress(40);

      let previewPath = "";
      if (form.previewAudioFile) {
        const pExt = (form.previewAudioFile.name.split(".").pop() || "mp3").toLowerCase();
        previewPath = `${uid}/preview-${crypto.randomUUID()}.${pExt}`;
        const { error: prevErr } = await supabase.storage.from("mix-previews").upload(previewPath, form.previewAudioFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (prevErr) throw new Error(formatStorageError(prevErr));
      }
      setProgress(50);

      let coverUrl = "";
      if (form.coverFile) {
        const coverExt = (form.coverFile.name.split(".").pop() || "jpg").toLowerCase();
        const coverPath = `${uid}/${crypto.randomUUID()}.${coverExt}`;
        const { error: coverErr } = await supabase.storage.from("mix-covers").upload(coverPath, form.coverFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (coverErr) throw new Error(formatStorageError(coverErr));
        coverUrl = supabase.storage.from("mix-covers").getPublicUrl(coverPath).data.publicUrl;
      }
      setProgress(75);

      const tracklist = (form.tracklist || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const tags = (form.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { data: inserted, error: insertErr } = await supabase
        .from("mixes")
        .insert({
          user_id: uid,
          title: (form.title || "").trim() || "Untitled Mix",
          description: form.description || "",
          genre: form.genre || "Tech House",
          tags,
          tracklist,
          cover_url: coverUrl,
          audio_url: "",
          audio_storage_path: audioPath,
          audio_preview_path: previewPath,
          duration_secs: 0,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      setPublishedMixId(inserted.id);
      setProgress(100);
      await refreshMixes();
      setDone(true);
    } catch (e) {
      console.error(e);
      setPublishError(formatStorageError(e) || "Upload failed");
    } finally {
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
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: isCompact ? 20 : 24 }}>Sign in to Upload</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24, fontSize: isCompact ? 14 : 15, maxWidth: 320 }}>
          You need an account to upload mixes to Dropzone
        </p>
        <button className="btn btn-primary" onClick={() => auth.setShowAuth(true)}>
          Sign In / Register
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
          minHeight: "70vh",
        }}
      >
        <div
          style={{
            width: isCompact ? 64 : 80,
            height: isCompact ? 64 : 80,
            borderRadius: "50%",
            background: "rgba(52,211,153,0.15)",
            border: "2px solid var(--green)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Icon name="check" size={isCompact ? 28 : 36} color="var(--green)" />
        </div>
        <h2 style={{ fontSize: isCompact ? 22 : 28, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
          Upload Successful!
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
          Your mix "<strong>{form.title || "Untitled Mix"}</strong>" is now processing and will be live shortly.
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
              setForm({
                title: "",
                description: "",
                tracklist: "",
                genre: "Tech House",
                tags: "",
                audioFile: null,
                previewAudioFile: null,
                coverFile: null,
                coverPreview: null,
              });
              setProgress(0);
            }}
          >
            Upload Another
          </button>
          <button
            className="btn btn-primary"
            disabled={!publishedMixId}
            onClick={() => {
              if (publishedMixId) navigate(`/mix/${publishedMixId}`, { state: { from: "/upload" } });
            }}
          >
            View Mix
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setDone(false);
              navigate("/profile");
            }}
          >
            View My Uploads
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
        paddingBottom: 100,
        maxWidth: isCompact ? "100%" : 760,
        margin: isCompact ? 0 : undefined,
      }}
    >
      <h1
        style={{
          fontFamily: "var(--ff-display)",
          fontSize: isCompact ? 28 : 40,
          letterSpacing: "0.04em",
          marginBottom: 6,
        }}
      >
        UPLOAD MIX
      </h1>
      <p style={{ color: "var(--text2)", marginBottom: isCompact ? 20 : 32, fontSize: isCompact ? 13 : 15 }}>
        Share your mix with the Dropzone community
      </p>

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
              onClick={() => document.getElementById("audio-inp").click()}
            >
              <input
                id="audio-inp"
                type="file"
                accept="audio/*"
                style={{ display: "none" }}
                onChange={(e) => pickAudioFile(e.target.files[0])}
              />
              {form.audioFile ? (
                <div>
                  <Icon name="music" size={isCompact ? 28 : 36} color="var(--accent)" />
                  <p style={{ marginTop: 10, fontWeight: 600, fontSize: isCompact ? 13 : 15, wordBreak: "break-word" }}>
                    {form.audioFile.name}
                  </p>
                  <p style={{ fontSize: isCompact ? 11 : 12, color: "var(--text3)", marginTop: 4 }}>
                    {(form.audioFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
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
                  <button className="btn btn-ghost" style={{ marginTop: isCompact ? 12 : 16, fontSize: isCompact ? 13 : 14 }}>
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
                Client limit: {maxAudioMb} MB (VITE_MAX_AUDIO_MB). Supabase may enforce a separate cap in Storage settings.
              </p>
            ) : (
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
                Supabase limits file size per project (50 MB max on Free; raise under Dashboard → Storage → Settings on Pro).
              </p>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
              Guest preview clip (optional)
            </label>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10, lineHeight: 1.5 }}>
              Short audio (e.g. under ~90s) stored in a public bucket so visitors who aren&apos;t signed in can hear something.
              The full mix stays private and only streams via signed URLs for logged-in users.
            </p>
            <input
              id="preview-audio-inp"
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              onChange={(e) =>
                setForm((f) => ({ ...f, previewAudioFile: e.target.files[0] || null }))
              }
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <button type="button" className="btn btn-ghost" onClick={() => document.getElementById("preview-audio-inp").click()}>
                {form.previewAudioFile ? "Change preview file" : "Choose preview file"}
              </button>
              {form.previewAudioFile ? (
                <>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>{form.previewAudioFile.name}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => {
                      setForm((f) => ({ ...f, previewAudioFile: null }));
                      const el = document.getElementById("preview-audio-inp");
                      if (el) el.value = "";
                    }}
                  >
                    Clear
                  </button>
                </>
              ) : null}
            </div>
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
            disabled={!form.audioFile}
          >
            Continue <Icon name="skip" size={15} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="slide-in">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                Title *
              </label>
              <input
                className="inp"
                placeholder="e.g. Summer Deep House Session Vol. 5"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
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
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
              disabled={!form.title}
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
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text2)" }}>Uploading...</span>
                <span style={{ fontSize: 13, color: "var(--accent)", fontFamily: "var(--ff-mono)" }}>
                  {Math.floor(progress)}%
                </span>
              </div>
              <div className="progress-wrap" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${progress}%`, transition: "width 0.2s linear" }} />
              </div>
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
                  <Icon name="upload" size={15} />
                  Publish Mix
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

