import {
  FABRIC_LEDGER_HONESTY,
  LINEAGE_VERIFIED_DEFAULT,
  ONTOLOGY_CAUSAL_QUERY_ENGINE,
  ONTOLOGY_NATIONAL_GRAPH,
  ONTOLOGY_SPINE_LABEL,
  ROLE_EVALUATES_DECISION,
  MarketRefSchema,
  NewsEventSchema,
  OhlcBarSchema,
  WorldTickSchema,
  fabricLedgerActor,
  fabricSnapshot,
  hashNormalizedEventId,
  makeNewsEvent,
  ohlcAllowedForFamily,
  resolveInstrumentAlias,
  verifyLineageChain,
} from "./world-connector";

describe("world-connector additive contracts", () => {
  it("parses a simulated WorldTick and never certifies", () => {
    const tick = WorldTickSchema.parse({
      id: "tick-1",
      source: "prediction.polymarket",
      eventTime: "2026-09-23T00:00:00.000Z",
      ingestionTime: "2026-09-23T00:00:01.000Z",
      validFrom: "2026-09-23T00:00:00.000Z",
      revisionId: "rev-1",
      feed: "simulated_alpha",
      certified: false,
      payload: { yes: 0.42 },
    });
    expect(tick.certified).toBe(false);
    expect(tick.feed).toBe("simulated_alpha");
  });

  it("OHLC is allowed only for FAM-08/21 families", () => {
    expect(ohlcAllowedForFamily("market_portfolio_risk")).toBe(true);
    expect(ohlcAllowedForFamily("market_intelligence")).toBe(true);
    expect(ohlcAllowedForFamily("cyber_ops")).toBe(false);
    OhlcBarSchema.parse({
      instrumentId: "inst-1",
      interval: "1h",
      t: "2026-09-23T00:00:00.000Z",
      o: 1,
      h: 2,
      l: 0.5,
      c: 1.5,
      v: 10,
      source: "fixture_sim",
      feed: "simulated_alpha",
    });
  });

  it("unmapped news is orphan", () => {
    const news = NewsEventSchema.parse({
      eventId: "sha-1",
      source: "rss:economic",
      guid: "g1",
      title: "headline",
      publishedAt: "2026-09-23T00:00:00.000Z",
      mappedInstrumentId: null,
      orphan: true,
    });
    expect(news.orphan).toBe(true);
  });

  it("lineage verified is UNKNOWN without nodes and true only on prevHash match", () => {
    expect(verifyLineageChain(undefined)).toBe("UNKNOWN");
    expect(verifyLineageChain([])).toBe("UNKNOWN");
    expect(
      verifyLineageChain([
        { hash: "a", prevHash: null },
        { hash: "b", prevHash: "a" },
      ])
    ).toBe(true);
    expect(
      verifyLineageChain([
        { hash: "a", prevHash: null },
        { hash: "b", prevHash: "nope" },
      ])
    ).toBe(false);
  });

  it("MarketRef parses venue+marketId", () => {
    expect(MarketRefSchema.parse({ venue: "polymarket", marketId: "pm-1" }).marketId).toBe("pm-1");
  });

  it("normalized eventId is sha256(source+guid) and news unmapped is orphan", () => {
    const id = hashNormalizedEventId("rss:economic", "g1");
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    expect(id).toBe(hashNormalizedEventId("rss:economic", "g1"));
    expect(id).not.toBe(hashNormalizedEventId("rss:economic", "g2"));
    const news = makeNewsEvent({
      source: "rss:economic",
      guid: "g1",
      title: "headline",
      publishedAt: "2026-09-23T00:00:00.000Z",
    });
    expect(news.eventId).toBe(id);
    expect(news.orphan).toBe(true);
    NewsEventSchema.parse(news);
  });

  it("instrument alias prefers ticker then metadata.primaryObject", () => {
    expect(resolveInstrumentAlias({ ticker: "AAPL" })).toBe("AAPL");
    expect(resolveInstrumentAlias({ metadata: { primaryObject: "Alert" } })).toBe("Alert");
    expect(resolveInstrumentAlias({})).toBe("UNKNOWN");
  });

  it("missing snapshots are UNKNOWN and ledger stays non-durable", () => {
    expect(fabricSnapshot("prediction", null).status).toBe("UNKNOWN");
    expect(fabricSnapshot("risk", { id: "r1", verdict: "HOLD" }).status).toBe("PRESENT");
    expect(LINEAGE_VERIFIED_DEFAULT).toBe("UNKNOWN");
    expect(fabricLedgerActor("role.cyber_ops.soc_analyst")).toBe("human:role.cyber_ops.soc_analyst");
    expect(FABRIC_LEDGER_HONESTY.persisted).toBe(false);
    expect(FABRIC_LEDGER_HONESTY.durable).toBe(false);
    expect(ONTOLOGY_SPINE_LABEL).toBe("PRODUCES→SUPPORTS→TRAINS→PRODUCES→REQUIRES→PROVES");
    expect(ROLE_EVALUATES_DECISION).toBe("EVALUATES");
    expect(ONTOLOGY_NATIONAL_GRAPH).toBe(false);
    expect(ONTOLOGY_CAUSAL_QUERY_ENGINE).toBe("ABSENT");
  });
});
