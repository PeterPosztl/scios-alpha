import assert from "node:assert/strict";
import { test } from "node:test";
import { applyProfessionModules } from "./profession-module-expansion.js";
import { EXPLAINABILITY_PREP_HOOKS, buildExplainabilityPrepWave } from "./explainability-prep.js";

test("explainability prep REFUSES live root-cause, causal preview, and a second explain bus", () => {
  const wave = buildExplainabilityPrepWave();
  assert.equal(EXPLAINABILITY_PREP_HOOKS.enabled, false);
  assert.equal(wave.ready, false);
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.showCausalPaths, false);
  assert.equal(wave.unifiedExplainBus, false);
  assert.equal(wave.secondReviewFlow, false);
  assert.equal(wave.autoAudit, false);
  assert.equal(wave.autoDecide, false);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.health.explainPanelsLive, 0);
  assert.equal(wave.health.causalPathsShown, 0);
  assert.equal(wave.health.unifiedBusEnabled, 0);
  assert.equal(wave.health.autoActionsExplained, 0);
  assert.equal(wave.episodes.find((c) => c.id === "Episode.1.enableAuditExplainability")?.result, "REFUSED");
  assert.equal(wave.episodes.find((c) => c.id === "Episode.4.enableHumanReview")?.result, "ANALOG_CONTRACT");
  assert.equal(wave.episodes.find((c) => c.id === "Episode.5.enableCausalPreview")?.result, "REFUSED");
  assert.equal(wave.episodes.find((c) => c.id === "Episode.6.addWorkspaceExplainPanels")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(wave.episodes.find((c) => c.id === "Episode.7.enableExplainBus")?.result, "REFUSED");
  const hosp = applyProfessionModules("hospitality", { demand_series: [1, 2, 3] });
  assert.equal(hosp.evidence.status, "SKIPPED_RESEARCH_REQUIRED");
});
