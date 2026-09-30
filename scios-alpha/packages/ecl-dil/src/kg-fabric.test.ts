import assert from "node:assert/strict";
import { test } from "node:test";
import {
  KG_FABRIC_HOOKS,
  inspectKgFabricPath,
  inspectKgNodes,
  inspectKgEdges,
  inspectKgIngestion,
  inspectKgCausal,
  inspectKgScenario,
  inspectKgFabricBoot,
  buildKgFabricWave,
} from "./kg-fabric.js";

test("kg-fabric does not create src/kg-fabric.ts or national graph", () => {
  assert.equal(KG_FABRIC_HOOKS.ready, false);
  assert.equal(KG_FABRIC_HOOKS.autoTrade, false);
  assert.equal(KG_FABRIC_HOOKS.nationalGraph, false);
  assert.equal(KG_FABRIC_HOOKS.causalQueryEngine, "ABSENT");
  assert.equal(KG_FABRIC_HOOKS.parallelTree, false);

  assert.equal(inspectKgFabricPath().find((c) => c.id === "KG.path")?.result, "REFUSED");
  assert.equal(inspectKgFabricPath().find((c) => c.id === "KG.sciOsX10Dep")?.result, "REFUSED");
  assert.equal(inspectKgFabricPath().find((c) => c.id === "KG.npxTsx")?.result, "REFUSED");
  assert.equal(inspectKgNodes().find((c) => c.id === "KG1_200.hospitalityNodes")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectKgEdges().find((c) => c.id === "KG201_400.cascade")?.result, "REFUSED");
  assert.equal(inspectKgIngestion().find((c) => c.id === "KG401_600.ingestCount")?.result, "REFUSED");
  assert.equal(inspectKgCausal().find((c) => c.id === "KG601_800.nationalGraph")?.result, "REFUSED");
  assert.equal(inspectKgScenario().find((c) => c.id === "KG801_1000.mainRequire")?.result, "REFUSED");
  assert.equal(inspectKgFabricBoot().find((c) => c.id === "KG7.postgresCtor")?.result, "REFUSED");
  assert.equal(inspectKgFabricBoot().find((c) => c.id === "KG7.hospitalityHotelWrite")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectKgFabricBoot().find((c) => c.id === "KG7.fredIngest")?.result, "REFUSED");
  assert.equal(inspectKgFabricBoot().find((c) => c.id === "KG7.causalWrite")?.result, "REFUSED");
  assert.equal(inspectKgFabricBoot().find((c) => c.id === "KG7.monteCarloRandom")?.result, "REFUSED");

  const wave = buildKgFabricWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.requestedPoints, 1000);
  assert.equal(wave.health.nationalGraphStamps, 0);
  assert.equal(wave.health.ingestedWithoutFetch, 0);
  assert.equal(wave.health.causalEngines, 0);
  assert.equal(wave.health.megaFiles, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.nationalGraph === false && c.applied === false), true);
});
