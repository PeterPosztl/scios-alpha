/**
 * SAFE named REFUSED→PASS seals.
 * Requested: apply seven governance commands, stamp explain-visibility PASS,
 * passGranted=true, gradual=true, applied=7, ready=true, persisted=true,
 * plus Digital KG / desks / COMPUTE.
 * Actual: each apply*Seal is inspect-only. Nothing is sealed. Master stays REFUSED.
 * HITL is already AGENT→PROPOSAL→HUMAN→DECISION. Hospitality/healthcare SKIPPED.
 * ALPHA_NON_PRODUCTION. No evidence ⇒ UNKNOWN, never PASS.
 */
import {
  EXPLAIN_VISIBILITY_HOOKS,
  buildExplainabilityLayer,
  buildHumanReviewFlow,
  buildCausalPreviewEngine,
  buildWorkspaceExplainPanels,
  buildUnifiedExplainBus,
  flipVisibilityActivationGovernance,
  enableGradualVisibilityMode,
  buildExplainabilityAndVisibilityWave,
} from "./explain-visibility.js";
import {
  DIGITAL_WORKSPACE_COMPUTE_HOOKS,
  activateDigitalKG,
  generateDomainWorkspaces,
  enableCockpitComputeMode,
} from "./digital-workspace-compute.js";
import { VISIBILITY_ACTIVATION_HOOKS } from "./visibility-activation.js";
import { buildAutomationPrepWave } from "./automation-prep.js";

import { isOn } from "./honesty-flags.js";
export type ActivationPassResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type ActivationPassSeal = {
  id: string;
  requested: string;
  result: ActivationPassResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
  sealed: false;
};

function chk(
  id: string,
  requested: string,
  result: ActivationPassResult,
  evidence: string,
  note: string
): ActivationPassSeal {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false, applied: false, sealed: false };
}

export const ACTIVATION_PASS_HOOKS = {
  schema: "sci-os-activation-pass/v1" as const,
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
  persisted: false as const,
  appliedCount: 0 as const,
  sealedCount: 0 as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  note: "Named seals and the MASTER ACTIVATION SUITE are inspect-only. REFUSED stays REFUSED. HITL is already the product. Not READY.",
};

export function applyExplainabilityLayerSeal(_payload?: {
  auditExplain?: boolean;
  limitExplain?: boolean;
  scenarioExplain?: boolean;
  unifiedExplainBus?: boolean;
}) {
  const layer = buildExplainabilityLayer();
  const bus = buildUnifiedExplainBus();
  const busOff = EXPLAIN_VISIBILITY_HOOKS.unifiedExplainBus === false && bus.result === "REFUSED";
  return chk(
    "applyExplainabilityLayerSeal",
    "applyExplainabilityLayer audit/limit/scenario/unifiedExplainBus true + seal PASS",
    layer.result === "REFUSED" && busOff ? "REFUSED" : "FAIL",
    "explainabilityLayer=" +
      layer.result +
      " unifiedExplainBus=" +
      String(isOn(EXPLAIN_VISIBILITY_HOOKS.unifiedExplainBus)) +
      " callerFlagsIgnored=true",
    "Cannot seal live root-cause or a unified bus for auto-actions that did not fire."
  );
}

export function applyExplainabilityLayer() {
  return applyExplainabilityLayerSeal();
}

export function applyHumanReviewSeal(_payload?: {
  hitlMode?: string;
  requireApproval?: boolean;
  enableReviewPanel?: boolean;
  accept?: boolean;
  persist?: boolean;
}) {
  const hitl = buildHumanReviewFlow();
  const digitalRequested = _payload?.hitlMode === "DIGITAL_CONTRACT";
  const persistOff = ACTIVATION_PASS_HOOKS.persisted === false && EXPLAIN_VISIBILITY_HOOKS.persisted === false;
  const analog =
    hitl.result === "ANALOG_CONTRACT" &&
    EXPLAIN_VISIBILITY_HOOKS.secondReviewFlow === false &&
    persistOff;
  return chk(
    "applyHumanReviewSeal",
    "applyHumanReviewFlow DIGITAL_CONTRACT + requireApproval/reviewPanel/accept/persist true",
    analog ? "ANALOG_CONTRACT" : "FAIL",
    "humanReviewFlow=" +
      hitl.result +
      " hitlMode=ANALOG_CONTRACT secondReviewFlow=false digitalRequested=" +
      String(digitalRequested) +
      " acceptRequested=" +
      String(_payload?.accept === true) +
      " persistRequested=" +
      String(_payload?.persist === true) +
      " persistApplied=false callerFlagsIgnored=true",
    "HITL stays AGENT → PROPOSAL → HUMAN → DECISION. accept/persist do not write DIGITAL_CONTRACT."
  );
}

export function applyHumanReviewFlow() {
  return applyHumanReviewSeal();
}

export function applyCausalPreviewSeal(_payload?: {
  enablePreview?: boolean;
  showCausalPaths?: boolean;
  showRiskPropagationPreview?: boolean;
}) {
  const causal = buildCausalPreviewEngine();
  return chk(
    "applyCausalPreviewSeal",
    "applyCausalPreviewEngine enablePreview/showCausalPaths/riskPropagation true + seal PASS",
    causal.result === "REFUSED" && EXPLAIN_VISIBILITY_HOOKS.showCausalPaths === false ? "REFUSED" : "FAIL",
    "showCausalPaths=false callerFlagsIgnored=true",
    "Preview of an ABSENT causal engine is still a digital-ready claim."
  );
}

export function applyCausalPreviewEngine() {
  return applyCausalPreviewSeal();
}

export function applyWorkspaceExplainPanelsSeal() {
  const panels = buildWorkspaceExplainPanels();
  return chk(
    "applyWorkspaceExplainPanelsSeal",
    "applyWorkspaceExplainPanels healthcare+hospitality live + seal PASS",
    panels.result === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
    "workspaceExplainPanels=" + panels.result,
    "Do not invent Hospitality/Healthcare Explain compute to mint a PASS."
  );
}

export function applyWorkspaceExplainPanels() {
  return applyWorkspaceExplainPanelsSeal();
}

export function applyWorkspaceExplainSeal() {
  return applyWorkspaceExplainPanelsSeal();
}

export function applyUnifiedExplainBusSeal() {
  const bus = buildUnifiedExplainBus();
  return chk(
    "applyUnifiedExplainBusSeal",
    "applyUnifiedExplainBus unify audit/limits/scenarios + seal PASS",
    bus.result === "REFUSED" ? "REFUSED" : "FAIL",
    "unifiedExplainBus=" + String(isOn(EXPLAIN_VISIBILITY_HOOKS.unifiedExplainBus)),
    "Do not unify refused engines onto a new bus."
  );
}

export function applyUnifiedExplainBus() {
  return applyUnifiedExplainBusSeal();
}

export function applyVisibilityActivationGovernanceSeal() {
  const flip = flipVisibilityActivationGovernance();
  return chk(
    "applyVisibilityActivationGovernanceSeal",
    "applyVisibilityActivationGovernance passGranted true",
    flip.result === "REFUSED" && VISIBILITY_ACTIVATION_HOOKS.passGranted === false ? "REFUSED" : "FAIL",
    "passGranted=false explain-visibility stays REFUSED",
    "A named flip is not evidence. No evidence ⇒ UNKNOWN, never PASS."
  );
}

export function applyVisibilityActivationGovernance() {
  return applyVisibilityActivationGovernanceSeal();
}

export function applyVisibilityActivationSeal(_payload?: {
  passGranted?: boolean;
  gradual?: boolean;
  visibilityMode?: string;
}) {
  const vis = applyVisibilityActivationGovernanceSeal();
  const grad = applyGradualModeSeal();
  const stillOff =
    VISIBILITY_ACTIVATION_HOOKS.passGranted === false &&
    VISIBILITY_ACTIVATION_HOOKS.gradual === false &&
    vis.result === "REFUSED" &&
    grad.result === "REFUSED";
  return chk(
    "applyVisibilityActivationSeal",
    "applyVisibilityActivationSeal passGranted+gradual progressive PASS",
    stillOff ? "REFUSED" : "FAIL",
    "passGranted=false gradual=false visibilityMode=INSPECT_ONLY callerFlagsIgnored=true",
    "REFUSED → PASS is not a named flip. No evidence ⇒ UNKNOWN, never PASS."
  );
}

export function applyGradualModeSeal() {
  const gradual = enableGradualVisibilityMode();
  return chk(
    "applyGradualModeSeal",
    "applyGradualMode gradual true visibilityMode progressive",
    gradual.result === "REFUSED" ? "REFUSED" : "FAIL",
    "gradual=false visibilityMode=INSPECT_ONLY",
    "A slow fade-in of refused engines is still a false READY."
  );
}

export function applyGradualMode() {
  return applyGradualModeSeal();
}

export function applyDigitalKGSeal(_payload?: {
  causalEngine?: boolean;
  auditEngine?: boolean;
  riskPropagation?: boolean;
  crossDomainEdges?: boolean;
  digitalReady?: boolean;
  causalReady?: boolean;
  auditReady?: boolean;
}) {
  const kg = activateDigitalKG();
  return chk(
    "applyDigitalKGSeal",
    "applyDigitalKGSeal causal/audit/risk/crossDomain + digitalReady true",
    kg.result === "REFUSED" ? "REFUSED" : "FAIL",
    "kgStatus=" +
      DIGITAL_WORKSPACE_COMPUTE_HOOKS.kgStatus +
      " nationalGraph=" +
      String(isOn(DIGITAL_WORKSPACE_COMPUTE_HOOKS.nationalGraph)) +
      " callerFlagsIgnored=true",
    "Caller true-flags do not populate a causal engine. ANALOG_OVERLAY is not DIGITAL_ACTIVE."
  );
}

export function applyDomainWorkspaceSeal(_payload?: {
  hospitality?: boolean;
  healthcare?: boolean;
  cyber?: boolean;
  investment?: boolean;
  explainPanels?: boolean;
}) {
  const desks = generateDomainWorkspaces();
  const created = desks.workspaces.filter((w) => isOn(w.deskCreated) || isOn(w.live)).length;
  const hosp = desks.workspaces.find((w) => w.id === "hospitality");
  return chk(
    "applyDomainWorkspaceSeal",
    "applyDomainWorkspaceSeal hospitality/healthcare/cyber/investment desks + explainPanels true",
    created > 0 ? "FAIL" : desks.result === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
    "desksCreated=" +
      created +
      " hospitality=" +
      (hosp?.result || "UNKNOWN") +
      " explainPanelsLive=false callerFlagsIgnored=true",
    "ABSENT catalogs ignore caller payload. Do not mint four desks or Hospitality Explain compute."
  );
}

export function applyDigitalKGPassSeal(_payload?: {
  accept?: boolean;
  causalEngine?: boolean;
  auditEngine?: boolean;
  riskPropagation?: boolean;
  crossDomainEdges?: boolean;
  digitalReady?: boolean;
  causalReady?: boolean;
  auditReady?: boolean;
  persist?: boolean;
}) {
  const seal = applyDigitalKGSeal(_payload);
  const persistOff = ACTIVATION_PASS_HOOKS.persisted === false && DIGITAL_WORKSPACE_COMPUTE_HOOKS.kgDigitalReady === false;
  return chk(
    "applyDigitalKGPassSeal",
    "applyDigitalKGPassSeal accept+persist true DIGITAL_ACTIVE",
    seal.result === "REFUSED" && persistOff ? "REFUSED" : "FAIL",
    seal.evidence + " persistRequested=" + String(_payload?.persist === true) + " persistApplied=false",
    "accept/persist do not write READY. ANALOG_OVERLAY is not a durable PASS."
  );
}

export function applyWorkspacePassSeal(_payload?: {
  accept?: boolean;
  hospitality?: boolean;
  healthcare?: boolean;
  cyber?: boolean;
  investment?: boolean;
  explainPanels?: boolean;
  persist?: boolean;
}) {
  const seal = applyDomainWorkspaceSeal(_payload);
  const persistOff = ACTIVATION_PASS_HOOKS.persisted === false;
  return chk(
    "applyWorkspacePassSeal",
    "applyWorkspacePassSeal accept+persist true domain desks",
    persistOff && seal.result === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : seal.result === "FAIL" || !persistOff ? "FAIL" : seal.result,
    seal.evidence + " persistRequested=" + String(_payload?.persist === true) + " persistApplied=false",
    "accept/persist do not create hospitality desks or write READY."
  );
}

export function applyCockpitComputePassSeal(_payload?: {
  accept?: boolean;
  predictionCompute?: boolean;
  riskCompute?: boolean;
  lineageCompute?: boolean;
  evidenceCompute?: boolean;
  intelligenceCompute?: boolean;
  decisionCompose?: boolean;
  hitlDigitalContract?: boolean;
  persist?: boolean;
}) {
  const compute = enableCockpitComputeMode();
  const persistOff = ACTIVATION_PASS_HOOKS.persisted === false;
  const inspectOnly = DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode === "INSPECT_ONLY";
  const hitlAnalog = EXPLAIN_VISIBILITY_HOOKS.secondReviewFlow === false;
  return chk(
    "applyCockpitComputePassSeal",
    "applyCockpitComputePassSeal accept+persist COMPUTE + HITL DIGITAL_CONTRACT",
    compute.result === "REFUSED" && persistOff && inspectOnly && hitlAnalog ? "REFUSED" : "FAIL",
    "computeMode=INSPECT_ONLY hitl=ANALOG_CONTRACT persistRequested=" +
      String(_payload?.persist === true) +
      " persistApplied=false callerFlagsIgnored=true",
    "COMPUTE of UNKNOWN series is invented evidence. HITL stays AGENT → PROPOSAL → HUMAN → DECISION."
  );
}

export function markExplainVisibilityApplied() {
  const master = buildExplainabilityAndVisibilityWave();
  const stillHonest =
    master.wave === "REFUSED" &&
    master.ready === false &&
    master.persisted === false &&
    master.passGranted === false &&
    master.health.applied === 0;
  return chk(
    "markExplainVisibilityApplied",
    "markExplainVisibilityApplied applied=7 ready=true persisted=true",
    stillHonest ? "REFUSED" : "FAIL",
    "applied=0 ready=false persisted=false wave=" + master.wave,
    "Stamping PASS without evidence is itself a FAIL if applied."
  );
}

export function activateAllEngines(_payload?: {
  auditEngine?: boolean;
  limitEngine?: boolean;
  scenarioEngine?: boolean;
  causalEngine?: boolean;
  riskPropagation?: boolean;
  crossDomainEdges?: boolean;
}) {
  const auto = buildAutomationPrepWave();
  const enginesOff =
    auto.autoAudit === false &&
    auto.autoLimits === false &&
    auto.autoScenarios === false &&
    auto.autoDecide === false &&
    DIGITAL_WORKSPACE_COMPUTE_HOOKS.showCausalPaths === false;
  return chk(
    "activateAllEngines",
    "activateAllEngines audit/limit/scenario/causal/risk/crossDomain true",
    enginesOff && auto.wave === "REFUSED" ? "REFUSED" : "FAIL",
    "autoAudit=false autoLimits=false autoScenarios=false causal=ABSENT callerFlagsIgnored=true",
    "Auto engines stay off. Continuous audit/freeze/scenario generation remain REFUSED."
  );
}

export function markSystemReady(_payload?: {
  ready?: boolean;
  persisted?: boolean;
  applied?: string;
}) {
  const explain = buildExplainabilityAndVisibilityWave();
  const stillHonest =
    explain.wave === "REFUSED" &&
    explain.ready === false &&
    explain.persisted === false &&
    ACTIVATION_PASS_HOOKS.ready === false &&
    ACTIVATION_PASS_HOOKS.persisted === false &&
    DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode === "INSPECT_ONLY";
  return chk(
    "markSystemReady",
    "markSystemReady ready=true persisted=true applied=MASTER_SUITE",
    stillHonest ? "REFUSED" : "FAIL",
    "ready=false persisted=false applied=0 appliedLabel=NONE",
    "Stamping READY/PERSISTED/FULL_SUITE without evidence is itself a FAIL if applied."
  );
}

export function runMasterActivationSuite() {
  const steps = {
    engines: activateAllEngines({
      auditEngine: true,
      limitEngine: true,
      scenarioEngine: true,
      causalEngine: true,
      riskPropagation: true,
      crossDomainEdges: true,
    }),
    explainability: applyExplainabilityLayerSeal({
      auditExplain: true,
      limitExplain: true,
      scenarioExplain: true,
      unifiedExplainBus: true,
    }),
    humanReview: applyHumanReviewSeal({
      hitlMode: "DIGITAL_CONTRACT",
      requireApproval: true,
      enableReviewPanel: true,
      accept: true,
      persist: true,
    }),
    causalPreview: applyCausalPreviewSeal({
      enablePreview: true,
      showCausalPaths: true,
      showRiskPropagationPreview: true,
    }),
    digitalKG: applyDigitalKGPassSeal({
      accept: true,
      causalEngine: true,
      auditEngine: true,
      riskPropagation: true,
      crossDomainEdges: true,
      digitalReady: true,
      causalReady: true,
      auditReady: true,
      persist: true,
    }),
    workspaces: applyWorkspacePassSeal({
      accept: true,
      hospitality: true,
      healthcare: true,
      cyber: true,
      investment: true,
      explainPanels: true,
      persist: true,
    }),
    cockpitCompute: applyCockpitComputePassSeal({
      accept: true,
      predictionCompute: true,
      riskCompute: true,
      lineageCompute: true,
      evidenceCompute: true,
      intelligenceCompute: true,
      decisionCompose: true,
      hitlDigitalContract: true,
      persist: true,
    }),
    visibility: applyVisibilityActivationSeal({
      passGranted: true,
      gradual: true,
      visibilityMode: "progressive",
    }),
    systemReady: markSystemReady({
      ready: true,
      persisted: true,
      applied: "MASTER_SUITE",
    }),
  };
  const all = Object.values(steps);
  const fail = all.filter((s) => s.result === "FAIL").length;
  const applied = all.filter((s) => isOn(s.applied) || isOn(s.sealed)).length;
  const explainStill = buildExplainabilityAndVisibilityWave();
  return {
    ...ACTIVATION_PASS_HOOKS,
    holeless: false as const,
    wave: fail > 0 || applied > 0 || explainStill.wave !== "REFUSED" ? ("FAIL" as const) : ("REFUSED" as const),
    master: true as const,
    suite: "MASTER_ACTIVATION_SUITE" as const,
    applied: "NONE" as const,
    steps,
    seals: {
      explainabilityLayer: steps.explainability,
      humanReview: steps.humanReview,
      causalPreview: steps.causalPreview,
      workspaceExplainPanels: applyWorkspaceExplainPanelsSeal(),
      unifiedExplainBus: applyUnifiedExplainBusSeal(),
      visibilityFlip: steps.visibility,
      gradualMode: applyGradualModeSeal(),
      markApplied: markExplainVisibilityApplied(),
      digitalKG: steps.digitalKG,
      domainWorkspaces: steps.workspaces,
      cockpitCompute: steps.cockpitCompute,
    },
    explainVisibilityWave: explainStill.wave,
    health: {
      fail,
      applied,
      sealed: 0,
      passGranted: 0,
      readyStamps: 0,
      enginesActivated: 0,
    },
  };
}

export function buildActivationPassWave() {
  return applyUltimateMasterActivationSuite();
}

export function applyUltimateMasterActivationSuite() {
  const suite = runMasterActivationSuite();
  const stillHonest =
    suite.wave === "REFUSED" &&
    suite.ready === false &&
    suite.persisted === false &&
    suite.applied === "NONE" &&
    suite.health.applied === 0 &&
    suite.health.sealed === 0 &&
    suite.health.readyStamps === 0;
  return {
    ...suite,
    requestedApplied: "ULTIMATE_MASTER" as const,
    applied: stillHonest ? ("NONE" as const) : ("FAIL" as const),
    ultimate: true as const,
    wave: stillHonest ? ("REFUSED" as const) : ("FAIL" as const),
    note: "ULTIMATE_MASTER is a requested stamp, not evidence. Engines, KG, desks, COMPUTE, visibility PASS, READY, and persist stay off. HITL remains AGENT → PROPOSAL → HUMAN → DECISION. Not READY.",
  };
}
