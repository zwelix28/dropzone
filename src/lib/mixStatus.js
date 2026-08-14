/** Review state for mixes. Members submit as "pending"; admins publish by approving. */

export const MIX_STATUS_PENDING = "pending";
export const MIX_STATUS_APPROVED = "approved";
export const MIX_STATUS_REJECTED = "rejected";

const KNOWN = [MIX_STATUS_PENDING, MIX_STATUS_APPROVED, MIX_STATUS_REJECTED];

/** Rows saved before the review migration have no status and are already live. */
export function normalizeMixStatus(raw) {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return KNOWN.includes(value) ? value : MIX_STATUS_APPROVED;
}

export function isMixApproved(mix) {
  return normalizeMixStatus(mix?.status) === MIX_STATUS_APPROVED;
}

export function mixStatusLabel(raw) {
  const status = normalizeMixStatus(raw);
  if (status === MIX_STATUS_PENDING) return "Awaiting review";
  if (status === MIX_STATUS_REJECTED) return "Not approved";
  return "Live";
}

export function mixStatusColor(raw) {
  const status = normalizeMixStatus(raw);
  if (status === MIX_STATUS_PENDING) return "var(--orange)";
  if (status === MIX_STATUS_REJECTED) return "var(--red)";
  return "var(--green)";
}
