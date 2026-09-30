/**
 * Experience Compiler pipeline — Intent → hydration chain → experience-spec → compile.
 * ALPHA_NON_PRODUCTION — missing inputs → unknowns/degraded; never fabricate READY.
 */
import { compileExperience } from "./experience-compiler.js";
import { hydrateContext } from "./hydration/context-hydration.js";
import { hydrateDomain } from "./hydration/domain-hydration.js";
import { hydrateEvidence } from "./hydration/evidence-hydration.js";
import { hydrateAnalysis } from "./hydration/analysis-hydration.js";
import { hydrateRisk } from "./hydration/risk-hydration.js";
import { hydrateDecision } from "./hydration/decision-hydration.js";

export const COMPILER_VERSION = "sci-os-compiler-pipeline/v1.0.0-b008";

const healthState = {
  lastCompileAt: null,
  lastCompileLatencyMs: null,
  lastStatus: "IDLE",
  lastDegraded: false,
  compileCount: 0,
};

export function rolePresentationHints() {
  return {
    "arch.market_analyst": "Prediction · uncertainty · risk · lineage for instruments.",
    "arch.fraud_investigator": "Entity and transaction investigation — fraud modules may show PARTIAL.",
    "arch.soc_analyst": "Alert triage — cyber modules may show PARTIAL.",
    "arch.fin_risk_analyst": "Scenario and limit posture — dense risk panels prioritized.",
    "arch.osint_analyst": "Entity network and source-quality framing.",
    "arch.executive": "Exception queue and decision summaries — minimal disclosure default.",
    "arch.auditor": "Policy, approval, and lineage audit trail emphasis.",
    "arch.prediction_decision_analyst": "Edge, risk, scenario, and proposals on prediction markets — human decides.",
    "arch.eng_operator": "Health, jobs, and diagnostics — technical detail available in Engineering.",
  };
}

export function buildExperienceSpec(parts, compiled) {
  const hints = rolePresentationHints();
  const roleId = parts.context?.roleId || parts.intent?.roleId || null;
  const hydrationAt = new Date().toISOString();

  return {
    schema: "sci-os-experience-spec/v1",
    label: "ALPHA_NON_PRODUCTION",
    intent: parts.intent,
    context: parts.context,
    domain: parts.domain,
    evidence: parts.evidence,
    analysis: parts.analysis,
    risk: parts.risk,
    decision: parts.decision,
    lineage: parts.lineage,
    degraded: parts.degraded,
    degradedReasons: parts.degradedReasons || [],
    roleHints: {
      roleId,
      presentation: hints[roleId] || (roleId ? "Professional workspace for " + roleId : null),
      density: compiled?.output?.density || null,
      disclosure: compiled?.output?.disclosureDefault || null,
    },
    timestamps: {
      hydrationAt,
      compiledAt: hydrationAt,
    },
    compilerVersion: COMPILER_VERSION,
    workspaceSpec: compiled?.workspaceSpec || null,
  };
}

/**
 * @param {object} input — roleId, objectId, workflowState, actor, kernelProjection, policyResults, etc.
 * @param {object} deps — appRoot, recentRuns
 */
export function runExperienceCompilerPipeline(input = {}, deps = {}) {
  const started = Date.now();
  const degradedReasons = [];

  const context = hydrateContext(input, deps);
  if (context.missing.length) {
    degradedReasons.push(...context.missing.map((m) => "context:" + m));
  }

  const domain = hydrateDomain({ roleId: context.roleId });
  if (!domain.ok) {
    degradedReasons.push("domain:registry_or_archetype");
    if (domain.registryErrors?.length) {
      degradedReasons.push(
        ...domain.registryErrors.slice(0, 3).map((e) => "registry:" + e.code)
      );
    }
  }

  const evidence = hydrateEvidence(
    { requiredCapabilities: domain.requiredCapabilities },
    deps
  );
  if (evidence.missing.length) {
    degradedReasons.push(...evidence.missing.map((m) => "evidence:" + m));
  }

  const analysis = hydrateAnalysis(
    {
      objectId: context.objectId,
      workflowState: context.workflowState,
    },
    deps
  );

  const risk = hydrateRisk(
    {
      riskPolicy: context.riskPolicy,
      executionMode: context.executionMode,
      policyResults: input.policyResults || deps.policyResults,
    },
    deps
  );

  const decision = hydrateDecision(
    {
      workflowState: context.workflowState,
      policyResults: input.policyResults || deps.policyResults,
    },
    deps
  );

  const lineage = {
    schema: "sci-os-hydration-lineage/v1",
    available: analysis.latestRunId != null,
    runId: analysis.latestRunId,
    tipHashRequired: true,
    status: analysis.latestRunId ? "PARTIAL" : "ABSENT",
    note: analysis.latestRunId
      ? "Lineage from vertical-slice run"
      : "Complete Analyze to produce lineage tip hash",
  };

  const disabledActions = [
    ...(risk.deniedActions || []),
    ...(input.disabledActions || []),
  ];

  const compiled = compileExperience({
    roleId: context.roleId,
    currentObject: context.objectId,
    workflowState: context.workflowState,
    userExperienceLevel: input.userExperienceLevel || "intermediate",
    runtimeMount: input.runtimeMount !== false,
    actor: context.actor,
    permission: context.permission || {
      actionsAllowed: [],
      actionsDenied: [],
      source: null,
    },
    riskPolicy: context.riskPolicy,
    executionProfile: context.executionMode,
    disabledActions,
    jobToBeDone: domain.jobToBeDone,
    domainOntology: domain.domainOntology,
    availableData: evidence.availableData,
    sciOsCapabilities: evidence.sciOsCapabilities,
  });

  if (compiled.output?.unknowns?.length) {
    for (const u of compiled.output.unknowns) {
      if (!degradedReasons.includes("compile:" + u)) {
        degradedReasons.push("compile:" + u);
      }
    }
  }

  const degraded = degradedReasons.length > 0;
  let compilerStatus = compiled.compilerStatus;
  if (degraded && input.runtimeMount !== false) {
    compilerStatus = "DEGRADED";
  }

  const intent = {
    roleId: context.roleId,
    objectId: context.objectId,
    workflowState: context.workflowState,
    mission: domain.jobToBeDone?.mission || null,
  };

  const experienceSpec = buildExperienceSpec(
    {
      intent,
      context,
      domain,
      evidence,
      analysis,
      risk,
      decision,
      lineage,
      degraded,
      degradedReasons,
    },
    compiled
  );

  const latencyMs = Date.now() - started;
  healthState.lastCompileAt = new Date().toISOString();
  healthState.lastCompileLatencyMs = latencyMs;
  healthState.lastStatus = compilerStatus;
  healthState.lastDegraded = degraded;
  healthState.compileCount += 1;

  return {
    ...compiled,
    compilerStatus,
    degraded,
    degradedReasons,
    experienceSpec,
    compilerVersion: COMPILER_VERSION,
    pipeline: {
      schema: "sci-os-compiler-pipeline-result/v1",
      hydrationMs: latencyMs,
      domainOk: domain.ok,
      registryOk: domain.registryOk,
      evidenceProven: evidence.provenCount,
    },
  };
}

export function getCompilerHealth(deps = {}) {
  const domain = hydrateDomain({ roleId: "arch.market_analyst" });
  const evidence = hydrateEvidence({}, deps);
  return {
    schema: "sci-os-compiler-health/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    compilerVersion: COMPILER_VERSION,
    pipelineModule: "PRESENT",
    authority: "packages/professional-domain-registry/src/compiler-pipeline.js",
    registryOk: domain.registryOk,
    capabilityRegistryPresent: !evidence.missing.includes("capability_registry_file"),
    executionMode: process.env.EXECUTION_MODE || "SIMULATION_ONLY",
    lastCompileAt: healthState.lastCompileAt,
    lastCompileLatencyMs: healthState.lastCompileLatencyMs,
    lastStatus: healthState.lastStatus,
    lastDegraded: healthState.lastDegraded,
    compileCount: healthState.compileCount,
    degraded: !domain.registryOk,
    status: domain.registryOk ? "READY" : "DEGRADED",
  };
}
