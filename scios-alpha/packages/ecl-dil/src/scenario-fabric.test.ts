import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SCENARIO_FABRIC_HOOKS,
  inspectScenarioFabricPath,
  inspectScenarioRegistry,
  inspectScenarioLoader,
  inspectScenarioRunner,
  inspectScenarioDomainCausal,
  buildScenarioFabricWave,
} from "./scenario-fabric.js";

test("scenario-fabric does not create src/scenario-fabric.ts or run batches", () => {
  assert.equal(SCENARIO_FABRIC_HOOKS.ready, false);
  assert.equal(SCENARIO_FABRIC_HOOKS.autoTrade, false);
  assert.equal(SCENARIO_FABRIC_HOOKS.executed, false);
  assert.equal(SCENARIO_FABRIC_HOOKS.parallelTree, false);

  assert.equal(inspectScenarioFabricPath().find((c) => c.id === "SF.path")?.result, "REFUSED");
  assert.equal(inspectScenarioFabricPath().find((c) => c.id === "SF.sciOsX10Dep")?.result, "REFUSED");
  assert.equal(inspectScenarioFabricPath().find((c) => c.id === "SF.domainKgDep")?.result, "REFUSED");
  assert.equal(inspectScenarioFabricPath().find((c) => c.id === "SF.entry")?.result, "REFUSED");
  assert.equal(inspectScenarioRegistry().find((c) => c.id === "SF1_200.hospitalityHighSeason")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectScenarioRegistry().find((c) => c.id === "SF1_200.investmentRateToEquity")?.result, "REFUSED");
  assert.equal(inspectScenarioLoader().find((c) => c.id === "SF201_400.loadReady")?.result, "REFUSED");
  assert.equal(inspectScenarioRunner().find((c) => c.id === "SF401_600.coreRun")?.result, "REFUSED");
  assert.equal(inspectScenarioRunner().find((c) => c.id === "SF401_600.parallelBatch")?.result, "REFUSED");
  assert.equal(inspectScenarioRunner().find((c) => c.id === "SF401_600.metricZero")?.result, "REFUSED");
  assert.equal(inspectScenarioDomainCausal().find((c) => c.id === "SF801_1000.causalRegister")?.result, "REFUSED");
  assert.equal(inspectScenarioDomainCausal().find((c) => c.id === "SF801_1000.causalMonteCarlo")?.result, "REFUSED");
  assert.equal(inspectScenarioDomainCausal().find((c) => c.id === "SF801_1000.governanceAutoApprove")?.result, "REFUSED");
  assert.equal(inspectScenarioDomainCausal().find((c) => c.id === "SF801_1000.mainWritesAll")?.result, "REFUSED");

  const wave = buildScenarioFabricWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.requestedPoints, 1000);
  assert.equal(wave.health.executedRuns, 0);
  assert.equal(wave.health.parallelBatches, 0);
  assert.equal(wave.health.liveDesks, 0);
  assert.equal(wave.health.megaFiles, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.executed === false && c.applied === false), true);
});
