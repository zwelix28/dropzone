/** Whether a signed-in profile may use the app (admins always can). */
export function isAccountApproved(user) {
  if (!user?.id) return false;
  if (user.isAdmin) return true;
  // Missing column (pre-migration) → allow; explicit false → pending.
  return user.isApproved !== false;
}
