import { isMixApproved } from "./mixStatus.js";

/** Release state after review. Independent of pending/approved/rejected. */
export const MIX_VISIBILITY_HIDDEN = "hidden";
export const MIX_VISIBILITY_PRESAVE = "presave";
export const MIX_VISIBILITY_LIVE = "live";

const KNOWN = [MIX_VISIBILITY_HIDDEN, MIX_VISIBILITY_PRESAVE, MIX_VISIBILITY_LIVE];

/** Rows without a visibility column (migration not applied) behave as live. */
export function normalizeMixVisibility(raw) {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return KNOWN.includes(value) ? value : MIX_VISIBILITY_LIVE;
}

export function isMixPresave(mix) {
  return isMixApproved(mix) && normalizeMixVisibility(mix?.visibility) === MIX_VISIBILITY_PRESAVE;
}

export function isMixLive(mix) {
  return isMixApproved(mix) && normalizeMixVisibility(mix?.visibility) === MIX_VISIBILITY_LIVE;
}

/** Shown in member catalogs (Lab Home, Mixes, etc.). Hidden stays admin-only. */
export function isMixCatalogVisible(mix) {
  if (!isMixApproved(mix)) return false;
  const v = normalizeMixVisibility(mix?.visibility);
  return v === MIX_VISIBILITY_LIVE || v === MIX_VISIBILITY_PRESAVE;
}

/**
 * Full streaming for free/paid members.
 * Pre-save and hidden mixes are not streamable (admins may preview via allowAdminPreview).
 */
export function isMixStreamable(mix, { allowAdminPreview = false } = {}) {
  if (allowAdminPreview) return isMixApproved(mix);
  return isMixLive(mix);
}

export function mixVisibilityLabel(raw) {
  const v = normalizeMixVisibility(raw);
  if (v === MIX_VISIBILITY_PRESAVE) return "Pre-save";
  if (v === MIX_VISIBILITY_HIDDEN) return "Hidden";
  return "Live";
}

export function mixVisibilityColor(raw) {
  const v = normalizeMixVisibility(raw);
  if (v === MIX_VISIBILITY_PRESAVE) return "var(--orange)";
  if (v === MIX_VISIBILITY_HIDDEN) return "var(--text3)";
  return "var(--green)";
}

/** Short date for Pre-save tags, e.g. "21 Nov 2026". */
export function formatGoesLiveDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** e.g. "Releases 21 Nov 2026" or "Release date TBA". */
export function formatPresaveReleaseLine(iso) {
  const pretty = formatGoesLiveDate(iso);
  return pretty ? `Releases ${pretty}` : "Release date TBA";
}

/** datetime-local input value from ISO / Date. */
export function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(local) {
  const raw = String(local || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
