/**
 * SAFE enterprise prep wave.
 * Requested: live cross-domain scenario engine, durable ledger, SIEM/broker/ERP ingestion.
 * Actual: analog/STUB overlays only. Live ingestion, durable fabric, and ABSENT-domain
 * propagation stay REFUSED. Next-wave auto-* specs are prepared and disabled.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT. No evidence ⇒ UNKNOWN, never PASS.
 */
import { defaultFeedStatus } from "./feeds.js";
import {
  applyOsBlueprint,
  OS_BLUEPRINT_HOOKS,
} from "./os-blueprint-integration.js";
import { applyProfessionModules } from "./profession-module-expansion.js";
import { buildCyberResearchBridgeWave } from "./cyber-research-bridge.js";
import { NEXT_WAVE_PREP } from "./activation-review.js";

import { isOn } from "./honesty-flags.js";
export type EnterprisePrepResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type EnterprisePrepCheck = {
  id: string;
  requested: string;
  result: EnterprisePrepResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function chk(
  id: string,
  requested: string,
  result: EnterprisePrepResult,
  evidence: string,
  note: string
): EnterprisePrepCheck {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false };
}

export const ENTERPRISE_SCENARIOS = [
  {
    id: "cyber_breach_impacts_pnl",
    from: "cyber",
    to: "investment",
    trigger: "breach_event",
    effects: ["pnl_drop", "volatility_spike", "liquidity_risk"],
    analog: true,
  },
  {
    id: "fraud_surge_impacts_ops",
    from: "cyber",
    to: "ops",
    trigger: "fraud_surge",
    effects: ["order_freeze", "payment_hold", "ledger_delay"],
    analog: true,
  },
  {
    id: "icu_overload_impacts_supplychain",
    from: "healthcare",
    to: "supply_chain",
    trigger: "icu_overload",
    effects: ["urgent_procurement", "route_priority", "stockout_risk"],
    analog: false,
  },
  {
    id: "hospitality_demand_spike_impacts_finance",
    from: "hospitality",
    to: "investment",
    trigger: "demand_spike",
    effects: ["revenue_forecast_up", "risk_budget_shift"],
    analog: false,
  },
] as const;

export const ENTERPRISE_PREP_HOOKS = {
  schema: "sci-os-enterprise-prep/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  enabledFull: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  autoDecide: false as const,
  inventedSops: false as const,
  liveIngestion: false as const,
  liveSiem: false as const,
  liveBroker: false as const,
  liveErp: false as const,
  durableLedger: false as const,
  crossDomainEngine: false as const,
  allowRiskPropagation: false as const,
  allowPnLPropagation: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Enterprise prep. Live SIEM/broker/ERP ingestion, durable ledger, and ABSENT-domain propagation are REFUSED. Scenario labels overlay Wave-1 AFFECTS. Next-wave auto-* stays PREPARED_DISABLED. Not READY.",
};

export function buildEnterprisePrepWave() {
  const feeds = defaultFeedStatus();
  const cyber = buildCyberResearchBridgeWave();
  const hosp = applyProfessionModules("hospitality");
  const health = applyProfessionModules("healthcare");
  const cyberApply = applyOsBlueprint("cyber");
  const opsApply = applyOsBlueprint("ops");
  const liveEnv = process.env.SCI_DIL_FEED === "live_unverified";

  const scenarios = [
    chk(
      "Scenario.engine",
      "registerScenarioEngine allowCrossDomain + PnL/ops/healthcare/hospitality propagation",
      "REFUSED",
      "crossDomainEngine=false allowPnLPropagation=false",
      "A live scenario engine would invent cross-domain effects. Overlay labels only."
    ),
    chk(
      "Scenario.cyber_breach_impacts_pnl",
      "defineScenario cyber→investment live PnL",
      cyber.livePnlImpact === false && cyberApply.intelligence.edge == null ? "ANALOG_CONTRACT" : "FAIL",
      "bridge=RiskEvent→risk livePnlImpact=false populated=false",
      "Existing analog overlay. Not a computed pnl_drop path."
    ),
    chk(
      "Scenario.fraud_surge_impacts_ops",
      "defineScenario cyber→ops live freeze/hold",
      opsApply.liveErp === false ? "ANALOG_CONTRACT" : "FAIL",
      "ops catalog=STUB liveErp=false",
      "SAP-alt step labels only. Not a live order freeze."
    ),
    chk(
      "Scenario.icu_overload_impacts_supplychain",
      "defineScenario healthcare→supply_chain DIGITAL",
      health.prediction.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "healthcare=" + health.prediction.status,
      "ABSENT catalog. No invented ICU procurement path."
    ),
    chk(
      "Scenario.hospitality_demand_spike_impacts_finance",
      "defineScenario hospitality→investment DIGITAL",
      hosp.prediction.status === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "hospitality=" + hosp.prediction.status,
      "ABSENT catalog. Occupancy payload is ignored."
    ),
  ];

  const ledger = [
    chk(
      "Ledger.enableDurable",
      "enableDurableLedger immutable auditReady crossDomain",
      NEXT_WAVE_PREP.digitalLedger.enabled === false && NEXT_WAVE_PREP.digitalLedger.status === "ABSENT"
        ? "REFUSED"
        : "FAIL",
      "ledger=in-memory durable=false persisted=false",
      "ECL ledger is in-memory. Durable fabric is P2, not ALPHA GO."
    ),
    chk(
      "Ledger.ops_finance",
      "defineLedgerStream ops_finance immutable",
      "PREPARED_DISABLED",
      "entries=order,fulfillment,invoice,payment,ledger_post",
      "SAP-alt labels overlay GW1. Not bound to a ledger."
    ),
    chk(
      "Ledger.cyber_finance",
      "defineLedgerStream cyber_finance immutable",
      "PREPARED_DISABLED",
      "entries=incident,risk_event,pnl_impact,audit_entry",
      "Session audit analog. Not an immutable hash fabric."
    ),
    chk(
      "Ledger.healthcare_supply",
      "defineLedgerStream healthcare_supply immutable",
      "SKIPPED_RESEARCH_REQUIRED",
      "healthcare ABSENT",
      "Cannot post ICU load to a durable stream that does not exist."
    ),
  ];

  const live = [
    chk(
      "Feed.siem_mapping",
      "registerLiveFeed siem_feed cyber signals",
      "ANALOG_CONTRACT",
      "signals=login_pattern,geo_location,anomaly_score,siem_event liveSiem=false",
      "Signal names exist on the cyber analog blueprint. Not a SOC connector."
    ),
    chk(
      "Feed.broker_mapping",
      "registerLiveFeed broker_feed investment signals",
      "ANALOG_CONTRACT",
      "signals=price,volume,volatility,orderflow liveBroker=false",
      "Signal names exist. Not a venue-certified broker."
    ),
    chk(
      "Feed.erp_mapping",
      "registerLiveFeed erp_feed ops signals",
      "ANALOG_CONTRACT",
      "signals=order,fulfillment,invoice,payment liveErp=false",
      "SAP-alt labels. Not an ERP adapter."
    ),
    chk(
      "Feed.enableLiveIngestion",
      "enableLiveIngestion siem=true broker=true erp=true",
      OS_BLUEPRINT_HOOKS.liveSiem === false &&
        OS_BLUEPRINT_HOOKS.liveBroker === false &&
        OS_BLUEPRINT_HOOKS.liveErp === false &&
        (!liveEnv || feeds.liveAdapter === "OPTIONAL_UNVERIFIED")
        ? "REFUSED"
        : "FAIL",
      "liveAdapter=" +
        feeds.liveAdapter +
        " SCI_DIL_FEED=" +
        (process.env.SCI_DIL_FEED || "unset") +
        " liveSiem=" +
        String(isOn(OS_BLUEPRINT_HOOKS.liveSiem)),
      "Enterprise live ingestion is refused. live_unverified is still UNVERIFIED, not certified SIEM/broker/ERP."
    ),
  ];

  const next = [
    chk(
      "Next.autoAudit",
      "prepare_auto_audit_engine_spec enabled",
      "PREPARED_DISABLED",
      "autoApply=" + String(isOn(NEXT_WAVE_PREP.autoAudit.autoApply)),
      "Auto-audit would violate GOVERNANCE > AGENT."
    ),
    chk(
      "Next.autoLimits",
      "prepare_limit_enforcement_engine_spec enabled",
      "PREPARED_DISABLED",
      "enabled=" + String(isOn(NEXT_WAVE_PREP.autoLimits.enabled)),
      "No live domain limit engine."
    ),
    chk(
      "Next.autoScenario",
      "prepare_auto_scenario_generation_spec enabled",
      "PREPARED_DISABLED",
      "populated=false",
      "Cursor does not auto-generate specialist scenario packs."
    ),
    chk(
      "Next.autoPnLExplain",
      "prepare_pnl_explainability_spec live",
      "PREPARED_DISABLED",
      "livePnlImpact=false",
      "Explainability stays analog/UNKNOWN without a proven path."
    ),
    chk(
      "Next.autoOpsRouting",
      "prepare_ops_routing_ai_spec live",
      "PREPARED_DISABLED",
      "secondWorkflowEngine=" + String(isOn(OS_BLUEPRINT_HOOKS.secondWorkflowEngine)),
      "No second workflow engine. GW1 analog only."
    ),
  ];

  const all = [...scenarios, ...ledger, ...live, ...next];
  const fail = all.filter((c) => c.result === "FAIL").length;
  const refused = all.filter((c) => c.result === "REFUSED").length;
  const analog = all.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const skipped = all.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;
  const prepared = all.filter((c) => c.result === "PREPARED_DISABLED").length;

  return {
    ...ENTERPRISE_PREP_HOOKS,
    holeless: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    scenarios,
    ledger,
    live,
    next,
    scenarioCatalog: ENTERPRISE_SCENARIOS.map((s) => ({
      ...s,
      populated: false as const,
      live: false as const,
    })),
    ledgerStreams: {
      ops_finance: { prepared: true as const, enabled: false as const, immutableRuntime: false as const },
      cyber_finance: { prepared: true as const, enabled: false as const, immutableRuntime: false as const },
      healthcare_supply: { prepared: false as const, enabled: false as const, result: "SKIPPED_RESEARCH_REQUIRED" as const },
    },
    liveFeeds: {
      siem_feed: { mapped: true as const, enabled: false as const, certified: false as const },
      broker_feed: { mapped: true as const, enabled: false as const, certified: false as const },
      erp_feed: { mapped: true as const, enabled: false as const, certified: false as const },
    },
    health: {
      fail,
      refused,
      analogContract: analog,
      skippedResearchRequired: skipped,
      preparedDisabled: prepared,
      liveIngestion: 0,
      durableStreams: 0,
      populatedScenarios: 0,
    },
  };
}
