/**
 * Role catalog + professional experience layer + domain sandboxes.
 * Inspectable inventory — not 200 live apps, not specialist SOP invention.
 * ALPHA_NON_PRODUCTION. SIMULATION_ONLY. No auto-trade. Not READY.
 */

export const SCI_ROLE_CATALOG_IDS = [
  "AllDomains",
  "Finance",
  "Hospitality",
  "Cybersecurity",
  "Procurement",
  "ProjectManagement",
  "Consulting",
  "Healthcare",
  "Government",
  "SupplyChain",
  "Marketing",
  "Sales",
  "RealEstate",
  "LegalCompliance",
  "IT_Technology",
  "ExecutiveIntelligence",
] as const;

export const SCI_SANDBOX_IDS = [
  "AllDomains",
  "Finance",
  "Hospitality",
  "Cybersecurity",
  "Procurement",
  "ProjectManagement",
  "Consulting",
  "Healthcare",
  "Government",
  "SupplyChain",
  "Marketing",
  "Sales",
  "RealEstate",
  "LegalCompliance",
  "IT_Technology",
  "ExecutiveIntelligence",
] as const;

export type SciRoleCatalogId = (typeof SCI_ROLE_CATALOG_IDS)[number];
export type SciSandboxId = (typeof SCI_SANDBOX_IDS)[number];

export const ROLE_PROFESSIONAL_HOOKS = {
  schema: "sci-os-role-professional-hooks/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  enabledFull: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  safeActivation: true as const,
  wiredIntoOs: true as const,
  inspectionUnlocked: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  secondShell: false as const,
  parallelOS: false as const,
  liveDomainData: false as const,
  fullProfessionalSystem: true as const,
  shellViews: ["roles"] as const,
  aliases: { Core: "AllDomains" } as const,
  note: "200 role seeds + 9 archetypes + Experience Compiler dry-run. Bulk missions remain RESEARCH_REQUIRED. Sandboxes are SIMULATION_ONLY. Not READY.",
};

type CatalogStatus = "COMPOSED" | "PARTIAL" | "STUB" | "ABSENT";

type CatalogEntry = {
  id: SciRoleCatalogId;
  status: CatalogStatus;
  analogFamilies: string[];
  analogArchetypes: string[];
  seedRolesApprox: number;
  fullySpecified: number;
  researchRequired: boolean;
  analog: string;
  note: string;
  autoTrade: false;
  persisted: false;
  mode: "SIMULATION_ONLY";
};

type EngineEntry = {
  status: "PARTIAL" | "ABSENT";
  analog: string;
  note: string;
};

type SandboxEntry = {
  id: SciSandboxId;
  mode: "SIMULATION_ONLY";
  status: CatalogStatus;
  liveData: false;
  certified: false;
  persisted: false;
  autoTrade: false;
  analog: string;
  note: string;
};

function catalog(
  id: SciRoleCatalogId,
  status: CatalogStatus,
  analogFamilies: string[],
  analogArchetypes: string[],
  seedRolesApprox: number,
  fullySpecified: number,
  analog: string,
  note: string
): CatalogEntry {
  return {
    id,
    status,
    analogFamilies,
    analogArchetypes,
    seedRolesApprox,
    fullySpecified,
    researchRequired: fullySpecified === 0 || seedRolesApprox > fullySpecified,
    analog,
    note,
    autoTrade: false,
    persisted: false,
    mode: "SIMULATION_ONLY",
  };
}

function sandbox(id: SciSandboxId, status: CatalogStatus, analog: string, note: string): SandboxEntry {
  return {
    id,
    mode: "SIMULATION_ONLY",
    status,
    liveData: false,
    certified: false,
    persisted: false,
    autoTrade: false,
    analog,
    note,
  };
}

export function buildRoleProfessionalInventory() {
  const catalogs: CatalogEntry[] = [
    catalog(
      "AllDomains",
      "PARTIAL",
      [
        "cyber_ops",
        "threat_intel",
        "digital_forensics",
        "investigation_case",
        "fraud_fincrime",
        "aml_kyc",
        "fin_intel",
        "market_intelligence",
        "market_portfolio_risk",
        "enterprise_risk",
        "corporate_security",
        "physical_security",
        "crisis_emergency",
        "intel_analysis",
        "osint_geoint",
        "data_analytics",
        "ai_ml_gov",
        "eng_platform",
        "cloud_infra",
        "gov_audit_legal",
        "supply_ops_risk",
      ],
      [
        "arch.soc_analyst",
        "arch.fraud_investigator",
        "arch.fin_risk_analyst",
        "arch.osint_analyst",
        "arch.executive",
        "arch.auditor",
        "arch.market_analyst",
        "arch.prediction_decision_analyst",
        "arch.eng_operator",
      ],
      200,
      9,
      "@scios/professional-domain-registry 21 families + 200 seeds + 9 archetypes",
      "AllDomains is the existing registry (alias: Core). 191 bulk roles stay SEED_RESEARCH_REQUIRED. Not 200 live apps."
    ),
    catalog(
      "Finance",
      "PARTIAL",
      ["fin_intel", "market_intelligence", "market_portfolio_risk", "fraud_fincrime"],
      ["arch.fin_risk_analyst", "arch.market_analyst", "arch.prediction_decision_analyst", "arch.fraud_investigator"],
      38,
      4,
      "Market/portfolio risk + DIL prediction analyst + fraud analog",
      "Not a live brokerage or SAP finance module."
    ),
    catalog(
      "Hospitality",
      "ABSENT",
      [],
      [],
      0,
      0,
      "NONE",
      "No hospitality family in the registry. RESEARCH_REQUIRED. Do not invent hotel SOPs."
    ),
    catalog(
      "Cybersecurity",
      "PARTIAL",
      ["cyber_ops", "threat_intel", "digital_forensics"],
      ["arch.soc_analyst"],
      41,
      1,
      "SOC / threat / forensics families + SOC archetype",
      "Alert triage analog. Not a SOC platform or SIEM."
    ),
    catalog(
      "Procurement",
      "STUB",
      ["supply_ops_risk"],
      [],
      9,
      0,
      "supply_ops_risk seeds only",
      "No procurement SOP. RESEARCH_REQUIRED."
    ),
    catalog(
      "ProjectManagement",
      "ABSENT",
      [],
      [],
      0,
      0,
      "NONE",
      "No PM family. RESEARCH_REQUIRED. Not Jira/MS Project."
    ),
    catalog(
      "Consulting",
      "ABSENT",
      [],
      [],
      0,
      0,
      "NONE",
      "No consulting family. RESEARCH_REQUIRED."
    ),
    catalog(
      "Healthcare",
      "ABSENT",
      [],
      [],
      0,
      0,
      "NONE",
      "No clinical family. RESEARCH_REQUIRED. Not an EHR."
    ),
    catalog(
      "Government",
      "PARTIAL",
      ["gov_audit_legal"],
      ["arch.auditor"],
      11,
      1,
      "Governance / audit / legal family + auditor archetype",
      "Not a government case-management system."
    ),
    catalog(
      "SupplyChain",
      "STUB",
      ["supply_ops_risk"],
      [],
      9,
      0,
      "supply_ops_risk seeds",
      "Operational-risk analog. Not a TMS/WMS."
    ),
    catalog(
      "Marketing",
      "ABSENT",
      [],
      [],
      0,
      0,
      "NONE",
      "No marketing family. RESEARCH_REQUIRED."
    ),
    catalog(
      "Sales",
      "ABSENT",
      [],
      [],
      0,
      0,
      "NONE",
      "No sales CRM family. RESEARCH_REQUIRED."
    ),
    catalog(
      "RealEstate",
      "ABSENT",
      [],
      [],
      0,
      0,
      "NONE",
      "No real-estate family. RESEARCH_REQUIRED."
    ),
    catalog(
      "LegalCompliance",
      "PARTIAL",
      ["gov_audit_legal", "aml_kyc"],
      ["arch.auditor"],
      22,
      1,
      "Audit/legal + AML/KYC families",
      "Not licensed legal counsel. Human remains decision maker."
    ),
    catalog(
      "IT_Technology",
      "PARTIAL",
      ["eng_platform", "cloud_infra", "ai_ml_gov"],
      ["arch.eng_operator"],
      31,
      1,
      "Engineering/platform + cloud + model-gov families",
      "Home Engineering operator analog. Not a second OS."
    ),
    catalog(
      "ExecutiveIntelligence",
      "PARTIAL",
      ["enterprise_risk", "intel_analysis"],
      ["arch.executive"],
      16,
      1,
      "Enterprise risk + intelligence analysis + executive archetype",
      "Attention/exception analog. Not a national intelligence product."
    ),
  ];

  const engines: Record<string, EngineEntry> = {
    ExperienceCompiler: {
      status: "PARTIAL",
      analog: "GET /v1/experience/compile · packages/professional-domain-registry compiler-pipeline",
      note: "Dry-run / degraded compile. Missing inputs stay UNKNOWN. Not a second product kernel.",
    },
    WorkspaceSpecEngine: {
      status: "PARTIAL",
      analog: "experience-spec.schema.json + compiled.workspaceSpec",
      note: "Spec is a compose plan for one Shell. Not 200 generated pages.",
    },
    JTBDEngine: {
      status: "PARTIAL",
      analog: "archetype topTasks / topQuestions (9 defined)",
      note: "191 bulk roles remain RESEARCH_REQUIRED. Do not invent jobs-to-be-done.",
    },
    CapabilityEngine: {
      status: "PARTIAL",
      analog: "families.sharedCapabilityFamilies + requiredSCIcapabilities",
      note: "Shared Case/Entity/Risk/Evidence/Decision primitives. Proven=false unless GW1 evidence exists.",
    },
    PolicyEngine: {
      status: "PARTIAL",
      analog: "@scios/governance-engine evaluatePolicyDecision mapped from professional role",
      note: "local-development matrix. Not OIDC RBAC.",
    },
    "RiskEngine.Professional": {
      status: "PARTIAL",
      analog: "hydrateRisk + ECL guardrail",
      note: "Advisory. Not a broker kill-switch.",
    },
    "EvidenceEngine.Professional": {
      status: "PARTIAL",
      analog: "hydrateEvidence + ECL audit + GW1 lineage",
      note: "Session provenance. Not enterprise SIEM.",
    },
    "LineageEngine.Professional": {
      status: "PARTIAL",
      analog: "GW1 immutable_lineage + in-memory audit ids",
      note: "No durable hash fabric.",
    },
  };

  const sandboxes: SandboxEntry[] = [
    sandbox("AllDomains", "PARTIAL", "Union of mapped family analogs on the simulated book", "SIMULATION_ONLY. Unmapped domains stay ABSENT. liveData=false."),
    sandbox("Finance", "PARTIAL", "DIL/ECL simulated book + finance archetypes", "SIMULATION_ONLY. No live capital."),
    sandbox("Hospitality", "ABSENT", "NONE", "No hospitality sandbox data. RESEARCH_REQUIRED."),
    sandbox("Cybersecurity", "PARTIAL", "SOC archetype workspace panels (may be PARTIAL)", "Not a live SOC feed."),
    sandbox("Procurement", "STUB", "supply_ops_risk seeds", "No PO/invoice ledger."),
    sandbox("ProjectManagement", "ABSENT", "NONE", "No project sandbox. RESEARCH_REQUIRED."),
    sandbox("Consulting", "ABSENT", "NONE", "No consulting sandbox. RESEARCH_REQUIRED."),
    sandbox("Healthcare", "ABSENT", "NONE", "No PHI sandbox. RESEARCH_REQUIRED."),
    sandbox("Government", "PARTIAL", "Auditor archetype + policy/approval panels", "Not a government records system."),
    sandbox("SupplyChain", "STUB", "supply_ops_risk seeds", "No logistics telemetry."),
    sandbox("Marketing", "ABSENT", "NONE", "No campaign sandbox. RESEARCH_REQUIRED."),
    sandbox("Sales", "ABSENT", "NONE", "No CRM sandbox. RESEARCH_REQUIRED."),
    sandbox("RealEstate", "ABSENT", "NONE", "No listings sandbox. RESEARCH_REQUIRED."),
    sandbox("LegalCompliance", "PARTIAL", "Auditor + AML/KYC analog", "Not licensed counsel."),
    sandbox("IT_Technology", "PARTIAL", "Engineering operator + System health", "Same Shell. No second cockpit."),
    sandbox("ExecutiveIntelligence", "PARTIAL", "Executive archetype attention queue", "Simulated attention only."),
  ];

  const mapped = catalogs.filter((c) => c.status === "PARTIAL" || c.status === "COMPOSED").length;
  const stub = catalogs.filter((c) => c.status === "STUB").length;
  const absent = catalogs.filter((c) => c.status === "ABSENT").length;
  const sandboxAbsent = sandboxes.filter((s) => s.status === "ABSENT").length;

  return {
    ...ROLE_PROFESSIONAL_HOOKS,
    // After the spread: the hooks carry their own schema id and were silently
    // overwriting this report's identity.
    schema: "sci-os-role-professional/v1" as const,
    label: "ALPHA_NON_PRODUCTION" as const,
    registry: {
      package: "@scios/professional-domain-registry",
      families: 21,
      archetypes: 9,
      rolesSeeded: 200,
      rolesFullySpecified: 9,
      rolesResearchRequired: 200,
      loadMode: "static_json_import",
    },
    catalogs,
    engines,
    sandboxes,
    health: {
      catalogs: catalogs.length,
      mapped,
      stub,
      absent,
      sandboxes: sandboxes.length,
      sandboxMode: "SIMULATION_ONLY" as const,
      sandboxLiveData: 0,
      sandboxAbsent,
      engines: Object.keys(engines).length,
      unexpectedLive: false,
      liveCertified: 0,
    },
    selector: {
      view: "roles",
      archetypesOnlyCompile: true as const,
      note: "Workspace selector inspects catalogs/sandboxes. Experience compile stays on the 9 archetypes. Unmapped domains stay RESEARCH_REQUIRED.",
    },
    refused: {
      twoHundredDashboards: "one adaptive UX, not 200 pages",
      inventedSops: "RESEARCH_REQUIRED stays RESEARCH_REQUIRED",
      liveDomainFeeds: "sandbox liveData=false",
      autoTrade: false,
      ready: false,
    },
    note: "Full professional system on analogs. 200 seeds / 9 archetypes. Unmapped domains RESEARCH_REQUIRED. Not 16 live products. Not READY.",
  };
}
