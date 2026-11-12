/** Normalize a display name / handle for comparison and storage. */
export function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, "");
}

export function toHandle(username) {
  const core = normalizeUsername(username).toLowerCase();
  return core ? `@${core}` : "";
}

export function looksLikeEmail(value) {
  const v = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Suggest alternate usernames when the chosen one is taken. */
export function suggestUsernames(desired, takenSet = new Set()) {
  const base = normalizeUsername(desired).toLowerCase().replace(/[^a-z0-9._-]/gi, "") || "dj";
  const taken = new Set(
    [...takenSet].map((t) => normalizeUsername(t).toLowerCase()).filter(Boolean),
  );
  taken.add(base);

  const year = new Date().getFullYear();
  const candidates = [
    `${base}${Math.floor(Math.random() * 90) + 10}`,
    `${base}_${Math.floor(Math.random() * 90) + 10}`,
    `${base}${year.toString().slice(-2)}`,
    `dj_${base}`,
    `${base}_lab`,
    `${base}hq`,
  ];

  const out = [];
  for (const c of candidates) {
    const n = normalizeUsername(c).toLowerCase();
    if (!n || taken.has(n) || out.includes(n)) continue;
    out.push(n);
    if (out.length >= 3) break;
  }
  return out;
}
