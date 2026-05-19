#!/usr/bin/env node
/**
 * Send security health report to Slack and/or email.
 *
 * Slack:  SLACK_WEBHOOK_URL
 * Email:  SECURITY_REPORT_EMAIL_TO (required for email)
 *         plus one of:
 *           - SENDGRID_API_KEY + SECURITY_REPORT_EMAIL_FROM
 *           - RESEND_API_KEY + SECURITY_REPORT_EMAIL_FROM
 *
 * Usage: node scripts/security/notify.mjs [path-to-report.json]
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const reportPath = process.argv[2] || process.env.SECURITY_REPORT_PATH || join(ROOT, "security-health-report.json");

if (!existsSync(reportPath)) {
  console.error(`Report not found: ${reportPath}. Run health-check first.`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));

const statusEmoji = { pass: "✅", warn: "⚠️", fail: "🚨" }[report.status] ?? "ℹ️";
const repo = process.env.GITHUB_REPOSITORY || "dropzone";
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : null;

function slackPayload() {
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `${statusEmoji} Daily security health — ${report.status.toUpperCase()}` },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Project*\n${report.project}` },
        { type: "mrkdwn", text: `*When*\n${report.timestamp}` },
        {
          type: "mrkdwn",
          text: `*Vulns*\ncritical ${report.summary.auditCritical}, high ${report.summary.auditHigh}, moderate ${report.summary.auditModerate}`,
        },
        {
          type: "mrkdwn",
          text: `*Other*\n${report.summary.secretFindings} secret/env flags, ${report.summary.rlsMissing} RLS gaps`,
        },
      ],
    },
  ];

  const advisoryLines = [];
  for (const a of report.checks.audits) {
    for (const adv of (a.advisories ?? []).slice(0, 3)) {
      advisoryLines.push(`• [${adv.severity}] ${adv.name}: ${adv.title}`);
    }
  }
  if (advisoryLines.length) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Top advisories*\n${advisoryLines.join("\n")}` },
    });
  }

  if (report.checks.rls.missingRls?.length) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Supabase tables without RLS in migrations:* ${report.checks.rls.missingRls.join(", ")}`,
      },
    });
  }

  if (runUrl) {
    blocks.push({
      type: "actions",
      elements: [{ type: "button", text: { type: "plain_text", text: "View workflow run" }, url: runUrl }],
    });
  }

  return { blocks, text: `Security health: ${report.status}` };
}

async function sendSlack() {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { channel: "slack", skipped: true };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slackPayload()),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook failed (${res.status}): ${body}`);
  }
  return { channel: "slack", ok: true };
}

async function sendViaSendGrid(to, from, subject, text) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return null;

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: "text/plain", value: text }],
    }),
  });
  if (!res.ok) {
    throw new Error(`SendGrid failed (${res.status}): ${await res.text()}`);
  }
  return "sendgrid";
}

async function sendViaResend(to, from, subject, text) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) {
    throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
  }
  return "resend";
}

async function sendEmail() {
  const to = process.env.SECURITY_REPORT_EMAIL_TO;
  if (!to) return { channel: "email", skipped: true };

  const from = process.env.SECURITY_REPORT_EMAIL_FROM;
  if (!from) {
    throw new Error("SECURITY_REPORT_EMAIL_FROM is required when SECURITY_REPORT_EMAIL_TO is set");
  }

  const subject = `[${repo}] Security health ${report.status.toUpperCase()} — ${report.timestamp.slice(0, 10)}`;
  const text = `${report.markdown}\n\n${runUrl ? `Workflow: ${runUrl}\n` : ""}`;

  const provider =
    (await sendViaSendGrid(to, from, subject, text)) ||
    (await sendViaResend(to, from, subject, text));

  if (!provider) {
    throw new Error(
      "Email requested but no provider configured. Set SENDGRID_API_KEY or RESEND_API_KEY (and SECURITY_REPORT_EMAIL_FROM)."
    );
  }
  return { channel: "email", ok: true, provider };
}

async function main() {
  const results = [];
  const wantSlack = Boolean(process.env.SLACK_WEBHOOK_URL);
  const wantEmail = Boolean(process.env.SECURITY_REPORT_EMAIL_TO);

  if (!wantSlack && !wantEmail) {
    console.warn(
      "No notification channels configured. Set SLACK_WEBHOOK_URL and/or SECURITY_REPORT_EMAIL_TO (+ email provider keys)."
    );
    process.exit(0);
  }

  if (wantSlack) results.push(await sendSlack());
  if (wantEmail) results.push(await sendEmail());

  console.log(JSON.stringify({ notified: results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
