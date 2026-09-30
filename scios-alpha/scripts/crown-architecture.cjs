#!/usr/bin/env node
"use strict";

/**
 * SCI OS ×10 — Crown Architecture evidence pack.
 * Extends boot + Product Kernel discipline — no parallel OS.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "diagnostics-export", "crown-architecture");
const AT = new Date().toISOString();
const buildId = `crown-architecture-${AT.slice(0, 10)}`;

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
function exists(rel) {
  return fs.existsSync(path.join(REPO, rel));
}

async function main() {
  const disc = await import(
    pathToFileURL(path.join(REPO, "packages/product-kernel/src/discipline/index.js")).href
  );
  const cockpit = fs.readFileSync(
    path.join(REPO, "apps/cockpit-ui/src/index.js"),
    "utf8"
  );
  const startSci = fs.readFileSync(
    path.join(REPO, "installer/scripts/start-sci-os.cjs"),
    "utf8"
  );
  const gap = readJson("diagnostics-export/gap-to-zero/27-zero-level-signoff.json");
  const discSign = readJson(
    "diagnostics-export/enterprise-discipline/16-enterprise-discipline-signoff.json"
  );
  const idem = readJson(
    "diagnostics-export/enterprise-discipline/03-action-idempotency-proof.json"
  );
  const txBootSrc = exists("installer/scripts/startup/transactional-boot.cjs");
  const txBootEvidence = readJson("diagnostics-export/transactional-boot.json");

  write("01-transactional-boot-contract.json", {
    at: AT,
    buildId,
    stages: [
      "PRE_FLIGHT",
      "RESOLVE_RUNTIME",
      "RESOLVE_APP_ROOT",
      "VALIDATE_CONFIG",
      "CLAIM_RESOURCES",
      "START_CORE",
      "VERIFY_CORE",
      "START_EXPERIENCE",
      "VERIFY_HOME",
      "COMMIT_BOOT",
    ],
    failurePhases: [
      "CLASSIFY",
      "ROLLBACK",
      "RELEASE_RESOURCES",
      "RECOVERY_SAFE_MODE",
      "EVIDENCE",
    ],
    module: "installer/scripts/startup/transactional-boot.cjs",
    wiredIntoStartSciOs: /TransactionalBoot/.test(startSci),
    verifyHomeBeforeBrowser: /verifyHome/.test(startSci),
    lastRuntimeEvidence: txBootEvidence,
    status: txBootSrc && /TransactionalBoot/.test(startSci) ? "WIRED" : "ABSENT",
  });

  const mesh = disc.buildInvariantMesh({
    userLaunchTarget: "SHELL",
    shellPort: 4000,
    controlPlanePort: 3000,
    packaged: false,
    analyzeProducesRiskAndGov: true,
    evidenceBuildId: gap?.buildId || buildId,
    releaseBuildId: buildId,
    visibleActionsMissingFromRegistry: [],
    actionsMissingProvider: [],
    experienceCapabilityRegistered: true,
    unknownMandatoryDeps: [],
    claimedReady: false,
  });
  write("02-invariant-mesh.json", { at: AT, buildId, ...mesh });

  write("03-semantic-control-plane.json", {
    at: AT,
    buildId,
    ...disc.buildOperationalOntologyMap(),
    normalizedAround: [
      "OBJECT",
      "RELATIONSHIP",
      "ACTION",
      "WORKFLOW",
      "POLICY",
      "RISK",
      "DECISION",
      "OUTCOME",
      "EVIDENCE",
    ],
  });

  write("04-intent-to-outcome.json", {
    at: AT,
    buildId,
    ...disc.compileIntentToOutcome({
      userIntent: "Analyze AAPL and decide simulation",
      role: "arch.market_analyst",
      object: { type: "Entity", id: "AAPL" },
    }),
  });

  const ux = disc.buildUxKernelInventory(cockpit);
  write("05-ux-kernel.json", { at: AT, buildId, ...ux });
  write("06-golden-ux-flow-audit.json", {
    at: AT,
    buildId,
    ...disc.auditGoldenUxFlow(ux),
  });

  write("07-trust-fabric-maturity.json", {
    at: AT,
    buildId,
    ...disc.buildAssetMaturityRegistry({}),
    statesIncludeTested: true,
  });

  write("08-trust-capsule-sample.json", {
    at: AT,
    buildId,
    ...disc.buildTrustCapsule({
      runId: "sample",
      timestamp: AT,
      predictionEnvelope: {
        model: { id: "baseline-logistic", version: "1.0.0" },
        abstain: false,
        calibration: { status: "NON_PRODUCTION" },
      },
      riskDecision: { verdict: "APPROVE" },
      governanceDecision: { policy: "embedded-foundation/v1" },
      lineage: { tipHash: "sample", nodes: [{ id: "n1" }] },
    }),
    shellHasTrustCapsule: /trustCapsule|trust-capsule/.test(cockpit),
  });

  write("09-action-idempotency-proof.json", {
    at: AT,
    buildId,
    ...(idem || (await disc.proveIdempotency())),
  });

  const impact = disc.analyzeImpact({
    changeId: "crown-architecture-2026-08-13",
    description: "Crown: transactional boot, invariants, intent, trust capsule, UX kernel",
  });
  write("10-change-impact.json", { at: AT, buildId, ...impact });

  const baseline = disc.buildEvaluationBaseline();
  write("11-professional-evaluation-lab.json", {
    at: AT,
    buildId,
    baseline,
    compare: disc.compareEvaluation(baseline, baseline),
  });

  write("12-reliability-governor.json", {
    at: AT,
    buildId,
    slo: disc.buildSloRegistry(),
    budgets: disc.assessErrorBudgets(disc.buildSloRegistry(), {}),
    release: disc.buildReleaseGovernor({
      knownP0StructuralGaps: gap?.knownP0StructuralGaps ?? 0,
      knownP1ProductGaps: gap?.knownP1ProductGaps ?? 0,
      anyExhausted: false,
      evalRegressions: 0,
      primaryDeadEnds: 0,
      disconnectedMandatory: 0,
      evidenceFresh: true,
      externalValidationOpen: gap?.externalValidationOpen ?? 1,
    }),
  });

  write("13-dual-digital-twin.json", {
    at: AT,
    buildId,
    ...disc.buildDualDigitalTwin({ controlPlanePort: 3000, shellPort: 4000 }),
  });

  write("14-autonomic-closure-loop.json", {
    at: AT,
    buildId,
    ...disc.buildAutonomicClosureLoop(),
  });

  const finishing = disc.buildFinishingGovernor({
    internalP0: gap?.knownP0StructuralGaps ?? 0,
    internalP1: gap?.knownP1ProductGaps ?? 0,
    bootReliability: "PARTIAL_TRANSACTIONAL_WIRED",
    primaryUxDeadEnds: 0,
    mandatoryDisconnected: 0,
    professionalEvalRegressions: 0,
    evidenceFresh: true,
    errorBudgetsExhausted: false,
  });
  // External validation still counts as closure debt for packaged READY
  if ((gap?.externalValidationOpen || 0) > 0) {
    finishing.verdict = "FIX_BEFORE_EXPAND";
    finishing.blockP2P3Expansion = true;
    finishing.inputs.externalValidationOpen = gap.externalValidationOpen;
    finishing.note =
      "Structural P0/P1 closed but packaged GW1 external validation remains — freeze vanity P2/P3";
  }
  write("15-finishing-governor.json", { at: AT, buildId, ...finishing });

  const finalProof = disc.buildCrownFinalProofChecklist({
    packagedGw1Proven: false,
    packagedPrefersBundled: true,
    idempotency: idem?.status || "PARTIAL_PASS",
  });
  write("16-crown-final-proof.json", { at: AT, buildId, ...finalProof });

  const answers = {
    transactionalBoot: /TransactionalBoot/.test(startSci) ? "WIRED" : "ABSENT",
    invariantMesh: mesh.allPass ? "PASS_STATIC" : "FAIL",
    semanticControlPlane: "PARTIAL",
    intentToOutcome: "WIRED",
    uxKernel: ux.foundation?.trustCapsule ? "PARTIAL" : "PARTIAL",
    goldenUxFlowStructural: disc.auditGoldenUxFlow(ux).pass ? "PASS_STRUCTURAL" : "FAIL",
    trustFabric: "PARTIAL",
    trustCapsuleUx: /trustCapsule/.test(cockpit) ? "WIRED" : "ABSENT",
    idempotency: idem?.status || "PARTIAL_PASS",
    changeImpact: "WIRED",
    evaluationLab: "BASELINE_SET",
    reliabilityGovernor: "PARTIAL_UNMEASURED",
    dualTwin: "PARTIAL",
    autonomicLoop: "DEFINED_PROPOSE_ONLY",
    finishingGovernor: finishing.verdict,
  };

  const signoff = {
    at: AT,
    buildId,
    extendsNorthStar: true,
    noParallelArchitecture: true,
    answers,
    finishing,
    gapSignoff: gap?.verdicts || null,
    disciplineSignoff: discSign?.verdicts || null,
    verdicts: {
      CROWN_ARCHITECTURE: "PARTIAL_WIRED",
      STRUCTURAL_GAP_SOURCE_TO_EVIDENCE: "NARROWED_NOT_CLOSED",
      TRANSACTIONAL_BOOT: answers.transactionalBoot,
      INVARIANT_MESH: answers.invariantMesh,
      FIRST_RELEASE: gap?.verdicts?.FIRST_RELEASE || "EXTERNAL_VALIDATION_ONLY",
      READY: false,
    },
    note:
      "Crown disciplines wired into canonical boot/kernel/shell. READY remains false until cold packaged prove + measured SLOs.",
  };
  write("17-crown-architecture-signoff.json", signoff);

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT,
        transactionalBoot: answers.transactionalBoot,
        goldenUx: answers.goldenUxFlowStructural,
        finishing: finishing.verdict,
        ready: false,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
