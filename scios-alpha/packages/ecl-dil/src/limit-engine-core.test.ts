import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LIMIT_ENGINE_CORE_HOOKS,
  inspectLimitEngineCoreLoop,
  inspectLimitEngineAdvanced,
  buildLimitEngineCoreWave,
} from "./limit-engine-core.js";

test("limit-engine core 101–200 does not start a 1s loop or auto freeze", () => {
  assert.equal(LIMIT_ENGINE_CORE_HOOKS.ready, false);
  assert.equal(LIMIT_ENGINE_CORE_HOOKS.autoTrade, false);
  assert.equal(LIMIT_ENGINE_CORE_HOOKS.autoLimits, false);
  assert.equal(LIMIT_ENGINE_CORE_HOOKS.continuous, false);
  assert.equal(LIMIT_ENGINE_CORE_HOOKS.freeze, false);
  assert.equal(LIMIT_ENGINE_CORE_HOOKS.autoAdjust, false);
  assert.equal(LIMIT_ENGINE_CORE_HOOKS.invented.dailyLossPct05, false);
  assert.equal(LIMIT_ENGINE_CORE_HOOKS.invented.exposure1e6, false);

  assert.equal(inspectLimitEngineCoreLoop().find((c) => c.id === "L101.coreLoop")?.result, "REFUSED");
  assert.equal(inspectLimitEngineCoreLoop().find((c) => c.id === "L103.exposure1e6")?.result, "REFUSED");
  assert.equal(inspectLimitEngineCoreLoop().find((c) => c.id === "L105.dailyLoss05")?.result, "REFUSED");
  assert.equal(inspectLimitEngineAdvanced().find((c) => c.id === "L114.enforcer")?.result, "REFUSED");
  assert.equal(inspectLimitEngineAdvanced().find((c) => c.id === "L117.recoveryVerifyTrue")?.result, "REFUSED");

  const wave = buildLimitEngineCoreWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.requestedPoints, 100);
  assert.equal(wave.health.loopsStarted, 0);
  assert.equal(wave.health.accountsFrozen, 0);
  assert.equal(wave.health.autoBlocks, 0);
  assert.equal(wave.health.autoAdjusts, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.loopStarted === false && c.applied === false), true);
});
