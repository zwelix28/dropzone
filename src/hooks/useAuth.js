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
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

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
    // Missing column (pre-migration) stays usable; explicit false = pending approval.
    isApproved: row.is_approved !== false,
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

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) await loadProfile(s.user.id);
      else setProfile(null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) loadProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, enterLocalSession]);

  const signInWithEmailPassword = useCallback(async (email, password) => {
    if (isLocalMode()) {
      const emailOk = email.trim().toLowerCase() === LOCAL_TEST_EMAIL;
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const shown = formatAuthError(error);
      setAuthError(shown);
      return { ok: false, error: shown };
    }
    return { ok: true };
  }, [enterLocalSession]);

  const signUp = useCallback(async (email, password, { username, genre }) => {
    if (isLocalMode()) return { ok: false, error: LOCAL_SIGNUP_PAUSED };
    if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured" };
    setAuthError(null);
    const uname = (username || "").trim() || email.split("@")[0];
    const handle = `@${uname.toLowerCase().replace(/\s/g, "")}`;
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
      setAuthError(shown);
      return { ok: false, error: shown };
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

  const requestPasswordReset = useCallback(async (email) => {
    if (isLocalMode()) return { ok: false, error: LOCAL_SIGNUP_PAUSED };
    if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured" };
    setAuthError(null);
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (error) {
      const shown = formatAuthError(error);
      setAuthError(shown);
      return { ok: false, error: shown };
    }
    return { ok: true };
  }, []);

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
      requestPasswordReset,
      updatePassword,
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
      requestPasswordReset,
      updatePassword,
      signOut,
      refreshProfile,
      enterLocalSession,
    ],
  );
}
