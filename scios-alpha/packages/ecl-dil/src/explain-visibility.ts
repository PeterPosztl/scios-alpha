/**
 * SAFE named explainability / visibility build commands.
 * Requested: seven callable enable functions + a master that flips
 * visibility-activation PASS and gradual Cockpit appearance.
 * Actual: each build is inspect-only. Nothing is enabled. Master stays REFUSED.
 * HITL is already AGENT→PROPOSAL→HUMAN→DECISION. Hospitality/healthcare SKIPPED.
 * ALPHA_NON_PRODUCTION. No evidence ⇒ UNKNOWN, never PASS.
 */
import { applyProfessionModules } from "./profession-module-expansion.js";
import { OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { buildPrecisionUpgradeWave } from "./precision-upgrade.js";
import { buildAutomationPrepWave } from "./automation-prep.js";
import { VISIBILITY_ACTIVATION_HOOKS } from "./visibility-activation.js";
import { VISIBILITY_DEEP_HOOKS } from "./visibility-deep.js";

import { isOn } from "./honesty-flags.js";
export type ExplainVisibilityResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type ExplainVisibilityBuild = {
  id: string;
  requested: string;
  result: ExplainVisibilityResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
};

function chk(
  id: string,
  requested: string,
  result: ExplainVisibilityResult,
  evidence: string,
  note: string
): ExplainVisibilityBuild {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false, applied: false };
}

type Ctx = {
  enginesOff: boolean;
  frozen: number;
  generated: number;
  causalOff: boolean;
  hospStatus: string;
  healthStatus: string;
  passStillFalse: boolean;
  gradualStillFalse: boolean;
};

function ctx(): Ctx {
  const auto = buildAutomationPrepWave();
  const precision = buildPrecisionUpgradeWave();
  const hosp = applyProfessionModules("hospitality");
  const health = applyProfessionModules("healthcare");
  return {
    enginesOff: auto.autoAudit === false && auto.autoLimits === false && auto.autoScenarios === false && auto.autoDecide === false,
    frozen: auto.health.accountsFrozen,
    generated: auto.health.scenariosGenerated,
    causalOff: precision.showCausalPaths === false && OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT",
    hospStatus: hosp.evidence.status,
    healthStatus: health.evidence.status,
    passStillFalse: VISIBILITY_ACTIVATION_HOOKS.passGranted === false && VISIBILITY_DEEP_HOOKS.passGranted === false,
    gradualStillFalse: VISIBILITY_ACTIVATION_HOOKS.gradual === false && VISIBILITY_DEEP_HOOKS.gradual === false,
  };
}

export const EXPLAIN_VISIBILITY_HOOKS = {
  schema: "sci-os-explain-visibility/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  enabledFull: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  autoDecide: false as const,
  passGranted: false as const,
  gradual: false as const,
  visibilityMode: "INSPECT_ONLY" as const,
  showCausalPaths: false as const,
  unifiedExplainBus: false as const,
  secondReviewFlow: false as const,
  inventedSops: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Named build commands are inspect-only. Master does not enable live explain, causal preview, a second review bus, passGranted, or gradual Cockpit fade-in. HITL is already the product. Not READY.",
};

/** 1) Audit / limit / scenario explainability — inspect, not live root-cause. */
export function buildExplainabilityLayer(c: Ctx = ctx()) {
  return chk(
    "buildExplainabilityLayer",
    "enableAudit/Limit/ScenarioExplainability live root-cause",
    c.enginesOff ? "REFUSED" : "FAIL",
    "autoAudit=false frozen=" + c.frozen + " generated=" + c.generated,
    "Cannot explain an auto-action that did not fire. Analog chain labels remain inspectable."
  );
}

/** 2) Human review — already the product; no parallel auto-engine review bus. */
export function buildHumanReviewFlow(_c: Ctx = ctx()) {
  return chk(
    "buildHumanReviewFlow",
    "enableHumanReview requireApprovalFor audit/limit/scenario actions",
    "ANALOG_CONTRACT",
    "AGENT → PROPOSAL → HUMAN → DECISION · autoDecide=false · secondReviewFlow=false",
    "HITL is current contract. Auto-engine actions do not exist to approve or deny."
  );
}

/** 3) Causal path preview — ABSENT engine, not a harmless preview. */
export function buildCausalPreviewEngine(c: Ctx = ctx()) {
  return chk(
    "buildCausalPreviewEngine",
    "enableCausalPreview showCausalPaths live",
    c.causalOff ? "REFUSED" : "FAIL",
    "showCausalPaths=false causalQueryEngine=" + OS_BLUEPRINT_HOOKS.causalQueryEngine,
    "Preview of an ABSENT causal engine is still a digital-ready claim."
  );
}

/** 4) Domain Explain buttons — hospitality/healthcare stay SKIPPED. */
export function buildWorkspaceExplainPanels(c: Ctx = ctx()) {
  const skipped = c.hospStatus === "SKIPPED_RESEARCH_REQUIRED" && c.healthStatus === "SKIPPED_RESEARCH_REQUIRED";
  return chk(
    "buildWorkspaceExplainPanels",
    "addWorkspaceExplainPanels healthcare+hospitality Explain buttons live",
    skipped ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
    "hospitality=" + c.hospStatus + " healthcare=" + c.healthStatus,
    "Cyber/investment/ops analog inspect already exists. Do not invent Hospitality/Healthcare Explain compute."
  );
}

/** 5) Unified explain bus — no second bus. */
export function buildUnifiedExplainBus(c: Ctx = ctx()) {
  return chk(
    "buildUnifiedExplainBus",
    "enableExplainBus unifyAudit/limits/scenarios",
    c.enginesOff ? "REFUSED" : "FAIL",
    "unifiedExplainBus=false",
    "Do not unify refused engines onto a new bus. One Cockpit."
  );
}

/** 6) visibility-activation PASS flip — not applied. */
export function flipVisibilityActivationGovernance(c: Ctx = ctx()) {
  return chk(
    "flipVisibilityActivationGovernance",
    "flipVisibilityActivation passGranted true",
    c.passStillFalse ? "REFUSED" : "FAIL",
    "passGranted=false visibility-activation stays REFUSED",
    "A named flip is not evidence. No evidence ⇒ UNKNOWN, never PASS."
  );
}

/** 7) Gradual Cockpit appearance — not applied. */
export function enableGradualVisibilityMode(c: Ctx = ctx()) {
  return chk(
    "enableGradualVisibilityMode",
    "flipGradualMode gradual progressive",
    c.gradualStillFalse ? "REFUSED" : "FAIL",
    "gradual=false visibility_mode=INSPECT_ONLY",
    "A slow fade-in of refused engines is still a false READY."
  );
}

export function domainExplainButtons(c: Ctx = ctx()) {
  return [
    { id: "cyber", button: "Cyber Explain", live: false as const, result: "ANALOG_CONTRACT" as const },
    { id: "investment", button: "Investment Explain", live: false as const, result: "ANALOG_CONTRACT" as const },
    { id: "ops", button: "Ops Explain", live: false as const, result: "ANALOG_CONTRACT" as const },
    { id: "healthcare", button: "Healthcare Explain", live: false as const, result: "SKIPPED_RESEARCH_REQUIRED" as const, evidence: c.healthStatus },
    { id: "hospitality", button: "Hospitality Explain", live: false as const, result: "SKIPPED_RESEARCH_REQUIRED" as const, evidence: c.hospStatus },
  ];
}

/** Master: all seven inspect commands. Does not enable. */
export function buildExplainabilityAndVisibilityWave() {
  const c = ctx();
  const builds = {
    explainabilityLayer: buildExplainabilityLayer(c),
    humanReviewFlow: buildHumanReviewFlow(c),
    causalPreviewEngine: buildCausalPreviewEngine(c),
    workspaceExplainPanels: buildWorkspaceExplainPanels(c),
    unifiedExplainBus: buildUnifiedExplainBus(c),
    visibilityFlip: flipVisibilityActivationGovernance(c),
    gradualMode: enableGradualVisibilityMode(c),
  };
  const all = Object.values(builds);
  const fail = all.filter((b) => b.result === "FAIL").length;
  const applied = all.filter((b) => isOn(b.applied)).length;
  return {
    ...EXPLAIN_VISIBILITY_HOOKS,
    holeless: false as const,
    wave: fail > 0 || applied > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    master: true as const,
    builds,
    domainExplainButtons: domainExplainButtons(c),
    health: {
      fail,
      applied,
      passGranted: 0,
      gradual: 0,
      causalPathsShown: 0,
      unifiedBusEnabled: 0,
      explainButtonsLive: 0,
    },
  };
}
