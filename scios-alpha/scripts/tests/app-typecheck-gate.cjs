#!/usr/bin/env node
"use strict";
/**
 * App typecheck gate.
 *
 * `pnpm build` only runs tsc across ./packages/**, and packaging uses esbuild,
 * which strips types without checking them. Apps were therefore never
 * typechecked by any gate, which let 75 errors accumulate in
 * apps/control-plane-api — including a job-recovery result that omitted
 * `reconciled` on its transition branch and a session read that would throw on
 * a persisted session lacking `recent`.
 *
 * Also verifies the generated declarations for the plain-JS workspace packages
 * are current, since stale ones silently reintroduce implicit `any` across the
 * Product Kernel boundary.
 *
 * Evidence: diagnostics-export/final-completion/app-typecheck-gate.json
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const APPS_DIR = path.join(ROOT, "apps");
const TSC_BIN = require.resolve("typescript/bin/tsc", { paths: [ROOT] });

function discoverApps() {
  return fs
    .readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(APPS_DIR, e.name, "tsconfig.json")))
    .map((e) => e.name)
    .sort();
}

function typecheck(appDir) {
  const res = spawnSync(process.execPath, [TSC_BIN, "-p", "tsconfig.json", "--noEmit"], {
    cwd: appDir,
    encoding: "utf8",
    windowsHide: true,
    timeout: 600000,
  });
  const out = ((res.stdout || "") + (res.stderr || "")).split(/\r?\n/);
  const errors = out.filter((l) => /error TS\d+/.test(l));
  return { exit: res.status, errorCount: errors.length, errors: errors.slice(0, 25) };
}

const report = {
  schema: "sci-os-app-typecheck-gate/v1",
  label: "ALPHA_NON_PRODUCTION",
  at: new Date().toISOString(),
  note: "Apps are not covered by `pnpm build` (packages only) and esbuild does not typecheck.",
  apps: [],
  packageDeclarations: null,
  status: "PASS",
};

for (const app of discoverApps()) {
  const r = typecheck(path.join(APPS_DIR, app));
  const entry = { app, ...r, status: r.exit === 0 && r.errorCount === 0 ? "PASS" : "FAIL" };
  if (entry.status !== "PASS") report.status = "FAIL";
  report.apps.push(entry);
}

const decl = spawnSync(
  process.execPath,
  [path.join(ROOT, "scripts/dev/generate-package-types.cjs"), "--check"],
  { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 600000 }
);
report.packageDeclarations = {
  exit: decl.status,
  status: decl.status === 0 ? "PASS" : "FAIL",
  detail: (decl.stdout || "").trim().slice(0, 500),
};
if (decl.status !== 0) report.status = "FAIL";

report.token = report.status === "PASS" ? "APP_TYPECHECK_GATE_PASS" : "APP_TYPECHECK_GATE_FAIL";

const outDir = path.join(ROOT, "diagnostics-export", "final-completion");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "app-typecheck-gate.json"),
  JSON.stringify(report, null, 2) + "\n"
);

console.log(
  JSON.stringify({
    ok: report.status === "PASS",
    token: report.token,
    apps: report.apps.map((a) => ({ app: a.app, errors: a.errorCount })),
    packageDeclarations: report.packageDeclarations.status,
  })
);
process.exit(report.status === "PASS" ? 0 : 1);
