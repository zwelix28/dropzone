import { useEffect, useRef, useState } from "react";

/**
 * Horizontally slides overflowing text so the full string is readable.
 * Stays static when the title fits the container.
 */
export default function MarqueeText({
  text,
  maxWidth = 160,
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
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    ro?.observe(viewport);
    window.addEventListener("resize", check);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [text, maxWidth]);

  const label = text || "";

  return (
    <div
      ref={viewportRef}
      className={`marquee-title ${overflowing ? "is-overflowing" : ""} ${className}`.trim()}
      title={titleAttr ?? label}
      style={{ width: maxWidth, maxWidth, ...style }}
    >
      {/* Hidden measure copy — always single line, no animation */}
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
