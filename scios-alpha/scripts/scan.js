#!/usr/bin/env node
"use strict";

/**
 * orchestrator:scan
 * Input:  diagnostics-export/orchestrator/filtered.json
 * Output: diagnostics-export/orchestrator/scans/report.json
 *
 * For each repo: license-checker + npm audit (sandbox clones only).
 */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const {
  ROOT,
  OUT_DIR,
  readJson,
  writeJson,
  repoSandboxRel,
} = require("./orchestrator/lib.cjs");

const filtered = readJson(path.join(OUT_DIR, "filtered.json"));
if (!filtered) {
  console.error(JSON.stringify({ step: "scan", ok: false, error: "run orchestrator:filter first" }));
  process.exit(1);
}

const repos = filtered.candidates ?? [];
const scansDir = path.join(OUT_DIR, "scans");
fs.mkdirSync(scansDir, { recursive: true });

function runLicenseChecker(repoAbs) {
  const out = execSync(`npx --yes license-checker --json --start "${repoAbs}"`, {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true,
  });
  return JSON.parse(out);
}

function runNpmAudit(repoAbs) {
  const out = execSync("npm audit --json", {
    cwd: repoAbs,
    stdio: "pipe",
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true,
  });
  return JSON.parse(out);
}

function auditSummary(audit) {
  if (!audit || typeof audit !== "object") return null;
  const meta = audit.metadata?.vulnerabilities ?? audit.vulnerabilities ?? null;
  return meta;
}

const report = [];

for (const r of repos) {
  const rel = repoSandboxRel(r.name);
  const repoAbs = path.join(ROOT, rel);
  const entry = {
    repo: r.name,
    url: r.url,
    path: rel,
    license: r.license,
    stars: r.stars,
  };

  if (!fs.existsSync(repoAbs)) {
    report.push({
      ...entry,
      status: "NEEDS_CLONE",
      error: `missing sandbox clone at ${rel}`,
    });
    continue;
  }

  try {
    let licenseSummary = null;
    try {
      licenseSummary = runLicenseChecker(repoAbs);
    } catch (err) {
      licenseSummary = { error: err.message };
    }

    let audit = null;
    let auditErr = null;
    if (fs.existsSync(path.join(repoAbs, "package.json"))) {
      try {
        audit = runNpmAudit(repoAbs);
      } catch (err) {
        auditErr = err.message;
        const stdout = err.stdout?.toString?.() ?? "";
        if (stdout) {
          try {
            audit = JSON.parse(stdout);
          } catch {
            /* keep auditErr */
          }
        }
      }
    }

    report.push({
      ...entry,
      status: "SCANNED",
      licenseSummary,
      audit,
      auditSummary: auditSummary(audit),
      auditError: auditErr,
    });
  } catch (e) {
    report.push({
      ...entry,
      status: "ERROR",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

const reportPath = path.join(scansDir, "report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

const summary = {
  at: new Date().toISOString(),
  source: "filtered.json",
  sandboxRoot: "sandbox/public_repos",
  reportPath: path.relative(ROOT, reportPath).replace(/\\/g, "/"),
  repos: report.length,
  scanned: report.filter((x) => x.status === "SCANNED").length,
  needsClone: report.filter((x) => x.status === "NEEDS_CLONE").length,
  errors: report.filter((x) => x.status === "ERROR").length,
  label: "ALPHA_NON_PRODUCTION",
  scans: report,
};

const file = writeJson("scan.json", summary);
console.log(
  JSON.stringify(
    {
      step: "scan",
      ok: true,
      file,
      report: summary.reportPath,
      repos: summary.repos,
      scanned: summary.scanned,
      needsClone: summary.needsClone,
    },
    null,
    2
  )
);
