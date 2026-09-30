#!/usr/bin/env node
"use strict";
/**
 * Update the completion program controller from executed evidence.
 *
 * Only fields backed by an artifact are written. Existing history is preserved:
 * this merges into program-state.json and never rewrites past wave verdicts.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const PROG = path.join(ROOT, "diagnostics-export", "completion-program");
const FINAL = path.join(ROOT, "diagnostics-export", "final-completion");
const STATE = path.join(PROG, "program-state.json");

const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

const state = readJson(STATE);
if (!state) {
  console.error(JSON.stringify({ ok: false, error: "program_state_unreadable", path: STATE }));
  process.exit(1);
}

const gate = (d) => readJson(path.join(PROG, d, "11-final-gate.json"));
const alpha = gate("alpha-final");
const beta = gate("beta-gate");
const prod = gate("production-gate");
const restart = readJson(path.join(FINAL, "installed-restart-reliability.json"));
const typeGate = readJson(path.join(FINAL, "app-typecheck-gate.json"));
const gapRegister = readJson(path.join(FINAL, "15-final-gap-register.json"));
const runtime = readJson(path.join(FINAL, "01-runtime-diagnostic.json"));
const sync = readJson(path.join(FINAL, "02-source-build-package-install-sync.json"));

const buildId = sync?.installedBuildId;
if (!buildId || buildId === "UNKNOWN") {
  console.error(JSON.stringify({ ok: false, error: "installed_build_id_unknown" }));
  process.exit(1);
}

const before = {
  currentBuild: state.currentBuild,
  alphaFinalGate: state.alphaFinalGate,
  betaGate: state.betaGate,
  productionGate: state.productionGate,
};

state.currentBuild = buildId;
state.currentWave = "FINAL-COMPLETION";
state.currentWaveTitle = "Installed boot/restart reliability + app typecheck closure";
state.lastUpdatedAt = new Date().toISOString();

if (alpha?.token) {
  state.alphaFinalGate = alpha.token;
  state.alphaFinalGateAt = alpha.at;
  state.alphaFinalGateProof = "diagnostics-export/completion-program/alpha-final/11-final-gate.json";
}
if (beta?.token) {
  state.betaGate = beta.token;
  state.betaGateAt = beta.at;
  state.betaGateProof = "diagnostics-export/completion-program/beta-gate/11-final-gate.json";
}
if (prod?.token) {
  state.productionGate = prod.token;
  state.productionGateAt = prod.at;
  state.productionGateProof = "diagnostics-export/completion-program/production-gate/11-final-gate.json";
}

/** Engineering-failure state is what this program can act on; external blockers are tracked separately. */
state.engineeringFailures = {
  betaGate: beta?.engineeringFail ?? "UNKNOWN",
  productionGate: prod?.engineeringFail ?? "UNKNOWN",
  // The alpha gate reports per-check results rather than a failed list.
  alphaFinalFailedChecks: alpha?.checks
    ? Object.entries(alpha.checks)
        .filter(([, v]) => String(v) !== "PASS")
        .map(([k, v]) => `${k}=${v}`)
    : "UNKNOWN",
};

state.lastSuccessfulProofs = {
  installedRestartReliability: restart?.token ?? "UNKNOWN",
  installedBootToSurfaceMs: restart?.readyMsSamples ?? "UNKNOWN",
  appTypecheckGate: typeGate?.token ?? "UNKNOWN",
  installedRuntimeVerdict: runtime?.controlPlane?.verdict ?? "UNKNOWN",
  sourceBuildPackageInstallSynchronized: sync?.synchronized ?? "UNKNOWN",
  at: new Date().toISOString(),
};

state.externalAndFounderBlockers = (gapRegister?.openGaps || [])
  .filter((g) => g.owner === "EXTERNAL" || g.owner === "FOUNDER")
  .map((g) => ({ id: g.id, impact: g.impact, owner: g.owner, nextAction: g.nextAction }));

state.openEngineeringGaps = (gapRegister?.openGaps || [])
  .filter((g) => g.owner !== "EXTERNAL" && g.owner !== "FOUNDER")
  .map((g) => ({ id: g.id, impact: g.impact, classification: g.classification }));

state.nextExactAction =
  "Resolve GAP-PG-PROBE-NONDETERMINISM (durable-adapter pg probe varies by import path), then gate smoke:ecl-dil. " +
  "Beta remains blocked on FD-001 (OIDC provider) and a reachable PostgreSQL (DATABASE_URL); production additionally on TLS termination and Target-C P1=0.";
state.nextWave = "B-011";

// P0..P3 are not edited here: counters change only when the underlying register changes.
state.registerCountsNote =
  "P0..P3 mirror the P1 register; they are not adjusted to produce a cleaner number. b-007 reports engineering-open P1 separately.";

fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");

console.log(
  JSON.stringify(
    {
      ok: true,
      before,
      after: {
        currentBuild: state.currentBuild,
        alphaFinalGate: state.alphaFinalGate,
        betaGate: state.betaGate,
        productionGate: state.productionGate,
        P0: state.P0,
        P1: state.P1,
      },
      engineeringFailures: state.engineeringFailures,
      openEngineeringGaps: state.openEngineeringGaps.length,
      externalAndFounderBlockers: state.externalAndFounderBlockers.length,
    },
    null,
    2
  )
);
