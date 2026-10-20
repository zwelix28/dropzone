/**
 * notify-delivery Edge Function
 *
 * Invoked by a Supabase Database Webhook on INSERT into public.notifications.
 * For type = new_mix:
 *   - email via Resend (if profile.notify_email_new_mix)
 *   - web push (if profile.notify_push_new_mix and subscriptions exist)
 *
 * Deploy:  supabase functions deploy notify-delivery --no-verify-jwt
 * Secrets:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY, EMAIL_FROM (e.g. Deep House Lab <notify@yourdomain.com>)
 *   PUBLIC_SITE_URL (e.g. https://your-app.netlify.app)
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@domain.com)
 *   NOTIFY_WEBHOOK_SECRET (REQUIRED — shared with Database Webhook header x-notify-secret)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SITE_URL = () => (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/$/, "");
const EMAIL_FROM = () => Deno.env.get("EMAIL_FROM") ?? "";
const RESEND_KEY = () => Deno.env.get("RESEND_API_KEY") ?? "";
const WEBHOOK_SECRET = () => (Deno.env.get("NOTIFY_WEBHOOK_SECRET") ?? "").trim();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  episode_id: string | null;
  meta: Record<string, unknown> | null;
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notify-secret",
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

/** Only allow same-origin relative app paths (blocks phishing absolute URLs). */
function safeAppHref(href: string | null) {
  const raw = (href || "/").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (/[\s"'<>\\]/.test(raw)) return "/";
  const base = SITE_URL();
  if (!base) return raw;
  try {
    const url = new URL(raw, `${base}/`);
    if (url.origin !== new URL(base).origin) return base;
    return url.toString();
  } catch {
    return base;
  }
}

function extractNotificationId(body: Record<string, unknown>): string | null {
  if (typeof body.notification_id === "string" && UUID_RE.test(body.notification_id.trim())) {
    return body.notification_id.trim();
  }
  const record = body.record;
  if (record && typeof record === "object" && !Array.isArray(record)) {
    const id = (record as { id?: unknown }).id;
    if (typeof id === "string" && UUID_RE.test(id.trim())) return id.trim();
  }
  return null;
}

async function loadNotification(id: string): Promise<NotificationRow | null> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, message, href, episode_id, meta")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as NotificationRow | null) ?? null;
}

async function sendEmail(to: string, title: string, message: string, href: string) {
  const key = RESEND_KEY();
  const from = EMAIL_FROM();
  if (!key || !from || !to) return { ok: false, reason: "email_not_configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: title,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#0f172a">
          <h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>
          <p style="margin:0 0 16px">${escapeHtml(message)}</p>
          <p style="margin:0 0 24px">
            <a href="${escapeHtml(href)}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">
              Open mix
            </a>
          </p>
          <p style="margin:0;font-size:12px;color:#64748b">Deep House Lab</p>
        </div>
      `,
      text: `${title}\n\n${message}\n\n${href}\n`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("resend error", res.status, body);
    return { ok: false, reason: `resend_${res.status}` };
  }
  return { ok: true };
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendPush(
  userId: string,
  title: string,
  message: string,
  href: string,
) {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@localhost";
  if (!publicKey || !privateKey) return { ok: false, reason: "vapid_not_configured", sent: 0 };

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    console.error("push_subscriptions select", error.message);
    return { ok: false, reason: error.message, sent: 0 };
  }
  if (!subs?.length) return { ok: true, reason: "no_subscriptions", sent: 0 };

  const payload = JSON.stringify({
    title,
    body: message,
    href,
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      console.error("web-push error", status, err);
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }
  return { ok: true, sent };
}

async function deliver(notification: NotificationRow) {
  if (notification.type !== "new_mix") {
    return { skipped: true, reason: "type_not_new_mix" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("notify_email_new_mix, notify_push_new_mix, is_banned")
    .eq("id", notification.user_id)
    .maybeSingle();

  if (!profile || profile.is_banned) {
    return { skipped: true, reason: "user_unavailable" };
  }

  const href = safeAppHref(notification.href);
  const results: Record<string, unknown> = {};

  if (profile.notify_email_new_mix !== false) {
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(
      notification.user_id,
    );
    if (userErr) {
      results.email = { ok: false, reason: userErr.message };
    } else {
      const email = userData.user?.email ?? "";
      results.email = await sendEmail(email, notification.title, notification.message, href);
    }
  } else {
    results.email = { skipped: true, reason: "pref_off" };
  }

  if (profile.notify_push_new_mix !== false) {
    results.push = await sendPush(
      notification.user_id,
      notification.title,
      notification.message,
      href,
    );
  } else {
    results.push = { skipped: true, reason: "pref_off" };
  }

  // Idempotency / audit marker on the notification row
  await supabase
    .from("notifications")
    .update({
      meta: {
        ...(notification.meta || {}),
        delivery: {
          ...(typeof notification.meta?.delivery === "object" && notification.meta?.delivery
            ? (notification.meta.delivery as Record<string, unknown>)
            : {}),
          ...results,
          at: new Date().toISOString(),
        },
      },
    })
    .eq("id", notification.id);

  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
  }

  // Fail closed: --no-verify-jwt is only safe when a shared secret is configured.
  const secret = WEBHOOK_SECRET();
  if (!secret) {
    console.error("NOTIFY_WEBHOOK_SECRET is not set");
    return jsonResponse({ error: "Server misconfigured" }, 503);
  }
  const provided = req.headers.get("x-notify-secret") ?? "";
  if (provided !== secret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  try {
    const notificationId = extractNotificationId(body);
    if (!notificationId) {
      return jsonResponse({ error: "notification id required" }, 400);
    }

    // Never trust webhook body fields for delivery — reload from DB.
    const notification = await loadNotification(notificationId);
    if (!notification?.id) {
      return jsonResponse({ error: "notification not found" }, 404);
    }

    const already = (notification.meta as { delivery?: { at?: string } } | null)?.delivery?.at;
    if (already) {
      return jsonResponse({ ok: true, skipped: "already_delivered" });
    }

    const results = await deliver(notification);
    return jsonResponse({ ok: true, results });
  } catch (err) {
    console.error("notify-delivery", err);
    return jsonResponse({ error: (err as Error)?.message ?? "failed" }, 500);
  }
});
