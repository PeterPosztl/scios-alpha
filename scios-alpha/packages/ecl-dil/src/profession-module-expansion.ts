/**
 * Profession module expansion — analog adapter registry for unmapped catalogs.
 * Extends existing Analyze / Intelligence / Decisions modules. Does not invent live SOPs.
 * Hospitality/Healthcare/PM/Consulting/Sales/RealEstate stay ABSENT.
 * SupplyChain stays STUB. liveDomainData=false. Not READY.
 * ALPHA_NON_PRODUCTION
 */
import { buildRoleProfessionalInventory, type SciRoleCatalogId } from "./role-professional.js";

export const PROFESSION_EXPANSION_HOOKS = {
  schema: "sci-os-profession-module-expansion/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  enabledFull: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  inventedSops: false as const,
  liveDomainData: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  secondShell: false as const,
  note: "Inspectable analog adapters for unmapped professions. ABSENT catalogs stay RESEARCH_REQUIRED. Not live domain packs.",
};

export type ProfessionExpansionId =
  | "hospitality"
  | "healthcare"
  | "project-management"
  | "consulting"
  | "sales"
  | "real-estate"
  | "supply-chain";

type AdapterStatus = "SKIPPED_RESEARCH_REQUIRED" | "ANALOG" | "UNKNOWN";

type SeriesAdapter = {
  id: string;
  label: string;
  source: string;
  sourceField: string;
  panel: "PredictionPanel";
};

type RiskMatrixAdapter = {
  id: string;
  rows: string[];
  cols: string[];
  sourceField: "riskMatrix";
  panel: "RiskPanel";
};

type KgChainAdapter = {
  id: string;
  nodes: string[];
  edges: Array<[string, string]>;
  panel: "LineagePanel";
};

type AuditChainAdapter = {
  id: string;
  steps: string[];
  panel: "EvidencePanel";
};

type EdgeDetectorAdapter = {
  id: string;
  formula: string;
  leftField: string;
  rightField: string;
  panel: "Intelligence";
};

type DecisionTemplateAdapter = {
  id: string;
  title: string;
  fields: string[];
  panel: "Decisions";
};

export type ProfessionModuleSpec = {
  id: ProfessionExpansionId;
  catalogId: SciRoleCatalogId;
  label: string;
  catalogStatus: "ABSENT" | "STUB";
  modules: Array<"prediction" | "risk" | "lineage" | "evidence" | "intelligence" | "decisions">;
  series: SeriesAdapter;
  riskMatrix: RiskMatrixAdapter;
  kgChain: KgChainAdapter;
  auditChain: AuditChainAdapter;
  edgeDetector: EdgeDetectorAdapter;
  decisionTemplate: DecisionTemplateAdapter;
  inventedSops: false;
  liveDomainData: false;
};

function spec(
  id: ProfessionExpansionId,
  catalogId: SciRoleCatalogId,
  catalogStatus: "ABSENT" | "STUB",
  label: string,
  series: Omit<SeriesAdapter, "panel">,
  risk: Omit<RiskMatrixAdapter, "panel" | "sourceField">,
  kg: Omit<KgChainAdapter, "panel">,
  audit: Omit<AuditChainAdapter, "panel">,
  edge: Omit<EdgeDetectorAdapter, "panel">,
  decision: Omit<DecisionTemplateAdapter, "panel">
): ProfessionModuleSpec {
  return {
    id,
    catalogId,
    label,
    catalogStatus,
    modules: ["prediction", "risk", "lineage", "evidence", "intelligence", "decisions"],
    series: { ...series, panel: "PredictionPanel" },
    riskMatrix: { ...risk, sourceField: "riskMatrix", panel: "RiskPanel" },
    kgChain: { ...kg, panel: "LineagePanel" },
    auditChain: { ...audit, panel: "EvidencePanel" },
    edgeDetector: { ...edge, panel: "Intelligence" },
    decisionTemplate: { ...decision, panel: "Decisions" },
    inventedSops: false,
    liveDomainData: false,
  };
}

const SPECS: ProfessionModuleSpec[] = [
  spec(
    "hospitality",
    "Hospitality",
    "ABSENT",
    "Hospitality",
    { id: "hospitality-series", label: "Hospitality demand curve", source: "blueprint:hospitality", sourceField: "timeseries" },
    { id: "hospitality-risk", rows: ["Staffing", "Demand", "Inventory", "Weather"], cols: ["Low", "Medium", "High"] },
    {
      id: "hospitality-lineage",
      nodes: ["Demand", "Staffing", "Revenue", "Decision"],
      edges: [
        ["Demand", "Staffing"],
        ["Staffing", "Revenue"],
        ["Revenue", "Decision"],
      ],
    },
    { id: "hospitality-audit", steps: ["Data ingest", "Normalization", "Scenario", "Decision"] },
    { id: "hospitality-edge", formula: "demand_minus_capacity", leftField: "demand", rightField: "capacity" },
    { id: "hospitality-decision", title: "Staffing adjustment", fields: ["Demand", "Staffing", "Revenue"] }
  ),
  spec(
    "healthcare",
    "Healthcare",
    "ABSENT",
    "Healthcare",
    { id: "healthcare-series", label: "Healthcare load curve", source: "blueprint:healthcare", sourceField: "capacity" },
    { id: "healthcare-risk", rows: ["ICU", "ER", "Staff", "Supplies"], cols: ["Stable", "Stressed", "Critical"] },
    {
      id: "healthcare-lineage",
      nodes: ["Load", "Capacity", "Outcome", "Decision"],
      edges: [
        ["Load", "Capacity"],
        ["Capacity", "Outcome"],
        ["Outcome", "Decision"],
      ],
    },
    { id: "healthcare-audit", steps: ["Load ingest", "Capacity model", "Outcome model", "Decision"] },
    { id: "healthcare-edge", formula: "load_minus_capacity", leftField: "load", rightField: "capacity" },
    { id: "healthcare-decision", title: "Capacity allocation", fields: ["Load", "Capacity", "Outcome"] }
  ),
  spec(
    "project-management",
    "ProjectManagement",
    "ABSENT",
    "Project Management",
    { id: "pm-series", label: "PM milestone probability", source: "blueprint:pm", sourceField: "forecast" },
    { id: "pm-risk", rows: ["Scope", "Schedule", "Budget", "Staff"], cols: ["Low", "Medium", "High"] },
    {
      id: "pm-lineage",
      nodes: ["Milestone", "Forecast", "Risk", "Decision"],
      edges: [
        ["Milestone", "Forecast"],
        ["Forecast", "Risk"],
        ["Risk", "Decision"],
      ],
    },
    { id: "pm-audit", steps: ["Plan ingest", "Forecast", "Scenario", "Decision"] },
    { id: "pm-edge", formula: "forecast_minus_baseline", leftField: "forecast", rightField: "baseline" },
    { id: "pm-decision", title: "Milestone slip", fields: ["Milestone", "Forecast", "Risk"] }
  ),
  spec(
    "consulting",
    "Consulting",
    "ABSENT",
    "Consulting",
    { id: "consulting-series", label: "Engagement utilization", source: "blueprint:consulting", sourceField: "utilization" },
    { id: "consulting-risk", rows: ["Scope", "Staff", "Client", "Delivery"], cols: ["Low", "Medium", "High"] },
    {
      id: "consulting-lineage",
      nodes: ["Question", "Analysis", "Recommendation", "Decision"],
      edges: [
        ["Question", "Analysis"],
        ["Analysis", "Recommendation"],
        ["Recommendation", "Decision"],
      ],
    },
    { id: "consulting-audit", steps: ["Brief ingest", "Analysis", "Recommendation", "Decision"] },
    { id: "consulting-edge", formula: "value_minus_effort", leftField: "value", rightField: "effort" },
    { id: "consulting-decision", title: "Recommendation gate", fields: ["Question", "Analysis", "Recommendation"] }
  ),
  spec(
    "sales",
    "Sales",
    "ABSENT",
    "Sales",
    { id: "sales-series", label: "Pipeline probability", source: "blueprint:sales", sourceField: "pipeline" },
    { id: "sales-risk", rows: ["Pipeline", "Concentration", "Cycle", "Churn"], cols: ["Low", "Medium", "High"] },
    {
      id: "sales-lineage",
      nodes: ["Lead", "Opportunity", "Proposal", "Decision"],
      edges: [
        ["Lead", "Opportunity"],
        ["Opportunity", "Proposal"],
        ["Proposal", "Decision"],
      ],
    },
    { id: "sales-audit", steps: ["CRM ingest", "Scoring", "Proposal", "Decision"] },
    { id: "sales-edge", formula: "win_minus_baseline", leftField: "winProb", rightField: "baseline" },
    { id: "sales-decision", title: "Pursue / hold", fields: ["Opportunity", "Proposal", "Risk"] }
  ),
  spec(
    "real-estate",
    "RealEstate",
    "ABSENT",
    "Real Estate",
    { id: "real-estate-series", label: "Occupancy / yield path", source: "blueprint:real-estate", sourceField: "yield" },
    { id: "real-estate-risk", rows: ["Occupancy", "Rate", "Capex", "Liquidity"], cols: ["Low", "Medium", "High"] },
    {
      id: "real-estate-lineage",
      nodes: ["Asset", "Scenario", "Yield", "Decision"],
      edges: [
        ["Asset", "Scenario"],
        ["Scenario", "Yield"],
        ["Yield", "Decision"],
      ],
    },
    { id: "real-estate-audit", steps: ["Listing ingest", "Scenario", "Yield", "Decision"] },
    { id: "real-estate-edge", formula: "yield_minus_hurdle", leftField: "yield", rightField: "hurdle" },
    { id: "real-estate-decision", title: "Hold / dispose", fields: ["Asset", "Yield", "Risk"] }
  ),
  spec(
    "supply-chain",
    "SupplyChain",
    "STUB",
    "Supply Chain",
    { id: "supply-chain-series", label: "Fill / delay analog", source: "blueprint:supply-chain", sourceField: "fill" },
    { id: "supply-chain-risk", rows: ["Supplier", "Transit", "Inventory", "Demand"], cols: ["Low", "Medium", "High"] },
    {
      id: "supply-chain-lineage",
      nodes: ["Supplier", "Node", "Inventory", "Decision"],
      edges: [
        ["Supplier", "Node"],
        ["Node", "Inventory"],
        ["Inventory", "Decision"],
      ],
    },
    { id: "supply-chain-audit", steps: ["Ops ingest", "Risk analog", "Scenario", "Decision"] },
    { id: "supply-chain-edge", formula: "fill_minus_demand", leftField: "fill", rightField: "demand" },
    { id: "supply-chain-decision", title: "Reallocate inventory", fields: ["Supplier", "Inventory", "Risk"] }
  ),
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

export function professionById(id: string): ProfessionModuleSpec | undefined {
  return SPECS.find((p) => p.id === id || p.catalogId === id);
}

export function resolveSeriesAdapter(professionId: string, raw?: unknown) {
  const p = professionById(professionId);
  if (!p) return { status: "UNKNOWN" as AdapterStatus, series: [] as Array<{ y: number }>, invented: false as const };
  if (p.catalogStatus === "ABSENT") {
    return {
      status: "SKIPPED_RESEARCH_REQUIRED" as AdapterStatus,
      series: [] as Array<{ y: number }>,
      invented: false as const,
      live: false as const,
      adapter: p.series,
    };
  }
  const series = finiteSeries(raw, p.series.sourceField);
  return {
    status: (series.length >= 2 ? "ANALOG" : "UNKNOWN") as AdapterStatus,
    series,
    invented: false as const,
    live: false as const,
    adapter: p.series,
  };
}

export function resolveRiskMatrix(professionId: string, raw?: unknown) {
  const p = professionById(professionId);
  if (!p) return { status: "UNKNOWN" as AdapterStatus, cells: null, invented: false as const };
  if (p.catalogStatus === "ABSENT") {
    return { status: "SKIPPED_RESEARCH_REQUIRED" as AdapterStatus, cells: null, invented: false as const, live: false as const, adapter: p.riskMatrix };
  }
  const matrix = raw && typeof raw === "object" ? (raw as Record<string, unknown>).riskMatrix : null;
  return {
    status: (matrix ? "ANALOG" : "UNKNOWN") as AdapterStatus,
    cells: matrix || null,
    invented: false as const,
    live: false as const,
    adapter: p.riskMatrix,
  };
}

export function resolveKgChain(professionId: string) {
  const p = professionById(professionId);
  if (!p) return { status: "UNKNOWN" as AdapterStatus, nodes: [] as string[], edges: [] as Array<[string, string]>, invented: false as const };
  if (p.catalogStatus === "ABSENT") {
    return {
      status: "SKIPPED_RESEARCH_REQUIRED" as AdapterStatus,
      nodes: p.kgChain.nodes,
      edges: p.kgChain.edges,
      invented: false as const,
      live: false as const,
      populated: false as const,
      adapter: p.kgChain,
    };
  }
  return {
    status: "ANALOG" as AdapterStatus,
    nodes: p.kgChain.nodes,
    edges: p.kgChain.edges,
    invented: false as const,
    live: false as const,
    populated: false as const,
    adapter: p.kgChain,
  };
}

export function resolveAuditChain(professionId: string) {
  const p = professionById(professionId);
  if (!p) return { status: "UNKNOWN" as AdapterStatus, steps: [] as string[], invented: false as const };
  if (p.catalogStatus === "ABSENT") {
    return {
      status: "SKIPPED_RESEARCH_REQUIRED" as AdapterStatus,
      steps: p.auditChain.steps,
      invented: false as const,
      live: false as const,
      evidenceBound: false as const,
      adapter: p.auditChain,
    };
  }
  return {
    status: "ANALOG" as AdapterStatus,
    steps: p.auditChain.steps,
    invented: false as const,
    live: false as const,
    evidenceBound: false as const,
    adapter: p.auditChain,
  };
}

export function resolveEdgeDetector(professionId: string, payload?: Record<string, unknown>) {
  const p = professionById(professionId);
  if (!p) return { status: "UNKNOWN" as AdapterStatus, edge: null as number | null, invented: false as const };
  if (p.catalogStatus === "ABSENT") {
    return {
      status: "SKIPPED_RESEARCH_REQUIRED" as AdapterStatus,
      edge: null as number | null,
      confidence: null as number | null,
      invented: false as const,
      live: false as const,
      adapter: p.edgeDetector,
    };
  }
  const left = Number(payload && payload[p.edgeDetector.leftField]);
  const right = Number(payload && payload[p.edgeDetector.rightField]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return {
      status: "UNKNOWN" as AdapterStatus,
      edge: null as number | null,
      confidence: null as number | null,
      invented: false as const,
      live: false as const,
      adapter: p.edgeDetector,
    };
  }
  const confRaw = Number(payload && payload.confidence);
  return {
    status: "ANALOG" as AdapterStatus,
    edge: left - right,
    confidence: Number.isFinite(confRaw) ? confRaw : null,
    invented: false as const,
    live: false as const,
    adapter: p.edgeDetector,
  };
}

export function resolveDecisionTemplate(professionId: string) {
  const p = professionById(professionId);
  if (!p) return { status: "UNKNOWN" as AdapterStatus, template: null, invented: false as const };
  if (p.catalogStatus === "ABSENT") {
    return {
      status: "SKIPPED_RESEARCH_REQUIRED" as AdapterStatus,
      template: p.decisionTemplate,
      invented: false as const,
      live: false as const,
      autoDecide: false as const,
    };
  }
  return {
    status: "ANALOG" as AdapterStatus,
    template: p.decisionTemplate,
    invented: false as const,
    live: false as const,
    autoDecide: false as const,
  };
}

export function applyProfessionModules(professionId: string, payload?: Record<string, unknown>) {
  return {
    professionId,
    prediction: resolveSeriesAdapter(professionId, payload),
    risk: resolveRiskMatrix(professionId, payload),
    lineage: resolveKgChain(professionId),
    evidence: resolveAuditChain(professionId),
    intelligence: resolveEdgeDetector(professionId, payload),
    decisions: resolveDecisionTemplate(professionId),
    autoTrade: false as const,
    inventedSops: false as const,
    liveDomainData: false as const,
  };
}

export function buildProfessionModuleExpansion() {
  const inv = buildRoleProfessionalInventory();
  const professions = SPECS.map((p) => {
    const catalog = inv.catalogs.find((c) => c.id === p.catalogId);
    const sandbox = inv.sandboxes.find((s) => s.id === p.catalogId);
    return {
      ...p,
      catalogStatus: (catalog?.status === "STUB" || catalog?.status === "ABSENT" ? catalog.status : p.catalogStatus) as
        | "ABSENT"
        | "STUB",
      sandboxStatus: sandbox?.status || "UNKNOWN",
      result: catalog?.status === "ABSENT" ? ("SKIPPED_RESEARCH_REQUIRED" as const) : ("REGISTERED_ANALOG" as const),
      ready: false as const,
      enabled: false as const,
    };
  });
  return {
    ...PROFESSION_EXPANSION_HOOKS,
    professions,
    health: {
      registered: professions.length,
      skippedResearchRequired: professions.filter((p) => p.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analogStub: professions.filter((p) => p.result === "REGISTERED_ANALOG").length,
      liveDomainData: 0,
      inventedSops: false as const,
    },
    panels: {
      PredictionPanel: "series adapters",
      RiskPanel: "risk matrices",
      LineagePanel: "KG chain templates",
      EvidencePanel: "audit chain templates",
      Intelligence: "edge detector contracts",
      Decisions: "decision templates",
    },
  };
}
