import { useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import { handleArtworkError } from "../constants/artwork.js";
import { formatFloorEventPlace, formatFloorEventWhen } from "../lib/floorEvents.js";
import { safeHttpUrl } from "../lib/safeAppHref.js";

export default function FloorFlyerLightbox({ event, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!event) return null;

  const ticketHref = safeHttpUrl(event.ticketUrl);
  const detailsHref = safeHttpUrl(event.detailsUrl);
  const cta = ticketHref || detailsHref;
  const place = formatFloorEventPlace(event.venue, event.city);
  const when = formatFloorEventWhen(event.startsAt, event.endsAt);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${event.title} flyer`}
      className="floor-flyer-lightbox"
      onClick={onClose}
    >
      <button type="button" className="floor-flyer-lightbox-close" aria-label="Close" onClick={onClose}>
        <Icon name="x" size={22} />
      </button>
      <div className="floor-flyer-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <img
          src={event.flyerUrl || "/logo.png"}
          alt={`${event.title} flyer`}
          onError={handleArtworkError}
        />
        <div className="floor-flyer-lightbox-meta">
          <b>{event.title}</b>
          {when ? <span>{when}</span> : null}
          {place ? <span>{place}</span> : null}
          {event.lineup ? <span className="floor-flyer-lightbox-lineup">{event.lineup}</span> : null}
          {cta ? (
            <a className="btn btn-primary" href={cta} target="_blank" rel="noopener noreferrer">
              {ticketHref ? "Get tickets" : "Event details"}
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
