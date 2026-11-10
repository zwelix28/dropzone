import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FLOOR_STATUS_APPROVED,
  FLOOR_STATUS_PENDING,
  FLOOR_STATUS_REJECTED,
  deleteFloorEvent,
  floorStatusLabel,
  formatFloorEventPlace,
  formatFloorEventWhen,
  listFloorEvents,
  reviewFloorEvent,
  saveFloorEvent,
} from "../../lib/floorEvents.js";
import { isLocalMode } from "../../lib/localMode.js";
import { handleArtworkError } from "../../constants/artwork.js";

const emptyForm = () => ({
  id: "",
  title: "",
  venue: "",
  city: "",
  startsAt: "",
  endsAt: "",
  ticketUrl: "",
  detailsUrl: "",
  lineup: "",
  isFeatured: false,
  isPublished: true,
  isPromoting: false,
  existingFlyerUrl: "",
});

function toLocalInputValue(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function FloorEventsPanel({ adminId }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [flyerFile, setFlyerFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { rows: list, error: loadError } = await listFloorEvents({ includeUnpublished: true });
    setLoading(false);
    if (loadError) setError(loadError);
    setRows(list);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!flyerFile) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(flyerFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [flyerFile]);

  const pending = useMemo(
    () => rows.filter((row) => row.status === FLOOR_STATUS_PENDING),
    [rows],
  );
  const catalog = useMemo(
    () => rows.filter((row) => row.status !== FLOOR_STATUS_PENDING),
    [rows],
  );

  const resetForm = () => {
    setForm(emptyForm());
    setFlyerFile(null);
    setPreview("");
    setSaved(false);
  };

  const editRow = (row) => {
    setForm({
      id: row.id,
      title: row.title,
      venue: row.venue,
      city: row.city,
      startsAt: toLocalInputValue(row.startsAt),
      endsAt: toLocalInputValue(row.endsAt),
      ticketUrl: row.ticketUrl,
      detailsUrl: row.detailsUrl,
      lineup: row.lineup || "",
      isFeatured: row.isFeatured,
      isPublished: row.isPublished,
      isPromoting: row.isPromoting,
      existingFlyerUrl: row.flyerUrl,
    });
    setFlyerFile(null);
    setPreview("");
    setSaved(false);
    setError(null);
  };

  const onSave = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await saveFloorEvent({
      ...form,
      flyerFile,
      adminId,
      status: FLOOR_STATUS_APPROVED,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setFlyerFile(null);
    setPreview("");
    setForm((prev) => ({
      ...prev,
      id: result.row.id,
      existingFlyerUrl: result.row.flyerUrl,
      startsAt: toLocalInputValue(result.row.startsAt),
      endsAt: toLocalInputValue(result.row.endsAt),
    }));
    await load();
  };

  const onReview = async (id, status, featured = false) => {
    setBusy(true);
    setError(null);
    const result = await reviewFloorEvent({
      id,
      status,
      reviewNote,
      adminId,
      isFeatured: featured,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReviewNote("");
    await load();
  };

  const onDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Remove this event from the floor?")) return;
    setBusy(true);
    setError(null);
    const result = await deleteFloorEvent(id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (form.id === id) resetForm();
    await load();
  };

  const shownFlyer = preview || form.existingFlyerUrl;

  return (
    <section className="admin-panel admin-floor-panel">
      <h2 className="admin-panel-title">This week on the floor</h2>
      <p className="admin-panel-desc">
        Curate deep-house events for the desktop Home sidebar, and review member submissions before they go live.
        Approvals send an in-app notification to the submitter.
      </p>
      {isLocalMode() ? (
        <p style={{ color: "var(--orange)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          Local mode stores events in this browser. Run supabase/floor-events.sql and
          supabase/floor-events-submissions.sql before cloud login is turned back on.
        </p>
      ) : null}

      {error ? <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p> : null}

      <div className="admin-floor-review" style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          Awaiting review ({pending.length})
        </h3>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Review note (optional — shown on reject)
        </label>
        <input
          className="inp"
          value={reviewNote}
          placeholder="Reason if rejecting…"
          onChange={(e) => setReviewNote(e.target.value)}
          style={{ marginBottom: 12, maxWidth: 480 }}
        />
        {pending.length === 0 ? (
          <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>No member submissions waiting.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((row) => (
              <li
                key={row.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 12,
                  border: "1px solid rgba(251,146,60,0.35)",
                  borderRadius: 12,
                  background: "rgba(251,146,60,0.06)",
                }}
              >
                <img
                  src={row.flyerUrl || "/logo.png"}
                  alt=""
                  onError={handleArtworkError}
                  style={{
                    width: 56,
                    height: 74,
                    objectFit: "cover",
                    borderRadius: 8,
                    background: "#141414",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{row.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                    {formatFloorEventWhen(row.startsAt, row.endsAt)}
                    {formatFloorEventPlace(row.venue, row.city) ? ` · ${formatFloorEventPlace(row.venue, row.city)}` : ""}
                  </div>
                  {row.lineup ? (
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Lineup: {row.lineup}</div>
                  ) : null}
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                    {row.isPromoting ? "Promoter submission" : "Community listing"}
                    {row.ticketUrl ? " · has ticket link" : ""}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: "6px 12px" }}
                      disabled={busy}
                      onClick={() => void onReview(row.id, FLOOR_STATUS_APPROVED, false)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: "6px 12px" }}
                      disabled={busy}
                      onClick={() => void onReview(row.id, FLOOR_STATUS_APPROVED, true)}
                    >
                      Approve + feature
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: "6px 12px", color: "var(--red)" }}
                      disabled={busy}
                      onClick={() => void onReview(row.id, FLOOR_STATUS_REJECTED, false)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-floor-layout">
        <div className="admin-floor-form">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            {form.id ? "Edit event" : "Publish event (admin)"}
          </h3>

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Flyer</label>
          {shownFlyer ? (
            <img
              src={shownFlyer}
              alt=""
              onError={handleArtworkError}
              style={{
                width: 140,
                height: 180,
                objectFit: "cover",
                borderRadius: 12,
                display: "block",
                marginBottom: 10,
                background: "#141414",
              }}
            />
          ) : null}
          <input
            className="inp"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              setSaved(false);
              setFlyerFile(event.target.files?.[0] || null);
            }}
          />

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, margin: "14px 0 6px" }}>Title</label>
          <input
            className="inp"
            value={form.title}
            maxLength={120}
            placeholder="Event name"
            onChange={(e) => {
              setSaved(false);
              setForm((f) => ({ ...f, title: e.target.value }));
            }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Venue</label>
              <input
                className="inp"
                value={form.venue}
                maxLength={120}
                placeholder="Club / venue"
                onChange={(e) => {
                  setSaved(false);
                  setForm((f) => ({ ...f, venue: e.target.value }));
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>City</label>
              <input
                className="inp"
                value={form.city}
                maxLength={80}
                placeholder="City"
                onChange={(e) => {
                  setSaved(false);
                  setForm((f) => ({ ...f, city: e.target.value }));
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Starts</label>
              <input
                className="inp"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => {
                  setSaved(false);
                  setForm((f) => ({ ...f, startsAt: e.target.value }));
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Ends (optional)
              </label>
              <input
                className="inp"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => {
                  setSaved(false);
                  setForm((f) => ({ ...f, endsAt: e.target.value }));
                }}
              />
            </div>
          </div>

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, margin: "14px 0 6px" }}>
            Lineup (optional)
          </label>
          <textarea
            className="inp"
            rows={3}
            maxLength={500}
            value={form.lineup}
            placeholder="Artists / residents…"
            onChange={(e) => {
              setSaved(false);
              setForm((f) => ({ ...f, lineup: e.target.value }));
            }}
          />

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, margin: "14px 0 6px" }}>
            Ticket link
          </label>
          <input
            className="inp"
            value={form.ticketUrl}
            maxLength={500}
            placeholder="https://…"
            onChange={(e) => {
              setSaved(false);
              setForm((f) => ({ ...f, ticketUrl: e.target.value }));
            }}
          />

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, margin: "14px 0 6px" }}>
            Details link (optional)
          </label>
          <input
            className="inp"
            value={form.detailsUrl}
            maxLength={500}
            placeholder="https://…"
            onChange={(e) => {
              setSaved(false);
              setForm((f) => ({ ...f, detailsUrl: e.target.value }));
            }}
          />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 14 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => {
                  setSaved(false);
                  setForm((f) => ({ ...f, isFeatured: e.target.checked }));
                }}
              />
              Featured flyer
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => {
                  setSaved(false);
                  setForm((f) => ({ ...f, isPublished: e.target.checked }));
                }}
              />
              Published on Home
            </label>
          </div>

          {saved ? (
            <p style={{ color: "var(--green)", fontSize: 13, marginTop: 12 }}>
              Saved. Open Home on desktop to preview the floor panel.
            </p>
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onSave()}>
              {busy ? "Saving…" : form.id ? "Update event" : "Publish event"}
            </button>
            {form.id ? (
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={resetForm}>
                New event
              </button>
            ) : null}
          </div>
        </div>

        <div className="admin-floor-list">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            {loading ? "Loading…" : `${catalog.length} catalog event${catalog.length === 1 ? "" : "s"}`}
          </h3>
          {catalog.length === 0 && !loading ? (
            <p style={{ color: "var(--text3)", fontSize: 13 }}>No published or rejected events yet.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {catalog.map((row) => (
                <li
                  key={row.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: 10,
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    background: "var(--surface)",
                  }}
                >
                  <img
                    src={row.flyerUrl || "/logo.png"}
                    alt=""
                    onError={handleArtworkError}
                    style={{
                      width: 52,
                      height: 68,
                      objectFit: "cover",
                      borderRadius: 8,
                      background: "#141414",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, wordBreak: "break-word" }}>
                      {row.title}
                      {row.isFeatured ? (
                        <span style={{ color: "var(--accent)", fontWeight: 600, marginLeft: 8 }}>Featured</span>
                      ) : null}
                      <span style={{ color: "var(--text3)", fontWeight: 600, marginLeft: 8 }}>
                        {floorStatusLabel(row.status)}
                      </span>
                      {row.status === FLOOR_STATUS_APPROVED && !row.isPublished ? (
                        <span style={{ color: "var(--text3)", fontWeight: 600, marginLeft: 8 }}>Hidden</span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                      {formatFloorEventWhen(row.startsAt, row.endsAt)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                      {formatFloorEventPlace(row.venue, row.city) || "—"}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: "4px 10px" }}
                        onClick={() => editRow(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: "4px 10px", color: "var(--red)" }}
                        disabled={busy}
                        onClick={() => void onDelete(row.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
