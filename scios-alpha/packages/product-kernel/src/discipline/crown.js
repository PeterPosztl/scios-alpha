/**
 * Autonomic closure loop + finishing governor.
 * Unify Meta-Intelligence / Meta-Recovery / System Closure — propose only.
 * ALPHA_NON_PRODUCTION
 */

export function buildAutonomicClosureLoop() {
  return {
    schema: "sci-os-autonomic-closure-loop/v1",
    label: "ALPHA_NON_PRODUCTION",
    autonomousPromotionToProduction: false,
    stages: [
      "OBSERVE",
      "GAP",
      "ROOT_CAUSE",
      "BLAST_RADIUS",
      "PROPOSE",
      "SANDBOX",
      "TEST",
      "PROFESSIONAL_EVAL",
      "INDEPENDENT_VERIFY",
      "APPROVAL",
      "DEPLOY",
      "MONITOR",
      "ROLLBACK",
    ],
    bindings: {
      OBSERVE: ["integrity:run", "gap:zero", "enterprise:discipline", "startup-report"],
      GAP: ["gap-to-zero register", "system-closure"],
      ROOT_CAUSE: ["24-root-cause-priority", "deep-forensics"],
      BLAST_RADIUS: ["discipline/impact.js", "change-impact-*.json"],
      PROPOSE: ["meta-intelligence SelfEvolutionController (propose-only)"],
      SANDBOX: ["local-foundation SIMULATION_ONLY"],
      TEST: ["vertical-slice smoke", "gates"],
      PROFESSIONAL_EVAL: ["discipline/evaluation.js"],
      INDEPENDENT_VERIFY: ["integrity engine", "invariant mesh"],
      APPROVAL: ["human", "release governor"],
      DEPLOY: ["packaged install — not auto"],
      MONITOR: ["SLO registry", "transactional boot"],
      ROLLBACK: ["meta-recovery", "process-supervisor stop"],
    },
  };
}

export function buildFinishingGovernor(input = {}) {
  const p0 = input.internalP0 ?? 0;
  const p1 = input.internalP1 ?? 0;
  const bootOk = input.bootReliability !== "NO_GO";
  const deadEnds = input.primaryUxDeadEnds ?? 0;
  const disconnected = input.mandatoryDisconnected ?? 0;
  const evalReg = input.professionalEvalRegressions ?? 0;
  const evidenceFresh = input.evidenceFresh !== false;
  const budgetsExhausted = !!input.errorBudgetsExhausted;

  const mandatoryDebt =
    p0 > 0 ||
    p1 > 0 ||
    !bootOk ||
    deadEnds > 0 ||
    disconnected > 0 ||
    evalReg > 0 ||
    !evidenceFresh ||
    budgetsExhausted;

  return {
    schema: "sci-os-finishing-governor/v1",
    label: "ALPHA_NON_PRODUCTION",
    inputs: {
      internalP0: p0,
      internalP1: p1,
      bootReliability: input.bootReliability || "UNKNOWN",
      primaryUxDeadEnds: deadEnds,
      mandatoryDisconnected: disconnected,
      professionalEvalRegressions: evalReg,
      evidenceFresh,
      errorBudgetsExhausted: budgetsExhausted,
    },
    policy: "If mandatory closure debt exists: FIX BEFORE EXPAND",
    verdict: mandatoryDebt ? "FIX_BEFORE_EXPAND" : "MAY_CONSIDER_P2_P3",
    blockP2P3Expansion: mandatoryDebt,
  };
}

export function buildCrownFinalProofChecklist(opts = {}) {
  return {
    schema: "sci-os-crown-final-proof/v1",
    label: "ALPHA_NON_PRODUCTION",
    coldInstalledFlow: {
      steps: [
        "ONE_CLICK",
        "TRANSACTIONAL_BOOT",
        "HOME",
        "PROFESSIONAL_WORKFLOW",
        "EVIDENCE",
        "CLEAN_SHUTDOWN",
      ],
      status: opts.packagedGw1Proven ? "PASS" : "EXTERNAL_VALIDATION_OPEN",
    },
    negativeProofs: {
      wrongRuntimeUnavailable: opts.packagedPrefersBundled ? "PARTIAL" : "UNKNOWN",
      wrongAppRootUnavailable: "PARTIAL — invariant defined",
      wrongEndpointWiringDetected: "PARTIAL — port invariant + health gate",
      duplicateActionPrevented: opts.idempotency || "PARTIAL_PASS",
      staleEvidenceRejected: "PARTIAL — evidence index classes STALE",
      policyBypassRejected: "PARTIAL — governance gate + approval card",
      brokenUiActionDetected: "PARTIAL — dead-end audit primary path",
      dependencyBlastRadiusCalculated: "YES — impact before/after",
      professionalRegressionDetected: "YES — evaluation compare",
    },
    ready: false,
  };
}
