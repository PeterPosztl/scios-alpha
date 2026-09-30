/**
 * SAFE automation prep wave.
 * Requested: continuous auto-audit, automatic limit breach actions, data-driven scenario generation.
 * Actual: analog chain/policy templates only. Continuous engines, auto freeze/hold/block, and
 * ABSENT-domain generation stay REFUSED. Human remains decision maker.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT. No evidence ⇒ UNKNOWN, never PASS.
 */
import { applyOsBlueprint, OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { applyProfessionModules } from "./profession-module-expansion.js";
import { NEXT_WAVE_PREP } from "./activation-review.js";
import { buildEnterprisePrepWave } from "./enterprise-prep.js";

import { isOn } from "./honesty-flags.js";
export type AutomationPrepResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type AutomationPrepCheck = {
  id: string;
  requested: string;
  result: AutomationPrepResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function chk(
  id: string,
  requested: string,
  result: AutomationPrepResult,
  evidence: string,
  note: string
): AutomationPrepCheck {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false };
}

export const AUTOMATION_PREP_HOOKS = {
  schema: "sci-os-automation-prep/v1" as const,
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
  inventedSops: false as const,
  continuousAudit: false as const,
  usesDurableLedger: false as const,
  usesDigitalKg: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Automation prep. Continuous auto-audit, automatic freeze/hold/block, and data-driven scenario generation are REFUSED. Analog templates remain inspectable. AGENT → PROPOSAL → HUMAN → DECISION. Not READY.",
};

export function buildAutomationPrepWave() {
  const enterprise = buildEnterprisePrepWave();
  const cyber = applyOsBlueprint("cyber");
  const inv = applyOsBlueprint("investment");
  const ops = applyOsBlueprint("ops");
  const hosp = applyProfessionModules("hospitality");
  const health = applyProfessionModules("healthcare");

  const audit = [
    chk(
      "Audit.engine",
      "registerAuditEngine continuous + crossDomain + usesLedger + usesKG",
      enterprise.durableLedger === false && OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT"
        ? "REFUSED"
        : "FAIL",
      "durableLedger=false causalQueryEngine=" + OS_BLUEPRINT_HOOKS.causalQueryEngine + " autoApply=" + String(isOn(NEXT_WAVE_PREP.autoAudit.autoApply)),
      "Continuous audit on an in-memory analog overlay is not an enterprise audit engine."
    ),
    chk(
      "Audit.cyber_incident_chain_complete",
      "defineAuditRule cyber onMissing flag_audit_gap live",
      "ANALOG_CONTRACT",
      "steps=" + (cyber.evidence?.steps || []).join("→") + " evidenceBound=" + String(isOn(cyber.evidence?.evidenceBound)),
      "Analog audit template. Gaps stay UNKNOWN without a bound chain."
    ),
    chk(
      "Audit.investment_decision_chain_complete",
      "defineAuditRule investment live",
      "ANALOG_CONTRACT",
      "steps=" + (inv.evidence?.steps || []).join("→"),
      "Analog investment audit labels. Not a trade blotter."
    ),
    chk(
      "Audit.ops_order_to_ledger_complete",
      "defineAuditRule ops live ledger_post",
      "ANALOG_CONTRACT",
      "steps=" + (ops.evidence?.steps || []).join("→") + " liveErp=" + String(isOn(ops.liveErp)),
      "SAP-alt labels. Not posted to a durable ledger."
    ),
    chk(
      "Audit.healthcare_icu_overload_chain",
      "defineAuditRule healthcare live",
      health.evidence.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "healthcare=" + health.evidence.status,
      "ABSENT catalog. Do not invent ICU audit gaps."
    ),
    chk(
      "Audit.hospitality_demand_to_revenue_chain",
      "defineAuditRule hospitality live",
      hosp.evidence.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "hospitality=" + hosp.evidence.status,
      "ABSENT catalog. Occupancy is not an audit source."
    ),
  ];

  const limits = [
    chk(
      "Limit.engine",
      "registerLimitEngine automatic crossDomain usesRisk usesPnL",
      "REFUSED",
      "autoLimits.enabled=" + String(isOn(NEXT_WAVE_PREP.autoLimits.enabled)) + " autoDecide=false",
      "Automatic enforcement would freeze/hold/block without a human. GOVERNANCE > AGENT."
    ),
    chk(
      "Limit.investment_risk_budget",
      "onBreach block_new_risk + reduce_size automatic",
      "ANALOG_CONTRACT",
      "DIL noNewRisk is advisory SIMULATION_ONLY · not a broker kill-switch",
      "Existing DIL guardrail proposes avoid/size=0. It does not auto-trade or auto-reduce."
    ),
    chk(
      "Limit.cyber_incident_tolerance",
      "onBreach escalate_to_soc + freeze_high_risk_accounts automatic",
      "REFUSED",
      "liveSiem=" + String(isOn(OS_BLUEPRINT_HOOKS.liveSiem)) + " autoDecide=false",
      "Account freeze is a human decision. Templates stay analog."
    ),
    chk(
      "Limit.ops_payment_risk",
      "onBreach hold_payments + require_manual_approval automatic",
      "REFUSED",
      "liveErp=" + String(isOn(OS_BLUEPRINT_HOOKS.liveErp)),
      "Payment hold cannot run on SAP-alt labels. Manual approval is already the product contract."
    ),
  ];

  const scenarios = [
    chk(
      "ScenarioGen.engine",
      "registerScenarioGenerator dataDriven usesKG usesLedger",
      enterprise.crossDomainEngine === false ? "REFUSED" : "FAIL",
      "crossDomainEngine=false populatedScenarios=" + enterprise.health.populatedScenarios,
      "Cursor does not auto-compose specialist scenario packs from analog overlays."
    ),
    chk(
      "ScenarioGen.cyber_pattern_to_investment_stress",
      "generateScenarioTemplate cyber→investment live",
      "ANALOG_CONTRACT",
      "overlay=RiskEvent→AFFECTS populated=false livePnlImpact=false",
      "Inspectable template only. Not fired from anomaly_score."
    ),
    chk(
      "ScenarioGen.healthcare_load_to_supplychain_stress",
      "generateScenarioTemplate healthcare→supply_chain live",
      health.prediction.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "icu_load ignored on ABSENT catalog",
      "No invented urgent procurement scenario."
    ),
    chk(
      "ScenarioGen.hospitality_demand_to_finance_scenario",
      "generateScenarioTemplate hospitality→investment live",
      hosp.prediction.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "demand_spike ignored on ABSENT catalog",
      "No invented occupancy→revenue scenario."
    ),
  ];

  const next = [
    chk(
      "Next.explainability",
      "explainability layer why a limit/audit/scenario fired",
      "PREPARED_DISABLED",
      "engines not enabled · nothing fired",
      "Cannot explain an auto-action that is refused."
    ),
    chk(
      "Next.humanInTheLoop",
      "human-in-the-loop review for auto decisions",
      "ANALOG_CONTRACT",
      "AGENT → PROPOSAL → HUMAN → DECISION already the product",
      "HITL is current contract, not a future unlock. Auto decisions stay off."
    ),
  ];

  const all = [...audit, ...limits, ...scenarios, ...next];
  const fail = all.filter((c) => c.result === "FAIL").length;
  const refused = all.filter((c) => c.result === "REFUSED").length;
  const analog = all.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const skipped = all.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;
  const prepared = all.filter((c) => c.result === "PREPARED_DISABLED").length;

  return {
    ...AUTOMATION_PREP_HOOKS,
    holeless: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    audit,
    limits,
    scenarios,
    next,
    health: {
      fail,
      refused,
      analogContract: analog,
      skippedResearchRequired: skipped,
      preparedDisabled: prepared,
      autoActions: 0,
      accountsFrozen: 0,
      paymentsHeld: 0,
      scenariosGenerated: 0,
    },
  };
}
