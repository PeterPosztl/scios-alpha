import { OntologyRelationSchema, InMemoryOntologyStore } from "./ontology";
import { InMemoryCanonicalLedger } from "./ledger";

describe("ontology wave1", () => {
  it("parses PRODUCES relation", () => {
    const rel = OntologyRelationSchema.parse({
      id: "r1",
      type: "PRODUCES",
      fromId: "ds1",
      fromKind: "Dataset",
      toId: "f1",
      toKind: "Feature",
      validFrom: "2026-01-01T00:00:00.000Z",
      tenantId: "t1",
    });
    expect(rel.type).toBe("PRODUCES");
  });

  it("stores entity and relation", () => {
    const store = new InMemoryOntologyStore();
    store.upsert({
      id: "m1",
      kind: "Model",
      version: "1",
      owner: "quant",
      tenantId: "t1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lineage: [],
      schemaId: "ontology/v1",
      name: "baseline",
      family: "baseline",
    });
    store.relate({
      id: "r2",
      type: "PRODUCES",
      fromId: "m1",
      fromKind: "Model",
      toId: "p1",
      toKind: "Prediction",
      validFrom: "2026-01-01T00:00:00.000Z",
      tenantId: "t1",
    });
    expect(store.health().entities).toBe(1);
    expect(store.neighbors("m1", "PRODUCES")).toHaveLength(1);
  });
});

describe("ledger wave1", () => {
  it("appends immutably", async () => {
    const ledger = new InMemoryCanonicalLedger();
    const e1 = await ledger.append({
      entryId: "e1",
      ledger: "decisions",
      at: "2026-01-01T00:00:00.000Z",
      actor: "operator",
      tenantId: "t1",
      correlationId: "c1",
      payload: { action: "BUY" },
    });
    expect(e1.sequence).toBe(1);
    const list = await ledger.list("decisions");
    expect(list).toHaveLength(1);
  });
});
