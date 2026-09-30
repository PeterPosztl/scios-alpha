#!/usr/bin/env node
"use strict";

/**
 * scripts/generate-signoff.js
 * Output: diagnostics-export/p0-startup-signoff.json
 *
 * Evidence-first — never hardcode PASS/true without artifacts or live probes.
 * Label: ALPHA_NON_PRODUCTION
 */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { execSync } = require("node:child_process");

const ROOT = process.cwd();
const DIAG = path.join(ROOT, "diagnostics-export");
const OUT_PATH = path.join(DIAG, "p0-startup-signoff.json");

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "UNAVAILABLE";
  }
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readJson(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function httpGet(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", () => resolve(0));
    req.on("timeout", () => {
      req.destroy();
      resolve(0);
    });
  });
}

function resolvePorts() {
  const report = readJson("diagnostics-export/startup-report.json");
  const api =
    Number(process.env.PORT) ||
    report?.configuration?.redactedConfig?.apiPort ||
    3000;
  const cockpit =
    Number(process.env.SCIOS_COCKPIT_PORT) ||
    report?.configuration?.redactedConfig?.cockpitPort ||
    4000;
  return { api, cockpit };
}

(async () => {
  const now = new Date().toISOString();
  const sha = gitSha();
  const ports = resolvePorts();

  const startupProofArtifact =
    exists("diagnostics-export/startup-proof.json") ||
    exists("diagnostics-export/convergence/startup-convergence-proof.json") ||
    exists("diagnostics-export/startup-report.json");

  const scorecard = readJson("diagnostics-export/p0-startup-scorecard.json");
  const dual = readJson("diagnostics-export/dual-startup-evidence.json");
  const gateReport = readJson(
    "diagnostics-export/convergence/startup-convergence-gate-report.json"
  );
  const startupReport = readJson("diagnostics-export/startup-report.json");
  const convergence = readJson(
    "diagnostics-export/convergence/startup-convergence-proof.json"
  );

  const [backendHz, cockpitHz] = await Promise.all([
    httpGet(`http://127.0.0.1:${ports.api}/healthz`),
    httpGet(`http://127.0.0.1:${ports.cockpit}/healthz`),
  ]);

  const verticalSliceCode = exists(
    "packages/vertical-slice/src/pipeline.ts"
  );
  const verticalSliceSmoke =
    exists("packages/vertical-slice/src/boot-smoke.ts") &&
    (startupReport?.recoveryAttempts ?? []).some(
      (a) => a.action === "vertical-slice-smoke" && a.exitCode === 0
    );

  const dualAutonomous =
    dual?.autonomous === true ||
    gateReport?.autonomous === true ||
    scorecard?.verdict === "PASS";

  const startupProof =
    startupProofArtifact &&
    (startupReport?.verdict === "READY" ||
      startupReport?.verdict === "DEGRADED" ||
      convergence?.verdict === "STARTUP_CONVERGED_READY" ||
      convergence?.verdict === "STARTUP_CONVERGED_DEGRADED" ||
      scorecard?.verdict === "PASS" ||
      dualAutonomous);

  const cockpitLive = cockpitHz === 200;
  const backendLive = backendHz === 200;
  // After dual-startup gate, orderly shutdown leaves ports down by design —
  // accept proven cockpit from dual evidence / scorecard instead of requiring live.
  const cockpitProven =
    cockpitLive ||
    dual?.second?.live?.cockpitHealth === true ||
    dual?.first?.live?.cockpitHealth === true ||
    (scorecard?.rows || []).some(
      (r) =>
        (r.id === "cockpit_health" || r.id === "second_cockpit_200") && r.pass
    );

  const system = {
    startupProof: !!startupProof,
    verticalSlice:
      verticalSliceCode &&
      (verticalSliceSmoke || backendLive || dualAutonomous),
    cockpit: !!cockpitProven,
  };

  const allOk =
    system.startupProof && system.verticalSlice && system.cockpit;

  const overall =
    allOk &&
    (startupReport?.verdict === "READY" || dual?.verdict === "STARTUP_CONVERGED_READY")
      ? "PASS"
      : allOk
        ? "DEGRADED_PASS"
        : "FAIL";

  const health = {
    timestamp: now,
    gitSHA: sha,
    gate: "p0-startup-acceptance",
    profile: process.env.SCI_RUNTIME_PROFILE || "local-foundation",
    verdict: overall,
    label: "ALPHA_NON_PRODUCTION",
    system,
    evidence: {
      startupReportVerdict: startupReport?.verdict ?? null,
      scorecard: scorecard
        ? { display: scorecard.display, verdict: scorecard.verdict }
        : null,
      dualAutonomous: !!dualAutonomous,
      dualVerdict: dual?.verdict ?? null,
      convergenceVerdict: convergence?.verdict ?? null,
      probes: {
        backendHealthz: backendHz,
        cockpitHealthz: cockpitHz,
        apiPort: ports.api,
        cockpitPort: ports.cockpit,
        note:
          !cockpitLive && cockpitProven
            ? "cockpit proven during dual-startup then orderly stopped"
            : null,
      },
      artifacts: {
        startupProof: exists("diagnostics-export/startup-proof.json"),
        startupReport: exists("diagnostics-export/startup-report.json"),
        scorecard: exists("diagnostics-export/p0-startup-scorecard.json"),
        dualStartup: exists("diagnostics-export/dual-startup-evidence.json"),
        verticalSlicePipeline: verticalSliceCode,
      },
    },
    note:
      overall === "PASS"
        ? "All system flags true with READY startup evidence"
        : overall === "DEGRADED_PASS"
          ? "Core flags true but startup not READY (infra optional / DEGRADED); dual consecutive startups may be proven"
          : "One or more system flags false — no silent PASS",
  };

  fs.mkdirSync(DIAG, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(health, null, 2));
  console.log(
    JSON.stringify(
      {
        step: "generate-signoff",
        ok: overall !== "FAIL",
        outPath: path.relative(ROOT, OUT_PATH).replace(/\\/g, "/"),
        verdict: overall,
        system,
        gitSHA: sha,
      },
      null,
      2
    )
  );
  process.exit(overall === "FAIL" ? 1 : 0);
})().catch((err) => {
  console.error(
    JSON.stringify({
      step: "generate-signoff",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    })
  );
  process.exit(1);
});
