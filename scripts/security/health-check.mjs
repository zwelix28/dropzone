#!/usr/bin/env node
/**
 * Daily security health check for Dropzone.
 * Runs dependency audits, secret-pattern scans, Supabase RLS coverage, and env hygiene.
 *
 * Usage: node scripts/security/health-check.mjs [--json-only]
 * Exit: 0 = pass/warn only, 1 = fail (critical/high issues)
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const JSON_ONLY = process.argv.includes("--json-only");
const REPORT_PATH = process.env.SECURITY_REPORT_PATH || join(ROOT, "security-health-report.json");

const SCAN_DIRS = ["src", "server", "supabase"];
const SCAN_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".sql", ".json", ".toml", ".md", ".html"]);
const IGNORE_DIRS = new Set(["node_modules", "dist", ".git", "uploads"]);

const SECRET_PATTERNS = [
  { id: "aws_access_key", re: /AKIA[0-9A-Z]{16}/, severity: "critical" },
  { id: "github_pat", re: /ghp_[a-zA-Z0-9]{36,}/, severity: "critical" },
  { id: "github_oauth", re: /gho_[a-zA-Z0-9]{36,}/, severity: "critical" },
  { id: "slack_token", re: /xox[baprs]-[0-9a-zA-Z-]{10,}/, severity: "critical" },
  { id: "supabase_service_role", re: /service_role['"]?\s*[:=]\s*['"]?eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/i, severity: "critical" },
  { id: "jwt_like_secret", re: /(?:secret|private[_-]?key)\s*[:=]\s*['"]?eyJ[a-zA-Z0-9_-]{20,}/i, severity: "high" },
  { id: "generic_api_key", re: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9_\-]{24,}['"]/i, severity: "medium" },
];

const CLIENT_FORBIDDEN = [
  { id: "service_role_in_client", re: /SUPABASE_SERVICE_ROLE|service_role/i, severity: "critical" },
  { id: "mongodb_uri_in_client", re: /MONGODB_URI\s*=/i, severity: "high" },
];

function nowIso() {
  return new Date().toISOString();
}

function runNpmAudit(packageDir) {
  const label = relative(ROOT, packageDir) || ".";
  try {
    const raw = execSync("npm audit --json", {
      cwd: packageDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const data = JSON.parse(raw);
    const meta = data.metadata?.vulnerabilities ?? {};
    return {
      package: label,
      ok: (meta.critical ?? 0) + (meta.high ?? 0) === 0,
      counts: {
        critical: meta.critical ?? 0,
        high: meta.high ?? 0,
        moderate: meta.moderate ?? 0,
        low: meta.low ?? 0,
        total: meta.total ?? 0,
      },
      advisories: summarizeAdvisories(data),
    };
  } catch (err) {
    const stdout = err.stdout?.toString?.() ?? "";
    try {
      const data = JSON.parse(stdout);
      const meta = data.metadata?.vulnerabilities ?? {};
      return {
        package: label,
        ok: (meta.critical ?? 0) + (meta.high ?? 0) === 0,
        counts: {
          critical: meta.critical ?? 0,
          high: meta.high ?? 0,
          moderate: meta.moderate ?? 0,
          low: meta.low ?? 0,
          total: meta.total ?? 0,
        },
        advisories: summarizeAdvisories(data),
      };
    } catch {
      return {
        package: label,
        ok: false,
        error: err.message || String(err),
        counts: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
        advisories: [],
      };
    }
  }
}

function summarizeAdvisories(auditJson) {
  const vulns = auditJson.vulnerabilities ?? {};
  const out = [];
  for (const [name, v] of Object.entries(vulns)) {
    const via = Array.isArray(v.via) ? v.via.find((x) => typeof x === "object") : null;
    if (!via) continue;
    out.push({
      name,
      severity: v.severity,
      title: via.title,
      url: via.url,
    });
  }
  out.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  return out.slice(0, 15);
}

function severityRank(s) {
  return { critical: 4, high: 3, moderate: 2, low: 1, info: 0 }[s] ?? 0;
}

function walkFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkFiles(full, files);
    } else {
      const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
      if (SCAN_EXTENSIONS.has(ext)) files.push(full);
    }
  }
  return files;
}

function scanSecrets() {
  const findings = [];
  for (const dir of SCAN_DIRS) {
    const base = join(ROOT, dir);
    for (const file of walkFiles(base)) {
      const rel = relative(ROOT, file);
      if (rel.includes(".env") && !rel.endsWith(".example")) continue;
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/\.example|placeholder|YOUR_|your_|changeme|xxx/i.test(line)) continue;
        for (const pat of SECRET_PATTERNS) {
          if (pat.re.test(line)) {
            findings.push({
              type: "secret_pattern",
              id: pat.id,
              severity: pat.severity,
              file: rel,
              line: i + 1,
            });
          }
        }
        if (rel.startsWith("src/")) {
          for (const pat of CLIENT_FORBIDDEN) {
            if (pat.re.test(line)) {
              findings.push({
                type: "client_exposure",
                id: pat.id,
                severity: pat.severity,
                file: rel,
                line: i + 1,
              });
            }
          }
        }
      }
    }
  }
  return findings;
}

function checkEnvHygiene() {
  const findings = [];
  const trackedEnv = [".env", ".env.local", "server/.env"];
  for (const p of trackedEnv) {
    const full = join(ROOT, p);
    if (existsSync(full)) {
      findings.push({
        type: "env_hygiene",
        id: "env_file_present",
        severity: "high",
        message: `${p} exists locally — ensure it is gitignored and never committed`,
      });
    }
  }
  try {
    const tracked = execSync("git ls-files '*.env' '*.env.local' 'server/.env'", {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    if (tracked) {
      findings.push({
        type: "env_hygiene",
        id: "env_tracked_in_git",
        severity: "critical",
        message: `Environment files tracked in git: ${tracked}`,
      });
    }
  } catch {
    /* git not available or no matches */
  }
  return findings;
}

function checkSupabaseRls() {
  const sqlDir = join(ROOT, "supabase");
  if (!existsSync(sqlDir)) return { ok: true, tables: [], missingRls: [] };

  const tableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi;
  const rlsRe = /alter\s+table\s+public\.(\w+)\s+enable\s+row\s+level\s+security/gi;

  const tables = new Set();
  const withRls = new Set();

  for (const name of readdirSync(sqlDir)) {
    if (!name.endsWith(".sql")) continue;
    const text = readFileSync(join(sqlDir, name), "utf8");
    let m;
    while ((m = tableRe.exec(text))) tables.add(m[1]);
    while ((m = rlsRe.exec(text))) withRls.add(m[1]);
  }

  const missingRls = [...tables].filter((t) => !withRls.has(t)).sort();
  return {
    ok: missingRls.length === 0,
    tables: [...tables].sort(),
    missingRls,
  };
}

function overallStatus(checks) {
  const hasCritical =
    checks.audits.some((a) => (a.counts?.critical ?? 0) > 0) ||
    checks.secrets.some((f) => f.severity === "critical") ||
    checks.env.some((f) => f.severity === "critical");

  const hasHigh =
    checks.audits.some((a) => (a.counts?.high ?? 0) > 0) ||
    checks.secrets.some((f) => f.severity === "high") ||
    checks.env.some((f) => f.severity === "high") ||
    !checks.rls.ok;

  if (hasCritical || hasHigh) return "fail";
  const hasModerate =
    checks.audits.some((a) => (a.counts?.moderate ?? 0) > 0) ||
    checks.secrets.some((f) => f.severity === "moderate" || f.severity === "medium");
  if (hasModerate) return "warn";
  return "pass";
}

function formatMarkdown(report) {
  const lines = [
    `# Security health check — ${report.project}`,
    ``,
    `**When:** ${report.timestamp}`,
    `**Status:** ${report.status.toUpperCase()}`,
    ``,
    `## Dependency audit`,
  ];
  for (const a of report.checks.audits) {
    const c = a.counts;
    lines.push(
      `- **${a.package}**: critical ${c.critical}, high ${c.high}, moderate ${c.moderate}, low ${c.low}` +
        (a.advisories?.length ? ` (${a.advisories.length} top advisories)` : "")
    );
    for (const adv of a.advisories ?? []) {
      lines.push(`  - [${adv.severity}] ${adv.name}: ${adv.title}`);
    }
    if (a.error) lines.push(`  - Error: ${a.error}`);
  }

  lines.push(``, `## Supabase RLS`);
  if (report.checks.rls.ok) {
    lines.push(`- All ${report.checks.rls.tables.length} tables in SQL migrations have RLS enabled.`);
  } else {
    lines.push(`- **Missing RLS:** ${report.checks.rls.missingRls.join(", ")}`);
  }

  lines.push(``, `## Secret / exposure scan`);
  if (report.checks.secrets.length === 0 && report.checks.env.length === 0) {
    lines.push(`- No suspicious patterns detected.`);
  } else {
    for (const f of [...report.checks.secrets, ...report.checks.env]) {
      const loc = f.file ? `${f.file}:${f.line}` : "";
      lines.push(`- [${f.severity}] ${f.id}${loc ? ` (${loc})` : ""}${f.message ? `: ${f.message}` : ""}`);
    }
  }

  lines.push(``, `---`, `Run locally: \`npm run security:check\``);
  return lines.join("\n");
}

function main() {
  const packageDirs = [ROOT, join(ROOT, "server")].filter((d) => existsSync(join(d, "package.json")));

  const audits = packageDirs.map(runNpmAudit);
  const secrets = scanSecrets();
  const env = checkEnvHygiene();
  const rls = checkSupabaseRls();

  const checks = { audits, secrets, env, rls };
  const status = overallStatus(checks);

  const report = {
    project: "dropzone",
    timestamp: nowIso(),
    status,
    checks,
    summary: {
      auditCritical: audits.reduce((n, a) => n + (a.counts?.critical ?? 0), 0),
      auditHigh: audits.reduce((n, a) => n + (a.counts?.high ?? 0), 0),
      auditModerate: audits.reduce((n, a) => n + (a.counts?.moderate ?? 0), 0),
      secretFindings: secrets.length + env.length,
      rlsMissing: rls.missingRls.length,
    },
    markdown: "",
  };
  report.markdown = formatMarkdown(report);

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  if (!JSON_ONLY) {
    console.log(report.markdown);
    console.log(`\nReport written to ${relative(ROOT, REPORT_PATH)}`);
  } else {
    console.log(JSON.stringify(report));
  }

  process.exit(status === "fail" ? 1 : 0);
}

main();
