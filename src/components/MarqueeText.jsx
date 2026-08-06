import { useEffect, useRef, useState } from "react";

/**
 * Horizontally slides overflowing text so the full string is readable.
 * Stays static when the title fits the container.
 *
 * @param {object} props
 * @param {string} props.text
 * @param {number|string} [props.maxWidth=160] — fixed width when not filling parent
 * @param {boolean} [props.fill=false] — use 100% of parent width (mobile player bar)
 */
export default function MarqueeText({
  text,
  maxWidth = 160,
  fill = false,
  className = "",
  style,
  title: titleAttr,
}) {
  const viewportRef = useRef(null);
  const measureRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const measure = measureRef.current;
    if (!viewport || !measure) return;

    const check = () => {
      setOverflowing(measure.scrollWidth > viewport.clientWidth + 1);
    };

    check();
    // Re-check after layout settles (flex parents on mobile)
    const raf = requestAnimationFrame(check);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    ro?.observe(viewport);
    window.addEventListener("resize", check);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [text, maxWidth, fill]);

  const label = text || "";
  const sizeStyle = fill
    ? { width: "100%", maxWidth: "100%", minWidth: 0 }
    : { width: maxWidth, maxWidth };

  return (
    <div
      ref={viewportRef}
      className={`marquee-title ${overflowing ? "is-overflowing" : ""} ${className}`.trim()}
      title={titleAttr ?? label}
      style={{ ...sizeStyle, ...style }}
    >
      <span ref={measureRef} className="marquee-title-measure" aria-hidden>
        {label}
      </span>
      {overflowing ? (
        <div className="marquee-title-track">
          <span className="marquee-title-item">{label}</span>
          <span className="marquee-title-item" aria-hidden>
            {label}
          </span>
        </div>
      ) : (
        <span className="marquee-title-item">{label}</span>
      )}
    </div>
  );
}
