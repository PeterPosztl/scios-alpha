import assert from "node:assert/strict";
import { test } from "node:test";
import { applyProfessionModules } from "./profession-module-expansion.js";
import {
  PRECISION_UPGRADE_HOOKS,
  KG_VISUAL_TOKENS,
  buildPrecisionUpgradeWave,
} from "./precision-upgrade.js";

test("precision upgrade REFUSES causal paths, pad-to-30, and ABSENT domain enable", () => {
  const wave = buildPrecisionUpgradeWave();
  assert.equal(PRECISION_UPGRADE_HOOKS.enabled, false);
  assert.equal(wave.ready, false);
  assert.equal(wave.digitalRuntime, false);
  assert.equal(wave.nationalGraph, false);
  assert.equal(wave.showCausalPaths, false);
  assert.equal(wave.minSeriesLengthEnforced, false);
  assert.equal(wave.ldaPass, false);
  assert.equal(wave.seedsComplete, 0);
  assert.equal(wave.roles200Stabilized, false);
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.prerequisite.find((c) => c.id === "Prerequisite.digitalActivation")?.result, "REFUSED");
  assert.equal(wave.spine.find((c) => c.id === "KG.spine.causalPaths")?.result, "REFUSED");
  assert.equal(wave.spine.find((c) => c.id === "KG.visualTokens")?.result, "ANALOG_CONTRACT");
  assert.equal(wave.domainFlows.find((c) => c.id === "DomainFlow.cyber")?.result, "ANALOG_CONTRACT");
  assert.equal(wave.domainFlows.find((c) => c.id === "DomainFlow.hospitality")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(wave.domainFlows.find((c) => c.id === "DomainFlow.healthcare")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(wave.moduleFlows.find((c) => c.id === "ModuleFlow.LineagePanel")?.result, "REFUSED");
  assert.equal(wave.precision.find((c) => c.id === "Precision.minSeriesLength")?.result, "REFUSED");
  assert.equal(wave.kgSpine.defaults.showCausalPaths, false);
  assert.equal(wave.kgSpine.layers.length, 3);
  assert.equal(KG_VISUAL_TOKENS.Event.cssVar, "--ice");
  assert.equal(KG_VISUAL_TOKENS.Decision.cssVar, "--navy");
  assert.equal(wave.cockpitFlows.Decisions.autoDecide, false);
  assert.ok(wave.cockpitFlows.PredictionPanel.researchRequired.includes("hospitality"));
  assert.equal(wave.researchFlows.hospitality.signals.length, 5);
  const hosp = applyProfessionModules("hospitality", { occupancy: [0.2, 0.9], timeseries: Array(30).fill(0.5) });
  assert.equal(hosp.prediction.status, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(hosp.prediction.series.length, 0);
  assert.equal(hosp.intelligence.edge, null);
});
