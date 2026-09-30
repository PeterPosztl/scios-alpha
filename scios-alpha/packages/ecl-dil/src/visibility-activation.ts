/**
 * SAFE visibility activation episodes.
 * Requested: 10 episodes flipping visibility-prep REFUSED → PASS, declare engines
 * ready, invent domain %, mark KG digital/causal ready, gradual Cockpit linking.
 * Actual: visibility-prep stays REFUSED. Stamping APPROVED/READY/PASS without
 * evidence is itself a FAIL if applied. Hospitality/healthcare stay SKIPPED.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT. No evidence ⇒ UNKNOWN, never PASS.
 */
import { applyProfessionModules } from "./profession-module-expansion.js";
import { OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { buildVisibilityPrepWave } from "./visibility-prep.js";

import { isOn } from "./honesty-flags.js";
export type VisibilityActivationResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type VisibilityActivationCheck = {
  id: string;
  episode: number;
  requested: string;
  result: VisibilityActivationResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function chk(
  id: string,
  episode: number,
  requested: string,
  result: VisibilityActivationResult,
  evidence: string,
  note: string
): VisibilityActivationCheck {
  return { id, episode, requested, result, evidence, note, autoTrade: false, ready: false };
}

export const VISIBILITY_ACTIVATION_HOOKS = {
  schema: "sci-os-visibility-activation/v1" as const,
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
  governanceApproved: false as const,
  enginesDeclaredReady: false as const,
  kgDigitalReady: false as const,
  kgCausalReady: false as const,
  passRequested: true as const,
  passGranted: false as const,
  inventedSops: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Visibility activation episodes. visibility-prep stays REFUSED. Governance APPROVED, engine-ready, domain %, digital-ready KG, gradual PASS, and live panel linking are not applied. Honest inspect chips remain. AGENT → PROPOSAL → HUMAN → DECISION. Not READY.",
};

export function buildVisibilityActivationWave() {
  const vis = buildVisibilityPrepWave();
  const hosp = applyProfessionModules("hospitality");
  const health = applyProfessionModules("healthcare");

  const prepStillRefused = vis.wave === "REFUSED" && vis.ready === false && vis.gradual === false && vis.digitalReadyMarkers === false;
  const enginesStillOff = vis.autoAudit === false && vis.autoLimits === false && vis.autoScenarios === false && vis.autoDecide === false;

  const episodes = [
    chk(
      "Episode.1.approveVisibilityGovernance",
      1,
      "approveVisibilityGovernance status APPROVED",
      hosp.evidence.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "hospitality docs=" + hosp.evidence.status + " healthcare docs=" + health.evidence.status + " approved=" + String(false),
      "Cannot stamp APPROVED over ABSENT domain research. GOVERNANCE > AGENT."
    ),
    chk(
      "Episode.2.declareEngineReady",
      2,
      "declareEngineReady autoAudit + limitEnforcement + autoScenario true",
      enginesStillOff ? "REFUSED" : "FAIL",
      "autoAudit=" + String(isOn(vis.autoAudit)) + " autoLimits=" + String(isOn(vis.autoLimits)) + " autoScenarios=" + String(isOn(vis.autoScenarios)),
      "A declaration is not evidence. Analog templates stay analog."
    ),
    chk(
      "Episode.3.setDomainProgress",
      3,
      "setDomainProgress hospitality 0.40 healthcare 0.40 cyber 0.60",
      hosp.evidence.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "requested percents not applied · hospitality=" + hosp.evidence.status,
      "Invented 40–70% enable bars are a READY claim. Domain rows stay SKIPPED or ANALOG with enable=false."
    ),
    chk(
      "Episode.4.markKGReady",
      4,
      "markKGReady digital_ready + causal_ready true",
      vis.digitalReadyMarkers === false && OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT" && OS_BLUEPRINT_HOOKS.nationalGraph === false
        ? "REFUSED"
        : "FAIL",
      "digitalReadyMarkers=" + String(isOn(vis.digitalReadyMarkers)) + " causalQueryEngine=" + OS_BLUEPRINT_HOOKS.causalQueryEngine,
      "Analog KG overlay is not digitally ready. Causal engine remains ABSENT."
    ),
    chk(
      "Episode.5.enableAuditHints",
      5,
      "enableAuditHints allowAuditHintBadges as activation",
      "ANALOG_CONTRACT",
      "showAuditHints inspect-only · autoAudit=" + String(isOn(vis.autoAudit)),
      "Evidence panel may show audit-hint · REFUSED. That is not engine activation."
    ),
    chk(
      "Episode.6.enableLimitHints",
      6,
      "enableLimitHints allowLimitHintBadges as activation",
      "ANALOG_CONTRACT",
      "showLimitHints inspect-only · accountsFrozen=" + vis.health.accountsFrozen,
      "Risk/decisions may show limit-hint · REFUSED · HITL. Freeze/hold did not fire."
    ),
    chk(
      "Episode.7.enableScenarioHints",
      7,
      "enableScenarioHints allowScenarioHintBadges as activation",
      "ANALOG_CONTRACT",
      "showScenarioHints inspect-only · generated=" + vis.health.scenariosGenerated,
      "Intelligence may show scenario-hint · REFUSED · generated=0."
    ),
    chk(
      "Episode.8.requestVisibilityWavePass",
      8,
      "requestVisibilityWave expected PASS",
      prepStillRefused ? "REFUSED" : "FAIL",
      "visibility-prep.wave=" + vis.wave + " passGranted=false",
      "Re-requesting PASS does not create evidence. No evidence ⇒ UNKNOWN, never PASS."
    ),
    chk(
      "Episode.9.enableGradualVisibility",
      9,
      "enableGradualVisibility gradual progressive",
      vis.gradual === false ? "REFUSED" : "FAIL",
      "gradual=" + String(isOn(vis.gradual)) + " visibility_mode=INSPECT_ONLY",
      "A slow fade-in of refused engines is still a false READY."
    ),
    chk(
      "Episode.10.linkEngineToCockpit",
      10,
      "linkEngineToCockpit live Evidence/Risk/Intelligence",
      enginesStillOff ? "REFUSED" : "FAIL",
      "Evidence/Risk/Intelligence already show analog inspect overlays · live engines not mounted",
      "Do not mount refused engines onto panels as if they compute. One Cockpit, analog inspect only."
    ),
  ];

  const next = [
    chk("Next.explainabilityLayer", 0, "prepare_explainability_layer", "PREPARED_DISABLED", "nothing fired", "Cannot explain a refused auto-action."),
    chk("Next.humanReviewFlow", 0, "prepare_human_in_loop_review", "ANALOG_CONTRACT", "AGENT → PROPOSAL → HUMAN → DECISION", "HITL is current contract, not a future unlock."),
    chk("Next.causalPreviewEngine", 0, "prepare_causal_path_preview", "REFUSED", "causalQueryEngine=ABSENT", "Preview of a refused causal engine is still a digital-ready claim."),
    chk("Next.workspaceTemplates", 0, "prepare_domain_workspace_templates", "SKIPPED_RESEARCH_REQUIRED", "hospitality/healthcare ABSENT", "Do not invent specialist workspace templates."),
    chk("Next.ledgerReconciliation", 0, "prepare_cross_domain_ledger_reconciliation", "REFUSED", "durableLedger=false", "In-memory analog labels are not reconciliation."),
    chk("Next.feedQualityScoring", 0, "prepare_live_feed_quality_scoring", "REFUSED", "liveSiem=false certified=false", "ABSENT feeds have no quality score."),
    chk("Next.scenarioPrioritization", 0, "prepare_auto_scenario_prioritization", "PREPARED_DISABLED", "generated=0", "Nothing to rank."),
  ];

  const all = [...episodes, ...next];
  const fail = all.filter((c) => c.result === "FAIL").length;
  const refused = all.filter((c) => c.result === "REFUSED").length;
  const analog = all.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const skipped = all.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;
  const prepared = all.filter((c) => c.result === "PREPARED_DISABLED").length;

  return {
    ...VISIBILITY_ACTIVATION_HOOKS,
    holeless: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    visibilityPrepWave: vis.wave,
    episodes,
    next,
    domainProgress: {
      cyber: { requested: 0.6, applied: false as const, result: "ANALOG_CONTRACT" as const },
      investment: { requested: 0.7, applied: false as const, result: "ANALOG_CONTRACT" as const },
      ops: { requested: 0.5, applied: false as const, result: "ANALOG_CONTRACT" as const },
      hospitality: { requested: 0.4, applied: false as const, result: "SKIPPED_RESEARCH_REQUIRED" as const },
      healthcare: { requested: 0.4, applied: false as const, result: "SKIPPED_RESEARCH_REQUIRED" as const },
    },
    cockpitLinks: {
      autoAudit: { panel: "EvidencePanel", live: false as const, analogInspect: true as const },
      limitEnforcement: { panel: "RiskPanel", live: false as const, analogInspect: true as const },
      autoScenario: { panel: "IntelligencePanel", live: false as const, analogInspect: true as const },
    },
    health: {
      fail,
      refused,
      analogContract: analog,
      skippedResearchRequired: skipped,
      preparedDisabled: prepared,
      episodesPassed: 0,
      enginesDeclaredReady: 0,
      kgDigitalReady: 0,
      passGranted: 0,
    },
  };
}
