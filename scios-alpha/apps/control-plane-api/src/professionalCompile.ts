/**
 * SAFE professional workspace compilation — dry-run Experience Compiler.
 * 9 archetypes only. Unmapped domains RESEARCH_REQUIRED. GET must not persist.
 * ALPHA_NON_PRODUCTION. No auto-trade. Not READY.
 */
import { compileProductExperience } from "./routes/product.js";
import {
  buildProfessionalCompileReport,
  buildWorkspaceValidationWave,
  buildDeepWorkspaceValidationWave,
  buildWorkspaceActivationWave,
  buildWorkspaceStabilizationWave,
  buildDigitalActivationWave,
  buildPrecisionUpgradeWave,
  buildCyberResearchBridgeWave,
  buildActivationReviewWave,
  buildEnterprisePrepWave,
  buildAutomationPrepWave,
  buildVisibilityPrepWave,
  buildVisibilityActivationWave,
  buildVisibilityDeepWave,
  buildExplainabilityPrepWave,
  buildExplainabilityAndVisibilityWave,
  buildDigitalAndWorkspaceAndComputeWave,
  buildActivationPassWave,
  buildPhaseCoreWave,
  buildCopilotBlueprintWave,
  buildAuditEngineCoreWave,
  buildLimitEngineCoreWave,
  buildLedgerCoreWave,
  buildDomainFabricWave,
  buildKgFabricWave,
  buildScenarioFabricWave,
  buildCausalFabricWave,
  buildGovernanceFabricWave,
  buildInfraFabricWave,
  buildSecurityFabricWave,
  buildOsFabricWave,
  buildCursorRunbookWave,
  type ArchetypeCompileResult,
  type DeepArchetypeProbe,
} from "@scios/ecl-dil";

type Compiled = {
  compilerStatus?: string;
  degraded?: boolean;
  degradedReasons?: string[];
  output?: { workspaceProfileId?: string; unknowns?: string[] };
  workspaceSpec?: {
    workspaceId?: string;
    actions?: Array<{ id?: string; enabled?: boolean }>;
    panels?: Array<{ state?: string }>;
    jtbd?: string | null;
    maturity?: { modelScience?: string; execution?: string };
  };
  input?: {
    jobToBeDone?: { mission?: string | null; topTasks?: unknown[] };
    executionProfile?: string;
  };
};

function liveExecutionEnabled(compiled: Compiled): boolean {
  const actions = compiled.workspaceSpec?.actions || [];
  return actions.some((a) => a.id === "live_execution" && a.enabled === true);
}

function probeFromCompiled(roleId: string, compiled: Compiled): DeepArchetypeProbe {
  const actions = compiled.workspaceSpec?.actions || [];
  const panels = compiled.workspaceSpec?.panels || [];
  const live = liveExecutionEnabled(compiled);
  const liveAction = actions.find((a) => a.id === "live_execution");
  return {
    roleId,
    compilerStatus: compiled.compilerStatus || "UNKNOWN",
    workspaceProfileId:
      compiled.output?.workspaceProfileId || compiled.workspaceSpec?.workspaceId || null,
    panelCount: panels.length,
    panelsUnknown: panels.filter((p) => p.state === "UNKNOWN").length,
    liveBlocked: liveAction ? liveAction.enabled !== true : true,
    analyzeEnabled: actions.some((a) => a.id === "analyze" && a.enabled === true),
    jtbdMission: compiled.workspaceSpec?.jtbd || compiled.input?.jobToBeDone?.mission || null,
    jtbdTasks: Array.isArray(compiled.input?.jobToBeDone?.topTasks)
      ? compiled.input.jobToBeDone.topTasks.length
      : 0,
    unknowns: Array.isArray(compiled.output?.unknowns) ? compiled.output.unknowns.length : 0,
    executionProfile:
      compiled.workspaceSpec?.maturity?.execution || compiled.input?.executionProfile || "UNKNOWN",
    modelScience: compiled.workspaceSpec?.maturity?.modelScience || null,
    liveExecutionEnabled: live,
    autoTrade: false,
    invented: false,
  };
}

function compileArchetypes() {
  const plan = buildProfessionalCompileReport();
  const probes: DeepArchetypeProbe[] = [];
  const archetypes: ArchetypeCompileResult[] = plan.uniqueArchetypes.map((roleId) => {
    const compiled = compileProductExperience({
      roleId,
      workflowState: "ready",
      userExperienceLevel: "intermediate",
      sessionId: "professional-compile-test",
    }) as Compiled;
    const probe = probeFromCompiled(roleId, compiled);
    probes.push(probe);
    return {
      roleId,
      compilerStatus: compiled.compilerStatus || "UNKNOWN",
      degraded: compiled.degraded === true,
      degradedReasons: compiled.degradedReasons || [],
      workspaceProfileId: probe.workspaceProfileId,
      liveExecutionEnabled: probe.liveExecutionEnabled,
      autoTrade: false as const,
      persisted: false as const,
      invented: false as const,
    };
  });
  const compile = buildProfessionalCompileReport({ archetypes });
  return { compile, probes };
}

export function runProfessionalWorkspaceCompilation() {
  return compileArchetypes().compile;
}

export function runWorkspaceValidationWave() {
  return buildWorkspaceValidationWave(compileArchetypes().compile);
}

export function runDeepWorkspaceValidationWave() {
  const { compile, probes } = compileArchetypes();
  return buildDeepWorkspaceValidationWave({ compile, probes });
}

export function runWorkspaceActivationWave() {
  const { compile, probes } = compileArchetypes();
  return buildWorkspaceActivationWave({ compile, probes });
}

export function runWorkspaceStabilizationWave() {
  const { compile, probes } = compileArchetypes();
  return buildWorkspaceStabilizationWave({ compile, probes });
}

export function runDigitalActivationWave() {
  return buildDigitalActivationWave();
}

export function runPrecisionUpgradeWave() {
  return buildPrecisionUpgradeWave();
}

export function runCyberResearchBridgeWave() {
  return buildCyberResearchBridgeWave();
}

export function runActivationReviewWave() {
  return buildActivationReviewWave();
}

export function runEnterprisePrepWave() {
  return buildEnterprisePrepWave();
}

export function runAutomationPrepWave() {
  return buildAutomationPrepWave();
}

export function runVisibilityPrepWave() {
  return buildVisibilityPrepWave();
}

export function runVisibilityActivationWave() {
  return buildVisibilityActivationWave();
}

export function runVisibilityDeepWave() {
  return buildVisibilityDeepWave();
}

export function runExplainabilityPrepWave() {
  return buildExplainabilityPrepWave();
}

export function runExplainVisibilityWave() {
  return buildExplainabilityAndVisibilityWave();
}

export function runDigitalWorkspaceComputeWave() {
  return buildDigitalAndWorkspaceAndComputeWave();
}

export function runActivationPassWave() {
  return buildActivationPassWave();
}

export function runPhaseCoreWave() {
  return buildPhaseCoreWave();
}

export function runPhaseCoreBlueprintsWave() {
  return buildCopilotBlueprintWave();
}

export function runAuditEngineCoreWave() {
  return buildAuditEngineCoreWave();
}

export function runLimitEngineCoreWave() {
  return buildLimitEngineCoreWave();
}

export function runLedgerCoreWave() {
  return buildLedgerCoreWave();
}

export function runDomainFabricWave() {
  return buildDomainFabricWave();
}

export function runKgFabricWave() {
  return buildKgFabricWave();
}

export function runScenarioFabricWave() {
  return buildScenarioFabricWave();
}

export function runCausalFabricWave() {
  return buildCausalFabricWave();
}

export function runGovernanceFabricWave() {
  return buildGovernanceFabricWave();
}

export function runInfraFabricWave() {
  return buildInfraFabricWave();
}

export function runSecurityFabricWave() {
  return buildSecurityFabricWave();
}

export function runOsFabricWave() {
  return buildOsFabricWave();
}

export function runCursorRunbookWave() {
  return buildCursorRunbookWave();
}
