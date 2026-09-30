import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProfessionalCompileReport } from "./professional-compile.js";
import { buildWorkspaceActivationWave } from "./workspace-activation.js";
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

test("activation is PARTIAL — 9 specs session-mounted, 200 roles never activated", () => {
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
  const wave = buildWorkspaceActivationWave({ compile, probes });
  assert.equal(wave.ready, false);
  assert.equal(wave.enabledFull, false);
  assert.equal(wave.roles200Activated, false);
  assert.equal(wave.sessionActivation, true);
  assert.equal(wave.wave, "PARTIAL");
  assert.equal(wave.health.probes, 9);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.health.archetypesActivated, 9);
  assert.equal(wave.roles.find((c) => c.id === "RoleCatalog.AllDomains")?.result, "ACTIVATED_SIMULATION");
  assert.equal(wave.roles.find((c) => c.id === "JTBDEngine")?.result, "ACTIVATED_ANALOG");
  assert.equal(wave.blueprints.find((c) => c.id === "AgentSystem.LDA")?.result, "REFUSED");
  assert.equal(wave.blueprints.find((c) => c.id === "WorkflowDSL.Core")?.result, "SKIPPED_UNKNOWN");
  assert.equal(wave.pipelines.find((c) => c.id === "PolicyEngine")?.result, "ACTIVATED_SIMULATION");
  assert.ok(wave.sandboxes.every((s) => s.id !== "Sandbox.mode" || s.result === "ACTIVATED_SIMULATION"));
  assert.ok(wave.probes.every((p) => p.activation === "ACTIVATED_SIMULATION"));
});

test("activation FAILs if live_execution is enabled on a spec", () => {
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
  const wave = buildWorkspaceActivationWave({ compile, probes });
  assert.equal(wave.wave, "FAIL");
  assert.equal(wave.ready, false);
  assert.equal(wave.roles200Activated, false);
  assert.equal(wave.pipelines.find((c) => c.id === "PolicyEngine")?.result, "FAIL");
});
