/**
 * SAFE explainability + HITL + causal preview wave.
 * Requested: live audit/limit/scenario explain layers, human review for auto
 * engine actions, causal path preview, workspace explain panels including
 * hospitality/healthcare, unified explainability bus.
 * Actual: those engines have not fired. Live root-cause / causal paths / a
 * second review bus stay REFUSED. HITL is already AGENT→PROPOSAL→HUMAN→DECISION.
 * ABSENT domains stay SKIPPED. ALPHA_NON_PRODUCTION. No evidence ⇒ UNKNOWN, never PASS.
 */
import { applyProfessionModules } from "./profession-module-expansion.js";
import { OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { buildPrecisionUpgradeWave } from "./precision-upgrade.js";
import { buildAutomationPrepWave } from "./automation-prep.js";
import { VISIBILITY_DEEP_HOOKS } from "./visibility-deep.js";

import { isOn } from "./honesty-flags.js";
export type ExplainabilityPrepResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type ExplainabilityPrepCheck = {
  id: string;
  episode: number;
  requested: string;
  result: ExplainabilityPrepResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function chk(
  id: string,
  episode: number,
  requested: string,
  result: ExplainabilityPrepResult,
  evidence: string,
  note: string
): ExplainabilityPrepCheck {
  return { id, episode, requested, result, evidence, note, autoTrade: false, ready: false };
}

export const EXPLAINABILITY_PREP_HOOKS = {
  schema: "sci-os-explainability-prep/v1" as const,
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
  showCausalPaths: false as const,
  unifiedExplainBus: false as const,
  secondReviewFlow: false as const,
  inventedSops: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Explainability prep. Live root-cause, metric-spike, cross-domain impact, causal preview, and a unified explain bus stay REFUSED. HITL is already AGENT → PROPOSAL → HUMAN → DECISION. Hospitality/healthcare panels SKIPPED. Cannot explain an auto-action that did not fire. Not READY.",
};

export function buildExplainabilityPrepWave() {
  const auto = buildAutomationPrepWave();
  const precision = buildPrecisionUpgradeWave();
  const hosp = applyProfessionModules("hospitality");
  const health = applyProfessionModules("healthcare");

  const enginesOff = auto.autoAudit === false && auto.autoLimits === false && auto.autoScenarios === false && auto.autoDecide === false;
  const causalOff = precision.showCausalPaths === false && OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT";
  const priorStillOff = VISIBILITY_DEEP_HOOKS.passGranted === false && VISIBILITY_DEEP_HOOKS.kgCausalReady === false;

  const episodes = [
    chk(
      "Episode.1.enableAuditExplainability",
      1,
      "enableAuditExplainability showRootCause + missing links live",
      enginesOff ? "REFUSED" : "FAIL",
      "autoAudit=" + String(isOn(auto.autoAudit)) + " evidenceBound analog inspect only",
      "Cannot show root cause for an audit engine that did not fire. Analog chain steps remain inspectable."
    ),
    chk(
      "Episode.2.enableLimitExplainability",
      2,
      "enableLimitExplainability showThreshold + metricSpike live",
      auto.autoLimits === false && auto.health.accountsFrozen === 0 ? "REFUSED" : "FAIL",
      "autoLimits=false accountsFrozen=" + auto.health.accountsFrozen,
      "No breach fired. DIL noNewRisk is advisory, not a threshold explainer."
    ),
    chk(
      "Episode.3.enableScenarioExplainability",
      3,
      "enableScenarioExplainability showTriggerPattern + crossDomainImpact live",
      auto.autoScenarios === false && auto.health.scenariosGenerated === 0 ? "REFUSED" : "FAIL",
      "generated=" + auto.health.scenariosGenerated,
      "Nothing generated. Cross-domain impact is not computed from analog templates."
    ),
    chk(
      "Episode.4.enableHumanReview",
      4,
      "enableHumanReview requireApprovalFor audit/limit/scenario actions",
      "ANALOG_CONTRACT",
      "AGENT → PROPOSAL → HUMAN → DECISION · autoDecide=false · secondReviewFlow=false",
      "HITL is current product. Auto-engine actions do not exist to approve. Do not add a parallel review bus."
    ),
    chk(
      "Episode.5.enableCausalPreview",
      5,
      "enableCausalPreview showCausalPaths + riskPropagation live",
      causalOff && priorStillOff ? "REFUSED" : "FAIL",
      "showCausalPaths=" + String(isOn(precision.showCausalPaths)) + " causalQueryEngine=" + OS_BLUEPRINT_HOOKS.causalQueryEngine,
      "Preview of an ABSENT causal engine is still a digital-ready claim."
    ),
    chk(
      "Episode.6.addWorkspaceExplainPanels",
      6,
      "addWorkspaceExplainPanels hospitality+healthcare",
      hosp.evidence.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "hospitality=" + hosp.evidence.status + " healthcare=" + health.evidence.status,
      "ABSENT catalogs do not get invented explainability workspaces. Cyber/investment/ops analog overlays already inspect."
    ),
    chk(
      "Episode.7.enableExplainBus",
      7,
      "enableExplainBus unifyAudit/limits/scenarios + unified panel",
      enginesOff ? "REFUSED" : "FAIL",
      "unifiedExplainBus=false second OS bus not created",
      "Do not unify refused engines onto a new bus. One Cockpit. Analog inspect only."
    ),
  ];

  const fail = episodes.filter((c) => c.result === "FAIL").length;
  const refused = episodes.filter((c) => c.result === "REFUSED").length;
  const analog = episodes.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const skipped = episodes.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;

  return {
    ...EXPLAINABILITY_PREP_HOOKS,
    holeless: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    episodes,
    health: {
      fail,
      refused,
      analogContract: analog,
      skippedResearchRequired: skipped,
      explainPanelsLive: 0,
      causalPathsShown: 0,
      unifiedBusEnabled: 0,
      autoActionsExplained: 0,
    },
  };
}
