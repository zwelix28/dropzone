import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext
  );
}

export function getVapidPublicKey() {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY || "").trim();
}

export async function getExistingPushSubscription() {
  if (!isWebPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Request permission, subscribe this device, and store the endpoint for the signed-in user.
 */
export async function enableWebPush() {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };
  if (!isWebPushSupported()) {
    return { ok: false, error: "Push notifications need HTTPS and a supported browser." };
  }

  const vapid = getVapidPublicKey();
  if (!vapid) return { ok: false, error: "Push is not configured (missing VITE_VAPID_PUBLIC_KEY)." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Notification permission was not granted." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Sign in to enable push notifications." };

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, error: "Could not read push subscription keys." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint,
      user_id: user.id,
      p256dh,
      auth,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function disableWebPush() {
  if (!isWebPushSupported()) return { ok: true };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true };

  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }

  if (isSupabaseConfigured() && endpoint) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
  return { ok: true };
}
