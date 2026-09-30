/**
 * Data feed registry — ALPHA inventory (SAFE MODE).
 * Default SIMULATION_ONLY. Live remains ABSENT unless SCI_DIL_FEED=live_unverified (UNVERIFIED).
 * No auto-trade. Not venue-certified. Not READY.
 */

export const SCI_FEED_IDS = [
  "prediction.kalshi",
  "prediction.polymarket",
  "market.spot",
  "market.orderbook",
  "market.depth",
  "market.ohlc",
  "macro.gdp",
  "macro.cpi",
  "macro.rates",
  "news.economic",
  "news.political",
  "risk.credit",
  "risk.geopolitical",
] as const;

/** Previous IDs kept as aliases so older consoles still resolve. */
export const SCI_FEED_ALIASES = {
  "market_data.spot": "market.spot",
  "market_data.orderbook": "market.orderbook",
  "market_data.depth": "market.depth",
  "market_data.ohlc": "market.ohlc",
  "crypto.spot": "prediction.polymarket",
} as const;

export type SciFeedId = (typeof SCI_FEED_IDS)[number];

export type SciFeedEntry = {
  id: SciFeedId;
  family: string;
  status: "simulated_alpha" | "STUB" | "ABSENT";
  mode: "SIMULATION_ONLY";
  live: "ABSENT" | "UNVERIFIED";
  certified: false;
  persisted: false;
  autoTrade: false;
  analog: string;
  wiredTo: string[];
  note: string;
};

const STAR = [...SCI_FEED_IDS];

const CONSUMERS = {
  Intelligence: STAR,
  CausalEngine: STAR,
  SSE: STAR,
  Reporting: STAR,
  RiskGov: STAR,
  SystemHealth: ["FeedHealthMonitor"],
} as const;

function wiredTo(id: SciFeedId): string[] {
  const out = new Set<string>(["SystemHealth"]);
  (Object.keys(CONSUMERS) as Array<keyof typeof CONSUMERS>).forEach((mod) => {
    if (mod === "SystemHealth") return;
    if ((CONSUMERS[mod] as readonly string[]).includes(id)) out.add(mod);
  });
  return Array.from(out);
}

function entry(
  id: SciFeedId,
  family: string,
  status: SciFeedEntry["status"],
  analog: string,
  note: string
): SciFeedEntry {
  return {
    id,
    family,
    status,
    mode: "SIMULATION_ONLY",
    live: "ABSENT",
    certified: false,
    persisted: false,
    autoTrade: false,
    analog,
    wiredTo: wiredTo(id),
    note,
  };
}

export function buildFeedRegistry(opts?: { liveAdapter?: string; actual?: string }) {
  const liveAdapter = opts && opts.liveAdapter ? opts.liveAdapter : "ABSENT";
  const actual = opts && opts.actual ? opts.actual : "simulated_alpha";
  const feeds: SciFeedEntry[] = [
    entry("prediction.kalshi", "prediction", "simulated_alpha", "kx-cpi-hot / Kalshi simulated snapshots", "SIMULATION_ONLY. Not a Kalshi venue socket."),
    entry("prediction.polymarket", "prediction", "simulated_alpha", "pm-fed-cut-oct / pm-btc-100k simulated snapshots", "SIMULATION_ONLY. Not a Polymarket venue socket."),
    entry("market.spot", "market", "simulated_alpha", "DIL implied yes/no on simulated books", "Snapshot analog. Not a venue tape."),
    entry("market.orderbook", "market", "ABSENT", "NONE", "L2 book not mounted. Mode remains SIMULATION_ONLY."),
    entry("market.depth", "market", "ABSENT", "NONE", "Depth ladder not mounted. Mode remains SIMULATION_ONLY."),
    entry("market.ohlc", "market", "ABSENT", "NONE", "OHLC series not mounted — SSE uses simulated track-record, not candles."),
    entry("macro.gdp", "macro", "ABSENT", "NONE", "No GDP vintage adapter."),
    entry("macro.cpi", "macro", "STUB", "kx-cpi-hot simulated market — not BLS", "CPI is a prediction-market title, not official statistics."),
    entry("macro.rates", "macro", "STUB", "pm-fed-cut-oct simulated market — not FOMC", "Rates analog is a cut-odds market, not a rates tape."),
    entry("news.economic", "news", "STUB", "DIL STUB signals", "Manual/stub headlines. Not a wire service."),
    entry("news.political", "news", "STUB", "DIL STUB signals", "Manual/stub headlines. Not a wire service."),
    entry("risk.credit", "risk", "ABSENT", "ECL guardrail session scores", "No credit-bureau or CDS feed."),
    entry("risk.geopolitical", "risk", "STUB", "DIL risk score + STUB signals", "Advisory ALPHA score. Not a geopolitical event bus."),
  ];
  if (liveAdapter !== "ABSENT" && actual === "live_unverified") {
    feeds.forEach((f) => {
      if (f.id === "prediction.kalshi" || f.id === "prediction.polymarket" || f.id === "market.spot") {
        f.live = "UNVERIFIED";
        f.note = f.note + " Live adapter OPTIONAL_UNVERIFIED — not venue-certified. Execution stays SIMULATION_ONLY.";
      }
    });
  }
  const simulated = feeds.filter((f) => f.status === "simulated_alpha").length;
  const stub = feeds.filter((f) => f.status === "STUB").length;
  const absent = feeds.filter((f) => f.status === "ABSENT").length;
  return {
    schema: "sci-os-feed-registry/v1" as const,
    label: "ALPHA_NON_PRODUCTION" as const,
    engine: "DataFeedEngine" as const,
    adapters: "InstrumentAdapterLayer" as const,
    monitor: "FeedHealthMonitor" as const,
    prepared: true as const,
    enabledLive: false as const,
    liveCertified: false as const,
    simulationOnly: true as const,
    executionMode: "SIMULATION_ONLY" as const,
    autoTrade: false as const,
    persisted: false as const,
    unexpectedLive: false as const,
    liveAdapter,
    actual,
    consumers: CONSUMERS,
    aliases: SCI_FEED_ALIASES,
    feeds,
    health: {
      registered: feeds.length,
      simulated,
      stub,
      absent,
      liveCertified: 0,
      unverifiedLive: feeds.filter((f) => f.live === "UNVERIFIED").length,
      aliases: Object.keys(SCI_FEED_ALIASES).length,
    },
    note: "SAFE MODE. 13 primary types + compat aliases. Certified live feeds remain 0. GET persisted=false. No auto-trade.",
  };
}
