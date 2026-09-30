import assert from "node:assert/strict";
import { test } from "node:test";
import { AUTOMATION_PREP_HOOKS } from "./automation-prep.js";
import { DIGITAL_WORKSPACE_COMPUTE_HOOKS } from "./digital-workspace-compute.js";
import { OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { BUILD_SUITE_V2_HOOKS } from "./engine-suite-v2.js";
import { createEclDilRuntime } from "./runtime.js";

test("BUILD_SUITE_V2 in-memory ledger books without durable or autoTrade", async () => {
  const rt = createEclDilRuntime();
  const inst = rt.snapshot().instruments[0]?.id;
  assert.ok(inst);
  const v2 = rt.buildSuiteV2;
  const tradesBefore = rt.snapshot().trades.length;

  assert.equal(BUILD_SUITE_V2_HOOKS.durable, false);
  assert.equal(BUILD_SUITE_V2_HOOKS.ready, false);
  assert.equal(BUILD_SUITE_V2_HOOKS.autoTrade, false);
  assert.equal(v2.hooks.durable, false);

  const emptyEv = v2.evidenceV2(inst);
  assert.equal(emptyEv.status, "UNKNOWN");
  assert.equal(emptyEv.signals.length, 0);

  const emptyKg = v2.kgV2(inst);
  assert.equal(emptyKg.status, "UNKNOWN");
  assert.equal(emptyKg.nationalGraph, false);
  assert.equal(OS_BLUEPRINT_HOOKS.nationalGraph, false);

  const missingRisk = await v2.append({
    kind: "DECISION",
    instrumentId: inst,
    payload: { decision: "HOLD" },
  });
  assert.equal(missingRisk.ok, true);
  assert.equal(missingRisk.durable, false);
  const riskUnknown = v2.riskBook();
  assert.equal(riskUnknown.skippedUnknown, 1);
  assert.equal(riskUnknown.riskByInstrument[inst], undefined);

  await v2.append({
    kind: "DECISION",
    instrumentId: inst,
    payload: { decision: "ALLOW", riskScore: 0.4 },
  });
  const riskKnown = v2.riskBook();
  assert.equal(riskKnown.riskByInstrument[inst], 0.4);
  assert.equal(riskKnown.skippedUnknown, 1);

  const missingPnl = await v2.append({
    kind: "EXECUTION_PREVIEW",
    instrumentId: inst,
    payload: { size: 10 },
  });
  assert.equal(missingPnl.ok, true);
  const pnlUnknown = v2.pnlBook();
  assert.equal(pnlUnknown.skippedUnknown, 1);
  assert.equal(pnlUnknown.preview, true);
  assert.equal(pnlUnknown.realized, false);
  assert.equal(pnlUnknown.pnlByInstrument[inst], undefined);

  await v2.append({
    kind: "EXECUTION_PREVIEW",
    instrumentId: inst,
    payload: { size: 10, previewFillPrice: 0.5 },
  });
  const pnl = v2.pnlBook();
  assert.equal(pnl.pnlByInstrument[inst], 5);
  assert.equal(pnl.notionalPreviewByInstrument[inst], 5);
  assert.equal(pnl.skippedUnknown, 1);

  v2.kgRegistryAdd({
    node: { id: inst, type: "INSTRUMENT" },
    edges: [{ from: "macro:rates", to: inst, relation: "SUPPORTS" }],
  });
  v2.kgRegistryAdd({ node: { id: "macro:rates", type: "MACRO", fixture: true } });
  const kg = v2.kgV2(inst);
  assert.equal(kg.status, "ANALOG_REGISTRY");
  assert.equal(kg.nationalGraph, false);
  assert.ok(kg.nodes.some((n) => n.id === inst && n.live === false && n.analog === true));
  assert.ok(kg.nodes.some((n) => n.id === "macro:rates" && n.fixture === true));

  const leak = v2.kgV2("inst-hospitality-desk");
  assert.equal(leak.status, "UNKNOWN");
  assert.equal(leak.nodes.length, 0);

  const composed = await v2.cockpitComputeV2({
    userId: "t",
    instrumentId: inst,
    action: "BUY",
    size: 50,
    price: 0.4,
  });
  assert.equal(composed.engine, "cockpit-compute-v2");
  assert.equal(composed.executed, false);
  assert.equal(composed.durable, false);
  assert.equal(composed.inspectComputeMode, "INSPECT_ONLY");
  assert.equal(DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode, "INSPECT_ONLY");
  assert.ok(composed.ledgerSize >= 2);

  const after = v2.list();
  assert.ok(after.entries.some((e) => e.kind === "DECISION" && e.instrumentId === inst && e.durable === false));
  assert.ok(after.entries.some((e) => e.kind === "EXECUTION_PREVIEW" && e.durable === false));

  const ev = v2.evidenceV2(inst);
  assert.equal(ev.status, "PARTIAL");
  assert.ok(ev.signals.length >= 2);
  assert.ok(!ev.signals.some((s) => (s as { id?: string }).id === "sector:tech"));

  const report = v2.reporting();
  assert.equal(report.engine, "reporting-v1");
  assert.equal(report.ledgerSize, after.ledgerSize);

  assert.equal(rt.snapshot().trades.length, tradesBefore);
  assert.equal(AUTOMATION_PREP_HOOKS.autoAudit, false);
  assert.equal(AUTOMATION_PREP_HOOKS.autoLimits, false);

  const inv = v2.inventory();
  assert.equal(inv.suite, "BUILD_SUITE_V2");
  assert.equal(inv.ready, false);
  assert.equal(inv.durable, false);
});
