/** Whether a signed-in profile may use the app (admins always can). */
export function isAccountApproved(user) {
  if (!user?.id) return false;
  if (user.isBanned) return false;
  if (user.isAdmin) return true;
  // Open registration: missing / null approval counts as allowed. Explicit false = admin revoke.
  if (user.isApproved === false) return false;
  return true;
}
