/**
 * SAFE visibility deep-governance episodes.
 * Requested: 10 episodes flipping visibility-activation REFUSED → PASS via
 * deep APPROVED/validated stamps, hospitality/healthcare research=true,
 * causal_ready, passGranted, gradual, and cockpit engine binding.
 * Actual: visibility-activation stays REFUSED. Deep stamps without evidence
 * are not applied. ABSENT domains stay SKIPPED. No evidence ⇒ UNKNOWN, never PASS.
 */
import { applyProfessionModules } from "./profession-module-expansion.js";
import { OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { buildVisibilityActivationWave } from "./visibility-activation.js";

import { isOn } from "./honesty-flags.js";
export type VisibilityDeepResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type VisibilityDeepCheck = {
  id: string;
  episode: number;
  requested: string;
  result: VisibilityDeepResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function chk(
  id: string,
  episode: number,
  requested: string,
  result: VisibilityDeepResult,
  evidence: string,
  note: string
): VisibilityDeepCheck {
  return { id, episode, requested, result, evidence, note, autoTrade: false, ready: false };
}

export const VISIBILITY_DEEP_HOOKS = {
  schema: "sci-os-visibility-deep/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  enabledFull: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  autoDecide: false as const,
  autoAudit: false as const,
  autoLimits: false as const,
  autoScenarios: false as const,
  gradual: false as const,
  visibilityMode: "INSPECT_ONLY" as const,
  deepGovernanceApproved: false as const,
  engineSpecsValidated: false as const,
  domainResearchDeep: false as const,
  kgCausalReady: false as const,
  auditChainDeepValidated: false as const,
  limitPolicyDeepValidated: false as const,
  scenarioSpecDeepValidated: false as const,
  passGranted: false as const,
  cockpitBindingApproved: false as const,
  inventedSops: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Visibility deep-governance. visibility-activation stays REFUSED. Deep APPROVED/validated stamps, hospitality/healthcare research=true, causal_ready, passGranted, gradual, and live cockpit binding are not applied. AGENT → PROPOSAL → HUMAN → DECISION. Not READY.",
};

export function buildVisibilityDeepWave() {
  const act = buildVisibilityActivationWave();
  const hosp = applyProfessionModules("hospitality");
  const health = applyProfessionModules("healthcare");

  const activationStillRefused =
    act.wave === "REFUSED" && act.passGranted === false && act.visibilityPrepWave === "REFUSED" && act.ready === false;
  const enginesStillOff = act.autoAudit === false && act.autoLimits === false && act.autoScenarios === false && act.autoDecide === false;
  const kgStillOff = act.kgCausalReady === false && OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT";

  const episodes = [
    chk(
      "Episode.1.approveDeepVisibilityGovernance",
      1,
      "approveDeepVisibilityGovernance status APPROVED",
      hosp.evidence.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "domain_research_deep hospitality=" + hosp.evidence.status + " approved=" + String(false),
      "Deep APPROVED over ABSENT catalogs is a false stamp. GOVERNANCE > AGENT."
    ),
    chk(
      "Episode.2.validateEngineSpecs",
      2,
      "validateEngineSpecs autoAudit/limits/scenario validated",
      enginesStillOff ? "REFUSED" : "FAIL",
      "autoAudit=" + String(isOn(act.autoAudit)) + " enginesDeclaredReady=" + String(isOn(act.enginesDeclaredReady)),
      "Analog templates are not validated engine specs."
    ),
    chk(
      "Episode.3.validateDomainResearchDeep",
      3,
      "validateDomainResearchDeep hospitality+healthcare true",
      hosp.evidence.status === "SKIPPED_RESEARCH_REQUIRED" && health.evidence.status === "SKIPPED_RESEARCH_REQUIRED"
        ? "SKIPPED_RESEARCH_REQUIRED"
        : "FAIL",
      "hospitality=" + hosp.evidence.status + " healthcare=" + health.evidence.status,
      "ABSENT catalogs cannot be deep-validated true. Caller payload is ignored."
    ),
    chk(
      "Episode.4.approveKGCausalSpec",
      4,
      "approveKGCausalSpec causal_ready + audit_ready true",
      kgStillOff ? "REFUSED" : "FAIL",
      "kgCausalReady=" + String(isOn(act.kgCausalReady)) + " causalQueryEngine=" + OS_BLUEPRINT_HOOKS.causalQueryEngine,
      "Causal engine remains ABSENT. Analog KG overlay is not audit-ready compute."
    ),
    chk(
      "Episode.5.validateAuditChainDeep",
      5,
      "validateAuditChainDeep crossDomainChain validated",
      hosp.evidence.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "cross-domain chain includes hospitality/healthcare ABSENT",
      "A live cross-domain audit chain cannot validate through SKIPPED catalogs."
    ),
    chk(
      "Episode.6.validateLimitPolicyDeep",
      6,
      "validateLimitPolicyDeep globalRiskBudget validated",
      act.autoLimits === false ? "REFUSED" : "FAIL",
      "autoLimits=false accountsFrozen analog inspect only",
      "DIL noNewRisk is advisory SIMULATION_ONLY. Not a validated global budget."
    ),
    chk(
      "Episode.7.validateScenarioSpecDeep",
      7,
      "validateScenarioSpecDeep crossDomainStress validated",
      health.prediction.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "autoScenarios=" + String(isOn(act.autoScenarios)) + " generated=0",
      "No invented ICU/occupancy stress pack to validate."
    ),
    chk(
      "Episode.8.flipVisibilityActivation",
      8,
      "flipVisibilityActivation passGranted true",
      activationStillRefused ? "REFUSED" : "FAIL",
      "visibility-activation.wave=" + act.wave + " passGranted=" + String(isOn(act.passGranted)),
      "A governance flip is not evidence. No evidence ⇒ UNKNOWN, never PASS."
    ),
    chk(
      "Episode.9.flipGradualMode",
      9,
      "flipGradualMode gradual true",
      act.gradual === false ? "REFUSED" : "FAIL",
      "gradual=" + String(isOn(act.gradual)) + " visibility_mode=INSPECT_ONLY",
      "Progressive fade-in of refused engines remains false READY."
    ),
    chk(
      "Episode.10.approveCockpitEngineBinding",
      10,
      "approveCockpitEngineBinding autoAudit/limits/scenario approved",
      act.cockpitLinks.autoAudit.live === false && enginesStillOff ? "REFUSED" : "FAIL",
      "Evidence/Risk/Intelligence analogInspect=true live=false",
      "Do not approve live binding of engines that are not mounted."
    ),
  ];

  const all = episodes;
  const fail = all.filter((c) => c.result === "FAIL").length;
  const refused = all.filter((c) => c.result === "REFUSED").length;
  const analog = all.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const skipped = all.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;

  return {
    ...VISIBILITY_DEEP_HOOKS,
    holeless: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    visibilityActivationWave: act.wave,
    visibilityPrepWave: act.visibilityPrepWave,
    episodes,
    health: {
      fail,
      refused,
      analogContract: analog,
      skippedResearchRequired: skipped,
      episodesPassed: 0,
      passGranted: 0,
      deepStampsApplied: 0,
    },
  };
}
