/**
 * Full-system deployment inventory — compose map, not a second OS.
 * ALPHA_NON_PRODUCTION. Blueprints remain enabled=false. No auto-trade. Not READY.
 */

export const SCI_DEPLOY_IDS = [
  "ControlPlane",
  "Shell",
  "OSModule",
  "WorkflowEngine",
  "EventBus",
  "ConsensusEngine",
  "Intelligence",
  "Decisions",
  "Evidence",
  "Reporting",
  "RiskGov",
  "SystemHealth",
  "TechnicalCockpit",
  "AgentSystem",
  "KnowledgeGraph",
  "WorkflowDSL",
  "DistributedArchitecture",
  "DataFeedEngine",
  "InstrumentAdapterLayer",
  "FeedRegistry",
  "FeedHealthMonitor",
  "RiskPropagationEngine",
  "CausalGraphEngine",
  "SseRealisticTimeline",
  "EmotionalEngineRealistic",
  "ReportingRealisticPnL",
  "EvidenceRealisticChain",
  "LineageRealisticMode",
  "AuditEngine",
  "CompetitionEngine",
  "LegalGuardian",
  "RoleCatalog",
  "ExperienceCompiler",
  "WorkspaceSpecEngine",
  "ProfessionalPolicyEngine",
  "DomainSandbox",
] as const;

export type SciDeployId = (typeof SCI_DEPLOY_IDS)[number];

export type SciDeployEntry = {
  id: SciDeployId;
  family: "os" | "cockpit" | "blueprint" | "feed" | "sim" | "professional";
  status: "COMPOSED" | "PARTIAL" | "ABSENT";
  inProduct: boolean;
  enabledRuntime: false;
  secondInstance: false;
  autoTrade: false;
  analog: string;
  note: string;
};

function entry(
  id: SciDeployId,
  family: SciDeployEntry["family"],
  status: SciDeployEntry["status"],
  analog: string,
  note: string,
  inProduct = true
): SciDeployEntry {
  return {
    id,
    family,
    status,
    inProduct,
    enabledRuntime: false,
    secondInstance: false,
    autoTrade: false,
    analog,
    note,
  };
}

export function buildDeploymentInventory() {
  const modules: SciDeployEntry[] = [
    entry("ControlPlane", "os", "COMPOSED", "apps/control-plane-api :3000 via start-sci-os.cjs", "Canonical Control Plane. No second listen()."),
    entry("Shell", "os", "COMPOSED", "apps/cockpit-ui :4000", "One Shell. No second cockpit."),
    entry("OSModule", "os", "PARTIAL", "SCI_SYSTEM_IDENTITY + GW1 VERTICAL_SLICE_STAGES", "Identity and GW1 are the OS module. Not a parallel kernel."),
    entry("WorkflowEngine", "os", "PARTIAL", "GW1 stages + CF11 job TRANSITION_MATRIX", "The only live workflow. packages/workflow-engine HTTP app refused (GAP-0006)."),
    entry("EventBus", "os", "PARTIAL", "packages/observability InMemoryEventBus", "Wave 0 in-memory bus. Kafka/NATS ABSENT."),
    entry("ConsensusEngine", "os", "ABSENT", "independent_risk_gate + governance_decision", "Governance analog, not Raft/Paxos. Multi-node consensus ABSENT."),
    entry("Intelligence", "cockpit", "COMPOSED", "#dil Decision Intelligence console", "Simulated Polymarket/Kalshi. Agent proposes; human decides."),
    entry("Decisions", "cockpit", "COMPOSED", "#decisions + /v1/ai/proposals", "Accept/reject writes audit only. executed=false."),
    entry("Evidence", "cockpit", "COMPOSED", "#evidence + ECL audit + GW1 lineage", "Session provenance. Not enterprise SIEM."),
    entry("Reporting", "cockpit", "COMPOSED", "#ecl ECL Reporting console", "Simulated book. Weekly/monthly slices UNKNOWN."),
    entry("RiskGov", "cockpit", "COMPOSED", "Engineering Risk/Gov Studio + ECL guardrail", "Advisory stop. Not a broker kill-switch."),
    entry("SystemHealth", "cockpit", "COMPOSED", "#system System health dashboard", "Derived from live Control Plane APIs."),
    entry("TechnicalCockpit", "cockpit", "COMPOSED", "#engineering technical view", "GW1 JSON + blueprint studios. Same Shell."),
    entry("AgentSystem", "blueprint", "PARTIAL", "DIL proposals · Cursor remains implementer outside the product", "LDA runtime ABSENT. autoApply=false. autoPatch=false."),
    entry("KnowledgeGraph", "blueprint", "PARTIAL", "Wave-1 ontology + GW1 lineage + 200 RESEARCH_REQUIRED seeds", "National graph false. Causal query engine ABSENT."),
    entry("WorkflowDSL", "blueprint", "ABSENT", "GW1 VERTICAL_SLICE_STAGES", "User-authored DSL compiler ABSENT. secondEngine=false."),
    entry("DistributedArchitecture", "blueprint", "ABSENT", "local-foundation single node", "Kafka ABSENT. multiRegion=false."),
    entry("DataFeedEngine", "feed", "PARTIAL", "packages/ecl-dil feed-registry", "Registry mounted. Certified live feeds remain 0."),
    entry("InstrumentAdapterLayer", "feed", "PARTIAL", "bookIntegrity matched/orphan", "Spot/crypto simulated_alpha. Orderbook/depth/OHLC ABSENT."),
    entry("FeedRegistry", "feed", "COMPOSED", "GET /v1/ecl/feeds · 13 types", "Default SIMULATION_ONLY. persisted=false."),
    entry("FeedHealthMonitor", "feed", "COMPOSED", "registry.health liveCertified=0", "Health counts only. Not venue SLA."),
    entry("RiskPropagationEngine", "sim", "PARTIAL", "ECL guardrail + DIL risk scores", "Session graph. Not a production risk fabric."),
    entry("CausalGraphEngine", "sim", "PARTIAL", "Typed AFFECTS over simulated feeds", "Not CausalEngine.4.x do-calculus."),
    entry("SseRealisticTimeline", "sim", "PARTIAL", "24h vs stressed + asOf timeline", "Not SSE.3.x Monte Carlo."),
    entry("EmotionalEngineRealistic", "sim", "ABSENT", "UX role presentation", "No affect model."),
    entry("ReportingRealisticPnL", "sim", "PARTIAL", "ECL in-memory session PnL", "Weekly/monthly UNKNOWN."),
    entry("EvidenceRealisticChain", "sim", "PARTIAL", "ECL/DIL audit chain", "Not SIEM."),
    entry("LineageRealisticMode", "sim", "PARTIAL", "GW1 lineage + in-memory audit ids", "No durable hash fabric."),
    entry("AuditEngine", "sim", "PARTIAL", "ECL/DIL in-memory audit chain", "GET persisted=false until durable ledger."),
    entry("CompetitionEngine", "sim", "PARTIAL", "Rank simulated markets by |edgeScore|", "Not a live tournament."),
    entry("LegalGuardian", "sim", "PARTIAL", "GOVERNANCE > AGENT + ECL guardrail", "Not licensed legal counsel."),
    entry("RoleCatalog", "professional", "PARTIAL", "AllDomains 21 families + 200 seeds + 9 archetypes", "Bulk roles RESEARCH_REQUIRED. Not 200 apps."),
    entry("ExperienceCompiler", "professional", "PARTIAL", "GET /v1/experience/compile dry-run", "Missing inputs stay UNKNOWN. Not a second kernel."),
    entry("WorkspaceSpecEngine", "professional", "PARTIAL", "experience-spec compose plan", "One Shell. No generated page farm."),
    entry("ProfessionalPolicyEngine", "professional", "PARTIAL", "governance-engine role matrix", "local-development. Not OIDC RBAC."),
    entry("DomainSandbox", "professional", "PARTIAL", "16 domain sandboxes SIMULATION_ONLY including AllDomains", "liveData=false. Unmapped domains ABSENT."),
  ];
  const composed = modules.filter((m) => m.status === "COMPOSED").length;
  const partial = modules.filter((m) => m.status === "PARTIAL").length;
  const absent = modules.filter((m) => m.status === "ABSENT").length;
  return {
    schema: "sci-os-deployment-inventory/v1" as const,
    label: "ALPHA_NON_PRODUCTION" as const,
    identity: "ENTERPRISE_GRADE_ALPHA" as const,
    prepared: true as const,
    enabledRuntimes: false as const,
    inspectionUnlocked: true as const,
    simulationOnly: true as const,
    executionMode: "SIMULATION_ONLY" as const,
    autoTrade: false as const,
    persisted: false as const,
    ready: false as const,
    holeless: false as const,
    oneBoot: true as const,
    oneShell: true as const,
    secondWorkflowEngine: false as const,
    secondShell: false as const,
    parallelOS: false as const,
    liveCertifiedFeeds: 0 as const,
    boot: "start-sci-os.cjs",
    controlPlane: ":3000",
    shell: "apps/cockpit-ui :4000",
    modules,
    health: {
      registered: modules.length,
      composed,
      partial,
      absent,
      liveCertifiedFeeds: 0,
    },
    note: "Compose-into-existing-product deployment. Blueprints are inspectable, not enabled as live runtimes. No second OS, boot, Shell, workflow engine, or auto-trade.",
  };
}
