/**
 * SAFE professional workspace compilation plan/report.
 * Compiles 9 archetypes only. Unmapped domains stay RESEARCH_REQUIRED.
 * Analog-compiles engines/sandboxes/blueprints/OS. No invented SOPs. Not READY.
 */
import { REALISTIC_SIM_HOOKS } from "./realistic-sim.js";
import { buildRoleProfessionalInventory } from "./role-professional.js";

export type ArchetypeCompileResult = {
  roleId: string;
  compilerStatus: string;
  degraded: boolean;
  degradedReasons: string[];
  workspaceProfileId: string | null;
  liveExecutionEnabled: boolean;
  autoTrade: false;
  persisted: false;
  invented: false;
};

export type BlueprintCompileResult = {
  id: string;
  result: string;
  status: string;
  analog: string;
  note: string;
  autoTrade: false;
  persisted: false;
  invented: false;
  ready: false;
  autoPatch?: boolean;
  nationalGraph?: boolean;
  secondEngine?: boolean;
  kafka?: string;
};

// Generic over extra: a Record<string, unknown> spread contributes no named
// properties to the inferred return type, which erased mode/liveData/autoPatch/
// nationalGraph/secondEngine/kafka from every caller and hid the result override.
function analog<E extends Record<string, unknown>>(
  id: string,
  status: string,
  analog: string,
  note: string,
  extra: E = {} as E
) {
  const skipped = status === "ABSENT";
  return {
    id,
    result: skipped ? ("SKIPPED_ABSENT" as const) : ("COMPILED_ANALOG" as const),
    status,
    analog,
    note,
    autoTrade: false as const,
    persisted: false as const,
    invented: false as const,
    ready: false as const,
    ...extra,
  };
}

export function buildProfessionalCompileReport(opts?: { archetypes?: ArchetypeCompileResult[] }) {
  const inv = buildRoleProfessionalInventory();
  const byRole = new Map((opts?.archetypes || []).map((a) => [a.roleId, a]));
  const uniqueArchetypes = Array.from(
    new Set(inv.catalogs.flatMap((c) => c.analogArchetypes))
  );

  const catalogs = inv.catalogs.map((c) => {
    if (c.status === "ABSENT" || c.analogArchetypes.length === 0) {
      return {
        id: c.id,
        target: "RoleCatalog." + c.id,
        result:
          c.status === "ABSENT"
            ? ("SKIPPED_RESEARCH_REQUIRED" as const)
            : ("COMPILED_ANALOG" as const),
        catalogStatus: c.status,
        archetypes: [] as ArchetypeCompileResult[],
        inventedSops: false as const,
        autoTrade: false as const,
        persisted: false as const,
        ready: false as const,
        note: c.note,
      };
    }
    const archetypes = c.analogArchetypes.map((roleId) => {
      const hit = byRole.get(roleId);
      return (
        hit || {
          roleId,
          compilerStatus: "PENDING",
          degraded: true,
          degradedReasons: ["compile_not_executed"],
          workspaceProfileId: null,
          liveExecutionEnabled: false as const,
          autoTrade: false as const,
          persisted: false as const,
          invented: false as const,
        }
      );
    });
    return {
      id: c.id,
      target: "RoleCatalog." + c.id,
      result: "COMPILED_ARCHETYPE" as const,
      catalogStatus: c.status,
      archetypes,
      inventedSops: false as const,
      autoTrade: false as const,
      persisted: false as const,
      ready: false as const,
      note: c.note,
    };
  });

  const engines = Object.entries(inv.engines).map(([id, e]) => analog(id, e.status, e.analog, e.note));

  const sandboxes = inv.sandboxes.map((s) =>
    analog("Sandbox." + s.id, s.status, s.analog, s.note, {
      mode: s.mode,
      liveData: s.liveData,
    })
  );

  // Heterogeneous and looked up by id, so the evidence fields must be declared
  // optional on one shared shape; a union of four literals is not indexable.
  const blueprints: BlueprintCompileResult[] = [
    analog(
      "AgentSystem.LDA",
      "ABSENT",
      "DIL AI proposals + GOVERNANCE > AGENT; Cursor remains implementer outside the product",
      "No LocalDevelopmentAgent patch/AST/LSP runtime. Auto-apply refused.",
      { autoPatch: false, result: "REFUSED" }
    ),
    analog(
      "KnowledgeGraph.Core",
      "PARTIAL",
      "packages/data-fabric ontology + GW1 lineage + professional-domain-registry seeds",
      "National graph false. Causal query engine ABSENT.",
      { nationalGraph: false }
    ),
    analog(
      "WorkflowDSL.Core",
      "ABSENT",
      "GW1 VERTICAL_SLICE_STAGES + CF11 job TRANSITION_MATRIX",
      "User-authored DSL compiler ABSENT. secondEngine=false.",
      { secondEngine: false }
    ),
    analog(
      "DistributedArchitecture.Core",
      "ABSENT",
      "local-foundation single node; optional PG/Redis OPTIONAL_INFRA_DEGRADED",
      "Kafka ABSENT. multiRegion=false.",
      { kafka: "ABSENT" }
    ),
  ];

  const osIds = [
    "WorkflowEngine.RealisticMode",
    "EventBus.RealisticMode",
    "SystemHealth.RealisticMode",
    "AuditEngine.RealisticMode",
  ] as const;
  const os = osIds.map((id) => {
    const e = REALISTIC_SIM_HOOKS.engines[id];
    return analog(id, e.status, e.analog, e.note, { monteCarlo: false, raft: false });
  });

  const executed = (opts?.archetypes || []).length;
  const skipped = catalogs.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;
  const liveExec = (opts?.archetypes || []).some((a) => a.liveExecutionEnabled);

  return {
    schema: "sci-os-professional-workspace-compilation/v1" as const,
    label: "ALPHA_NON_PRODUCTION" as const,
    ready: false as const,
    holeless: false as const,
    autoTrade: false as const,
    persisted: false as const,
    simulationOnly: true as const,
    executionMode: "SIMULATION_ONLY" as const,
    inventedSops: false as const,
    liveDomainData: false as const,
    uniqueArchetypes,
    catalogs,
    engines,
    sandboxes,
    blueprints,
    os,
    health: {
      catalogs: catalogs.length,
      archetypesPlanned: uniqueArchetypes.length,
      archetypesExecuted: executed,
      skippedResearchRequired: skipped,
      sandboxMode: "SIMULATION_ONLY" as const,
      liveExecution: liveExec,
      unexpectedLive: false as const,
    },
    note: "SAFE compile test. 9 archetypes only. Unmapped domains RESEARCH_REQUIRED. LDA auto-patch refused. Not READY.",
  };
}
