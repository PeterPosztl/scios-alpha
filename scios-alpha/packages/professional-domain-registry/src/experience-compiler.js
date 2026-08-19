/**
 * Experience compiler — CONTRACT / dry-run only (ALPHA).
 * Missing inputs → unknowns. Never invent AVAILABLE DATA or READY.
 */
import { archetypes } from "./index.js";

const PROFILE_BY_ROLE = {
  "arch.market_analyst": {
    workspaceProfileId: "market_analysis",
    modules: [
      { id: "ContextHeader", system: "entity_system", order: 1 },
      { id: "PredictionPanel", system: "prediction_system", order: 2 },
      { id: "UncertaintyPanel", system: "prediction_system", order: 3 },
      { id: "RiskPanel", system: "risk_system", order: 4 },
      { id: "DecisionPanel", system: "risk_system", order: 5 },
      { id: "SimulationPanel", system: "execution_system", order: 6 },
      { id: "LineagePanel", system: "cross_cutting", order: 7 },
      { id: "EvidencePanel", system: "cross_cutting", order: 8 },
    ],
    aiCopilotProfile: "market_workspace",
    goldenWorkflow: "gw1_aapl_analysis",
  },
  "arch.fraud_investigator": {
    workspaceProfileId: "fraud_investigation",
    modules: [
      { id: "CaseHeader", system: "case_system", order: 1 },
      { id: "EntityGraph", system: "entity_system", order: 2 },
      { id: "TransactionTimeline", system: "cross_cutting", order: 3 },
      { id: "RiskPanel", system: "risk_system", order: 4 },
      { id: "EvidencePanel", system: "cross_cutting", order: 5 },
      { id: "DecisionPanel", system: "risk_system", order: 6 },
      { id: "ReportBuilder", system: "case_system", order: 7 },
    ],
    aiCopilotProfile: "fraud_workspace",
  },
  "arch.soc_analyst": {
    workspaceProfileId: "soc_ops",
    modules: [
      { id: "IncidentHeader", system: "case_system", order: 1 },
      { id: "AlertTimeline", system: "cross_cutting", order: 2 },
      { id: "AssetGraph", system: "entity_system", order: 3 },
      { id: "DetectionEvidence", system: "cross_cutting", order: 4 },
      { id: "ResponseActions", system: "case_system", order: 5 },
    ],
    aiCopilotProfile: "soc_workspace",
  },
  "arch.fin_risk_analyst": {
    workspaceProfileId: "portfolio_risk",
    modules: [
      { id: "PortfolioHeader", system: "risk_system", order: 1 },
      { id: "ExposureMap", system: "risk_system", order: 2 },
      { id: "ScenarioPanel", system: "risk_system", order: 3 },
      { id: "DecisionQueue", system: "risk_system", order: 4 },
    ],
    aiCopilotProfile: "risk_workspace",
  },
  "arch.eng_operator": {
    workspaceProfileId: "eng_ops",
    modules: [
      { id: "SystemHealth", system: "tech", order: 1 },
      { id: "RecoveryMemory", system: "tech", order: 2 },
      { id: "EngineeringVerticalSlice", system: "tech", order: 3 },
    ],
    aiCopilotProfile: "ops_workspace",
  },
  "arch.osint_analyst": {
    workspaceProfileId: "osint_research",
    modules: [
      { id: "ContextHeader", system: "entity_system", order: 1 },
      { id: "EvidencePanel", system: "cross_cutting", order: 2 },
      { id: "LineagePanel", system: "cross_cutting", order: 3 },
      { id: "DecisionPanel", system: "risk_system", order: 4 },
    ],
    aiCopilotProfile: "osint_workspace",
  },
  "arch.executive": {
    workspaceProfileId: "executive_brief",
    modules: [
      { id: "ContextHeader", system: "entity_system", order: 1 },
      { id: "RiskPanel", system: "risk_system", order: 2 },
      { id: "DecisionPanel", system: "risk_system", order: 3 },
      { id: "EvidencePanel", system: "cross_cutting", order: 4 },
    ],
    aiCopilotProfile: "executive_workspace",
  },
  "arch.auditor": {
    workspaceProfileId: "audit_review",
    modules: [
      { id: "ContextHeader", system: "entity_system", order: 1 },
      { id: "EvidencePanel", system: "cross_cutting", order: 2 },
      { id: "LineagePanel", system: "cross_cutting", order: 3 },
      { id: "DecisionPanel", system: "risk_system", order: 4 },
    ],
    aiCopilotProfile: "audit_workspace",
  },
};

const DENSITY = {
  novice: "comfortable",
  intermediate: "compact",
  expert: "dense",
  engineering: "dense",
};

const DISCLOSURE = {
  novice: "L1",
  intermediate: "L2",
  expert: "L3",
  engineering: "L4",
};

const PANEL_TYPE_MAP = {
  ContextHeader: { type: "entity.summary", capability: "Entity" },
  PredictionPanel: { type: "prediction", capability: "Prediction" },
  UncertaintyPanel: { type: "uncertainty", capability: "Prediction" },
  RiskPanel: { type: "risk", capability: "Risk" },
  DecisionPanel: { type: "decision", capability: "Decision" },
  SimulationPanel: { type: "scenario", capability: "Execution" },
  EvidencePanel: { type: "evidence", capability: "Evidence" },
  LineagePanel: { type: "lineage", capability: "Lineage" },
};

function capabilityState(id, caps, dataStatus) {
  const hit = (caps || []).find((c) => c && (c.id === id || c.id?.includes(id)));
  if (hit?.proven === true) return "AVAILABLE";
  if (hit?.proven === false) return "UNVALIDATED";
  if (dataStatus === "ABSENT") return "ABSENT";
  if (dataStatus === "PARTIAL") return "PARTIAL";
  return "UNKNOWN";
}

/** Build canonical WorkspaceSpec from compile inputs + profile modules. */
export function buildWorkspaceSpec(ctx) {
  const {
    roleId,
    profile,
    arch,
    level,
    caps,
    dataStatus,
    disabledActions,
    input,
    unknowns,
  } = ctx;
  const warnings = [];
  if (dataStatus === "ABSENT" || !dataStatus) {
    warnings.push({
      code: "MARKET_DATA_ABSENT",
      message: "Market data unavailable — ALPHA uses deterministic/sample input only",
    });
  }
  warnings.push({
    code: "MODEL_UNVALIDATED",
    message: "Prediction models are UNVALIDATED — not production-grade science",
  });
  if (!input?.permission?.source) {
    warnings.push({ code: "PERMISSION_SOURCE_UNKNOWN", message: "Permission source not proven" });
  }

  const panels = (profile.modules || []).map((m, i) => {
    const meta = PANEL_TYPE_MAP[m.id] || { type: "unsupported", capability: m.system || "UNKNOWN" };
    const capState = capabilityState(meta.capability, caps, dataStatus);
    let state = "READY";
    if (capState === "ABSENT") state = "UNKNOWN";
    else if (capState === "UNVALIDATED") state = "PARTIAL";
    else if (capState === "PARTIAL") state = "PARTIAL";
    return {
      id: m.id,
      type: meta.type,
      order: m.order || i + 1,
      visible: true,
      state,
      capability: meta.capability,
      reason:
        capState === "UNVALIDATED"
          ? "MODEL · ALPHA · UNVALIDATED"
          : capState === "ABSENT"
            ? "Capability absent"
            : null,
    };
  });

  const actions = [
    {
      id: "analyze",
      type: "SIMULATION",
      enabled: true,
      reason: null,
      governanceState: "SIMULATION_ONLY",
    },
    {
      id: "act.local_review.approve",
      type: "LOCAL_REVIEW",
      enabled: false,
      reason: "Governed approval not available — LOCAL_REVIEW only",
      governanceState: "LOCAL_REVIEW",
    },
    {
      id: "live_execution",
      type: "EXECUTION",
      enabled: false,
      reason: "EXECUTION_MODE=SIMULATION_ONLY",
      governanceState: "BLOCKED",
    },
  ];
  for (const d of disabledActions || []) {
    const id = typeof d === "string" ? d : d.action;
    const hit = actions.find((a) => a.id === id || a.id.endsWith(id));
    if (hit) {
      hit.enabled = false;
      hit.reason = typeof d === "object" ? d.reason : "Disabled by policy";
    }
  }

  return {
    schemaVersion: "sci-os-workspace-spec/v1",
    workspaceId: profile.workspaceProfileId,
    role: roleId,
    jtbd: input?.jobToBeDone?.mission || arch?.primaryMission || null,
    object: input?.currentObject || null,
    contextHeader: {
      title: arch?.name || roleId || "Workspace",
      mission: arch?.primaryMission || "UNKNOWN",
      object: input?.currentObject || null,
    },
    layout: "professional-grid",
    density: DENSITY[level] || "compact",
    disclosureLevel: DISCLOSURE[level] || "L2",
    panels,
    actions,
    warnings,
    attentionItems: [],
    evidenceRequirements: ["lineage tip hash when analysis completes"],
    maturity: {
      modelScience: "UNVALIDATED",
      marketData: dataStatus === "ABSENT" ? "ABSENT" : dataStatus || "UNKNOWN",
      governedApproval: "ABSENT",
      execution: input?.executionProfile || "SIMULATION_ONLY",
    },
    unknowns: unknowns || [],
  };
}

export function compileExperience(input = {}) {
  const unknowns = [];
  const roleId = input.roleId;
  if (!roleId) unknowns.push("roleId");

  const arch = archetypes.archetypes.find((a) => a.roleId === roleId);
  if (roleId && !arch) unknowns.push("role_not_in_archetypes");

  const level = input.userExperienceLevel || "intermediate";
  const profile = PROFILE_BY_ROLE[roleId] || {
    workspaceProfileId: "generic_attention",
    modules: [
      { id: "AttentionHome", system: "cross_cutting", order: 1 },
      { id: "EvidencePanel", system: "cross_cutting", order: 2 },
    ],
    aiCopilotProfile: null,
  };

  const caps = input.sciOsCapabilities || [];
  const unproven = caps.filter((c) => c && c.proven === false).map((c) => c.id);
  const dataStatus = input.availableData?.status;
  if (!dataStatus || dataStatus === "ABSENT" || dataStatus === "UNKNOWN") {
    unknowns.push("availableData");
  }
  if (!input.permission?.source) unknowns.push("permission_source");

  const disabledActions = (input.riskPolicy?.highRiskActions || []).map((action) => ({
    action,
    reason: input.riskPolicy?.approvalRequired
      ? "Blocked until approval (risk policy)"
      : "High-risk action — policy gate",
  }));

  for (const a of input.permission?.actionsDenied || []) {
    disabledActions.push({ action: a, reason: "Permission denied (server)" });
  }

  for (const d of input.disabledActions || []) {
    disabledActions.push(
      typeof d === "string" ? { action: d, reason: "Policy denied (server)" } : d
    );
  }

  const mounted = input.runtimeMount === true;
  const actor = input.actor || null;

  const output = {
      workspaceProfileId: profile.workspaceProfileId,
      nav: profile.modules.map((m) => m.id),
      home: {
        title: arch?.name || roleId || "Workspace",
        attention: "WHAT REQUIRES MY ATTENTION RIGHT NOW?",
        mission: arch?.primaryMission || "UNKNOWN",
      },
      modules: profile.modules,
      actions: [
        { id: "analyze", label: "Analyze", panel: "PredictionPanel" },
        { id: "evidence", label: "Evidence", panel: "EvidencePanel" },
        { id: "lineage", label: "Full Lineage", panel: "LineagePanel" },
        { id: "technical", label: "Technical View", panel: "Engineering" },
      ],
      density: DENSITY[level] || "compact",
      disclosureDefault: DISCLOSURE[level] || "L2",
      aiCopilotProfile: profile.aiCopilotProfile,
      disabledActions,
      nextStep:
        input.workflowState === "result"
          ? "Review evidence and lineage before acting"
          : "Search entity → Analyze → review professional result",
      unknowns: [
        ...new Set([
          ...unknowns,
          ...unproven.map((id) => `capability_unproven:${id}`),
        ]),
      ],
      goldenWorkflow: profile.goldenWorkflow || null,
    };

  const workspaceSpec = buildWorkspaceSpec({
    roleId,
    profile,
    arch,
    level,
    caps,
    dataStatus,
    disabledActions,
    input: {
      jobToBeDone: input.jobToBeDone || {
        mission: arch?.primaryMission || null,
        topTasks: arch?.topTasks || [],
        criticalDecisions: arch?.criticalDecisions || [],
      },
      permission: input.permission,
      currentObject: input.currentObject,
      executionProfile: input.executionProfile || process.env.EXECUTION_MODE || "UNKNOWN",
    },
    unknowns: output.unknowns,
  });

  return {
    schema: "sci-os-experience-compile/v1",
    label: "ALPHA_NON_PRODUCTION",
    compilerStatus: mounted ? "RUNTIME_MOUNTED" : "DRY_RUN",
    actor,
    input: {
      roleId: roleId || null,
      jobToBeDone: input.jobToBeDone || {
        mission: arch?.primaryMission || null,
        topTasks: arch?.topTasks || [],
        criticalDecisions: arch?.criticalDecisions || [],
      },
      permission: input.permission || {
        actionsAllowed: [],
        actionsDenied: [],
        source: null,
      },
      domainOntology: input.domainOntology || {
        domainFamily: arch?.domainFamily || "UNKNOWN",
        entityTypes: arch?.commonEntities || [],
      },
      availableData: input.availableData || {
        bindings: [],
        freshness: null,
        status: "UNKNOWN",
      },
      sciOsCapabilities: caps,
      riskPolicy: input.riskPolicy || {
        policyId: null,
        highRiskActions: [],
        approvalRequired: false,
      },
      userExperienceLevel: level,
      currentObject: input.currentObject || null,
      workflowState: input.workflowState || null,
      executionProfile: input.executionProfile || process.env.EXECUTION_MODE || "UNKNOWN",
    },
    output,
    workspaceSpec,
    note: mounted
      ? "Mounted into existing SCI OS Shell AppHost — not a second /app product"
      : "Dry-run compiler only until Shell mounts runtimeMount=true",
  };
}

/** Profile module tables — authority for Workspace Composer derivation. */
export function listWorkspaceProfiles() {
  return { ...PROFILE_BY_ROLE };
}

const isMain =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("experience-compiler.js");

if (isMain) {
  const sample = compileExperience({
    roleId: "arch.fraud_investigator",
    userExperienceLevel: "expert",
    permission: {
      actionsAllowed: ["case:write", "entity:read", "transaction:read"],
      actionsDenied: ["account:freeze"],
      source: "governance-engine:local-development",
    },
    availableData: {
      bindings: ["demo_case"],
      freshness: null,
      status: "PARTIAL",
    },
    sciOsCapabilities: [
      { id: "Case", proven: false, evidence: null },
      {
        id: "vertical-slice.foundation",
        proven: true,
        evidence: "diagnostics-export",
      },
    ],
    riskPolicy: {
      policyId: null,
      highRiskActions: ["account:freeze"],
      approvalRequired: true,
    },
  });
  console.log(JSON.stringify(sample, null, 2));
}
