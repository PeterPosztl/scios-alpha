import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CAUSAL_FABRIC_HOOKS,
  inspectCausalFabricPath,
  inspectCausalGraph,
  inspectCausalQuery,
  inspectCausalLineage,
  inspectCausalScenarioGov,
  inspectCausalFabricBoot,
  buildCausalFabricWave,
} from "./causal-fabric.js";

test("causal-fabric does not create src/causal-fabric.ts or do-calculus", () => {
  assert.equal(CAUSAL_FABRIC_HOOKS.ready, false);
  assert.equal(CAUSAL_FABRIC_HOOKS.autoTrade, false);
  assert.equal(CAUSAL_FABRIC_HOOKS.autoDecide, false);
  assert.equal(CAUSAL_FABRIC_HOOKS.causalQueryEngine, "ABSENT");
  assert.equal(CAUSAL_FABRIC_HOOKS.parallelTree, false);

  assert.equal(inspectCausalFabricPath().find((c) => c.id === "CF.path")?.result, "REFUSED");
  assert.equal(inspectCausalFabricPath().find((c) => c.id === "CF.deps")?.result, "REFUSED");
  assert.equal(inspectCausalFabricPath().find((c) => c.id === "CF.entry")?.result, "REFUSED");
  assert.equal(inspectCausalGraph().find((c) => c.id === "CF1_200.hospitalityOccupancyAdr")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectCausalQuery().find((c) => c.id === "CF201_400.queryEngine")?.result, "REFUSED");
  assert.equal(inspectCausalLineage().find((c) => c.id === "CF401_600.lineagePrefix")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectCausalScenarioGov().find((c) => c.id === "CF801_1000.governanceApprove")?.result, "REFUSED");
  assert.equal(inspectCausalScenarioGov().find((c) => c.id === "CF601_800.monteCarlo")?.result, "REFUSED");
  assert.equal(inspectCausalFabricBoot().find((c) => c.id === "CF7.postgresCtor")?.result, "REFUSED");
  assert.equal(inspectCausalFabricBoot().find((c) => c.id === "CF7.ateEmptyZero")?.result, "REFUSED");
  assert.equal(inspectCausalFabricBoot().find((c) => c.id === "CF7.monteCarlo")?.result, "REFUSED");
  assert.equal(inspectCausalFabricBoot().find((c) => c.id === "CF7.enforceBlock")?.result, "REFUSED");
  assert.equal(inspectCausalFabricBoot().find((c) => c.id === "CF7.autoFixer")?.result, "REFUSED");

  const wave = buildCausalFabricWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.requestedPoints, 1000);
  assert.equal(wave.health.causalEngines, 0);
  assert.equal(wave.health.autoApprovals, 0);
  assert.equal(wave.health.megaFiles, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.autoDecide === false && c.applied === false), true);
});
