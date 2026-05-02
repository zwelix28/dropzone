export const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n);

export const fmtDuration = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

