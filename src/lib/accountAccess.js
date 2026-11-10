/** Whether a signed-in profile may use the app (admins always can). */
export function isAccountApproved(user) {
  if (!user?.id) return false;
  if (user.isAdmin) return true;
  if (user.isApproved === true) return true;
  if (user.isApproved === false) return false;
  // Missing column (pre-migration): allow in local/dev only; fail closed in prod.
  return !import.meta.env.PROD;
}
