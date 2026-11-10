import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FloorFlyerLightbox from "../components/FloorFlyerLightbox.jsx";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { handleArtworkError } from "../constants/artwork.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import {
  formatFloorEventPlace,
  formatFloorEventWhen,
  listFloorEventsForHome,
} from "../lib/floorEvents.js";

export default function FloorPage() {
  const isCompact = useMediaQuery("(max-width: 720px)");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    listFloorEventsForHome({ limit: 12 }).then(({ rows }) => {
      if (!live) return;
      setEvents(rows || []);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  const pagePad = isCompact ? "16px 12px 28px" : "28px 36px 56px";

  return (
    <div className={`floor-page fade-in${isCompact ? " is-compact" : ""}`} style={{ padding: pagePad }}>
      <div className="floor-page-shell">
        <PageHeader icon="fire" title="ON THE FLOOR" large marginBottom={isCompact ? 8 : 12} />
        {isCompact ? <h1 className="floor-page-mobile-title">On the floor</h1> : null}
        <p className="floor-page-lede">
          What’s moving on the deep house streets — nights, rooms, and flyers curated by the Lab.
        </p>

        {loading ? (
          <p className="floor-page-empty">Loading nights…</p>
        ) : events.length === 0 ? (
          <div className="floor-page-empty-card">
            <Icon name="fire" size={28} color="var(--text3)" />
            <p>Nothing on the floor yet. Be the first to pitch a night.</p>
            <Link to="/on-the-floor" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Promote a night
            </Link>
          </div>
        ) : (
          <>
            <div className={`floor-page-grid${isCompact ? " is-street" : ""}`} role="list">
              {events.map((event) => {
                const place = formatFloorEventPlace(event.venue, event.city);
                const when = formatFloorEventWhen(event.startsAt, event.endsAt);
                const live = when === "Happening now";
                return (
                  <button
                    key={event.id}
                    type="button"
                    role="listitem"
                    className={`floor-page-card${event.isFeatured ? " is-featured" : ""}${live ? " is-live" : ""}`}
                    aria-label={`View flyer for ${event.title}`}
                    onClick={() => setPreview(event)}
                  >
                    <span className="floor-page-card-art">
                      <img src={event.flyerUrl || "/logo.png"} alt="" onError={handleArtworkError} />
                      {live ? <span className="floor-page-badge is-live">Now</span> : null}
                      {!live && event.isFeatured ? <span className="floor-page-badge">Featured</span> : null}
                    </span>
                    <span className="floor-page-card-copy">
                      <b>{event.title}</b>
                      {when ? <span>{when}</span> : null}
                      {place ? <span>{place}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="floor-page-promote">
              Got a night coming up?{" "}
              <Link to="/on-the-floor">Promote it</Link>
            </p>
          </>
        )}
      </div>

      {preview ? <FloorFlyerLightbox event={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}
