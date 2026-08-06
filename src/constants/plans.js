export const PLAN_FREE = "free";
export const PLAN_PAID = "paid";
export const PLAN_PRO = "pro";

/** @param {unknown} raw */
export function normalizePlan(raw) {
  const v = String(raw ?? "").toLowerCase();
  if (v === PLAN_PAID || v === PLAN_PRO) return v;
  return PLAN_FREE;
}

/** @param {{ plan?: string } | null | undefined} user */
export function isProPlan(user) {
  return normalizePlan(user?.plan) === PLAN_PRO;
}

/** Paid or Pro subscription — can download mixes (Free is stream-only). */
export function isPaidOrProPlan(user) {
  const plan = normalizePlan(user?.plan);
  return plan === PLAN_PAID || plan === PLAN_PRO;
}

/**
 * Whether this user may download a mix.
 * Free accounts stream only. Paid/Pro may download.
 * Mix owners and purchasers of a paid mix can always download that mix.
 */
export function canDownloadMix(user, { isOwner = false, purchaseUnlocked = false } = {}) {
  if (isOwner || purchaseUnlocked) return true;
  return isPaidOrProPlan(user);
}

/** @param {unknown} raw */
export function planLabel(raw) {
  switch (normalizePlan(raw)) {
    case PLAN_PAID:
      return "Paid";
    case PLAN_PRO:
      return "Pro";
    default:
      return "Free";
  }
}
