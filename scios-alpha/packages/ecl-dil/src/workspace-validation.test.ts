import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProfessionalCompileReport } from "./professional-compile.js";
import { buildWorkspaceValidationWave } from "./workspace-validation.js";

function mounted(roleId: string) {
  return {
    roleId,
    compilerStatus: "RUNTIME_MOUNTED",
    degraded: false,
    degradedReasons: [],
    workspaceProfileId: roleId.replace("arch.", ""),
    liveExecutionEnabled: false as const,
    autoTrade: false as const,
    persisted: false as const,
    invented: false as const,
  };
}

test("validation wave is PARTIAL — 9 archetypes evidenced, 200 roles never PASS", () => {
  const compile = buildProfessionalCompileReport({
    archetypes: [
      "arch.soc_analyst",
      "arch.fraud_investigator",
      "arch.fin_risk_analyst",
      "arch.osint_analyst",
      "arch.executive",
      "arch.auditor",
      "arch.market_analyst",
      "arch.prediction_decision_analyst",
      "arch.eng_operator",
    ].map(mounted),
  });
  const wave = buildWorkspaceValidationWave(compile);
  assert.equal(wave.ready, false);
  assert.equal(wave.roles200Validated, false);
  assert.equal(wave.autoTrade, false);
  assert.equal(wave.persisted, false);
  assert.equal(wave.wave, "PARTIAL");
  assert.equal(wave.health.archetypesEvidenced, 9);
  assert.equal(wave.health.rolesSeeded, 200);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.roles.find((c) => c.id === "RoleCatalog.AllDomains")?.verdict, "PARTIAL");
  assert.equal(wave.roles.find((c) => c.id === "ExperienceCompiler")?.verdict, "PARTIAL");
  assert.equal(wave.sandboxes.find((c) => c.id === "Sandbox.mode")?.verdict, "PASS_CONSTRAINT");
  assert.equal(wave.blueprints.find((c) => c.id === "AgentSystem.LDA")?.verdict, "PASS_CONSTRAINT");
  assert.equal(wave.blueprints.find((c) => c.id === "WorkflowDSL.Core")?.verdict, "UNKNOWN");
  assert.equal(wave.blueprints.find((c) => c.id === "DistributedArchitecture.Core")?.verdict, "UNKNOWN");
  assert.ok(wave.safety.every((c) => c.verdict === "PASS_CONSTRAINT"));
});

test("live execution fails the validation wave", () => {
  const compile = buildProfessionalCompileReport({
    archetypes: [
      {
        ...mounted("arch.market_analyst"),
        liveExecutionEnabled: true,
      },
    ],
  });
  const wave = buildWorkspaceValidationWave(compile);
  assert.equal(wave.wave, "FAIL");
  assert.equal(wave.ready, false);
  assert.equal(wave.roles.find((c) => c.id === "ExperienceCompiler")?.verdict, "FAIL");
});
