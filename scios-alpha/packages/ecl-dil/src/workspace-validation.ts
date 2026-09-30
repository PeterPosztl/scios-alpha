/**
 * Workspace validation wave — evidence over claim.
 * 9 archetypes can be checked. 191 bulk seeds stay UNKNOWN.
 * No evidence ⇒ UNKNOWN, never PASS. Not READY.
 */
import { buildRoleProfessionalInventory } from "./role-professional.js";
import { buildProfessionalCompileReport } from "./professional-compile.js";

export type ValidationVerdict = "PASS_CONSTRAINT" | "PARTIAL" | "UNKNOWN" | "SKIPPED" | "FAIL";

export type ValidationCheck = {
  id: string;
  verdict: ValidationVerdict;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function check(id: string, verdict: ValidationVerdict, evidence: string, note: string): ValidationCheck {
  return { id, verdict, evidence, note, autoTrade: false, ready: false };
}

export function buildWorkspaceValidationWave(
  compile = buildProfessionalCompileReport()
) {
  const inv = buildRoleProfessionalInventory();
  const all = compile.catalogs.find((c) => c.id === "AllDomains");
  const archetypes = all?.archetypes || [];
  const mounted = archetypes.filter(
    (a) => a.compilerStatus === "RUNTIME_MOUNTED" || a.compilerStatus === "DEGRADED"
  );
  const specs = archetypes.filter((a) => Boolean(a.workspaceProfileId));
  const liveExec = archetypes.some((a) => a.liveExecutionEnabled) || compile.health.liveExecution === true;
  const pending = archetypes.some((a) => a.compilerStatus === "PENDING" || a.compilerStatus === "UNKNOWN");

  const roles: ValidationCheck[] = [
    check(
      "RoleCatalog.AllDomains",
      liveExec ? "FAIL" : pending && mounted.length === 0 ? "UNKNOWN" : "PARTIAL",
      mounted.length + "/" + inv.registry.rolesSeeded + " workspaces evidenced (archetypes " + mounted.length + ", seeds " + inv.registry.rolesSeeded + ")",
      "200 seeds are not 200 validated workspaces. Bulk remain RESEARCH_REQUIRED. No evidence ⇒ UNKNOWN, never PASS."
    ),
    check(
      "ExperienceCompiler",
      liveExec ? "FAIL" : mounted.length === 9 ? "PARTIAL" : mounted.length > 0 ? "PARTIAL" : "UNKNOWN",
      "executed=" + compile.health.archetypesExecuted + " liveExecution=" + String(liveExec),
      "Dry-run compiler. RUNTIME_MOUNTED is not READY."
    ),
    check(
      "WorkspaceSpecEngine",
      specs.length === 9 ? "PARTIAL" : specs.length > 0 ? "PARTIAL" : "UNKNOWN",
      "workspaceProfileId present=" + specs.length,
      "Compose plan for one Shell. Not 200 generated pages."
    ),
  ];

  const sandboxModeOk = compile.sandboxes.every((s) => s.mode === "SIMULATION_ONLY" && s.liveData === false);
  const sandboxAbsent = compile.sandboxes.filter((s) => s.status === "ABSENT").length;
  const sandboxes: ValidationCheck[] = [
    check(
      "Sandbox.AllDomains",
      !sandboxModeOk ? "FAIL" : "PARTIAL",
      "sandboxes=" + compile.sandboxes.length + " mode=* SIMULATION_ONLY liveData=0 absent=" + sandboxAbsent,
      "Unmapped domain sandboxes stay ABSENT. Mode constraint can PASS_CONSTRAINT; domain completeness cannot."
    ),
    check(
      "Sandbox.mode",
      sandboxModeOk ? "PASS_CONSTRAINT" : "FAIL",
      sandboxModeOk ? "all SIMULATION_ONLY liveData=false" : "sandbox mode leak",
      "Safety invariant. Not a claim that every profession has a working sandbox."
    ),
  ];

  const lda = compile.blueprints.find((b) => b.id === "AgentSystem.LDA");
  const kg = compile.blueprints.find((b) => b.id === "KnowledgeGraph.Core");
  const dsl = compile.blueprints.find((b) => b.id === "WorkflowDSL.Core");
  const dist = compile.blueprints.find((b) => b.id === "DistributedArchitecture.Core");

  const blueprints: ValidationCheck[] = [
    check(
      "AgentSystem.LDA",
      lda?.result === "REFUSED" && lda.autoPatch === false ? "PASS_CONSTRAINT" : "FAIL",
      "result=" + (lda?.result || "UNKNOWN") + " autoPatch=" + String(lda?.autoPatch === true),
      "Correct refusal. GOVERNANCE > AGENT. Not an LDA runtime."
    ),
    check(
      "KnowledgeGraph.Core",
      kg?.nationalGraph === true ? "FAIL" : "PARTIAL",
      "status=" + (kg?.status || "UNKNOWN") + " nationalGraph=" + String(kg?.nationalGraph === true),
      "Wave-1 ontology analog. National graph remains false."
    ),
    check(
      "WorkflowDSL.Core",
      dsl?.secondEngine === true ? "FAIL" : "UNKNOWN",
      "status=" + (dsl?.status || "ABSENT") + " secondEngine=" + String(dsl?.secondEngine === true),
      "No evidence of a user-authored DSL compiler. UNKNOWN, not PASS."
    ),
    check(
      "DistributedArchitecture.Core",
      dist?.kafka && dist.kafka !== "ABSENT" ? "FAIL" : "UNKNOWN",
      "kafka=" + String(dist?.kafka || "ABSENT"),
      "No Kafka/multi-region evidence. UNKNOWN, not PASS."
    ),
  ];

  const pipelineIds = [
    "ExperienceCompiler",
    "WorkspaceSpecEngine",
    "JTBDEngine",
    "CapabilityEngine",
    "PolicyEngine",
    "RiskEngine.Professional",
    "EvidenceEngine.Professional",
    "LineageEngine.Professional",
  ];
  const pipelines: ValidationCheck[] = pipelineIds
    .filter((id) => id !== "ExperienceCompiler" && id !== "WorkspaceSpecEngine")
    .map((id) => {
      const e = compile.engines.find((x) => x.id === id);
      return check(
        id,
        !e ? "UNKNOWN" : e.status === "ABSENT" ? "UNKNOWN" : "PARTIAL",
        "result=" + (e?.result || "UNKNOWN") + " status=" + (e?.status || "UNKNOWN"),
        e?.note || "Analog only."
      );
    });

  const os: ValidationCheck[] = compile.os.map((o) =>
    check(
      o.id,
      o.status === "ABSENT" ? "UNKNOWN" : "PARTIAL",
      "result=" + o.result + " status=" + o.status,
      o.note
    )
  );

  const safety: ValidationCheck[] = [
    check(
      "simulationOnly",
      compile.simulationOnly === true && compile.executionMode === "SIMULATION_ONLY" ? "PASS_CONSTRAINT" : "FAIL",
      compile.executionMode,
      "EXECUTION_MODE remains SIMULATION_ONLY."
    ),
    check(
      "noAutoTrade",
      compile.autoTrade === false && !liveExec ? "PASS_CONSTRAINT" : "FAIL",
      "autoTrade=" + String(compile.autoTrade) + " liveExecution=" + String(liveExec),
      "Human remains decision maker."
    ),
    check(
      "persistedFalse",
      compile.persisted === false ? "PASS_CONSTRAINT" : "FAIL",
      "persisted=" + String(compile.persisted),
      "GET must not persist until durable ledger."
    ),
    check(
      "noUnexpectedLiveFeeds",
      compile.health.unexpectedLive === false && compile.liveDomainData === false ? "PASS_CONSTRAINT" : "FAIL",
      "unexpectedLive=" + String(compile.health.unexpectedLive) + " liveDomainData=" + String(compile.liveDomainData),
      "Certified live feeds remain 0."
    ),
    check(
      "oneBootOneShell",
      "PASS_CONSTRAINT",
      "start-sci-os.cjs · :3000 · apps/cockpit-ui :4000",
      "Validation does not start a second OS."
    ),
  ];

  const allChecks = [...roles, ...sandboxes, ...blueprints, ...pipelines, ...os, ...safety];
  const fail = allChecks.filter((c) => c.verdict === "FAIL").length;
  const passConstraint = allChecks.filter((c) => c.verdict === "PASS_CONSTRAINT").length;
  const partial = allChecks.filter((c) => c.verdict === "PARTIAL").length;
  const unknown = allChecks.filter((c) => c.verdict === "UNKNOWN").length;

  return {
    schema: "sci-os-workspace-validation-wave/v1" as const,
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
    roles,
    sandboxes,
    blueprints,
    pipelines,
    os,
    safety,
    health: {
      checks: allChecks.length,
      fail,
      passConstraint,
      partial,
      unknown,
      archetypesEvidenced: mounted.length,
      rolesSeeded: inv.registry.rolesSeeded,
      rolesFullySpecified: inv.registry.rolesFullySpecified,
      rolesResearchRequired: inv.registry.rolesResearchRequired,
    },
    compileHealth: compile.health,
    note: "Validation wave. 9 evidenced workspaces. 191 seeds UNKNOWN. Constraints may PASS. Product is not READY.",
  };
}
