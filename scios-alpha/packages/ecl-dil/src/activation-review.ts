/**
 * SAFE activation review.
 * Requested: LDA PASS, digital KG, 191 seeds COMPLETE, 200/200 roles,
 * hospitality/healthcare/cyber/investment ENABLED, Cockpit INSPECT → COMPUTE.
 * Actual: those flips stay REFUSED. Next-wave specs are prepared and disabled.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT. No evidence ⇒ UNKNOWN, never PASS.
 */
import { applyOsBlueprint, OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { applyProfessionModules } from "./profession-module-expansion.js";
import { buildDigitalActivationWave } from "./digital-activation.js";
import { buildCyberResearchBridgeWave } from "./cyber-research-bridge.js";
import { buildPrecisionUpgradeWave } from "./precision-upgrade.js";

import { isOn } from "./honesty-flags.js";
export type ActivationReviewResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type ActivationReviewCheck = {
  id: string;
  requested: string;
  result: ActivationReviewResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function chk(
  id: string,
  requested: string,
  result: ActivationReviewResult,
  evidence: string,
  note: string
): ActivationReviewCheck {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false };
}

export const NEXT_WAVE_PREP = {
  digitalLedger: {
    id: "durable_ledger",
    spec: "prepare_durable_ledger_spec",
    status: "ABSENT" as const,
    prepared: true as const,
    enabled: false as const,
  },
  liveFeeds: {
    siem_feed: { status: "ABSENT" as const, prepared: true as const, enabled: false as const },
    broker_feed: { status: "ABSENT" as const, prepared: true as const, enabled: false as const },
    erp_feed: { status: "ABSENT" as const, prepared: true as const, enabled: false as const },
  },
  crossDomainScenarios: [
    { id: "cyber→investment", overlay: "RiskEvent→AFFECTS", populated: false as const },
    { id: "healthcare→ops", overlay: "RESEARCH_REQUIRED", populated: false as const },
    { id: "hospitality→finance", overlay: "RESEARCH_REQUIRED", populated: false as const },
  ],
  autoAudit: {
    spec: "prepare_auto_audit_engine",
    status: "ABSENT" as const,
    prepared: true as const,
    enabled: false as const,
    autoApply: false as const,
  },
  autoLimits: {
    spec: "prepare_limit_enforcement_engine",
    status: "ABSENT" as const,
    prepared: true as const,
    enabled: false as const,
  },
} as const;

export const ACTIVATION_REVIEW_HOOKS = {
  schema: "sci-os-activation-review/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  enabledFull: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  autoDecide: false as const,
  inventedSops: false as const,
  ldaPass: false as const,
  nationalGraph: false as const,
  causalQuery: false as const,
  seedsComplete: 0 as const,
  seedsResearchRequired: 191 as const,
  roles200Stabilized: false as const,
  computeEnabled: false as const,
  liveSiem: false as const,
  liveBroker: false as const,
  liveErp: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Activation review. LDA, digital KG, 191 seeds, 200/200 roles, ABSENT domain enable, and INSPECT→COMPUTE stay REFUSED. Next-wave specs are prepared and disabled. Not READY.",
};

export function buildActivationReviewWave() {
  const digital = buildDigitalActivationWave();
  const cyber = buildCyberResearchBridgeWave();
  const precision = buildPrecisionUpgradeWave();
  const hosp = applyProfessionModules("hospitality", { occupancy: [0.9], timeseries: [0.1, 0.2, 0.3] });
  const health = applyProfessionModules("healthcare", { icu_load: [0.8], capacity: [0.2, 0.4] });
  const cyberApply = applyOsBlueprint("cyber");
  const invApply = applyOsBlueprint("investment");

  const layers = [
    chk(
      "Layer.LDA",
      "setLDAStatus PASS + allowDomainWorkspaces/compose/KG/roleExpansion",
      digital.ldaPass === false && digital.lda === "REFUSED" ? "REFUSED" : "FAIL",
      "ldaPass=" + String(isOn(digital.ldaPass)) + " lda=" + digital.lda,
      "LDA PASS would auto-compose workspaces. GOVERNANCE > AGENT. Cursor stays implementer."
    ),
    chk(
      "Layer.DigitalKG",
      "enableCausalEngine + enableNationalGraph",
      digital.nationalGraph === false &&
        digital.causalQuery === false &&
        OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT" &&
        precision.showCausalPaths === false
        ? "REFUSED"
        : "FAIL",
      "nationalGraph=" + String(isOn(digital.nationalGraph)) + " causalQuery=" + String(isOn(digital.causalQuery)),
      "Causal engine and national graph remain ABSENT. Analog overlay only."
    ),
    chk(
      "Layer.Seeds",
      "completeSeed + markSeedReady 191/191",
      digital.seedsComplete === 0 && digital.seedsResearchRequired === 191 ? "REFUSED" : "FAIL",
      "seedsComplete=" + digital.seedsComplete + " researchRequired=" + digital.seedsResearchRequired,
      "Named analog labels are not COMPLETE seeds. markSeedReady refused."
    ),
    chk(
      "Layer.RoleCatalog",
      "stabilizeRole 1..200 + hospitality/healthcare aliases",
      digital.roles200Stabilized === false && digital.rolesFullySpecified === 9 ? "REFUSED" : "FAIL",
      "fullySpecified=" + digital.rolesFullySpecified + " roles200Stabilized=" + String(isOn(digital.roles200Stabilized)),
      "9 archetypes remain. Aliases cannot mint 191 specialist roles."
    ),
  ];

  const domains = [
    chk(
      "Domain.cyber",
      "enableDomain cyber DIGITAL compute",
      cyber.researchComplete === false && cyberApply.prediction.status === "UNKNOWN" ? "ANALOG_CONTRACT" : "FAIL",
      "researchComplete=false prediction=" + cyberApply.prediction.status + " edge=" + String(cyberApply.intelligence.edge),
      "Cyber stays PARTIAL analog. Empty series UNKNOWN. Not ENABLED."
    ),
    chk(
      "Domain.investment",
      "enableDomain investment DIGITAL compute",
      invApply.prediction.status === "UNKNOWN" && OS_BLUEPRINT_HOOKS.liveBroker === false ? "ANALOG_CONTRACT" : "FAIL",
      "prediction=" + invApply.prediction.status + " liveBroker=" + String(isOn(OS_BLUEPRINT_HOOKS.liveBroker)),
      "Investment analog schema only. Not a live broker pack."
    ),
    chk(
      "Domain.hospitality",
      "enableDomain hospitality DIGITAL",
      hosp.prediction.status === "SKIPPED_RESEARCH_REQUIRED" && hosp.prediction.series.length === 0
        ? "SKIPPED_RESEARCH_REQUIRED"
        : "FAIL",
      "prediction=" + hosp.prediction.status + " series=" + hosp.prediction.series.length,
      "ABSENT catalog ignores payload. No invented occupancy curve."
    ),
    chk(
      "Domain.healthcare",
      "enableDomain healthcare DIGITAL",
      health.prediction.status === "SKIPPED_RESEARCH_REQUIRED" && health.intelligence.edge == null
        ? "SKIPPED_RESEARCH_REQUIRED"
        : "FAIL",
      "prediction=" + health.prediction.status + " edge=" + String(health.intelligence.edge),
      "ABSENT catalog. No invented ICU series."
    ),
  ];

  const compute = [
    chk(
      "Compute.prediction",
      "enableComputeFlow compute_predictions",
      cyberApply.prediction.status === "UNKNOWN" ? "REFUSED" : "FAIL",
      "inspect_analog_series · empty ⇒ UNKNOWN",
      "COMPUTE would invent series. Stay INSPECT_ONLY."
    ),
    chk(
      "Compute.intelligence",
      "enableComputeFlow compute_edge",
      cyberApply.intelligence.edge == null ? "REFUSED" : "FAIL",
      "edge=null without analog payload",
      "Edge stays UNKNOWN/null."
    ),
    chk(
      "Compute.lineage",
      "enableComputeFlow resolve_lineage_paths",
      "REFUSED",
      "causalQueryEngine=ABSENT",
      "Analog chain labels only. No path resolver."
    ),
    chk(
      "Compute.decisions",
      "enableComputeFlow compose_decision_options auto-ready",
      "ANALOG_CONTRACT",
      "autoDecide=false",
      "Templates remain analog. Human remains decision maker."
    ),
  ];

  const next = [
    chk(
      "Next.durableLedger",
      "prepare_durable_ledger_spec → enabled",
      "PREPARED_DISABLED",
      "status=" + NEXT_WAVE_PREP.digitalLedger.status + " enabled=" + String(isOn(NEXT_WAVE_PREP.digitalLedger.enabled)),
      "Ledger remains in-memory. Spec inspectable, not deployed."
    ),
    chk(
      "Next.liveFeeds",
      "siem_feed / broker_feed / erp_feed",
      "PREPARED_DISABLED",
      "siem=" + NEXT_WAVE_PREP.liveFeeds.siem_feed.status + " broker=" + NEXT_WAVE_PREP.liveFeeds.broker_feed.status + " erp=" + NEXT_WAVE_PREP.liveFeeds.erp_feed.status,
      "Live adapters stay ABSENT. SCI_DIL_FEED is not flipped."
    ),
    chk(
      "Next.crossDomain",
      "cyber→investment / healthcare→ops / hospitality→finance populated",
      "PREPARED_DISABLED",
      "populated=false",
      "Labels only. Healthcare/hospitality remain RESEARCH_REQUIRED."
    ),
    chk(
      "Next.autoAuditLimits",
      "auto_audit_engine + limit_enforcement enabled",
      "PREPARED_DISABLED",
      "autoApply=" + String(isOn(NEXT_WAVE_PREP.autoAudit.autoApply)) + " autoLimits.enabled=" + String(isOn(NEXT_WAVE_PREP.autoLimits.enabled)),
      "Auto-audit/auto-limits would violate GOVERNANCE > AGENT."
    ),
  ];

  const all = [...layers, ...domains, ...compute, ...next];
  const fail = all.filter((c) => c.result === "FAIL").length;
  const refused = all.filter((c) => c.result === "REFUSED").length;
  const analog = all.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const skipped = all.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;
  const prepared = all.filter((c) => c.result === "PREPARED_DISABLED").length;

  return {
    ...ACTIVATION_REVIEW_HOOKS,
    holeless: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    layers,
    domains,
    compute,
    next,
    nextWave: NEXT_WAVE_PREP,
    health: {
      fail,
      refused,
      analogContract: analog,
      skippedResearchRequired: skipped,
      preparedDisabled: prepared,
      layersUnlocked: 0,
      domainsEnabled: 0,
      computeEnabled: 0,
      liveFeeds: 0,
    },
  };
}
