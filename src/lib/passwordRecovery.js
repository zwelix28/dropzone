const STORAGE_KEY = "dhl-password-recovery";

/** True when the URL carries a Supabase recovery session (hash or PKCE code). */
export function urlLooksLikePasswordRecovery() {
  try {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const path = window.location.pathname || "";
    if (/type=recovery/i.test(hash) || /type=recovery/i.test(search)) return true;
    if (/access_token=/i.test(hash) && /recovery/i.test(hash)) return true;
    // PKCE recovery links use redirectTo=/reset-password
    if (/[?&]code=/.test(search) && path.includes("reset-password")) return true;
    return false;
  } catch {
    return false;
  }
}

export function markPasswordRecoveryPending() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearPasswordRecoveryPending() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isPasswordRecoveryPending() {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  return urlLooksLikePasswordRecovery();
}

/** Call once on boot so Site URL landings (`/?…#type=recovery`) still enter reset flow. */
export function capturePasswordRecoveryFromUrl() {
  if (urlLooksLikePasswordRecovery()) markPasswordRecoveryPending();
}
