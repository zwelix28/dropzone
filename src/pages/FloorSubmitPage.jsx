import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import EventDateTimePicker from "../components/EventDateTimePicker.jsx";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { handleArtworkError } from "../constants/artwork.js";
import { useApp } from "../context/AppContext.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { submitFloorEvent } from "../lib/floorEvents.js";
import { isLocalMode } from "../lib/localMode.js";
import { scrollAppMainToTop } from "../lib/scrollAppMain.js";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";

const emptyForm = () => ({
  title: "",
  venue: "",
  city: "",
  startsAt: "",
  endsAt: "",
  ticketUrl: "",
  detailsUrl: "",
  lineup: "",
  isPromoting: true,
});

export default function FloorSubmitPage() {
  const navigate = useNavigate();
  const { auth } = useApp();
  const isCompact = useMediaQuery("(max-width: 720px)");
  const flyerInputRef = useRef(null);
  const successRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [flyerFile, setFlyerFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const uid = auth.session?.user?.id;
  const guest = !auth.authLoading && !uid;

  useEffect(() => {
    if (!flyerFile) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(flyerFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [flyerFile]);

  useEffect(() => {
    if (!submitted) return;
    scrollAppMainToTop();
    successRef.current?.focus?.({ preventScroll: true });
  }, [submitted]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        uid &&
          form.title.trim() &&
          form.venue.trim() &&
          form.startsAt &&
          (flyerFile || preview),
      ),
    [uid, form.title, form.venue, form.startsAt, flyerFile, preview],
  );

  const goSignIn = () => {
    auth.setShowAuth(true);
  };

  const handleSubmit = async () => {
    setLocalError(null);
    if (!uid) {
      auth.setShowAuth(true);
      return;
    }
    if (!flyerFile) {
      setLocalError("Upload an event flyer.");
      return;
    }
    setBusy(true);
    try {
      const result = await submitFloorEvent({
        ...form,
        flyerFile,
        submitterId: uid,
      });
      if (!result.ok) {
        setLocalError(result.error || "Could not submit the event.");
        return;
      }
      setForm(emptyForm());
      setFlyerFile(null);
      setPreview("");
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

  if (auth.authLoading) {
    return (
      <div className="floor-submit-page" style={{ padding: isCompact ? "24px 16px" : "48px 36px", color: "var(--text2)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div
      className={`floor-submit-page fade-in${isCompact ? " is-compact" : ""}${submitted ? " is-success" : ""}`}
      style={{ padding: isCompact ? "16px 12px 24px" : "28px 36px 56px" }}
    >
      <div className="floor-submit-shell">
        <div style={{ marginBottom: isCompact ? 10 : 14 }}>
          <BackButton to="/profile" label="Profile" />
        </div>

        {submitted ? (
          <section
            ref={successRef}
            tabIndex={-1}
            className="floor-submit-confirm"
            aria-live="polite"
            aria-label="Submission received"
          >
            <div className="floor-submit-confirm-glow" aria-hidden="true" />
            <div className="floor-submit-confirm-icon" aria-hidden="true">
              <Icon name="check" size={isCompact ? 26 : 30} color="var(--green)" />
            </div>
            <p className="floor-submit-confirm-kicker">Submission received</p>
            <h1 className="floor-submit-confirm-title">Up for review</h1>
            <p className="floor-submit-confirm-copy">
              Thanks — your night is with the Deep House Lab team. You’ll get an in-app notification when it’s approved
              and live on This week on the floor.
            </p>
            <ul className="floor-submit-confirm-steps">
              <li>
                <Icon name="shield" size={14} color="var(--accent)" />
                <span>Lab review before it goes live</span>
              </li>
              <li>
                <Icon name="bell" size={14} color="var(--accent)" />
                <span>In-app alert when approved</span>
              </li>
              <li>
                <Icon name="fire" size={14} color="var(--accent)" />
                <span>Featured on On the Floor</span>
              </li>
            </ul>
            <div className="floor-submit-confirm-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSubmitted(false);
                  setLocalError(null);
                  scrollAppMainToTop();
                }}
              >
                Submit another
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate("/profile")}>
                Back to Profile
              </button>
            </div>
          </section>
        ) : (
          <>
            <PageHeader icon="fire" title="PROMOTE" large marginBottom={isCompact ? 8 : 12} />
            {isCompact ? <h1 className="floor-submit-mobile-title">Promote</h1> : null}
            <p className="floor-submit-lede">
              Pitch a deep-house night for This week on the floor. Every listing is reviewed before it goes live.
            </p>

            {guest ? (
              <p className="floor-submit-notice is-warn">
                Sign in to submit an event for review.{" "}
                <button type="button" className="floor-submit-link" onClick={goSignIn}>
                  Sign in
                </button>
              </p>
            ) : null}

            {!isSupabaseConfigured() && !isLocalMode() ? (
              <p className="floor-submit-notice is-warn">
                {import.meta.env.DEV ? (
                  <>
                    Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to{" "}
                    <code>.env.local</code> and restart the dev server.
                  </>
                ) : (
                  <>Promotions aren’t available right now. Please try again later.</>
                )}
              </p>
            ) : null}

            {isLocalMode() ? (
              <p className="floor-submit-notice is-warn">
                Local mode publishes submissions on this device so Home can show multiple promotions immediately.
              </p>
            ) : null}

            {localError ? <p className="floor-submit-notice is-error">{localError}</p> : null}

            <div className="floor-submit-stack">
              <section className={`settings-section${isCompact ? " is-compact" : ""}`}>
                <div className="settings-section-head">
                  <div className="settings-section-icon" aria-hidden="true">
                    <Icon name="img" size={isCompact ? 14 : 16} color="var(--accent)" />
                  </div>
                  <div className="settings-section-titles">
                    <h2>Flyer</h2>
                    <p>Portrait art works best for the Home sidebar card.</p>
                  </div>
                </div>
                <div className="settings-section-body">
                  <button
                    type="button"
                    className={`floor-submit-flyer-drop${preview ? " has-art" : ""}`}
                    disabled={guest}
                    onClick={() => flyerInputRef.current?.click()}
                  >
                    {preview ? (
                      <img src={preview} alt="" onError={handleArtworkError} className="floor-submit-flyer-preview" />
                    ) : (
                      <div className="floor-submit-flyer-empty">
                        <Icon name="upload" size={26} color="var(--text3)" />
                        <strong>Drop or choose a flyer</strong>
                        <span>JPEG, PNG, or WebP</span>
                      </div>
                    )}
                  </button>
                  <input
                    ref={flyerInputRef}
                    id="floor-flyer"
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={guest}
                    onChange={(e) => {
                      setLocalError(null);
                      setFlyerFile(e.target.files?.[0] || null);
                    }}
                  />
                  {preview ? (
                    <button
                      type="button"
                      className="btn btn-ghost floor-submit-replace"
                      disabled={guest}
                      onClick={() => flyerInputRef.current?.click()}
                    >
                      Replace flyer
                    </button>
                  ) : null}
                </div>
              </section>

              <section className={`settings-section${isCompact ? " is-compact" : ""}`}>
                <div className="settings-section-head">
                  <div className="settings-section-icon" aria-hidden="true">
                    <Icon name="music" size={isCompact ? 14 : 16} color="var(--accent)" />
                  </div>
                  <div className="settings-section-titles">
                    <h2>Event details</h2>
                    <p>Title, venue, and who’s on the bill.</p>
                  </div>
                </div>
                <div className="settings-section-body floor-submit-fields">
                  <div>
                    <label className="floor-submit-label" htmlFor="floor-title">
                      Event title
                    </label>
                    <input
                      id="floor-title"
                      className="inp"
                      maxLength={120}
                      placeholder="Night / party name"
                      value={form.title}
                      disabled={guest}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>

                  <div className="floor-submit-grid">
                    <div>
                      <label className="floor-submit-label" htmlFor="floor-venue">
                        Venue
                      </label>
                      <input
                        id="floor-venue"
                        className="inp"
                        maxLength={120}
                        placeholder="Club / venue"
                        value={form.venue}
                        disabled={guest}
                        onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="floor-submit-label" htmlFor="floor-city">
                        City
                      </label>
                      <input
                        id="floor-city"
                        className="inp"
                        maxLength={80}
                        placeholder="City"
                        value={form.city}
                        disabled={guest}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="floor-submit-label" htmlFor="floor-lineup">
                      Lineup / artists (optional)
                    </label>
                    <textarea
                      id="floor-lineup"
                      className="inp"
                      rows={3}
                      maxLength={500}
                      placeholder="Residents, guests, live acts…"
                      value={form.lineup}
                      disabled={guest}
                      onChange={(e) => setForm((f) => ({ ...f, lineup: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className={`settings-section${isCompact ? " is-compact" : ""}`}>
                <div className="settings-section-head">
                  <div className="settings-section-icon" aria-hidden="true">
                    <Icon name="zap" size={isCompact ? 14 : 16} color="var(--accent)" />
                  </div>
                  <div className="settings-section-titles">
                    <h2>When</h2>
                    <p>Quick night picks, calendar, and door times built for club hours.</p>
                  </div>
                </div>
                <div className="settings-section-body">
                  <EventDateTimePicker
                    startValue={form.startsAt}
                    endValue={form.endsAt}
                    disabled={guest}
                    onChange={({ startsAt, endsAt }) =>
                      setForm((f) => ({ ...f, startsAt, endsAt }))
                    }
                  />
                </div>
              </section>

              <section className={`settings-section${isCompact ? " is-compact" : ""}`}>
                <div className="settings-section-head">
                  <div className="settings-section-icon" aria-hidden="true">
                    <Icon name="send" size={isCompact ? 14 : 16} color="var(--accent)" />
                  </div>
                  <div className="settings-section-titles">
                    <h2>Links & submit</h2>
                    <p>Tickets, details, then send it for review.</p>
                  </div>
                </div>
                <div className="settings-section-body floor-submit-fields">
                  <div className="floor-submit-grid">
                    <div>
                      <label className="floor-submit-label" htmlFor="floor-tickets">
                        Ticket link
                      </label>
                      <input
                        id="floor-tickets"
                        className="inp"
                        maxLength={500}
                        placeholder="https://…"
                        value={form.ticketUrl}
                        disabled={guest}
                        onChange={(e) => setForm((f) => ({ ...f, ticketUrl: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="floor-submit-label" htmlFor="floor-details">
                        Details link (optional)
                      </label>
                      <input
                        id="floor-details"
                        className="inp"
                        maxLength={500}
                        placeholder="https://…"
                        value={form.detailsUrl}
                        disabled={guest}
                        onChange={(e) => setForm((f) => ({ ...f, detailsUrl: e.target.value }))}
                      />
                    </div>
                  </div>

                  <label className="floor-submit-check">
                    <input
                      type="checkbox"
                      checked={form.isPromoting}
                      disabled={guest}
                      onChange={(e) => setForm((f) => ({ ...f, isPromoting: e.target.checked }))}
                    />
                    <span>I’m promoting this event</span>
                  </label>

                  <div className="floor-submit-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void handleSubmit()}
                      disabled={busy || guest || !canSubmit}
                    >
                      {busy ? "Submitting…" : "Submit for review"}
                    </button>
                    <Link to={uid ? "/profile" : "/"} className="btn btn-ghost" style={{ textDecoration: "none" }}>
                      Cancel
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
