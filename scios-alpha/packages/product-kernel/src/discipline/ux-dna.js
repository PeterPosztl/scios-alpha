/**
 * Product Memory & UX DNA — scanners and contracts.
 * ALPHA_NON_PRODUCTION
 */

export const TASK_VERBS = [
  "FIND",
  "UNDERSTAND",
  "COMPARE",
  "INVESTIGATE",
  "MONITOR",
  "ASSESS",
  "PREDICT",
  "SIMULATE",
  "DECIDE",
  "APPROVE",
  "ACT",
  "ESCALATE",
  "REVIEW",
  "REPORT",
  "AUDIT",
];

export function buildWorkspaceContextEnvelope(partial = {}) {
  return {
    schema: "sci-os-workspace-context-envelope/v1",
    label: "ALPHA_NON_PRODUCTION",
    user: partial.user || "local-dev",
    role: partial.role || "arch.market_analyst",
    workspace: partial.workspace || "ws.analysis_gw1",
    jobToBeDone: partial.jobToBeDone || "Analyze entity and decide simulation",
    currentObject: partial.currentObject || null,
    case: partial.case || null,
    selection: partial.selection || null,
    timeRange: partial.timeRange || null,
    filters: partial.filters || {},
    workflowState: partial.workflowState || "ready",
    permissions: partial.permissions || ["analyze", "view_evidence"],
    openEvidence: partial.openEvidence || [],
    AIContext: partial.AIContext || null,
    unsavedState: partial.unsavedState || null,
    note: "Experience Compiler and AI must consume the same envelope — no dual contexts",
  };
}

export function buildExperienceContract(id, partial = {}) {
  return {
    schema: "sci-os-experience-contract/v1",
    contractId: id,
    version: partial.version || "1.0.0-alpha",
    role: partial.role,
    intent: partial.intent,
    entry: partial.entry,
    objects: partial.objects || [],
    requiredCapabilities: partial.requiredCapabilities || [],
    requiredPanels: partial.requiredPanels || [],
    requiredActions: partial.requiredActions || [],
    permissions: partial.permissions || [],
    states: {
      loading: partial.states?.loading || "REQUIRED",
      empty: partial.states?.empty || "REQUIRED",
      partial: partial.states?.partial || "REQUIRED",
      degraded: partial.states?.degraded || "REQUIRED",
      error: partial.states?.error || "REQUIRED",
      completion: partial.states?.completion || "REQUIRED",
    },
    risk: partial.risk || "VISIBLE_WHEN_RELEVANT",
    governance: partial.governance || "VISIBLE_WHEN_RELEVANT",
    evidence: partial.evidence || "REACHABLE",
    exitCondition: partial.exitCondition || "user navigates or completes decision",
    expectedOutcome: partial.expectedOutcome || "",
    label: "ALPHA_NON_PRODUCTION",
  };
}

export function gw1ExperienceContract() {
  return buildExperienceContract("exp.gw1.market_analysis", {
    role: "arch.market_analyst",
    intent: "Analyze instrument with risk/gov and evidence",
    entry: "Home|Search|Entity|Analyze",
    objects: ["Entity"],
    requiredCapabilities: [
      "vertical-slice.foundation",
      "control-plane-api",
      "cockpit.professional-view",
    ],
    requiredPanels: [
      "Situation",
      "ExpectedOutcome",
      "Risk",
      "Decision",
      "Simulation",
      "TrustCapsule",
      "Approval",
      "Evidence",
    ],
    requiredActions: ["analyze", "openLineage", "approval.*"],
    permissions: ["analyze", "view_evidence"],
    expectedOutcome: "Governed simulation decision with evidence reachable",
    risk: "REQUIRED",
    governance: "REQUIRED",
  });
}

export function buildRoleLenses(objectType = "Entity") {
  const roles = [
    "Executive",
    "Cyber Analyst",
    "Fraud Investigator",
    "Compliance",
    "Finance/Risk",
    "Project Manager",
    "Operations",
  ];
  return {
    schema: "sci-os-same-object-different-lens/v1",
    objectType,
    invariant: "Underlying truth unchanged; lens changes priority/presentation/actions/terminology",
    lenses: roles.map((role) => ({
      role,
      priority:
        role === "Executive"
          ? ["attention", "risk", "decision"]
          : role === "Finance/Risk"
            ? ["risk", "uncertainty", "decision", "evidence"]
            : role === "Cyber Analyst" || role === "Fraud Investigator"
              ? ["investigate", "evidence", "graph", "decision"]
              : ["attention", "work", "next_action"],
      presentation:
        role === "Executive" ? "sparse L1–L5" : "standard professional density",
      actions:
        role === "Compliance"
          ? ["REVIEW", "AUDIT", "ESCALATE"]
          : role === "Finance/Risk"
            ? ["ASSESS", "PREDICT", "SIMULATE", "APPROVE"]
            : ["FIND", "UNDERSTAND", "DECIDE"],
      terminology:
        role === "Cyber Analyst"
          ? { entity: "asset/identity", case: "incident" }
          : role === "Fraud Investigator"
            ? { entity: "party/account", case: "case" }
            : { entity: "entity", case: "case" },
    })),
  };
}

export function translateBenchmarkPattern(row) {
  return {
    SOURCE: row.source,
    PATTERN: row.pattern,
    WHY_IT_WORKS: row.why,
    FOUNDER_RELEVANCE: row.relevance,
    SCI_CURRENT_EQUIVALENT: row.equivalent,
    SCI_GAP: row.gap,
    SCI_NATIVE_TRANSLATION: row.translation,
    COPY_RISK: row.copyRisk || "HIGH_IF_UI_COPIED",
    DECISION: row.decision,
  };
}

export function runUxAntiDriftLint(cockpitSource, opts = {}) {
  const flags = [];
  if (/#[0-9A-Fa-f]{6}/.test(cockpitSource) && !opts.allowEmbeddedTokens) {
    // Shell still embeds tokens — warn until fully imported from design-system
    flags.push({
      id: "HARDCODED_HEX",
      severity: "INFO",
      note: "Hex colors present — must match design-system genome; migration to import tracked",
    });
  }
  if (/JSON\.stringify/.test(cockpitSource) && /proView|modePro/.test(cockpitSource)) {
    // JSON in tech path is OK; flag if pro view dumps JSON as primary
    if (/proWhat[\s\S]{0,200}JSON\.stringify/.test(cockpitSource)) {
      flags.push({ id: "JSON_IN_PROFESSIONAL", severity: "FAIL" });
    }
  }
  if (!/data-action-id|data-act=/.test(cockpitSource)) {
    flags.push({ id: "ACTIONS_WITHOUT_IDS", severity: "WARN" });
  }
  if (!/renderProfessional|modePro/.test(cockpitSource)) {
    flags.push({ id: "NO_PROFESSIONAL_MODE", severity: "FAIL" });
  }
  if (!/approvalCard|approval-card/.test(cockpitSource)) {
    flags.push({ id: "NO_APPROVAL_AFFORDANCE", severity: "WARN" });
  }
  if (!/trustCapsule|trust-capsule/.test(cockpitSource)) {
    flags.push({ id: "NO_TRUST_CAPSULE", severity: "WARN" });
  }
  if (!/proRisk|riskDecision/.test(cockpitSource)) {
    flags.push({ id: "NO_RISK_AFFORDANCE", severity: "FAIL" });
  }
  if (!/lineage|Evidence/.test(cockpitSource)) {
    flags.push({ id: "NO_EVIDENCE_AFFORDANCE", severity: "FAIL" });
  }
  if (/5200|5230/.test(cockpitSource) && !/legacy|not canonical/i.test(cockpitSource)) {
    flags.push({ id: "LEGACY_PORT_IN_UI", severity: "WARN" });
  }
  const fails = flags.filter((f) => f.severity === "FAIL");
  return {
    schema: "sci-os-ux-anti-drift-report/v1",
    flags,
    pass: fails.length === 0,
    productMemoryRequired: true,
  };
}

export function scoreExperienceQuality(checks = {}) {
  const required = [
    "entryClear",
    "taskPurposeClear",
    "contextPreserved",
    "actionsWork",
    "loadingWorks",
    "emptyWorks",
    "errorWorks",
    "degradedWorks",
    "permissionsWork",
    "riskVisible",
    "evidenceReachable",
    "keyboardPath",
    "visualHierarchy",
    "goldenWorkflow",
  ];
  const results = {};
  for (const k of required) {
    results[k] = checks[k] ?? "UNKNOWN";
  }
  const unknown = required.filter(
    (k) => results[k] === "UNKNOWN" || String(results[k]).startsWith("PARTIAL")
  ).length;
  const fail = required.filter((k) => results[k] === "FAIL" || results[k] === false).length;
  const pass = required.filter((k) => {
    const v = String(results[k]);
    return v === "PASS" || v.startsWith("PASS_");
  }).length;
  return {
    schema: "sci-os-experience-quality-gate/v1",
    results,
    passCount: pass,
    ready: fail === 0 && unknown === 0 && pass === required.length,
    note: "READY only when all dimensions PASS* — PARTIAL/UNKNOWN block READY",
  };
}
