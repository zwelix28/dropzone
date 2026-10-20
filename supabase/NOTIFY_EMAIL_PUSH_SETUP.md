# New mix email + push notifications

Hooks into existing `notifications` rows (`type = new_mix`). When a mix is approved / published, every approved listener gets an in-app notification; this pipeline also sends **email** (Resend) and **Web Push**.

## 1. SQL

Run in Supabase SQL Editor:

`supabase/notify-email-push.sql`

## 2. Resend (email)

1. Create a [Resend](https://resend.com) account and verify your sending domain.
2. Create an API key.

## 3. VAPID keys (push)

```bash
npx web-push generate-vapid-keys
```

- Put the **public** key in Netlify / `.env` as `VITE_VAPID_PUBLIC_KEY`
- Put public + private on the edge function (below)

## 4. Edge function secrets

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxx \
  EMAIL_FROM="Deep House Lab <notify@yourdomain.com>" \
  PUBLIC_SITE_URL=https://your-app.netlify.app \
  VAPID_PUBLIC_KEY=BNxxx \
  VAPID_PRIVATE_KEY=xxx \
  VAPID_SUBJECT=mailto:you@yourdomain.com \
  NOTIFY_WEBHOOK_SECRET=long-random-string
```

`NOTIFY_WEBHOOK_SECRET` is **required**. If it is missing, the function returns `503` and will not send email/push.

Deploy (skip JWT so the Database Webhook can call it — auth is the shared secret header):

```bash
supabase functions deploy notify-delivery --no-verify-jwt
```

## 5. Database Webhook

Supabase Dashboard → **Database → Webhooks → Create**:

| Field | Value |
|-------|--------|
| Table | `notifications` |
| Events | `INSERT` |
| Type | HTTP Request |
| Method | POST |
| URL | `https://YOUR_PROJECT.supabase.co/functions/v1/notify-delivery` |
| Headers | `Content-Type: application/json` |
| | `Authorization: Bearer YOUR_ANON_KEY` (or service role) |
| | `x-notify-secret: long-random-string` (same as `NOTIFY_WEBHOOK_SECRET`) |

## 6. Client env

```env
VITE_VAPID_PUBLIC_KEY=BNxxx
```

Redeploy the frontend after setting this.

## 7. User setup

In the app: **Settings → New mix alerts**

- Toggle email / push prefs
- Tap **Enable on this device** (requires HTTPS or installed PWA; LAN `http://` will not work)

## Notes

- Guests do not receive alerts (no account email / push subscription).
- Push works best when the app is installed (Add to Home Screen) on Android Chrome; iOS requires a recent iOS + installed PWA.
- Delivery is idempotent via `notifications.meta.delivery.at`.
