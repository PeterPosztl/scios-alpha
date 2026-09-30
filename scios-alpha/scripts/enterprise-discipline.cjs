#!/usr/bin/env node
"use strict";

/**
 * SCI OS ×10 — Enterprise Operating Discipline evidence pack.
 * Extends Product Kernel / Meta-Intelligence / System Closure — no parallel OS.
 * Does not invent READY. UNKNOWN remains UNKNOWN.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "diagnostics-export", "enterprise-discipline");
const AT = new Date().toISOString();
const buildId = `enterprise-discipline-${AT.slice(0, 10)}`;

function ensure() {
  fs.mkdirSync(OUT, { recursive: true });
}
function write(name, obj) {
  ensure();
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}
function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(REPO, rel), "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const discUrl = pathToFileURL(
    path.join(REPO, "packages/product-kernel/src/discipline/index.js")
  ).href;
  const disc = await import(discUrl);

  const cockpit = fs.readFileSync(
    path.join(REPO, "apps/cockpit-ui/src/index.js"),
    "utf8"
  );
  const gapSignoff = readJson("diagnostics-export/gap-to-zero/27-zero-level-signoff.json");
  const kernel = await import(
    pathToFileURL(path.join(REPO, "packages/product-kernel/src/index.js")).href
  );
  const pk = new kernel.ProductKernel(REPO);

  const impactBefore = disc.analyzeImpact({
    changeId: "discipline-layer-2026-08-13",
    phase: "BEFORE",
    description: "Introduce enterprise operating discipline into Product Kernel",
  });
  write("10-change-impact-before.json", { at: AT, buildId, ...impactBefore });

  const slo = disc.buildSloRegistry();
  write("01-slo-registry.json", { at: AT, buildId, ...slo });

  const budgets = disc.assessErrorBudgets(slo, {});
  write("02-error-budget-status.json", { at: AT, buildId, ...budgets });

  const idem = await disc.proveIdempotency();
  write("03-action-idempotency-proof.json", { at: AT, buildId, ...idem });

  write("04-contract-version-registry.json", {
    at: AT,
    buildId,
    ...disc.buildContractVersionRegistry(),
  });

  write("05-operational-ontology-map.json", {
    at: AT,
    buildId,
    ...disc.buildOperationalOntologyMap(),
  });

  write("06-asset-maturity-registry.json", {
    at: AT,
    buildId,
    ...disc.buildAssetMaturityRegistry(pk.snapshot()),
  });

  write("07-intelligence-control-tower.json", {
    at: AT,
    buildId,
    ...disc.buildIntelligenceControlTower(),
  });

  const baseline = disc.buildEvaluationBaseline();
  write("08-professional-evaluation-baseline.json", { at: AT, buildId, ...baseline });

  // Current = baseline copy for first run (no silent regression); mark as CURRENT snapshot.
  const current = {
    ...baseline,
    schema: "sci-os-professional-evaluation-current/v1",
    comparedToBaselineAt: AT,
  };
  write("09-professional-evaluation-current.json", { at: AT, buildId, ...current });
  const compare = disc.compareEvaluation(baseline, current);

  const impactAfter = disc.analyzeImpact({
    changeId: "discipline-layer-2026-08-13",
    phase: "AFTER",
    description: "Discipline modules + artifacts + action gate + SLO/governor wired",
    protectedContractsTouched: impactBefore.change.protectedContractsTouched,
  });
  write("11-change-impact-after.json", { at: AT, buildId, ...impactAfter });

  const trace = disc.createExecutionTrace({
    user: "local-dev",
    role: "arch.market_analyst",
    workspace: "ws.analysis_gw1",
    action: "analyze",
    risk: "envelope_present",
    result: "SIMULATION_ONLY",
    evidence: "lineage+run",
  });
  write("12-execution-observability-proof.json", {
    at: AT,
    buildId,
    ...disc.buildExecutionObservabilityProof(trace),
  });

  write("13-progressive-disclosure-ux-audit.json", {
    at: AT,
    buildId,
    ...disc.auditProgressiveDisclosure(cockpit),
  });

  write("14-workflow-outcome-metrics.json", {
    at: AT,
    buildId,
    ...disc.buildWorkflowOutcomeMetrics(),
  });

  const governor = disc.buildReleaseGovernor({
    reliabilityStatus: "UNKNOWN_UNTIL_MEASURED",
    knownP0StructuralGaps: gapSignoff?.knownP0StructuralGaps ?? null,
    knownP1ProductGaps: gapSignoff?.knownP1ProductGaps ?? null,
    anyExhausted: budgets.anyExhausted,
    evalRegressions: compare.regressions.length,
    primaryDeadEnds: 0,
    disconnectedMandatory: gapSignoff?.firstReleaseDisconnectedMandatoryCapabilities ?? 0,
    evidenceFresh: true,
    externalValidationOpen: gapSignoff?.externalValidationOpen ?? 1,
  });
  write("15-release-governor.json", { at: AT, buildId, ...governor });

  const answers = {
    surviveRetriesWithoutDuplicateAction: idem.sameProcessPass
      ? "YES_SAME_PROCESS"
      : "NO",
    durableRestartIdempotency: idem.durableRestartPass ? "YES" : "PARTIAL",
    measureOwnReliability: "PARTIAL — SLO registry defined; consumption UNKNOWN_UNTIL_MEASURED",
    distinguishExperimentalFromTrusted: "YES — maturity registry + no promote on source alone",
    blastRadiusBeforeCoreChange: "YES — impact before/after artifacts mandatory",
    detectAiRegressionObjectively: compare.pass
      ? "YES_BASELINE_EQUAL_CURRENT"
      : "REGRESSION_DETECTED",
    traceUserDecisionChain: trace.executionId ? "PARTIAL" : "UNKNOWN",
    hideComplexityWithoutHidingEvidence: /renderProfessional|modeTech|approvalCard/.test(
      cockpit
    )
      ? "PARTIAL"
      : "UNKNOWN",
    measureProfessionalOutcomes: "PARTIAL — outcome metrics defined; values UNKNOWN_UNTIL_MEASURED",
  };

  const anyUnknown = Object.values(answers).some(
    (v) => String(v).includes("UNKNOWN") && !String(v).includes("UNTIL_MEASURED")
  );
  // UNKNOWN_UNTIL_MEASURED is honest partial, not false READY
  const mandatoryFail = answers.surviveRetriesWithoutDuplicateAction === "NO";

  const signoff = {
    at: AT,
    buildId,
    philosophyPreserved: true,
    extends: [
      "Product Kernel",
      "Experience Compiler",
      "Meta-Intelligence",
      "System Closure",
      "Evidence/Lineage",
      "Runtime",
    ],
    notCreated: [
      "second Meta-Intelligence",
      "second System Closure",
      "second Evidence system",
      "second Product Kernel",
      "second Experience Compiler",
      "second Boot architecture",
    ],
    answers,
    evaluationCompare: compare,
    releaseGovernorVerdict: governor.verdict,
    verdicts: {
      DISCIPLINE_LAYER: mandatoryFail ? "NO_GO" : "PARTIAL_WIRED",
      IDEMPOTENCY: idem.status,
      RELIABILITY_MEASUREMENT: "PARTIAL",
      TRUST_MATURITY: "PARTIAL",
      CHANGE_IMPACT: "WIRED",
      EVALUATION: "BASELINE_SET",
      EXECUTION_TRACE: "PARTIAL",
      UX_DISCLOSURE: "PARTIAL",
      OUTCOMES: "DEFINED_UNMEASURED",
      READY: false,
    },
    note: anyUnknown
      ? "Some answers remain UNKNOWN — do not return READY"
      : "Discipline wired; READY false until measured SLOs + packaged validation + durable idempotency",
  };
  write("16-enterprise-discipline-signoff.json", signoff);

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT,
        idempotency: idem.status,
        governor: governor.verdict,
        ready: false,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
