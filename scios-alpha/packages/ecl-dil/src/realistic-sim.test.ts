import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRealisticSimulation, REALISTIC_SIM_HOOKS } from "./realistic-sim.js";
import { createEclDilRuntime } from "./runtime.js";

test("realistic simulation is SIMULATION_ONLY and does not claim full engines or live feeds", () => {
  assert.equal(REALISTIC_SIM_HOOKS.enabledFull, false);
  assert.equal(REALISTIC_SIM_HOOKS.monteCarlo, false);
  assert.equal(REALISTIC_SIM_HOOKS.doCalculus, false);
  assert.equal(REALISTIC_SIM_HOOKS.affectModel, false);
  assert.equal(REALISTIC_SIM_HOOKS.legalCounsel, false);
  assert.equal(REALISTIC_SIM_HOOKS.raft, false);
  assert.equal(REALISTIC_SIM_HOOKS.fullSystemOperation, true);
  assert.equal(REALISTIC_SIM_HOOKS.engines["CompetitionEngine.RealisticMode"].status, "PARTIAL");
  assert.equal(REALISTIC_SIM_HOOKS.engines["LegalGuardian.RealisticMode"].status, "PARTIAL");
  assert.equal(REALISTIC_SIM_HOOKS.engines["EmotionalEngine.RealisticMode"].status, "ABSENT");
  assert.equal(REALISTIC_SIM_HOOKS.engines["ConsensusEngine.RealisticMode"].status, "ABSENT");
  const rt = createEclDilRuntime();
  const cal = rt.calibration();
  const sim = buildRealisticSimulation({
    rows: rt.composeWorkspaceRows("24h"),
    audit: rt.audit(),
    guardrail: rt.snapshot().guardrail,
    session: rt.snapshot().session,
    calibration: { liveStatus: cal.liveCalibration, simulatedAdequacy: cal.status },
  });
  assert.equal(sim.simulationOnly, true);
  assert.equal(sim.persisted, false);
  assert.equal(sim.autoTrade, false);
  assert.equal(sim.liveCertified, 0);
  assert.equal(sim.monteCarlo, false);
  assert.equal(sim.doCalculus, false);
  assert.ok(sim.riskPropagation.nodes.length >= 1);
  assert.ok(sim.timeline.length >= 1);
  assert.ok(sim.competition.ranked.every((r) => r.autoTrade === false));
  assert.equal(sim.legalGuardian.autoTrade, false);
  assert.equal(sim.legalGuardian.requiresHuman, true);
  assert.equal(sim.legalGuardian.legalCounsel, false);
  assert.equal(sim.os.raft, false);
  assert.ok(sim.simulatedStructure.ohlc.every((s) => s.live === "ABSENT"));
  assert.ok(rt.composeWorkspaceRows("24h").every((r) => r.scenario && r.scenario.autoTrade === false));
});
