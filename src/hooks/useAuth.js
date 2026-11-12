import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizePlan } from "../constants/plans.js";
import { ensureFollowDhlab } from "../lib/followDhlab.js";
import {
  getLocalDemoProfile,
  getLocalDemoSession,
  hasLocalAuthSession,
  isLocalMode,
  LOCAL_TEST_EMAIL,
  LOCAL_TEST_PASSWORD,
  setLocalAuthSession,
} from "../lib/localMode.js";
import {
  capturePasswordRecoveryFromUrl,
  clearPasswordRecoveryPending,
  isPasswordRecoveryPending,
  markPasswordRecoveryPending,
} from "../lib/passwordRecovery.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { looksLikeEmail, normalizeUsername, suggestUsernames, toHandle } from "../lib/username.js";

const LOCAL_SIGNUP_PAUSED =
  "Local testing uses the account local@deephouselab.test. Sign in with that account.";

/** User-facing copy for common GoTrue / Supabase Auth responses */
function formatAuthError(error) {
  if (!error?.message) return "Something went wrong. Please try again.";
  const msg = error.message;
  const status = error.status;
  if (status === 429 || /rate limit/i.test(msg)) {
    return `${msg} For testing, wait up to an hour, use a different email, or add a user manually under Authentication → Users in the Supabase dashboard.`;
  }
  if (/database error saving new user/i.test(msg)) {
    return `${msg} Check Supabase → Logs → Postgres for the trigger error (often a failed profiles insert from handle_new_user).`;
  }
  return msg;
}

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username || "DJ",
    handle: row.handle || "@dj",
    bio: row.bio || "",
    avatar: row.avatar_url || "",
    followers: row.followers_count ?? 0,
    following: row.following_count ?? 0,
    verified: row.verified ?? false,
    genre: row.genre || "Tech House",
    location: row.location || "",
    isAdmin: row.is_admin ?? false,
    isBanned: row.is_banned ?? false,
    // true / false / null (null = column missing — see isAccountApproved)
    isApproved: row.is_approved === true ? true : row.is_approved === false ? false : null,
    plan: normalizePlan(row.plan),
    notifyEmailNewMix: row.notify_email_new_mix !== false,
    notifyPushNewMix: row.notify_push_new_mix !== false,
  };
}

export default function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    if (!isSupabaseConfigured() || !userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error || !data) {
      setProfile(null);
      return;
    }
    if (data.is_banned) {
      setProfile(null);
      setAuthError("This account has been suspended.");
      await supabase.auth.signOut();
      return;
    }
    setAuthError(null);
    setProfile(mapProfile(data));
  }, []);

  const enterLocalSession = useCallback(() => {
    setAuthError(null);
    setShowAuth(false);
    setLocalAuthSession(true);
    setSession(getLocalDemoSession());
    setProfile(getLocalDemoProfile());
    setLoading(false);
    return { ok: true };
  }, []);

  useEffect(() => {
    if (isLocalMode()) {
      if (hasLocalAuthSession()) enterLocalSession();
      else {
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
      return;
    }

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    capturePasswordRecoveryFromUrl();

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) await loadProfile(s.user.id);
      else setProfile(null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        markPasswordRecoveryPending();
      }
      if (event === "SIGNED_OUT") {
        clearPasswordRecoveryPending();
      }
      setSession(s);
      if (s?.user) loadProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, enterLocalSession]);

  const resolveEmailForLogin = useCallback(async (identifier) => {
    const raw = String(identifier || "").trim();
    if (!raw) return { ok: false, email: null, error: "Enter your email or username." };
    if (looksLikeEmail(raw)) return { ok: true, email: raw.toLowerCase() };

    const { data, error } = await supabase.rpc("resolve_login_email", {
      p_identifier: normalizeUsername(raw),
    });
    if (error) {
      // Migration not applied yet — fall back to treating input as email.
      if (/resolve_login_email|function .* does not exist/i.test(error.message || "")) {
        return {
          ok: false,
          email: null,
          error: "Username login isn’t set up on this project yet. Use your email, or run supabase/username-login.sql.",
        };
      }
      return { ok: false, email: null, error: formatAuthError(error) };
    }
    if (!data) {
      return { ok: false, email: null, error: "No account found for that username." };
    }
    return { ok: true, email: String(data) };
  }, []);

  const signInWithEmailPassword = useCallback(async (identifier, password) => {
    if (isLocalMode()) {
      const id = String(identifier || "").trim().toLowerCase();
      const emailOk = id === LOCAL_TEST_EMAIL || id === "local" || id === "deephouselab";
      const passwordOk = password === LOCAL_TEST_PASSWORD;
      if (!emailOk || !passwordOk) {
        const shown = "That local test login did not match. Use local@deephouselab.test and localtest.";
        setAuthError(shown);
        return { ok: false, error: shown };
      }
      enterLocalSession();
      return { ok: true };
    }
    if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured" };
    setAuthError(null);

    const resolved = await resolveEmailForLogin(identifier);
    if (!resolved.ok || !resolved.email) {
      const shown = resolved.error || "Could not find that account.";
      setAuthError(shown);
      return { ok: false, error: shown };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: resolved.email,
      password,
    });
    if (error) {
      const shown = formatAuthError(error);
      setAuthError(shown);
      return { ok: false, error: shown };
    }
    return { ok: true };
  }, [enterLocalSession, resolveEmailForLogin]);

  const checkUsernameAvailability = useCallback(async (username) => {
    const uname = normalizeUsername(username);
    if (!uname || uname.length < 2) {
      return {
        available: false,
        reason: "too_short",
        suggestions: [],
        error: "Choose a username with at least 2 characters.",
      };
    }
    if (!isSupabaseConfigured() || isLocalMode()) {
      return { available: true, reason: null, suggestions: [] };
    }

    const { data, error } = await supabase.rpc("check_username_available", {
      p_username: uname,
    });
    if (error) {
      // Soft-fail without the migration: allow signup and let DB constraints speak.
      if (/check_username_available|function .* does not exist/i.test(error.message || "")) {
        return { available: true, reason: null, suggestions: [], skipped: true };
      }
      return {
        available: false,
        reason: "error",
        suggestions: suggestUsernames(uname),
        error: formatAuthError(error),
      };
    }

    const available = Boolean(data?.available);
    const suggestions = Array.isArray(data?.suggestions)
      ? data.suggestions.map(String)
      : suggestUsernames(uname);
    return {
      available,
      reason: data?.reason || (available ? null : "taken"),
      suggestions: available ? [] : suggestions,
      error: available
        ? null
        : data?.reason === "reserved"
          ? "That username is reserved. Try another."
          : "That username is taken.",
    };
  }, []);

  const signUp = useCallback(async (email, password, { username, genre }) => {
    if (isLocalMode()) return { ok: false, error: LOCAL_SIGNUP_PAUSED };
    if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured" };
    setAuthError(null);
    const uname = normalizeUsername(username) || email.split("@")[0];
    const handle = toHandle(uname) || `@${String(uname).toLowerCase()}`;

    const availability = await checkUsernameAvailability(uname);
    if (!availability.available && !availability.skipped) {
      const shown = availability.error || "That username is taken.";
      setAuthError(shown);
      return {
        ok: false,
        error: shown,
        usernameTaken: true,
        suggestions: availability.suggestions || [],
      };
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: origin ? `${origin}/` : undefined,
        data: {
          username: uname,
          handle,
          genre: genre || "Tech House",
        },
      },
    });
    if (error) {
      const shown = formatAuthError(error);
      const taken = /duplicate|unique|already|username|handle/i.test(shown);
      setAuthError(shown);
      return {
        ok: false,
        error: shown,
        usernameTaken: taken,
        suggestions: taken ? suggestUsernames(uname) : [],
      };
    }

    // DB trigger should auto-follow; client backup when a session exists.
    const newUserId = data.user?.id;
    if (newUserId && data.session) {
      void ensureFollowDhlab(newUserId);
    }

    if (data.session) {
      return { ok: true, needsEmailConfirmation: false };
    }

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInErr && signInData.session) {
      if (newUserId) void ensureFollowDhlab(newUserId);
      return { ok: true, needsEmailConfirmation: false };
    }

    if (signInErr && /email not confirmed|confirm your email|not verified/i.test(signInErr.message)) {
      return { ok: true, needsEmailConfirmation: true };
    }

    if (signInErr) {
      const shown = formatAuthError(signInErr);
      setAuthError(shown);
      return { ok: false, error: shown };
    }

    return { ok: true, needsEmailConfirmation: true };
  }, []);

  const requestPasswordReset = useCallback(async (identifier) => {
    if (isLocalMode()) return { ok: false, error: LOCAL_SIGNUP_PAUSED };
    if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured" };
    setAuthError(null);
    const resolved = await resolveEmailForLogin(identifier);
    if (!resolved.ok || !resolved.email) {
      // Same generic copy as email-only reset to avoid account enumeration.
      return { ok: true };
    }
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(resolved.email, {
      redirectTo,
    });
    if (error) {
      const shown = formatAuthError(error);
      setAuthError(shown);
      return { ok: false, error: shown };
    }
    return { ok: true };
  }, [resolveEmailForLogin]);

  const updatePassword = useCallback(async (newPassword) => {
    if (isLocalMode()) return { ok: false, error: LOCAL_SIGNUP_PAUSED };
    if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured" };
    setAuthError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const shown = formatAuthError(error);
      setAuthError(shown);
      return { ok: false, error: shown };
    }
    clearPasswordRecoveryPending();
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (isLocalMode()) {
      setLocalAuthSession(false);
      setAuthError(null);
      setSession(null);
      setProfile(null);
      return;
    }
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (isLocalMode()) {
      if (session?.user?.id) setProfile(getLocalDemoProfile());
      return;
    }
    const uid = session?.user?.id;
    if (uid) await loadProfile(uid);
  }, [session?.user?.id, loadProfile]);

  return useMemo(
    () => ({
      session,
      currentUser: profile,
      authLoading: loading,
      showAuth,
      setShowAuth,
      authError,
      clearAuthError: () => setAuthError(null),
      signInWithEmailPassword,
      signUp,
      checkUsernameAvailability,
      requestPasswordReset,
      updatePassword,
      isPasswordRecoveryPending,
      clearPasswordRecoveryPending,
      signOut,
      refreshProfile,
      enterLocalSession,
      localMode: isLocalMode(),
      /** @deprecated use signOut */
      logout: signOut,
      /** legacy no-op — profile updates go through Supabase */
      setCurrentUser: () => {},
      login: () => {},
    }),
    [
      session,
      profile,
      loading,
      showAuth,
      authError,
      signInWithEmailPassword,
      signUp,
      checkUsernameAvailability,
      requestPasswordReset,
      updatePassword,
      isPasswordRecoveryPending,
      clearPasswordRecoveryPending,
      signOut,
      refreshProfile,
      enterLocalSession,
    ],
  );
}
