import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProfessionalCompileReport } from "./professional-compile.js";
import { buildDeepWorkspaceValidationWave, type DeepArchetypeProbe } from "./deep-workspace-validation.js";

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

test("deep validation is PARTIAL — 9 specs probed, 200 roles never PASS", () => {
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
  const deep = buildDeepWorkspaceValidationWave({ compile, probes });
  assert.equal(deep.ready, false);
  assert.equal(deep.roles200Validated, false);
  assert.equal(deep.wave, "PARTIAL");
  assert.equal(deep.health.probes, 9);
  assert.equal(deep.health.fail, 0);
  assert.equal(deep.roles.find((c) => c.id === "JTBDEngine.deep")?.verdict, "PARTIAL");
  assert.equal(deep.pipelines.find((c) => c.id === "PolicyEngine.deep")?.verdict, "PASS_CONSTRAINT");
  assert.equal(deep.blueprints.find((c) => c.id === "WorkflowDSL.Core.deep")?.verdict, "UNKNOWN");
});

test("deep validation FAILs if live_execution is enabled on a spec", () => {
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
  const deep = buildDeepWorkspaceValidationWave({ compile, probes });
  assert.equal(deep.wave, "FAIL");
  assert.equal(deep.ready, false);
  assert.equal(deep.pipelines.find((c) => c.id === "PolicyEngine.deep")?.verdict, "FAIL");
});
