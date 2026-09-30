import assert from "node:assert/strict";
import { test } from "node:test";
import { kgEdgesFromNodes, kgNodesFromGw1 } from "./blueprint-studio.js";

test("kgNodesFromGw1 is empty without a GW1 payload — UNKNOWN, not a national graph", () => {
  assert.deepEqual(kgNodesFromGw1(null), []);
  assert.deepEqual(kgNodesFromGw1({}), []);
});

test("kgNodesFromGw1 maps GW1 fields to entity/event/risk/decision/evidence", () => {
  const nodes = kgNodesFromGw1({
    instrumentId: "AAPL",
    prediction: { pointEstimate: 0.4 },
    riskDecision: { action: "NO_ACTION" },
    governanceDecision: { action: "HOLD" },
    lineage: { prevHash: "abc" },
  });
  assert.deepEqual(
    nodes.map((n) => n.kind),
    ["entity", "event", "risk", "decision", "evidence"]
  );
  const edges = kgEdgesFromNodes(nodes);
  assert.ok(edges.some((e) => e.type === "AFFECTS"));
  assert.ok(edges.some((e) => e.type === "PROVES"));
});
