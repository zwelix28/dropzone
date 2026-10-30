export const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n);

export const fmtDuration = (s) => {
  const total = Math.max(0, Math.floor(Number(s) || 0));
  if (total < 1) return "—";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m < 1) return "<1m";
  return `${m}m`;
};

/** Player / scrubber: `3:45` or `1:02:03` (always includes seconds). */
export function fmtPlayerTime(totalSec) {
  const s = Math.max(0, Math.floor(Number(totalSec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad2 = (n) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`;
  return `${m}:${pad2(sec)}`;
}

export const timeSince = (d) => {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
};

/** Absolute last-streamed stamp, e.g. `28 Oct 2026, 16:12`. */
export function fmtStreamedAt(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate();
  const month = date.toLocaleString(undefined, { month: "short" });
  const year = date.getFullYear();
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${day} ${month} ${year}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

