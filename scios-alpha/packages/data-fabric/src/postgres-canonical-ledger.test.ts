import { PostgresCanonicalLedger, createMemoryCanonicalSqlClient } from "./postgres-canonical-ledger";

describe("postgres canonical ledger adapter", () => {
  it("appends via injected SQL without claiming live Postgres", async () => {
    const ledger = new PostgresCanonicalLedger(createMemoryCanonicalSqlClient());
    const e1 = await ledger.append({
      entryId: "e1",
      ledger: "decisions",
      at: "2026-01-01T00:00:00.000Z",
      actor: "operator",
      tenantId: "t1",
      correlationId: "c1",
      payload: { action: "HOLD" },
    });
    expect(e1.sequence).toBe(1);
    expect(ledger.ready).toBe(false);
    expect(ledger.autoTrade).toBe(false);
    const list = await ledger.list("decisions");
    expect(list).toHaveLength(1);
    expect(await ledger.get("e1")).toMatchObject({ entryId: "e1" });
  });
});
