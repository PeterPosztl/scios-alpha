import assert from "node:assert/strict";
import { test } from "node:test";
import { EXPLAIN_VISIBILITY_HOOKS, buildExplainabilityAndVisibilityWave } from "./explain-visibility.js";
import { VISIBILITY_ACTIVATION_HOOKS } from "./visibility-activation.js";
import {
  ACTIVATION_PASS_HOOKS,
  applyExplainabilityLayerSeal,
  applyHumanReviewSeal,
  applyCausalPreviewSeal,
  applyWorkspaceExplainPanelsSeal,
  applyUnifiedExplainBusSeal,
  applyVisibilityActivationGovernanceSeal,
  applyGradualModeSeal,
  applyDigitalKGSeal,
  applyDomainWorkspaceSeal,
  applyDigitalKGPassSeal,
  applyWorkspacePassSeal,
  applyCockpitComputePassSeal,
  activateAllEngines,
  markSystemReady,
  runMasterActivationSuite,
  applyUltimateMasterActivationSuite,
  markExplainVisibilityApplied,
  buildActivationPassWave,
} from "./activation-pass.js";

test("activation PASS seals do not flip explain-visibility REFUSED or stamp READY", () => {
  assert.equal(applyExplainabilityLayerSeal({ auditExplain: true, unifiedExplainBus: true }).result, "REFUSED");
  assert.equal(applyExplainabilityLayerSeal().sealed, false);
  assert.equal(applyExplainabilityLayerSeal().applied, false);
  const hitlSeal = applyHumanReviewSeal({
    hitlMode: "DIGITAL_CONTRACT",
    requireApproval: true,
    enableReviewPanel: true,
    accept: true,
    persist: true,
  });
  assert.equal(hitlSeal.result, "ANALOG_CONTRACT");
  assert.equal(hitlSeal.applied, false);
  assert.equal(hitlSeal.sealed, false);
  assert.equal(hitlSeal.ready, false);
  assert.match(hitlSeal.evidence, /persistApplied=false/);
  assert.match(hitlSeal.evidence, /hitlMode=ANALOG_CONTRACT/);
  assert.equal(EXPLAIN_VISIBILITY_HOOKS.secondReviewFlow, false);
  assert.equal(EXPLAIN_VISIBILITY_HOOKS.persisted, false);
  assert.equal(applyCausalPreviewSeal({ enablePreview: true, showCausalPaths: true, showRiskPropagationPreview: true }).result, "REFUSED");
  assert.equal(applyWorkspaceExplainPanelsSeal().result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(applyUnifiedExplainBusSeal().result, "REFUSED");
  assert.equal(applyVisibilityActivationGovernanceSeal().result, "REFUSED");
  assert.equal(applyGradualModeSeal().result, "REFUSED");
  assert.equal(applyDigitalKGSeal({ digitalReady: true, causalReady: true }).result, "REFUSED");
  assert.equal(applyDigitalKGSeal({ digitalReady: true }).sealed, false);
  assert.equal(
    applyDomainWorkspaceSeal({ hospitality: true, healthcare: true, cyber: true, investment: true, explainPanels: true }).result,
    "SKIPPED_RESEARCH_REQUIRED"
  );
  assert.equal(applyDomainWorkspaceSeal({ hospitality: true }).applied, false);
  assert.equal(applyDigitalKGPassSeal({ accept: true, persist: true, digitalReady: true }).result, "REFUSED");
  assert.equal(applyDigitalKGPassSeal({ persist: true }).sealed, false);
  assert.equal(
    applyWorkspacePassSeal({ accept: true, hospitality: true, healthcare: true, cyber: true, investment: true, explainPanels: true, persist: true }).result,
    "SKIPPED_RESEARCH_REQUIRED"
  );
  assert.equal(applyWorkspacePassSeal({ persist: true }).applied, false);
  assert.equal(
    applyCockpitComputePassSeal({
      accept: true,
      predictionCompute: true,
      persist: true,
      hitlDigitalContract: true,
    }).result,
    "REFUSED"
  );
  assert.equal(applyCockpitComputePassSeal({ persist: true }).sealed, false);
  assert.equal(markExplainVisibilityApplied().result, "REFUSED");
  assert.equal(activateAllEngines({ auditEngine: true, causalEngine: true }).result, "REFUSED");
  assert.equal(markSystemReady({ ready: true, persisted: true, applied: "MASTER_SUITE" }).result, "REFUSED");
  assert.equal(markSystemReady({ ready: true }).sealed, false);

  const master = buildActivationPassWave();
  assert.equal(ACTIVATION_PASS_HOOKS.ready, false);
  assert.equal(ACTIVATION_PASS_HOOKS.persisted, false);
  assert.equal(master.wave, "REFUSED");
  assert.equal(master.applied, "NONE");
  assert.equal(master.steps.engines.result, "REFUSED");
  assert.equal(master.steps.workspaces.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(master.steps.systemReady.result, "REFUSED");
  assert.equal(master.steps.humanReview.result, "ANALOG_CONTRACT");
  assert.equal(runMasterActivationSuite().wave, "REFUSED");
  const ultimate = applyUltimateMasterActivationSuite();
  assert.equal(ultimate.wave, "REFUSED");
  assert.equal(ultimate.applied, "NONE");
  assert.equal(ultimate.requestedApplied, "ULTIMATE_MASTER");
  assert.equal(ultimate.ready, false);
  assert.equal(ultimate.persisted, false);
  assert.equal(ultimate.ultimate, true);
  assert.equal(ultimate.steps.systemReady.result, "REFUSED");
  assert.equal(master.passGranted, false);
  assert.equal(master.gradual, false);
  assert.equal(master.health.applied, 0);
  assert.equal(master.health.sealed, 0);
  assert.equal(master.explainVisibilityWave, "REFUSED");
  assert.equal(EXPLAIN_VISIBILITY_HOOKS.passGranted, false);
  assert.equal(EXPLAIN_VISIBILITY_HOOKS.ready, false);
  assert.equal(EXPLAIN_VISIBILITY_HOOKS.persisted, false);
  assert.equal(VISIBILITY_ACTIVATION_HOOKS.passGranted, false);
  assert.equal(buildExplainabilityAndVisibilityWave().health.applied, 0);
});
