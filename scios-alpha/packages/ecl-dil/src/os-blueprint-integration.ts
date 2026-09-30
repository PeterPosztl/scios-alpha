/**
 * OS blueprint integration — cyber / investment / ops analog contracts.
 * Maps onto existing Cockpit modules and Wave-1 ontology. Not Palantir, not SAP, not SIEM.
 * 9 archetypes unchanged. Hospitality/healthcare remain RESEARCH_REQUIRED via profession expansion.
 * ALPHA_NON_PRODUCTION. SIMULATION_ONLY. Not READY.
 */
import { buildRoleProfessionalInventory, type SciRoleCatalogId } from "./role-professional.js";

export const OS_BLUEPRINT_HOOKS = {
  schema: "sci-os-os-blueprint-integration/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  enabledFull: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  inventedSops: false as const,
  liveDomainData: false as const,
  liveSiem: false as const,
  liveBroker: false as const,
  liveErp: false as const,
  nationalGraph: false as const,
  causalQueryEngine: "ABSENT" as const,
  secondWorkflowEngine: false as const,
  secondShell: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Cyber/investment/ops blueprints compose into Prediction/Risk/Lineage/Evidence/Intelligence/Decisions. Schemas only. Not Palantir Foundry, not SAP, not a live SOC.",
};

export type OsBlueprintId = "cyber" | "investment" | "ops";

type CatalogStatus = "PARTIAL" | "STUB" | "ABSENT";
type AdapterStatus = "REGISTERED_ANALOG" | "SKIPPED_RESEARCH_REQUIRED" | "UNKNOWN";

const WAVE1_NODE_KINDS = ["entity", "event", "decision", "risk", "evidence", "policy"] as const;
const WAVE1_RELATIONS = [
  "PRODUCES",
  "TRAINS",
  "SUPPORTS",
  "REQUIRES",
  "MAY_REQUIRE",
  "CHANGES",
  "EVALUATES",
  "AFFECTS",
  "MODIFIES",
  "VALIDATES",
  "PROVES",
] as const;

/** Overlay labels → Wave-1 kinds. Extra Palantir-style names are aliases, not a new graph engine. */
export const KG_NODE_MAP = {
  Person: "entity",
  Org: "entity",
  Asset: "entity",
  Event: "event",
  Case: "entity",
  Instrument: "entity",
  Policy: "policy",
  Risk: "risk",
  RiskEvent: "risk",
  Decision: "decision",
  Evidence: "evidence",
} as const;

export const KG_EDGE_MAP = {
  owns: "SUPPORTS",
  trades: "AFFECTS",
  alerts: "PRODUCES",
  investigates: "REQUIRES",
  impacts: "AFFECTS",
  violates: "MAY_REQUIRE",
  mitigates: "CHANGES",
  approves: "PROVES",
  belongs_to: "SUPPORTS",
  triggers: "PRODUCES",
  results_in: "PROVES",
  exposes: "AFFECTS",
  supported_by: "PROVES",
  governs: "REQUIRES",
  cyber_incident_impacts_pnl: "AFFECTS",
  cyber_incident_impacts_risk_budget: "AFFECTS",
} as const;

export type OsBlueprintSpec = {
  id: OsBlueprintId;
  catalogId: SciRoleCatalogId;
  label: string;
  analogRoles: string[];
  catalogStatus: CatalogStatus;
  entities: string[];
  signals: string[];
  prediction: string[];
  riskDimensions: string[];
  decisions: string[];
  lineage: string[];
  evidence: string[];
  workflows: string[];
  series: { id: string; label: string; sourceField: string; panel: "PredictionPanel" };
  riskMatrix: { id: string; rows: string[]; cols: string[]; panel: "RiskPanel" };
  kgChain: { id: string; nodes: string[]; panel: "LineagePanel" };
  auditChain: { id: string; steps: string[]; panel: "EvidencePanel" };
  edgeDetector: { id: string; formula: string; leftField: string; rightField: string; panel: "Intelligence" };
  decisionTemplate: { id: string; title: string; fields: string[]; panel: "Decisions" };
  liveSiem: false;
  liveBroker: false;
  liveErp: false;
  inventedSops: false;
};

const SPECS: OsBlueprintSpec[] = [
  {
    id: "cyber",
    catalogId: "Cybersecurity",
    label: "Cyber OS analog",
    analogRoles: ["arch.soc_analyst", "arch.fraud_investigator"],
    catalogStatus: "PARTIAL",
    entities: ["Account", "Device", "IP", "Transaction", "Case", "Actor", "Campaign", "Indicator"],
    signals: ["login_pattern", "geo_location", "anomaly_score", "fraud_flags", "darkweb_intel", "siem_event"],
    prediction: ["fraud_probability", "breach_likelihood", "campaign_spread", "lateral_movement_risk"],
    riskDimensions: ["financial_loss", "legal_risk", "reputational_risk", "compliance_risk"],
    decisions: ["block", "allow", "freeze", "escalate", "investigate", "notify"],
    lineage: ["event", "alert", "case", "investigation", "decision", "outcome"],
    evidence: ["logs", "transactions", "intel_reports", "screenshots", "custody_chain"],
    workflows: ["alert_triage", "case_management", "threat_hunting", "incident_response"],
    series: {
      id: "cyber-series",
      label: "Fraud / breach analog series",
      sourceField: "fraud_probability",
      panel: "PredictionPanel",
    },
    riskMatrix: {
      id: "cyber-risk",
      rows: ["financial_loss", "legal_risk", "reputational_risk", "compliance_risk"],
      cols: ["Low", "Medium", "High"],
      panel: "RiskPanel",
    },
    kgChain: {
      id: "cyber-lineage",
      nodes: ["event", "alert", "case", "investigation", "decision", "outcome"],
      panel: "LineagePanel",
    },
    auditChain: {
      id: "cyber-audit",
      steps: ["log", "alert", "case", "report", "approval"],
      panel: "EvidencePanel",
    },
    edgeDetector: {
      id: "cyber-edge",
      formula: "anomaly_minus_baseline",
      leftField: "anomaly_score",
      rightField: "baseline",
      panel: "Intelligence",
    },
    decisionTemplate: {
      id: "cyber-decision",
      title: "Triage / contain",
      fields: ["block", "allow", "freeze", "escalate", "investigate"],
      panel: "Decisions",
    },
    liveSiem: false,
    liveBroker: false,
    liveErp: false,
    inventedSops: false,
  },
  {
    id: "investment",
    catalogId: "Finance",
    label: "Investment OS analog",
    analogRoles: ["arch.market_analyst", "arch.fin_risk_analyst", "arch.prediction_decision_analyst"],
    catalogStatus: "PARTIAL",
    entities: ["Instrument", "Portfolio", "Strategy", "Scenario", "Counterparty", "Market", "Venue"],
    signals: ["price", "volume", "volatility", "macro", "news", "onchain", "orderflow", "altdata"],
    prediction: ["pnl_distribution", "drawdown", "tail_risk", "scenario_outcome", "hit_rate"],
    riskDimensions: ["market_risk", "credit_risk", "liquidity_risk", "counterparty_risk", "model_risk", "operational_risk"],
    decisions: ["size", "enter", "exit", "hedge", "rebalance", "pause_strategy"],
    lineage: ["data", "model", "scenario", "decision", "trade", "realized_pnl"],
    evidence: ["backtest", "stress_test", "approvals", "limit_check", "audit_trail"],
    workflows: ["idea", "research", "scenario", "decision", "execution_sim", "review"],
    series: {
      id: "investment-series",
      label: "PnL / drawdown analog series",
      sourceField: "pnl_distribution",
      panel: "PredictionPanel",
    },
    riskMatrix: {
      id: "investment-risk",
      rows: ["market", "credit", "liquidity", "counterparty", "model", "operational"],
      cols: ["Low", "Medium", "High"],
      panel: "RiskPanel",
    },
    kgChain: {
      id: "investment-lineage",
      nodes: ["data", "model", "scenario", "decision", "trade", "realized_pnl"],
      panel: "LineagePanel",
    },
    auditChain: {
      id: "investment-audit",
      steps: ["backtest", "stress_test", "limit_check", "approval", "audit_entry"],
      panel: "EvidencePanel",
    },
    edgeDetector: {
      id: "investment-edge",
      formula: "expected_pnl_minus_risk_budget",
      leftField: "expected_pnl",
      rightField: "risk_budget",
      panel: "Intelligence",
    },
    decisionTemplate: {
      id: "investment-decision",
      title: "Size / enter / hedge",
      fields: ["size", "enter", "exit", "hedge", "rebalance"],
      panel: "Decisions",
    },
    liveSiem: false,
    liveBroker: false,
    liveErp: false,
    inventedSops: false,
  },
  {
    id: "ops",
    catalogId: "SupplyChain",
    label: "Ops / SAP-alt analog",
    analogRoles: [],
    catalogStatus: "STUB",
    entities: ["Order", "Fulfillment", "Invoice", "Payment", "Ledger", "Demand", "Plan"],
    signals: ["fill_rate", "delay", "backorder", "invoice_age"],
    prediction: ["fill", "delay", "demand"],
    riskDimensions: ["supplier", "transit", "inventory", "demand"],
    decisions: ["approve", "reject", "reroute", "replan"],
    lineage: ["order", "process", "approve", "post", "report"],
    evidence: ["document", "transaction", "policy", "approval", "ledger_entry"],
    workflows: ["Order", "Fulfillment", "Invoice", "Payment", "Ledger", "Demand", "Plan", "Procure", "Store", "Deliver"],
    series: {
      id: "ops-series",
      label: "Fill / delay analog series",
      sourceField: "fill",
      panel: "PredictionPanel",
    },
    riskMatrix: {
      id: "ops-risk",
      rows: ["supplier", "transit", "inventory", "demand"],
      cols: ["Low", "Medium", "High"],
      panel: "RiskPanel",
    },
    kgChain: {
      id: "ops-lineage",
      nodes: ["order", "process", "approve", "post", "report"],
      panel: "LineagePanel",
    },
    auditChain: {
      id: "ops-audit",
      steps: ["document", "transaction", "policy", "approval", "ledger_entry"],
      panel: "EvidencePanel",
    },
    edgeDetector: {
      id: "ops-edge",
      formula: "fill_minus_demand",
      leftField: "fill",
      rightField: "demand",
      panel: "Intelligence",
    },
    decisionTemplate: {
      id: "ops-decision",
      title: "Approve / reroute / replan",
      fields: ["approve", "reject", "reroute", "replan"],
      panel: "Decisions",
    },
    liveSiem: false,
    liveBroker: false,
    liveErp: false,
    inventedSops: false,
  },
];

function finiteSeries(raw: unknown, field: string): Array<{ y: number }> {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as Record<string, unknown>)[field];
  if (!Array.isArray(list)) return [];
  return list
    .map((v) => {
      const y = v && typeof v === "object" ? Number((v as { y?: unknown }).y) : Number(v);
      return Number.isFinite(y) ? { y } : null;
    })
    .filter((p): p is { y: number } => p !== null);
}

export function osBlueprintById(id: string): OsBlueprintSpec | undefined {
  return SPECS.find((b) => b.id === id || b.catalogId === id || b.analogRoles.includes(id));
}

export function osBlueprintForRole(roleId: string): OsBlueprintSpec | undefined {
  return SPECS.find((b) => b.analogRoles.includes(roleId));
}

export function applyOsBlueprint(id: string, payload?: Record<string, unknown>) {
  const b = osBlueprintById(id);
  if (!b) {
    return {
      blueprintId: id,
      status: "UNKNOWN" as AdapterStatus,
      prediction: { status: "UNKNOWN" as const, series: [] as Array<{ y: number }>, invented: false as const },
      intelligence: { status: "UNKNOWN" as const, edge: null as number | null, invented: false as const },
      autoTrade: false as const,
      liveSiem: false as const,
      liveBroker: false as const,
      liveErp: false as const,
      inventedSops: false as const,
    };
  }
  if (b.catalogStatus === "ABSENT") {
    return {
      blueprintId: b.id,
      status: "SKIPPED_RESEARCH_REQUIRED" as AdapterStatus,
      prediction: { status: "SKIPPED_RESEARCH_REQUIRED" as const, series: [] as Array<{ y: number }>, invented: false as const, live: false as const },
      risk: { status: "SKIPPED_RESEARCH_REQUIRED" as const, adapter: b.riskMatrix, invented: false as const },
      lineage: { status: "SKIPPED_RESEARCH_REQUIRED" as const, nodes: b.kgChain.nodes, populated: false as const },
      evidence: { status: "SKIPPED_RESEARCH_REQUIRED" as const, steps: b.auditChain.steps, evidenceBound: false as const },
      intelligence: { status: "SKIPPED_RESEARCH_REQUIRED" as const, edge: null as number | null, invented: false as const },
      decisions: { status: "SKIPPED_RESEARCH_REQUIRED" as const, template: b.decisionTemplate, autoDecide: false as const },
      autoTrade: false as const,
      liveSiem: false as const,
      liveBroker: false as const,
      liveErp: false as const,
      inventedSops: false as const,
    };
  }
  const series = finiteSeries(payload, b.series.sourceField);
  const left = Number(payload && payload[b.edgeDetector.leftField]);
  const right = Number(payload && payload[b.edgeDetector.rightField]);
  const edgeOk = Number.isFinite(left) && Number.isFinite(right);
  return {
    blueprintId: b.id,
    status: "REGISTERED_ANALOG" as AdapterStatus,
    prediction: {
      status: (series.length >= 2 ? "ANALOG" : "UNKNOWN") as "ANALOG" | "UNKNOWN",
      series,
      invented: false as const,
      live: false as const,
      adapter: b.series,
    },
    risk: { status: "ANALOG" as const, adapter: b.riskMatrix, cells: null, invented: false as const, live: false as const },
    lineage: { status: "ANALOG" as const, nodes: b.kgChain.nodes, populated: false as const, live: false as const },
    evidence: { status: "ANALOG" as const, steps: b.auditChain.steps, evidenceBound: false as const, live: false as const },
    intelligence: {
      status: (edgeOk ? "ANALOG" : "UNKNOWN") as "ANALOG" | "UNKNOWN",
      edge: edgeOk ? left - right : null,
      invented: false as const,
      live: false as const,
      adapter: b.edgeDetector,
    },
    decisions: { status: "ANALOG" as const, template: b.decisionTemplate, autoDecide: false as const, live: false as const },
    autoTrade: false as const,
    liveSiem: false as const,
    liveBroker: false as const,
    liveErp: false as const,
    inventedSops: false as const,
  };
}

export function buildOsBlueprintIntegration() {
  const inv = buildRoleProfessionalInventory();
  const blueprints = SPECS.map((b) => {
    const catalog = inv.catalogs.find((c) => c.id === b.catalogId);
    const status = (catalog?.status || b.catalogStatus) as CatalogStatus;
    return {
      ...b,
      catalogStatus: status,
      result:
        status === "ABSENT"
          ? ("SKIPPED_RESEARCH_REQUIRED" as const)
          : ("REGISTERED_ANALOG" as const),
      ready: false as const,
      enabled: false as const,
      liveSiem: false as const,
      liveBroker: false as const,
      liveErp: false as const,
    };
  });
  return {
    ...OS_BLUEPRINT_HOOKS,
    blueprints,
    kg: {
      analog: "Wave-1 ontology + GW1 lineage",
      nationalGraph: false as const,
      causalQueryEngine: "ABSENT" as const,
      wave1NodeKinds: WAVE1_NODE_KINDS,
      wave1Relations: WAVE1_RELATIONS,
      nodeMap: KG_NODE_MAP,
      edgeMap: KG_EDGE_MAP,
      layers: {
        operational: ["transactions", "events", "logs"],
        analytical: ["models", "predictions", "risk_scores"],
        governance: ["policies", "limits", "approvals", "audits"],
      },
      populated: false as const,
    },
    sapAlt: {
      financeOps: ["Order", "Fulfillment", "Invoice", "Payment", "Ledger"],
      supplyChain: ["Demand", "Plan", "Procure", "Store", "Deliver"],
      hr: { steps: ["Hire", "Assign", "Evaluate", "Pay", "Offboard"], result: "SKIPPED_RESEARCH_REQUIRED" as const },
      integration: {
        predictionRisk: "Prediction/Risk analog sits on GW1 / DIL — not a live ERP feed",
        decisions: "Decisions templates audit approvals and limits · autoDecide=false",
        evidence: "Evidence templates chain document → transaction → policy · not bound to a ledger",
      },
      secondWorkflowEngine: false as const,
      liveErp: false as const,
      note: "ERP step labels overlay GW1 / CF11. Not SAP. Not a second workflow engine.",
    },
    moduleMapping: {
      PredictionPanel: {
        analog: ["cyber", "investment", "ops"],
        researchRequired: ["hospitality", "healthcare", "project-management", "consulting", "sales", "real-estate"],
      },
      RiskPanel: {
        analog: ["cyber", "investment", "ops"],
        researchRequired: ["hospitality", "healthcare"],
      },
      LineagePanel: { analog: ["cyber", "investment", "ops"], kgOverlay: true as const, nationalGraph: false as const },
      EvidencePanel: { analog: ["cyber", "investment", "ops"] },
      Intelligence: { analog: ["cyber", "investment", "ops"], edgeWithoutPayload: "UNKNOWN" as const },
      Decisions: { analog: ["cyber", "investment", "ops"], autoDecide: false as const },
    },
    roleAliases: [
      { label: "Cyber Analyst", roleId: "arch.soc_analyst", inventedArchetype: false as const },
      { label: "Investment Strategist", roleId: "arch.prediction_decision_analyst", inventedArchetype: false as const },
    ],
    health: {
      registered: blueprints.length,
      analog: blueprints.filter((b) => b.result === "REGISTERED_ANALOG").length,
      skippedResearchRequired: blueprints.filter((b) => b.result === "SKIPPED_RESEARCH_REQUIRED").length,
      liveSiem: 0,
      liveBroker: 0,
      liveErp: 0,
      inventedSops: false as const,
      archetypesUnchanged: 9 as const,
    },
    panels: {
      PredictionPanel: "cyber fraud/breach analog · investment pnl analog · ops fill analog",
      RiskPanel: "cyber / investment / ops risk dimension matrices",
      LineagePanel: "domain chains mapped onto Wave-1 KG kinds",
      EvidencePanel: "cyber / investment / sap-alt audit templates",
      Intelligence: "edge formulas UNKNOWN without analog payload",
      Decisions: "triage / size / approve templates · autoDecide=false",
    },
  };
}
