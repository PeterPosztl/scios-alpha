import { ImmutableLineageStore } from "./lineage";

describe("ImmutableLineageStore integrity", () => {
  it("recomputes hashes and fails on tamper", () => {
    const s = new ImmutableLineageStore();
    s.appendNode({
      nodeId: "n1",
      stage: "raw_event",
      refId: "r1",
      at: "2026-08-14T00:00:00.000Z",
      payload: { ok: true },
    });
    s.appendNode({
      nodeId: "n2",
      stage: "normalized_event",
      refId: "r2",
      at: "2026-08-14T00:00:01.000Z",
      payload: { ok: true },
    });
    expect(s.verify().ok).toBe(true);
    const snap = s.snapshot();
    snap.nodes[1].hash = "deadbeef";
    const broken = new ImmutableLineageStore();
    Object.assign(broken, { nodes: snap.nodes, edges: snap.edges, tipHash: snap.tipHash });
    expect(broken.verify().ok).toBe(false);
    expect(broken.verify().mode).toMatch(/hash_recompute|prevHash/);
  });
});
