import assert from "node:assert/strict";
import { test } from "node:test";
import { applyProfessionModules } from "./profession-module-expansion.js";
import { VISIBILITY_ACTIVATION_HOOKS } from "./visibility-activation.js";
import {
  EXPLAIN_VISIBILITY_HOOKS,
  buildExplainabilityLayer,
  buildHumanReviewFlow,
  buildCausalPreviewEngine,
  buildWorkspaceExplainPanels,
  buildUnifiedExplainBus,
  flipVisibilityActivationGovernance,
  enableGradualVisibilityMode,
  buildExplainabilityAndVisibilityWave,
} from "./explain-visibility.js";

test("named explain/visibility builds are inspect-only and master does not grant PASS", () => {
  assert.equal(buildExplainabilityLayer().result, "REFUSED");
  assert.equal(buildExplainabilityLayer().applied, false);
  assert.equal(buildExplainabilityLayer().ready, false);
  assert.equal(buildHumanReviewFlow().result, "ANALOG_CONTRACT");
  assert.equal(buildCausalPreviewEngine().result, "REFUSED");
  assert.equal(buildWorkspaceExplainPanels().result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(buildUnifiedExplainBus().result, "REFUSED");
  assert.equal(flipVisibilityActivationGovernance().result, "REFUSED");
  assert.equal(enableGradualVisibilityMode().result, "REFUSED");

  const master = buildExplainabilityAndVisibilityWave();
  assert.equal(EXPLAIN_VISIBILITY_HOOKS.enabled, false);
  assert.equal(master.wave, "REFUSED");
  assert.equal(master.passGranted, false);
  assert.equal(master.gradual, false);
  assert.equal(master.showCausalPaths, false);
  assert.equal(master.unifiedExplainBus, false);
  assert.equal(master.health.fail, 0);
  assert.equal(master.health.applied, 0);
  assert.equal(master.health.passGranted, 0);
  assert.equal(master.builds.visibilityFlip.applied, false);
  assert.equal(master.domainExplainButtons.find((d) => d.id === "hospitality")?.live, false);
  assert.equal(master.domainExplainButtons.find((d) => d.id === "hospitality")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(VISIBILITY_ACTIVATION_HOOKS.passGranted, false);
  const hosp = applyProfessionModules("hospitality", { demand_series: [1, 2, 3] });
  assert.equal(hosp.evidence.status, "SKIPPED_RESEARCH_REQUIRED");
});
