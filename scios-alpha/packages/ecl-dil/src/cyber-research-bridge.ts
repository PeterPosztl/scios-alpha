/**
 * SAFE cyber research + investment bridge wave.
 * Requested: cyber SKIPPED → RESEARCH_COMPLETE → ENABLED, then cyber↔investment PnL bridge.
 * Actual: cyber is already ANALOG_CONTRACT (PARTIAL). RESEARCH_COMPLETE and enableDomain stay REFUSED.
 * Bridge is an analog overlay (RiskEvent → Wave-1 risk). Not live SIEM, not live PnL.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT. No evidence ⇒ UNKNOWN, never PASS.
 */
import { applyOsBlueprint, buildOsBlueprintIntegration, OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { buildProfessionModuleExpansion } from "./profession-module-expansion.js";
import { buildRoleProfessionalInventory } from "./role-professional.js";

import { isOn } from "./honesty-flags.js";
export type CyberBridgeResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "FAIL";

export type CyberBridgeCheck = {
  id: string;
  requested: string;
  result: CyberBridgeResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function chk(
  id: string,
  requested: string,
  result: CyberBridgeResult,
  evidence: string,
  note: string
): CyberBridgeCheck {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false };
}

function coverage(requested: readonly string[], have: string[]) {
  const missing = requested.filter((x) => !have.includes(x));
  return { have: requested.length - missing.length, total: requested.length, missing };
}

export const CYBER_RESEARCH_CHECKLIST = {
  entities: ["Account", "Device", "IP", "Transaction", "Case", "Actor", "Campaign"],
  signals: ["login_pattern", "geo_location", "anomaly_score", "fraud_flags", "siem_event"],
  predictionTargets: ["fraud_probability", "breach_likelihood", "campaign_spread"],
  riskDimensions: ["financial_loss", "legal_risk", "reputational_risk", "compliance_risk"],
  decisions: ["block", "allow", "freeze", "escalate", "investigate", "notify"],
  evidenceChain: ["log", "alert_record", "case_file", "investigation_report", "approval_record"],
  requiredArtifacts: [
    "entity_schema_doc",
    "signal_schema_doc",
    "model_spec_doc",
    "risk_policy_doc",
    "evidence_chain_doc",
  ],
} as const;

export const INVESTMENT_BRIDGE_SPEC = {
  bridgeNode: "RiskEvent",
  wave1Kind: "risk" as const,
  edges: [
    { id: "cyber_incident_impacts_pnl", wave1: "AFFECTS" as const },
    { id: "cyber_incident_impacts_risk_budget", wave1: "AFFECTS" as const },
  ],
  chain: ["Case", "RiskEvent", "Scenario", "PnL"],
  scenarios: ["fraud_surge_scenario", "breach_scenario", "campaign_spread_scenario"],
  investmentResponses: ["reduce_size", "increase_hedge", "pause_strategy", "rebalance_portfolio"],
  responseMap: {
    reduce_size: "size",
    increase_hedge: "hedge",
    pause_strategy: "pause_strategy",
    rebalance_portfolio: "rebalance",
  },
} as const;

export const CYBER_BRIDGE_HOOKS = {
  schema: "sci-os-cyber-research-bridge/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  enabledFull: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  inventedSops: false as const,
  liveSiem: false as const,
  liveBroker: false as const,
  livePnlImpact: false as const,
  researchComplete: false as const,
  domainEnabled: false as const,
  ldaPass: false as const,
  nationalGraph: false as const,
  autoDecide: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Cyber analog schema is PARTIAL. RESEARCH_COMPLETE and enableDomain refused. Investment bridge is overlay labels only. Not READY.",
};

export function buildCyberResearchBridgeWave() {
  const os = buildOsBlueprintIntegration();
  const expansion = buildProfessionModuleExpansion();
  const inv = buildRoleProfessionalInventory();
  const cyber = os.blueprints.find((b) => b.id === "cyber");
  const investment = os.blueprints.find((b) => b.id === "investment");
  const ops = os.blueprints.find((b) => b.id === "ops");
  const hosp = expansion.professions.find((p) => p.id === "hospitality");
  const emptyApply = applyOsBlueprint("cyber");

  const entityCov = coverage(CYBER_RESEARCH_CHECKLIST.entities, cyber?.entities || []);
  const signalCov = coverage(CYBER_RESEARCH_CHECKLIST.signals, cyber?.signals || []);
  const predCov = coverage(CYBER_RESEARCH_CHECKLIST.predictionTargets, cyber?.prediction || []);
  const riskCov = coverage(CYBER_RESEARCH_CHECKLIST.riskDimensions, cyber?.riskDimensions || []);
  const decCov = coverage(CYBER_RESEARCH_CHECKLIST.decisions, cyber?.decisions || []);

  const context = [
    chk(
      "Context.cyberStatus",
      "cyberDomain SKIPPED_RESEARCH_REQUIRED",
      cyber?.result === "REGISTERED_ANALOG" ? "ANALOG_CONTRACT" : "FAIL",
      "catalog=" + (cyber?.catalogStatus || "UNKNOWN") + " result=" + (cyber?.result || "UNKNOWN"),
      "Cyber is not SKIPPED. Cybersecurity catalog is PARTIAL analog. Hospitality remains SKIPPED."
    ),
  ];

  const research = [
    chk(
      "Cyber.entities",
      "finalize entity schemas",
      entityCov.missing.length === 0 ? "ANALOG_CONTRACT" : "SKIPPED_RESEARCH_REQUIRED",
      "coverage=" + entityCov.have + "/" + entityCov.total + (entityCov.missing.length ? " missing=" + entityCov.missing.join(",") : ""),
      "Names exist on the analog blueprint. Not an independently reviewed entity schema pack."
    ),
    chk(
      "Cyber.signals",
      "finalize signal schemas",
      signalCov.missing.length === 0 ? "ANALOG_CONTRACT" : "SKIPPED_RESEARCH_REQUIRED",
      "coverage=" + signalCov.have + "/" + signalCov.total,
      "Signal labels only. liveSiem=false. Not venue-certified feeds."
    ),
    chk(
      "Cyber.models",
      "model spec fraud_probability / breach_likelihood / campaign_spread",
      predCov.missing.length === 0 ? "ANALOG_CONTRACT" : "SKIPPED_RESEARCH_REQUIRED",
      "coverage=" + predCov.have + "/" + predCov.total + " emptySeries=" + String((emptyApply.prediction.series || []).length === 0),
      "Target names exist. Model science remains UNVALIDATED. Empty payload ⇒ UNKNOWN series."
    ),
    chk(
      "Cyber.riskPolicies",
      "define risk policies with live thresholds",
      riskCov.missing.length === 0 ? "ANALOG_CONTRACT" : "SKIPPED_RESEARCH_REQUIRED",
      "coverage=" + riskCov.have + "/" + riskCov.total,
      "Dimension labels exist. No enforced live threshold engine."
    ),
    chk(
      "Cyber.evidenceChain",
      "define evidence chain with stored approvals",
      "ANALOG_CONTRACT",
      "steps=" + (cyber?.auditChain.steps || []).join("→"),
      "Analog audit template. Not a bound SIEM/case store."
    ),
    chk(
      "Cyber.requiredArtifacts",
      "entity/signal/model/risk/evidence docs RESEARCH_COMPLETE",
      "SKIPPED_RESEARCH_REQUIRED",
      "artifactsPresent=0/" + CYBER_RESEARCH_CHECKLIST.requiredArtifacts.length,
      "Analog field lists are not independent research docs. No evidence ⇒ UNKNOWN, never PASS."
    ),
    chk(
      "Cyber.researchComplete",
      "markDomainResearchComplete(cyber)",
      "REFUSED",
      "catalog=PARTIAL liveSiem=false inventedSops=false",
      "PARTIAL analog is not RESEARCH_COMPLETE. Cursor does not stamp COMPLETE without independent evidence."
    ),
  ];

  const enable = [
    chk(
      "Cyber.enableDomain",
      "enableDomain cyber prediction/risk/lineage/evidence/intelligence/decisions DIGITAL",
      emptyApply.prediction.status === "UNKNOWN" && emptyApply.intelligence.edge == null && OS_BLUEPRINT_HOOKS.enabled === false
        ? "REFUSED"
        : "FAIL",
      "prediction=" +
        emptyApply.prediction.status +
        " edge=" +
        String(emptyApply.intelligence.edge) +
        " liveSiem=" +
        String(isOn(emptyApply.liveSiem)),
      "Enable would invent SIEM scores. Cockpit stays analog/UNKNOWN without payload."
    ),
    chk(
      "Cyber.decisionsAuditReady",
      "block/allow/freeze/escalate templates audit-ready DIGITAL",
      decCov.missing.filter((d) => d !== "notify").length === 0 ? "ANALOG_CONTRACT" : "SKIPPED_RESEARCH_REQUIRED",
      "fields=" + (cyber?.decisionTemplate.fields || []).join(",") + " autoDecide=false",
      "Templates exist. Human remains decision maker."
    ),
  ];

  const mappedResponses = INVESTMENT_BRIDGE_SPEC.investmentResponses.filter((r) => {
    const mapped = INVESTMENT_BRIDGE_SPEC.responseMap[r];
    return (investment?.decisions || []).includes(mapped);
  });

  const bridge = [
    chk(
      "Bridge.RiskEvent",
      "RiskEvent schema linking cyber Case + investment Scenario DIGITAL",
      "ANALOG_CONTRACT",
      "node=" + INVESTMENT_BRIDGE_SPEC.bridgeNode + " wave1=" + INVESTMENT_BRIDGE_SPEC.wave1Kind,
      "Overlay label only. Not a new graph node runtime."
    ),
    chk(
      "Bridge.edges",
      "cyber_incident_impacts_pnl live edges",
      "ANALOG_CONTRACT",
      INVESTMENT_BRIDGE_SPEC.edges.map((e) => e.id + "→" + e.wave1).join(" · "),
      "Maps onto Wave-1 AFFECTS. Causal engine remains ABSENT."
    ),
    chk(
      "Bridge.scenarios",
      "fraud_surge / breach / campaign_spread populated scenarios",
      "SKIPPED_RESEARCH_REQUIRED",
      "labels=" + INVESTMENT_BRIDGE_SPEC.scenarios.join(",") + " populated=false",
      "Scenario names are forward-looking. No invented PnL paths."
    ),
    chk(
      "Bridge.responses",
      "reduce_size / hedge / pause / rebalance live from cyber incident",
      mappedResponses.length === INVESTMENT_BRIDGE_SPEC.investmentResponses.length ? "ANALOG_CONTRACT" : "SKIPPED_RESEARCH_REQUIRED",
      "mapped=" + mappedResponses.length + "/" + INVESTMENT_BRIDGE_SPEC.investmentResponses.length,
      "Investment decision labels already exist. Not auto-fired from a cyber case."
    ),
    chk(
      "Bridge.enable",
      "enable cyber↔investment PnL impact DIGITAL",
      "REFUSED",
      "livePnlImpact=false liveBroker=" + String(isOn(OS_BLUEPRINT_HOOKS.liveBroker)),
      "Bridge stays prepared overlay until investment research is independently complete — which it is not."
    ),
  ];

  const governance = [
    chk(
      "Governance.LDA",
      "allowDomainWorkspaces / roleExpansion / KGIntegration",
      "REFUSED",
      "required cyber/investment/ops RESEARCH_COMPLETE — none stamped",
      "LDA auto-compose remains GOVERNANCE > AGENT."
    ),
    chk(
      "Governance.KG",
      "causalQueryEngine ON + nationalGraph true",
      OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT" && OS_BLUEPRINT_HOOKS.nationalGraph === false
        ? "REFUSED"
        : "FAIL",
      "causalQueryEngine=" + OS_BLUEPRINT_HOOKS.causalQueryEngine,
      "causal_engine_spec / audit_engine_spec / risk_policy_enforcement_spec ABSENT."
    ),
    chk(
      "Governance.seedsRoles",
      "191 seeds COMPLETE + RoleCatalog 200/200",
      "REFUSED",
      "fullySpecified=" + inv.registry.rolesFullySpecified + " researchRequired=" + inv.registry.rolesResearchRequired,
      "9 archetypes remain the only fully specified roles."
    ),
    chk(
      "Governance.hospitalityOps",
      "collect all domain research-complete docs",
      "SKIPPED_RESEARCH_REQUIRED",
      "hospitality=" +
        (hosp?.result || "UNKNOWN") +
        " ops=" +
        (ops?.catalogStatus || "UNKNOWN") +
        " investment=" +
        (investment?.catalogStatus || "UNKNOWN"),
      "Activation Review package cannot stamp PASS. Analog inventories only."
    ),
  ];

  const cockpit = [
    chk(
      "Cockpit.Prediction",
      "plug real cyber signals + models → series ≠ UNKNOWN",
      emptyApply.prediction.status === "UNKNOWN" ? "REFUSED" : "FAIL",
      "needs=validated_signals,domain_enable missing",
      "INSPECT_ONLY. Empty series stays UNKNOWN."
    ),
    chk(
      "Cockpit.Lineage",
      "event→alert→case→decision DIGITAL causal paths",
      "REFUSED",
      "needs=digital_kg,causal_engine",
      "Analog chain labels only."
    ),
    chk(
      "Cockpit.Intelligence",
      "edge computed (not null) without payload",
      emptyApply.intelligence.edge == null ? "REFUSED" : "FAIL",
      "needs=edge_models,risk_budget",
      "Edge without analog payload stays UNKNOWN/null."
    ),
    chk(
      "Cockpit.Decisions",
      "auto-compute decisions from cyber+investment",
      "ANALOG_CONTRACT",
      "autoDecide=false",
      "Keep autoDecide=false until governance explicitly allows it — it does not."
    ),
  ];

  const all = [...context, ...research, ...enable, ...bridge, ...governance, ...cockpit];
  const fail = all.filter((c) => c.result === "FAIL").length;
  const refused = all.filter((c) => c.result === "REFUSED").length;
  const analog = all.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const skipped = all.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;

  return {
    ...CYBER_BRIDGE_HOOKS,
    holeless: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    next: {
      now: "Keep cyber ANALOG_CONTRACT. Do not stamp RESEARCH_COMPLETE.",
      next: "Investment bridge overlay ready; investment catalog still PARTIAL.",
      later: "LDA / KG / seeds / roles stay REFUSED until independent evidence exists.",
      cockpit: "Inspect → compute is blocked on validated signals, causal engine, and governance.",
    },
    checklist: CYBER_RESEARCH_CHECKLIST,
    bridgeSpec: INVESTMENT_BRIDGE_SPEC,
    context,
    research,
    enable,
    bridge,
    governance,
    cockpit,
    health: {
      fail,
      refused,
      analogContract: analog,
      skippedResearchRequired: skipped,
      cyberEnabled: 0,
      liveSiem: 0,
      livePnlImpact: 0,
      artifactsPresent: 0,
    },
  };
}
