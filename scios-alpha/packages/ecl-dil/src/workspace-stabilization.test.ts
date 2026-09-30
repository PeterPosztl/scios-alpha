import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProfessionalCompileReport } from "./professional-compile.js";
import { buildWorkspaceStabilizationWave } from "./workspace-stabilization.js";
import type { DeepArchetypeProbe } from "./deep-workspace-validation.js";

function probe(roleId: string, extra: Partial<DeepArchetypeProbe> = {}): DeepArchetypeProbe {
  return {
    roleId,
    compilerStatus: "RUNTIME_MOUNTED",
    workspaceProfileId: roleId.replace("arch.", ""),
    panelCount: 6,
    panelsUnknown: 0,
    liveBlocked: true,
    analyzeEnabled: true,
    jtbdMission: "mission for " + roleId,
    jtbdTasks: 3,
    unknowns: 1,
    executionProfile: "SIMULATION_ONLY",
    modelScience: "UNVALIDATED",
    liveExecutionEnabled: false,
    autoTrade: false,
    invented: false,
    ...extra,
  };
}

const NINE = [
  "arch.soc_analyst",
  "arch.fraud_investigator",
  "arch.fin_risk_analyst",
  "arch.osint_analyst",
  "arch.executive",
  "arch.auditor",
  "arch.market_analyst",
  "arch.prediction_decision_analyst",
  "arch.eng_operator",
];

test("stabilization keeps 9 consistent specs and disables ABSENT views", () => {
  const probes = NINE.map((id) => probe(id));
  const compile = buildProfessionalCompileReport({
    archetypes: probes.map((p) => ({
      roleId: p.roleId,
      compilerStatus: p.compilerStatus,
      degraded: false,
      degradedReasons: [],
      workspaceProfileId: p.workspaceProfileId,
      liveExecutionEnabled: p.liveExecutionEnabled,
      autoTrade: false,
      persisted: false,
      invented: false,
    })),
  });
  const wave = buildWorkspaceStabilizationWave({ compile, probes });
  assert.equal(wave.ready, false);
  assert.equal(wave.roles200Stabilized, false);
  assert.equal(wave.wave, "PARTIAL");
  assert.equal(wave.stabilized, true);
  assert.equal(wave.health.archetypesConsistent, 9);
  assert.equal(wave.health.incomplete, 191);
  assert.equal(wave.reconcile["RoleCatalog.AllDomains"], "CONSISTENT");
  assert.equal(wave.reconcile.ExperienceCompiler, "CONSISTENT");
  assert.equal(wave.reconcile.WorkspaceSpecEngine, "CONSISTENT");
  assert.equal(wave.reconcile["Sandbox.AllDomains"], "CONSISTENT");
  assert.equal(wave.reconcile["AgentSystem.LDA"], "REFUSED");
  assert.equal(wave.reconcile["KnowledgeGraph.Core"], "ANALOG");
  assert.ok(wave.consistentPipelines.includes("PolicyEngine"));
  assert.ok(!wave.consistentPipelines.includes("AgentSystem.LDA"));
  assert.ok(!wave.consistentPipelines.includes("WorkflowDSL.Core"));
  assert.ok(wave.disabledViews.some((v) => v.id === "RoleCatalog.Hospitality" && v.view === "disabled"));
  assert.ok(wave.pipelines.find((p) => p.id === "WorkflowDSL.Core")?.status === "UNKNOWN");
});

test("stabilization FAILs if live_execution leaks", () => {
  const probes = [probe("arch.market_analyst", { liveBlocked: false, liveExecutionEnabled: true })];
  const compile = buildProfessionalCompileReport({
    archetypes: [
      {
        roleId: "arch.market_analyst",
        compilerStatus: "RUNTIME_MOUNTED",
        degraded: false,
        degradedReasons: [],
        workspaceProfileId: "market_analysis",
        liveExecutionEnabled: true,
        autoTrade: false,
        persisted: false,
        invented: false,
      },
    ],
  });
  const wave = buildWorkspaceStabilizationWave({ compile, probes });
  assert.equal(wave.wave, "FAIL");
  assert.equal(wave.stabilized, false);
  assert.equal(wave.ready, false);
  assert.deepEqual(wave.consistentPipelines, []);
});
