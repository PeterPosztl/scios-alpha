import assert from "node:assert/strict";
import { test } from "node:test";
import { AUTOMATION_PREP_HOOKS } from "./automation-prep.js";
import { DIGITAL_WORKSPACE_COMPUTE_HOOKS } from "./digital-workspace-compute.js";
import { OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { ENGINE_SUITE_HOOKS } from "./engine-suite.js";
import { createEclDilRuntime } from "./runtime.js";

test("BUILD_SUITE_V1 compose evaluates deterministically without live execute", () => {
  const rt = createEclDilRuntime();
  const inst = rt.snapshot().instruments[0]?.id;
  assert.ok(inst);
  const suite = rt.engineSuite;

  const a = suite.prediction({ instrumentId: inst, horizonDays: 1 });
  const b = suite.prediction({ instrumentId: inst, horizonDays: 1 });
  assert.equal(a.expectedReturn, b.expectedReturn);
  assert.equal(a.calibratedLive, false);
  assert.equal(a.status, "PASS_CONSTRAINT");
  assert.notEqual(a.expectedReturn, 0.025);

  const unknownPred = suite.prediction({ instrumentId: "inst-hospitality-desk" });
  assert.equal(unknownPred.status, "UNKNOWN");
  assert.equal(unknownPred.expectedReturn, null);

  const limit = suite.limit({});
  assert.equal(limit.engine, "limit-engine-v1");
  assert.equal(limit.freeze, false);
  assert.equal(limit.continuous, false);

  const kg = suite.kg(inst);
  assert.equal(kg.nationalGraph, false);
  assert.equal(kg.causalQueryEngine, "ABSENT");
  assert.equal(OS_BLUEPRINT_HOOKS.nationalGraph, false);
  assert.ok(kg.nodes.length >= 1);
  const macro = kg.nodes.find((n) => n.id === "macro:rates");
  if (macro) {
    assert.equal(macro.analog, true);
    assert.equal(macro.live, false);
    assert.equal(macro.fixture, true);
  }

  const ev = suite.evidence(inst);
  assert.notEqual(ev.status, "FAIL");
  assert.equal(
    ev.evidence.some((e) => e.id === "sector:tech" && e.weight === 0.4),
    false
  );

  const decHold = suite.decision({});
  assert.equal(decHold.decision, "HOLD");
  assert.equal(decHold.autoDecide, false);
  assert.equal(decHold.autoExecute, false);
  assert.equal(decHold.executed, false);

  const sim = suite.executionSim({ allowed: true, price: 0.42, size: 10 });
  assert.equal(sim.executed, false);
  assert.equal(sim.previewFillPrice, 0.42);
  const blocked = suite.executionSim({ allowed: false, price: 0.42, size: 10 });
  assert.equal(blocked.executed, false);

  const tradeN = rt.snapshot().trades.length;
  const compute = suite.cockpitCompute({
    userId: "u1",
    instrumentId: inst,
    action: "BUY",
    size: 50,
    horizonDays: 1,
    price: 0.4,
  });
  assert.equal(compute.engine, "cockpit-compute-v1");
  assert.equal(compute.executed, false);
  assert.equal(compute.execution.executed, false);
  assert.equal(compute.limit.engine, "limit-engine-v1");
  assert.equal(compute.inspectComputeMode, "INSPECT_ONLY");
  assert.equal(DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode, "INSPECT_ONLY");
  assert.equal(rt.snapshot().trades.length, tradeN);
  assert.equal(ENGINE_SUITE_HOOKS.suite, "BUILD_SUITE_V1");
  assert.equal(ENGINE_SUITE_HOOKS.ready, false);
  assert.equal(ENGINE_SUITE_HOOKS.continuous, false);
  assert.equal(ENGINE_SUITE_HOOKS.continuousReady, true);
  assert.equal(AUTOMATION_PREP_HOOKS.autoAudit, false);
});
