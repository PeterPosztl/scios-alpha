/**
 * Deep workspace validation — inspect workspaceSpec internals.
 * 9 archetypes only. 191 seeds UNKNOWN. Panel layout "READY" ≠ product READY.
 * ALPHA_NON_PRODUCTION. No auto-trade.
 */
import { buildRoleProfessionalInventory } from "./role-professional.js";
import { buildProfessionalCompileReport } from "./professional-compile.js";
import { buildWorkspaceValidationWave, type ValidationCheck, type ValidationVerdict } from "./workspace-validation.js";

export type DeepArchetypeProbe = {
  roleId: string;
  compilerStatus: string;
  workspaceProfileId: string | null;
  panelCount: number;
  panelsUnknown: number;
  liveBlocked: boolean;
  analyzeEnabled: boolean;
  jtbdMission: string | null;
  jtbdTasks: number;
  unknowns: number;
  executionProfile: string;
  modelScience: string | null;
  liveExecutionEnabled: boolean;
  autoTrade: false;
  invented: false;
};

function check(id: string, verdict: ValidationVerdict, evidence: string, note: string): ValidationCheck {
  return { id, verdict, evidence, note, autoTrade: false, ready: false };
}

export function buildDeepWorkspaceValidationWave(opts?: {
  compile?: ReturnType<typeof buildProfessionalCompileReport>;
  probes?: DeepArchetypeProbe[];
}) {
  const compile = opts?.compile || buildProfessionalCompileReport();
  const shallow = buildWorkspaceValidationWave(compile);
  const inv = buildRoleProfessionalInventory();
  const probes = opts?.probes || [];
  const n = probes.length;

  const liveLeak = probes.some((p) => p.liveExecutionEnabled || !p.liveBlocked);
  const specs = probes.filter((p) => p.workspaceProfileId && p.panelCount > 0);
  const jtbd = probes.filter((p) => p.jtbdMission && p.jtbdMission !== "UNKNOWN" && p.jtbdMission !== "RESEARCH_REQUIRED");
  const sim = probes.filter(
    (p) => p.executionProfile === "SIMULATION_ONLY" || p.executionProfile === "UNKNOWN"
  );
  const unvalidatedScience = probes.filter((p) => p.modelScience === "UNVALIDATED" || p.modelScience == null);

  const deepRoles: ValidationCheck[] = [
    check(
      "RoleCatalog.AllDomains.deep",
      liveLeak ? "FAIL" : n === 9 ? "PARTIAL" : n > 0 ? "PARTIAL" : "UNKNOWN",
      "probes=" + n + "/" + inv.registry.rolesSeeded + " liveLeak=" + String(liveLeak),
      "Deep inspect of 9 archetype specs. 191 seeds still UNKNOWN. Not 200 validated workspaces."
    ),
    check(
      "ExperienceCompiler.deep",
      liveLeak ? "FAIL" : n === 9 ? "PARTIAL" : "UNKNOWN",
      "mounted=" + probes.filter((p) => p.compilerStatus === "RUNTIME_MOUNTED" || p.compilerStatus === "DEGRADED").length,
      "RUNTIME_MOUNTED is a dry-run mount, not product READY."
    ),
    check(
      "WorkspaceSpecEngine.deep",
      specs.length === 9 ? "PARTIAL" : specs.length > 0 ? "PARTIAL" : "UNKNOWN",
      "specsWithPanels=" + specs.length + " panel layout READY is local UI state, not product READY",
      "One Shell compose plan per archetype. No page farm."
    ),
    check(
      "JTBDEngine.deep",
      jtbd.length === 9 ? "PARTIAL" : jtbd.length > 0 ? "PARTIAL" : "UNKNOWN",
      "missions=" + jtbd.length + "/9 archetypes · bulk seeds RESEARCH_REQUIRED",
      "Jobs-to-be-done exist on golden archetypes only. Do not invent hospitality/healthcare SOPs."
    ),
  ];

  const deepPolicy: ValidationCheck[] = [
    check(
      "PolicyEngine.deep",
      n > 0 && probes.every((p) => p.liveBlocked && !p.liveExecutionEnabled) ? "PASS_CONSTRAINT" : n === 0 ? "UNKNOWN" : "FAIL",
      "liveBlocked=" + probes.filter((p) => p.liveBlocked).length + "/" + n,
      "live_execution must stay disabled. Human remains decision maker."
    ),
    check(
      "CapabilityEngine.deep",
      unvalidatedScience.length === n && n === 9 ? "PARTIAL" : n > 0 ? "PARTIAL" : "UNKNOWN",
      "modelScience UNVALIDATED=" + unvalidatedScience.length + "/" + n,
      "Capabilities are analog/UNVALIDATED. Not proven production science."
    ),
    check(
      "RiskEngine.Professional.deep",
      n > 0 && sim.length === n ? "PARTIAL" : n === 0 ? "UNKNOWN" : "FAIL",
      "executionProfile SIMULATION_ONLY-or-UNKNOWN=" + sim.length + "/" + n,
      "Professional risk analog. Not a broker kill-switch."
    ),
    check(
      "EvidenceEngine.Professional.deep",
      specs.length > 0 ? "PARTIAL" : "UNKNOWN",
      "workspace specs evidenced=" + specs.length,
      "Session provenance via spec. Not enterprise SIEM."
    ),
    check(
      "LineageEngine.Professional.deep",
      specs.length > 0 ? "PARTIAL" : "UNKNOWN",
      "lineage still requires GW1 tip hash — UNKNOWN until Analyze completes",
      "No durable hash fabric. UNKNOWN for live lineage, not PASS."
    ),
  ];

  const deepSandboxes: ValidationCheck[] = [
    check(
      "Sandbox.AllDomains.deep",
      compile.sandboxes.every((s) => s.mode === "SIMULATION_ONLY" && s.liveData === false) ? "PARTIAL" : "FAIL",
      "count=" + compile.sandboxes.length + " absent=" + compile.sandboxes.filter((s) => s.status === "ABSENT").length,
      "Deep sandbox check is mode + liveData. Unmapped professions remain ABSENT."
    ),
  ];

  const lda = compile.blueprints.find((b) => b.id === "AgentSystem.LDA");
  const kg = compile.blueprints.find((b) => b.id === "KnowledgeGraph.Core");
  const deepBlueprints: ValidationCheck[] = [
    check(
      "AgentSystem.LDA.deep",
      lda?.result === "REFUSED" && lda.autoPatch === false ? "PASS_CONSTRAINT" : "FAIL",
      "result=" + (lda?.result || "UNKNOWN"),
      "Deep: still no AST/LSP auto-patcher. GOVERNANCE > AGENT."
    ),
    check(
      "KnowledgeGraph.Core.deep",
      kg?.nationalGraph === true ? "FAIL" : "PARTIAL",
      "nationalGraph=" + String(kg?.nationalGraph === true),
      "Ontology analog only. Causal query engine ABSENT."
    ),
    check(
      "WorkflowDSL.Core.deep",
      "UNKNOWN",
      "secondEngine=false · no compile artifacts for user DSL",
      "No evidence ⇒ UNKNOWN, never PASS."
    ),
    check(
      "DistributedArchitecture.Core.deep",
      "UNKNOWN",
      "kafka=ABSENT · no cluster compile artifacts",
      "No evidence ⇒ UNKNOWN, never PASS."
    ),
  ];

  const deepOs: ValidationCheck[] = compile.os.map((o) =>
    check(
      o.id + ".deep",
      o.status === "ABSENT" ? "UNKNOWN" : "PARTIAL",
      "analog=" + o.analog,
      "Deep OS check remains analog. Not Raft/Kafka."
    )
  );

  const allDeep = [...deepRoles, ...deepSandboxes, ...deepBlueprints, ...deepPolicy, ...deepOs];
  const fail = allDeep.filter((c) => c.verdict === "FAIL").length + (shallow.health.fail || 0);
  const passConstraint = allDeep.filter((c) => c.verdict === "PASS_CONSTRAINT").length;
  const partial = allDeep.filter((c) => c.verdict === "PARTIAL").length;
  const unknown = allDeep.filter((c) => c.verdict === "UNKNOWN").length;

  return {
    schema: "sci-os-deep-workspace-validation/v1" as const,
    label: "ALPHA_NON_PRODUCTION" as const,
    ready: false as const,
    holeless: false as const,
    autoTrade: false as const,
    persisted: false as const,
    simulationOnly: true as const,
    executionMode: "SIMULATION_ONLY" as const,
    inventedSops: false as const,
    roles200Validated: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("PARTIAL" as const),
    shallow: {
      wave: shallow.wave,
      health: shallow.health,
    },
    probes,
    roles: deepRoles,
    sandboxes: deepSandboxes,
    blueprints: deepBlueprints,
    pipelines: deepPolicy,
    os: deepOs,
    safety: shallow.safety,
    health: {
      fail,
      passConstraint: passConstraint + (shallow.health.passConstraint || 0),
      partial: partial + (shallow.health.partial || 0),
      unknown: unknown + (shallow.health.unknown || 0),
      probes: n,
      archetypesEvidenced: n,
      rolesSeeded: inv.registry.rolesSeeded,
      rolesFullySpecified: inv.registry.rolesFullySpecified,
      liveBlocked: probes.filter((p) => p.liveBlocked).length,
    },
    note: "Deep validation of 9 workspace specs. Panel READY ≠ product READY. 191 seeds UNKNOWN. Not READY.",
  };
}
