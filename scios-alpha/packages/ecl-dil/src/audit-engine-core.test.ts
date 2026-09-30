import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AUDIT_ENGINE_CORE_HOOKS,
  inspectAuditEngineCoreLoop,
  inspectAuditEngineEnforcement,
  inspectAuditEngineListeners,
  buildAuditEngineCoreWave,
} from "./audit-engine-core.js";

test("audit-engine core 1–25 does not start a 1s loop or auto freeze", () => {
  assert.equal(AUDIT_ENGINE_CORE_HOOKS.ready, false);
  assert.equal(AUDIT_ENGINE_CORE_HOOKS.autoTrade, false);
  assert.equal(AUDIT_ENGINE_CORE_HOOKS.autoAudit, false);
  assert.equal(AUDIT_ENGINE_CORE_HOOKS.continuous, false);
  assert.equal(AUDIT_ENGINE_CORE_HOOKS.freeze, false);
  assert.equal(AUDIT_ENGINE_CORE_HOOKS.loopStarted, false);
  assert.equal(AUDIT_ENGINE_CORE_HOOKS.missingRiskScore, "UNKNOWN");

  assert.equal(inspectAuditEngineCoreLoop().find((c) => c.id === "A1.coreLoop")?.result, "REFUSED");
  assert.equal(inspectAuditEngineCoreLoop().find((c) => c.id === "A5.continuousMode")?.result, "REFUSED");
  assert.equal(inspectAuditEngineListeners().find((c) => c.id === "A8.riskSnapshot")?.result, "REFUSED");
  assert.equal(inspectAuditEngineEnforcement().find((c) => c.id === "A12.freezeRule")?.result, "REFUSED");
  assert.equal(inspectAuditEngineEnforcement().find((c) => c.id === "A14.blockRule")?.result, "REFUSED");
  assert.equal(inspectAuditEngineEnforcement().find((c) => c.id === "A13.holdRule")?.result, "ANALOG_CONTRACT");

  const wave = buildAuditEngineCoreWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.inspected, 25);
  assert.equal(wave.health.loopsStarted, 0);
  assert.equal(wave.health.accountsFrozen, 0);
  assert.equal(wave.health.autoBlocks, 0);
  assert.equal(wave.health.applied, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.loopStarted === false && c.applied === false), true);
});
