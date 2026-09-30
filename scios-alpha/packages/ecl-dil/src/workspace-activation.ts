/**
 * SAFE workspace activation — session-mount 9 compiled archetypes.
 * 191 seeds stay UNKNOWN. LDA auto-patch REFUSED. No live_execution.
 * ALPHA_NON_PRODUCTION. No auto-trade. Not READY.
 */
import { buildRoleProfessionalInventory } from "./role-professional.js";
import { buildProfessionalCompileReport } from "./professional-compile.js";
import { buildWorkspaceValidationWave } from "./workspace-validation.js";
import type { DeepArchetypeProbe } from "./deep-workspace-validation.js";

export type ActivationResult =
  | "ACTIVATED_SIMULATION"
  | "ACTIVATED_ANALOG"
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "SKIPPED_UNKNOWN"
  | "FAIL";

export type ActivationCheck = {
  id: string;
  result: ActivationResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  liveExecution: false;
};

function act(id: string, result: ActivationResult, evidence: string, note: string): ActivationCheck {
  return { id, result, evidence, note, autoTrade: false, ready: false, liveExecution: false };
}

export function buildWorkspaceActivationWave(opts?: {
  compile?: ReturnType<typeof buildProfessionalCompileReport>;
  probes?: DeepArchetypeProbe[];
}) {
  const compile = opts?.compile || buildProfessionalCompileReport();
  const shallow = buildWorkspaceValidationWave(compile);
  const inv = buildRoleProfessionalInventory();
  const probes = opts?.probes || [];
  const n = probes.length;

  const liveLeak = probes.some((p) => p.liveExecutionEnabled || !p.liveBlocked);
  const mounted = probes.filter(
    (p) => p.compilerStatus === "RUNTIME_MOUNTED" || p.compilerStatus === "DEGRADED"
  );
  const specs = probes.filter((p) => p.workspaceProfileId && p.panelCount > 0);
  const jtbd = probes.filter((p) => p.jtbdMission && p.jtbdMission !== "UNKNOWN" && p.jtbdMission !== "RESEARCH_REQUIRED");
  const sim = probes.filter(
    (p) => p.executionProfile === "SIMULATION_ONLY" || p.executionProfile === "UNKNOWN"
  );
  const sandboxModeOk = compile.sandboxes.every((s) => s.mode === "SIMULATION_ONLY" && s.liveData === false);

  const roles: ActivationCheck[] = [
    act(
      "RoleCatalog.AllDomains",
      liveLeak ? "FAIL" : n === 9 ? "ACTIVATED_SIMULATION" : n > 0 ? "ACTIVATED_SIMULATION" : "SKIPPED_UNKNOWN",
      "activated=" + n + "/" + inv.registry.rolesSeeded + " liveLeak=" + String(liveLeak),
      "Session-mount of 9 archetype workspaces. 191 seeds stay UNKNOWN. Not 200 apps."
    ),
    act(
      "ExperienceCompiler",
      liveLeak ? "FAIL" : mounted.length === 9 ? "ACTIVATED_SIMULATION" : "SKIPPED_UNKNOWN",
      "runtimeMounted=" + mounted.length,
      "RUNTIME_MOUNTED is a dry-run mount. Activation is not product READY."
    ),
    act(
      "WorkspaceSpecEngine",
      specs.length === 9 ? "ACTIVATED_SIMULATION" : specs.length > 0 ? "ACTIVATED_SIMULATION" : "SKIPPED_UNKNOWN",
      "specsWithPanels=" + specs.length,
      "Compose plan for one Shell. Panel layout READY ≠ product READY."
    ),
    act(
      "JTBDEngine",
      jtbd.length === 9 ? "ACTIVATED_ANALOG" : jtbd.length > 0 ? "ACTIVATED_ANALOG" : "SKIPPED_UNKNOWN",
      "missions=" + jtbd.length + "/9 · bulk seeds RESEARCH_REQUIRED",
      "Jobs-to-be-done on golden archetypes only. No invented hospitality/healthcare SOPs."
    ),
  ];

  const sandboxes: ActivationCheck[] = [
    act(
      "Sandbox.AllDomains",
      !sandboxModeOk ? "FAIL" : "ACTIVATED_SIMULATION",
      "count=" + compile.sandboxes.length + " absent=" + compile.sandboxes.filter((s) => s.status === "ABSENT").length,
      "AllDomains sandbox session-mounted. Unmapped professions remain ABSENT."
    ),
    act(
      "Sandbox.mode",
      sandboxModeOk ? "ACTIVATED_SIMULATION" : "FAIL",
      sandboxModeOk ? "* = SIMULATION_ONLY liveData=false" : "sandbox mode leak",
      "Safety invariant. Mode activation is not a claim that every profession has a working sandbox."
    ),
    ...compile.sandboxes
      .filter((s) => s.status === "ABSENT")
      .map((s) =>
        act(
          "Sandbox." + String(s.id).replace(/^Sandbox\./, ""),
          "SKIPPED_RESEARCH_REQUIRED",
          "status=ABSENT mode=" + s.mode,
          "Unmapped domain. Do not invent specialist dashboards."
        )
      ),
  ];

  const lda = compile.blueprints.find((b) => b.id === "AgentSystem.LDA");
  const kg = compile.blueprints.find((b) => b.id === "KnowledgeGraph.Core");
  const blueprints: ActivationCheck[] = [
    act(
      "AgentSystem.LDA",
      lda?.result === "REFUSED" && lda.autoPatch === false ? "REFUSED" : "FAIL",
      "result=" + (lda?.result || "UNKNOWN") + " autoPatch=" + String(lda?.autoPatch === true),
      "Activation does not start an AST/LSP auto-patcher. GOVERNANCE > AGENT."
    ),
    act(
      "KnowledgeGraph.Core",
      kg?.nationalGraph === true ? "FAIL" : "ACTIVATED_ANALOG",
      "nationalGraph=" + String(kg?.nationalGraph === true),
      "Ontology analog only. Causal query engine ABSENT."
    ),
    act(
      "WorkflowDSL.Core",
      "SKIPPED_UNKNOWN",
      "secondEngine=false · no user DSL compile artifacts",
      "Cannot activate an absent DSL. No evidence ⇒ UNKNOWN, never PASS."
    ),
    act(
      "DistributedArchitecture.Core",
      "SKIPPED_UNKNOWN",
      "kafka=ABSENT · no cluster compile artifacts",
      "Cannot activate Kafka/Raft. No evidence ⇒ UNKNOWN, never PASS."
    ),
  ];

  const pipelines: ActivationCheck[] = [
    act(
      "CapabilityEngine",
      n === 9 ? "ACTIVATED_ANALOG" : n > 0 ? "ACTIVATED_ANALOG" : "SKIPPED_UNKNOWN",
      "modelScience UNVALIDATED on " + probes.filter((p) => p.modelScience === "UNVALIDATED" || p.modelScience == null).length + "/" + n,
      "Capabilities analog/UNVALIDATED. Not proven production science."
    ),
    act(
      "PolicyEngine",
      n > 0 && probes.every((p) => p.liveBlocked && !p.liveExecutionEnabled)
        ? "ACTIVATED_SIMULATION"
        : n === 0
          ? "SKIPPED_UNKNOWN"
          : "FAIL",
      "liveBlocked=" + probes.filter((p) => p.liveBlocked).length + "/" + n,
      "Policy holds live_execution off. Human remains decision maker."
    ),
    act(
      "RiskEngine.Professional",
      n > 0 && sim.length === n ? "ACTIVATED_SIMULATION" : n === 0 ? "SKIPPED_UNKNOWN" : "FAIL",
      "executionProfile SIMULATION_ONLY-or-UNKNOWN=" + sim.length + "/" + n,
      "Professional risk analog. Not a broker kill-switch."
    ),
    act(
      "EvidenceEngine.Professional",
      specs.length > 0 ? "ACTIVATED_ANALOG" : "SKIPPED_UNKNOWN",
      "workspace specs evidenced=" + specs.length,
      "Session provenance via spec. Not enterprise SIEM."
    ),
    act(
      "LineageEngine.Professional",
      specs.length > 0 ? "ACTIVATED_ANALOG" : "SKIPPED_UNKNOWN",
      "no durable hash fabric — live lineage remains UNKNOWN",
      "GW1 tip hash still required for live lineage. Analog only."
    ),
  ];

  const os: ActivationCheck[] = compile.os.map((o) =>
    act(
      o.id,
      o.status === "ABSENT" ? "SKIPPED_UNKNOWN" : "ACTIVATED_ANALOG",
      "analog=" + o.analog,
      "OS analog session-mounted. Not Raft/Kafka."
    )
  );

  const all = [...roles, ...sandboxes, ...blueprints, ...pipelines, ...os];
  const fail = all.filter((c) => c.result === "FAIL").length;
  const activatedSimulation = all.filter((c) => c.result === "ACTIVATED_SIMULATION").length;
  const activatedAnalog = all.filter((c) => c.result === "ACTIVATED_ANALOG").length;
  const refused = all.filter((c) => c.result === "REFUSED").length;
  const skipped = all.filter(
    (c) => c.result === "SKIPPED_RESEARCH_REQUIRED" || c.result === "SKIPPED_UNKNOWN"
  ).length;

  return {
    schema: "sci-os-workspace-activation-wave/v1" as const,
    label: "ALPHA_NON_PRODUCTION" as const,
    ready: false as const,
    holeless: false as const,
    autoTrade: false as const,
    persisted: false as const,
    simulationOnly: true as const,
    executionMode: "SIMULATION_ONLY" as const,
    inventedSops: false as const,
    enabledFull: false as const,
    enabled: false as const,
    sessionActivation: true as const,
    roles200Activated: false as const,
    liveExecutionEnabled: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("PARTIAL" as const),
    probes: probes.map((p) => ({
      ...p,
      activation:
        p.liveExecutionEnabled || !p.liveBlocked
          ? ("FAIL" as const)
          : p.workspaceProfileId && p.panelCount > 0
            ? ("ACTIVATED_SIMULATION" as const)
            : ("SKIPPED_UNKNOWN" as const),
    })),
    roles,
    sandboxes,
    blueprints,
    pipelines,
    os,
    safety: shallow.safety,
    health: {
      fail,
      activatedSimulation,
      activatedAnalog,
      refused,
      skipped,
      probes: n,
      archetypesActivated: liveLeak ? 0 : n,
      rolesSeeded: inv.registry.rolesSeeded,
      rolesFullySpecified: inv.registry.rolesFullySpecified,
      liveBlocked: probes.filter((p) => p.liveBlocked).length,
    },
    note: "SAFE session activation of 9 workspace specs. 191 seeds UNKNOWN. LDA REFUSED. Not READY.",
  };
}
