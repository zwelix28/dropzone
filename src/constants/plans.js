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
