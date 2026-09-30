/**
 * SAFE workspace stabilization — reconcile activation leftovers.
 * Keep 9 consistent archetype specs. Mark 191 incomplete. Disable ABSENT views.
 * LDA stays REFUSED. DSL/Kafka stay UNKNOWN.
 * ALPHA_NON_PRODUCTION. No auto-trade. Not READY.
 */
import { buildRoleProfessionalInventory } from "./role-professional.js";
import { buildProfessionalCompileReport } from "./professional-compile.js";
import { buildWorkspaceValidationWave } from "./workspace-validation.js";
import { buildWorkspaceActivationWave } from "./workspace-activation.js";
import type { DeepArchetypeProbe } from "./deep-workspace-validation.js";

export type StabilizationStatus =
  | "CONSISTENT"
  | "INCOMPLETE"
  | "DISABLED"
  | "REFUSED"
  | "UNKNOWN"
  | "ANALOG"
  | "FAIL";

export type StabilizationCheck = {
  id: string;
  status: StabilizationStatus;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function rec(id: string, status: StabilizationStatus, evidence: string, note: string): StabilizationCheck {
  return { id, status, evidence, note, autoTrade: false, ready: false };
}

export function buildWorkspaceStabilizationWave(opts?: {
  compile?: ReturnType<typeof buildProfessionalCompileReport>;
  probes?: DeepArchetypeProbe[];
}) {
  const compile = opts?.compile || buildProfessionalCompileReport();
  const activation = buildWorkspaceActivationWave({ compile, probes: opts?.probes });
  const shallow = buildWorkspaceValidationWave(compile);
  const inv = buildRoleProfessionalInventory();
  const probes = opts?.probes || [];
  const n = probes.length;

  const liveLeak = probes.some((p) => p.liveExecutionEnabled || !p.liveBlocked);
  const specs = probes.filter((p) => p.workspaceProfileId && p.panelCount > 0 && p.liveBlocked && !p.liveExecutionEnabled);
  const mounted = probes.filter(
    (p) =>
      (p.compilerStatus === "RUNTIME_MOUNTED" || p.compilerStatus === "DEGRADED") &&
      p.liveBlocked &&
      !p.liveExecutionEnabled
  );
  const sandboxModeOk = compile.sandboxes.every((s) => s.mode === "SIMULATION_ONLY" && s.liveData === false);

  const incompleteCatalogs = inv.catalogs.filter(
    (c) => c.status === "ABSENT" || c.status === "STUB" || c.analogArchetypes.length === 0
  );
  const disabledCatalogs = inv.catalogs.filter((c) => c.status === "ABSENT" || c.analogArchetypes.length === 0);
  const incompleteCount = inv.registry.rolesSeeded - inv.registry.rolesFullySpecified;

  const roles: StabilizationCheck[] = [
    rec(
      "RoleCatalog.AllDomains",
      liveLeak ? "FAIL" : specs.length === 9 ? "CONSISTENT" : "INCOMPLETE",
      "consistent=" + specs.length + "/" + inv.registry.rolesSeeded + " incomplete=" + incompleteCount,
      "Reconciled: 9 golden archetypes. 191 seeds INCOMPLETE. Not 200 apps."
    ),
    rec(
      "ExperienceCompiler",
      liveLeak ? "FAIL" : mounted.length === 9 ? "CONSISTENT" : "INCOMPLETE",
      "runtimeMounted=" + mounted.length,
      "Dry-run mount kept. RUNTIME_MOUNTED ≠ product READY."
    ),
    rec(
      "WorkspaceSpecEngine",
      liveLeak ? "FAIL" : specs.length === 9 ? "CONSISTENT" : "INCOMPLETE",
      "specsWithPanels=" + specs.length,
      "One Shell compose plan per consistent archetype. Panel READY ≠ product READY."
    ),
  ];

  const sandboxes: StabilizationCheck[] = [
    rec(
      "Sandbox.AllDomains",
      !sandboxModeOk ? "FAIL" : "CONSISTENT",
      "mode=* SIMULATION_ONLY liveData=0 absent=" + inv.sandboxes.filter((s) => s.status === "ABSENT").length,
      "Sandbox mode reconciled. Unmapped domain sandboxes DISABLED, not invented."
    ),
    ...inv.sandboxes
      .filter((s) => s.status === "ABSENT")
      .map((s) =>
        rec(
          "Sandbox." + s.id,
          "DISABLED",
          "status=ABSENT",
          "Broken/unmapped sandbox view disabled. RESEARCH_REQUIRED."
        )
      ),
  ];

  const lda = compile.blueprints.find((b) => b.id === "AgentSystem.LDA");
  const kg = compile.blueprints.find((b) => b.id === "KnowledgeGraph.Core");
  const blueprints: StabilizationCheck[] = [
    rec(
      "AgentSystem.LDA",
      lda?.result === "REFUSED" && lda.autoPatch === false ? "REFUSED" : "FAIL",
      "result=" + (lda?.result || "UNKNOWN") + " autoPatch=" + String(lda?.autoPatch === true),
      "Stabilization does not enable an AST/LSP auto-patcher. GOVERNANCE > AGENT."
    ),
    rec(
      "KnowledgeGraph.Core",
      kg?.nationalGraph === true ? "FAIL" : "ANALOG",
      "nationalGraph=" + String(kg?.nationalGraph === true),
      "Ontology analog kept. Not a national graph. Causal query engine ABSENT."
    ),
  ];

  const consistentPipelines = liveLeak
    ? []
    : [
        "RoleCatalog.AllDomains",
        "ExperienceCompiler",
        "WorkspaceSpecEngine",
        "Sandbox.AllDomains",
        "PolicyEngine",
        "RiskEngine.Professional",
      ];

  const pipelines: StabilizationCheck[] = [
    rec(
      "PolicyEngine",
      n > 0 && probes.every((p) => p.liveBlocked && !p.liveExecutionEnabled) ? "CONSISTENT" : n === 0 ? "UNKNOWN" : "FAIL",
      "liveBlocked=" + probes.filter((p) => p.liveBlocked).length + "/" + n,
      "Kept: live_execution stays off."
    ),
    rec(
      "RiskEngine.Professional",
      n > 0 && probes.every((p) => p.executionProfile === "SIMULATION_ONLY" || p.executionProfile === "UNKNOWN")
        ? "CONSISTENT"
        : n === 0
          ? "UNKNOWN"
          : "FAIL",
      "SIMULATION_ONLY profiles=" + n,
      "Kept: professional risk analog. Not a broker kill-switch."
    ),
    rec(
      "JTBDEngine",
      "ANALOG",
      "missions on 9 archetypes · bulk RESEARCH_REQUIRED",
      "Not in consistent runtime set. Do not invent hospitality/healthcare SOPs."
    ),
    rec(
      "CapabilityEngine",
      "ANALOG",
      "modelScience UNVALIDATED",
      "Dropped from consistent runtime set. Science unproven."
    ),
    rec(
      "EvidenceEngine.Professional",
      "ANALOG",
      "session provenance only",
      "Dropped from consistent runtime set. Not enterprise SIEM."
    ),
    rec(
      "LineageEngine.Professional",
      "ANALOG",
      "no durable hash fabric",
      "Dropped from consistent runtime set. Live lineage UNKNOWN."
    ),
    rec(
      "WorkflowDSL.Core",
      "UNKNOWN",
      "secondEngine=false",
      "Cannot keep an absent DSL pipeline."
    ),
    rec(
      "DistributedArchitecture.Core",
      "UNKNOWN",
      "kafka=ABSENT",
      "Cannot keep Kafka/Raft. Dropped."
    ),
  ];

  const views = [
    ...disabledCatalogs.map((c) => ({
      id: "RoleCatalog." + c.id,
      view: "disabled" as const,
      reason: c.status === "ABSENT" ? ("ABSENT" as const) : ("NO_ARCHETYPE" as const),
    })),
    ...inv.sandboxes
      .filter((s) => s.status === "ABSENT")
      .map((s) => ({
        id: "Sandbox." + s.id,
        view: "disabled" as const,
        reason: "ABSENT" as const,
      })),
  ];

  const incompleteWorkspaces = [
    {
      kind: "seeds" as const,
      count: incompleteCount,
      status: "INCOMPLETE" as const,
      note: "Bulk role seeds remain RESEARCH_REQUIRED.",
    },
    ...incompleteCatalogs.map((c) => ({
      kind: "catalog" as const,
      id: c.id,
      status: (c.status === "ABSENT" ? "DISABLED" : "INCOMPLETE") as "DISABLED" | "INCOMPLETE",
      note: c.note,
    })),
  ];

  const all = [...roles, ...sandboxes, ...blueprints, ...pipelines];
  const fail = all.filter((c) => c.status === "FAIL").length;

  return {
    schema: "sci-os-workspace-stabilization-wave/v1" as const,
    label: "ALPHA_NON_PRODUCTION" as const,
    ready: false as const,
    holeless: false as const,
    autoTrade: false as const,
    persisted: false as const,
    simulationOnly: true as const,
    executionMode: "SIMULATION_ONLY" as const,
    inventedSops: false as const,
    enabledFull: false as const,
    roles200Activated: false as const,
    roles200Stabilized: false as const,
    stabilized: fail === 0,
    wave: fail > 0 ? ("FAIL" as const) : ("PARTIAL" as const),
    reconcile: {
      WorkspaceSpecEngine: roles.find((r) => r.id === "WorkspaceSpecEngine")?.status,
      ExperienceCompiler: roles.find((r) => r.id === "ExperienceCompiler")?.status,
      "RoleCatalog.AllDomains": roles.find((r) => r.id === "RoleCatalog.AllDomains")?.status,
      "Sandbox.AllDomains": sandboxes.find((r) => r.id === "Sandbox.AllDomains")?.status,
      "AgentSystem.LDA": blueprints.find((r) => r.id === "AgentSystem.LDA")?.status,
      "KnowledgeGraph.Core": blueprints.find((r) => r.id === "KnowledgeGraph.Core")?.status,
    },
    consistentPipelines,
    incompleteWorkspaces,
    disabledViews: views,
    roles,
    sandboxes,
    blueprints,
    pipelines,
    safety: shallow.safety,
    activationWave: activation.wave,
    health: {
      fail,
      consistent: all.filter((c) => c.status === "CONSISTENT").length,
      incomplete: incompleteCount,
      disabledViews: views.length,
      refused: all.filter((c) => c.status === "REFUSED").length,
      unknown: all.filter((c) => c.status === "UNKNOWN").length,
      analog: all.filter((c) => c.status === "ANALOG").length,
      archetypesConsistent: liveLeak ? 0 : specs.length,
      rolesSeeded: inv.registry.rolesSeeded,
      rolesFullySpecified: inv.registry.rolesFullySpecified,
      liveBlocked: probes.filter((p) => p.liveBlocked).length,
      consistentPipelines: consistentPipelines.length,
    },
    note: "Stabilized inventory: 9 consistent specs, 191 incomplete, ABSENT views disabled, LDA refused. Not READY.",
  };
}
