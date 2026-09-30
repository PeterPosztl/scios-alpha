/**
 * SAFE visibility prep wave.
 * Requested: gradual Cockpit activation of auto-audit / limits / scenarios,
 * analog→digital hints, research→enable progress bars, digital-ready KG markers.
 * Actual: those engines are not READY. Visibility may show honest REFUSED /
 * ANALOG / SKIPPED status in the one Shell. No slow-activation theater.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT. No evidence ⇒ UNKNOWN, never PASS.
 */
import { applyOsBlueprint, OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { applyProfessionModules } from "./profession-module-expansion.js";
import { buildPrecisionUpgradeWave } from "./precision-upgrade.js";
import { buildAutomationPrepWave } from "./automation-prep.js";

import { isOn } from "./honesty-flags.js";
export type VisibilityPrepResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type VisibilityPrepCheck = {
  id: string;
  requested: string;
  result: VisibilityPrepResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function chk(
  id: string,
  requested: string,
  result: VisibilityPrepResult,
  evidence: string,
  note: string
): VisibilityPrepCheck {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false };
}

export const VISIBILITY_PREP_HOOKS = {
  schema: "sci-os-visibility-prep/v1" as const,
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
  analogToDigitalHints: false as const,
  showAuditHints: true as const,
  showLimitHints: true as const,
  showScenarioHints: true as const,
  showDomainProgress: false as const,
  digitalReadyMarkers: false as const,
  inventedSops: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Visibility prep. Honest REFUSED/ANALOG/SKIPPED status may appear in the one Cockpit. Gradual activation, analog→digital hints, research→enable bars, and digital-ready KG markers stay REFUSED. Auto-audit/limits/scenarios are not READY. AGENT → PROPOSAL → HUMAN → DECISION.",
};

export function buildVisibilityPrepWave() {
  const auto = buildAutomationPrepWave();
  const precision = buildPrecisionUpgradeWave();
  const cyber = applyOsBlueprint("cyber");
  const inv = applyOsBlueprint("investment");
  const ops = applyOsBlueprint("ops");
  const hosp = applyProfessionModules("hospitality");
  const health = applyProfessionModules("healthcare");
  const supply = applyProfessionModules("supply-chain");

  const enginesReady =
    isOn(auto.autoAudit) || isOn(auto.autoLimits) || isOn(auto.autoScenarios) || isOn(auto.ready)
      ? "FAIL"
      : "REFUSED";

  const visibility = [
    chk(
      "Visibility.engine",
      "enableVisibilityWave gradual analogToDigitalHints",
      "REFUSED",
      "gradual=false analogToDigitalHints=false enginesReady=" + String(enginesReady === "FAIL"),
      "A slow fade-in of refused engines is still a false READY. Status chips may inspect truth only."
    ),
    chk(
      "Visibility.auditHints",
      "showAuditHints as activation progress",
      "ANALOG_CONTRACT",
      "autoAudit=" + String(isOn(auto.autoAudit)) + " Audit.engine=" + (auto.audit.find((c) => c.id === "Audit.engine")?.result || "UNKNOWN"),
      "Cockpit may label audit status REFUSED/ANALOG. That is not an audit-hint badge implying the engine is coming online."
    ),
    chk(
      "Visibility.limitHints",
      "showLimitHints as activation progress",
      "ANALOG_CONTRACT",
      "autoLimits=" + String(isOn(auto.autoLimits)),
      "limit-hint inspects that freeze/hold/block did not fire. HITL remains required."
    ),
    chk(
      "Visibility.scenarioHints",
      "showScenarioHints as activation progress",
      "ANALOG_CONTRACT",
      "autoScenarios=" + String(auto.autoScenarios) + " generated=" + auto.health.scenariosGenerated,
      "scenario-hint inspects generated=0. Templates stay analog."
    ),
    chk(
      "Visibility.domainProgressBars",
      "domain progress bars research → enable",
      "REFUSED",
      "hospitality=" + hosp.evidence.status + " healthcare=" + health.evidence.status,
      "A bar toward enable is a claim. Domain rows stay SKIPPED or ANALOG with enable=false."
    ),
    chk(
      "Visibility.digitalReadyKgMarkers",
      "KG nodes with digital-ready markers",
      precision.showCausalPaths === false && OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT" && OS_BLUEPRINT_HOOKS.nationalGraph === false
        ? "REFUSED"
        : "FAIL",
      "nationalGraph=" +
        String(isOn(OS_BLUEPRINT_HOOKS.nationalGraph)) +
        " causalQueryEngine=" +
        OS_BLUEPRINT_HOOKS.causalQueryEngine +
        " showCausalPaths=" +
        String(isOn(precision.showCausalPaths)),
      "Analog KG overlay is not digitally ready. Markers would invent compute."
    ),
  ];

  const engines = [
    chk(
      "Engine.autoAudit.ready",
      "Auto-Audit Engine already built / ready / continuous",
      enginesReady,
      "autoAudit=" + String(isOn(auto.autoAudit)) + " continuousAudit=" + String(isOn(auto.continuousAudit)),
      "Inspectable analog chains are not a continuous audit engine."
    ),
    chk(
      "Engine.autoLimits.ready",
      "Limit Enforcement Engine already built / ready",
      enginesReady,
      "autoLimits=" + String(auto.autoLimits) + " accountsFrozen=" + auto.health.accountsFrozen,
      "Advisory DIL noNewRisk is not automatic enforcement."
    ),
    chk(
      "Engine.autoScenarios.ready",
      "Auto-Scenario Engine already built / ready",
      enginesReady,
      "autoScenarios=" + String(auto.autoScenarios) + " generated=" + auto.health.scenariosGenerated,
      "Analog templates are not a data-driven generator."
    ),
    chk(
      "Engine.cross_domain_chain_integrity",
      "defineAuditRule healthcare+hospitality live chain",
      health.evidence.status === "SKIPPED_RESEARCH_REQUIRED" && hosp.evidence.status === "SKIPPED_RESEARCH_REQUIRED"
        ? "SKIPPED_RESEARCH_REQUIRED"
        : "FAIL",
      "cyber=" + (cyber.evidence?.status || "UNKNOWN") + " hospitality=" + hosp.evidence.status,
      "ABSENT catalogs cannot join a live cross-domain audit chain."
    ),
    chk(
      "Engine.global_risk_budget",
      "onBreach limit_hint firing",
      "REFUSED",
      "autoDecide=false accountsFrozen=" + auto.health.accountsFrozen,
      "Nothing breached. A hint that did not fire is not enforcement."
    ),
    chk(
      "Engine.auto_cross_domain_stress",
      "generateScenarioTemplate risk_spike + anomaly_cluster live",
      health.prediction.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "supply-chain=" + supply.prediction.status + " generated=" + auto.health.scenariosGenerated,
      "No invented ICU/occupancy→ops stress pack."
    ),
  ];

  const next = [
    chk(
      "Next.explainability",
      "Explainability Layer why audit/limit/scenario fired",
      "PREPARED_DISABLED",
      "engines not enabled · nothing fired",
      "Cannot explain an auto-action that is refused."
    ),
    chk(
      "Next.humanReview",
      "Human-in-the-loop Review Flow for auto-engines",
      "ANALOG_CONTRACT",
      "AGENT → PROPOSAL → HUMAN → DECISION already the product",
      "HITL is current contract. Auto-engine suggestions stay off."
    ),
    chk(
      "Next.causalPathPreview",
      "Digital KG Causal Path Preview before full activation",
      precision.showCausalPaths === false ? "REFUSED" : "FAIL",
      "showCausalPaths=false causalQueryEngine=ABSENT",
      "Preview of a refused causal engine is still a digital-ready claim."
    ),
    chk(
      "Next.domainWorkspaceTemplates",
      "Domain Workspace Templates hospitality healthcare cyber investment",
      hosp.evidence.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "cyber analog · hospitality SKIPPED · inventedSops=false",
      "ABSENT domains do not get invented workspace templates."
    ),
    chk(
      "Next.crossDomainLedgerRecon",
      "Cross-Domain Ledger Reconciliation ops ↔ finance ↔ cyber",
      "REFUSED",
      "durableLedger=false liveErp=" + String(ops.liveErp),
      "In-memory analog labels are not a reconciliation engine."
    ),
    chk(
      "Next.liveFeedQuality",
      "Live Feed Quality Scoring SIEM/broker/ERP",
      "REFUSED",
      "liveSiem=" + String(OS_BLUEPRINT_HOOKS.liveSiem) + " certified=false",
      "ABSENT feeds have no quality score. OPTIONAL_UNVERIFIED is not certified."
    ),
    chk(
      "Next.autoScenarioPrioritization",
      "Auto-Scenario Prioritization which scenario matters most",
      "PREPARED_DISABLED",
      "generated=0",
      "Nothing to rank until generation is refused."
    ),
  ];

  const domains = [
    {
      id: "cyber",
      result: "ANALOG_CONTRACT" as const,
      enable: false as const,
      digitalReady: false as const,
      progressBar: false as const,
      evidence: cyber.evidence?.status || "UNKNOWN",
    },
    {
      id: "investment",
      result: "ANALOG_CONTRACT" as const,
      enable: false as const,
      digitalReady: false as const,
      progressBar: false as const,
      evidence: inv.evidence?.status || "UNKNOWN",
    },
    {
      id: "ops",
      result: "ANALOG_CONTRACT" as const,
      enable: false as const,
      digitalReady: false as const,
      progressBar: false as const,
      evidence: ops.evidence?.status || "UNKNOWN",
    },
    {
      id: "healthcare",
      result: "SKIPPED_RESEARCH_REQUIRED" as const,
      enable: false as const,
      digitalReady: false as const,
      progressBar: false as const,
      evidence: health.evidence.status,
    },
    {
      id: "hospitality",
      result: "SKIPPED_RESEARCH_REQUIRED" as const,
      enable: false as const,
      digitalReady: false as const,
      progressBar: false as const,
      evidence: hosp.evidence.status,
    },
    {
      id: "supply-chain",
      result: "ANALOG_CONTRACT" as const,
      enable: false as const,
      digitalReady: false as const,
      progressBar: false as const,
      evidence: supply.evidence.status,
    },
  ];

  const all = [...visibility, ...engines, ...next];
  const fail = all.filter((c) => c.result === "FAIL").length;
  const refused = all.filter((c) => c.result === "REFUSED").length;
  const analog = all.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const skipped = all.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;
  const prepared = all.filter((c) => c.result === "PREPARED_DISABLED").length;

  return {
    ...VISIBILITY_PREP_HOOKS,
    holeless: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    visibility,
    engines,
    next,
    domains,
    health: {
      fail,
      refused,
      analogContract: analog,
      skippedResearchRequired: skipped,
      preparedDisabled: prepared,
      enginesReady: 0,
      digitalReadyMarkers: 0,
      progressBarsToEnable: 0,
      scenariosGenerated: auto.health.scenariosGenerated,
      accountsFrozen: auto.health.accountsFrozen,
    },
  };
}
