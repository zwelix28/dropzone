# Daily security health checks

Automated checks run every day (and on demand) to catch dependency vulnerabilities, accidental secret commits, and missing Supabase RLS before they become incidents.

## What runs

| Check | Description |
|-------|-------------|
| **npm audit** | Root app and `server/` API (`npm ci` then audit) |
| **Secret patterns** | Scans `src/`, `server/`, `supabase/` for common leaked tokens |
| **Client exposure** | Flags `service_role` or server secrets referenced in frontend code |
| **Env hygiene** | Ensures `.env` / `.env.local` are not tracked in git |
| **Supabase RLS** | Tables created in `supabase/*.sql` should have `enable row level security` |

Results are written to `security-health-report.json` (gitignored). Status is **pass**, **warn** (moderate issues only), or **fail** (critical/high).

## Run locally

```bash
npm run security:check
```

Optional notification (requires env vars below):

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
npm run security:check && npm run security:notify
```

## GitHub Actions (recommended for daily runs)

Workflow: [`.github/workflows/daily-security-health.yml`](../.github/workflows/daily-security-health.yml)

- **Schedule:** 08:00 UTC daily
- **Manual:** Actions → *Daily security health* → *Run workflow*

### Repository secrets

Add under **Settings → Secrets and variables → Actions**:

#### Slack (easiest)

| Secret | Value |
|--------|--------|
| `SLACK_WEBHOOK_URL` | [Incoming Webhook](https://api.slack.com/messaging/webhooks) URL for your channel |

#### Email via SendGrid or Resend

| Secret | Value |
|--------|--------|
| `SECURITY_REPORT_EMAIL_TO` | Your email address |
| `SECURITY_REPORT_EMAIL_FROM` | Verified sender (e.g. `security@yourdomain.com`) |
| `SENDGRID_API_KEY` *or* `RESEND_API_KEY` | API key from your provider |

#### Email via SMTP (optional)

Set repository **variable** `SECURITY_USE_SMTP` = `true`, then add:

| Secret | Value |
|--------|--------|
| `SMTP_SERVER` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | e.g. `587` |
| `SMTP_USERNAME` | SMTP user |
| `SMTP_PASSWORD` | App password or SMTP password |
| `SECURITY_REPORT_EMAIL_TO` | Recipient |
| `SECURITY_REPORT_EMAIL_FROM` | From address |

You can use Slack only, email only, or both. If no notification secrets are set, the workflow still runs checks and uploads a 30-day artifact.

## Cursor Cloud Agent (optional)

To have a Cursor agent review failures or open fix PRs when checks fail, create a scheduled Cloud Agent in the Cursor dashboard that:

1. Triggers after the GitHub workflow fails (via webhook or daily schedule).
2. Uses the prompt: *“Read the latest security-health artifact or run `npm run security:check`. Fix critical/high npm audit issues and document anything that needs manual Supabase dashboard changes.”*

The workflow and scripts in this repo are the source of truth; the agent augments remediation, not the schedule itself.

## Tuning

- Edit `scripts/security/health-check.mjs` to add scan paths or patterns.
- Change cron in the workflow file for a different time zone (cron is UTC).
- Moderate-only audit findings (e.g. dev-only `esbuild`) produce **warn** and do not fail the workflow.
