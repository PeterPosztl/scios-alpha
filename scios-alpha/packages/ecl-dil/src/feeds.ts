/**
 * Optional live_unverified prediction-market pull.
 * Default remains simulated_alpha. Never auto-trades. Not READY.
 */
import { ALPHA_LABEL, NormalizedMarketSchema, type NormalizedMarket } from "./schemas.js";

export type DilFeedStatus = {
  requested: "simulated_alpha" | "live_unverified";
  actual: "simulated_alpha" | "live_unverified";
  liveAdapter: "ABSENT" | "OPTIONAL_UNVERIFIED" | "DEGRADED";
  venues: { polymarket: string; kalshi: string };
  lastError: string | null;
  fetchedAt: string | null;
  autoTrade: false;
  label: typeof ALPHA_LABEL;
  note: string;
};

export function requestedFeedMode(): "simulated_alpha" | "live_unverified" {
  return process.env.SCI_DIL_FEED === "live_unverified" ? "live_unverified" : "simulated_alpha";
}

export function defaultFeedStatus(): DilFeedStatus {
  const requested = requestedFeedMode();
  return {
    requested,
    actual: "simulated_alpha",
    liveAdapter: requested === "live_unverified" ? "OPTIONAL_UNVERIFIED" : "ABSENT",
    venues: { polymarket: "idle", kalshi: "idle" },
    lastError: requested === "live_unverified" ? null : "SCI_DIL_FEED unset — live adapter ABSENT",
    fetchedAt: null,
    autoTrade: false,
    label: ALPHA_LABEL,
    note: "Book is simulated_alpha unless SCI_DIL_FEED=live_unverified succeeds. Live ticks are UNVERIFIED. No auto-trade. Not READY.",
  };
}

async function getJson(url: string, ms = 1500): Promise<unknown> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { accept: "application/json" } });
    if (!r.ok) throw new Error("http_" + r.status);
    return r.json();
  } finally {
    clearTimeout(t);
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(0.99, Math.max(0.01, n));
}

function asMarket(partial: {
  marketId: string;
  venue: "polymarket" | "kalshi";
  title: string;
  yes: number;
  volume: number;
  liquidity?: number;
}): NormalizedMarket {
  const yes = clamp01(partial.yes);
  return NormalizedMarketSchema.parse({
    marketId: partial.marketId,
    venue: partial.venue,
    title: partial.title || partial.marketId,
    outcomes: ["yes", "no"],
    prices: { yes, no: clamp01(1 - yes) },
    volume: Number.isFinite(partial.volume) ? partial.volume : 0,
    liquidity: partial.liquidity,
    lastTrades: [],
    asOf: new Date().toISOString(),
    feed: "live_unverified",
  });
}

export async function pullLiveUnverifiedMarkets(): Promise<{
  markets: NormalizedMarket[];
  status: DilFeedStatus;
}> {
  const status = defaultFeedStatus();
  status.requested = "live_unverified";
  status.liveAdapter = "OPTIONAL_UNVERIFIED";
  const markets: NormalizedMarket[] = [];
  const errors: string[] = [];

  try {
    const raw = (await getJson("https://gamma-api.polymarket.com/markets?closed=false&limit=3")) as unknown;
    const list = Array.isArray(raw) ? raw : [];
    for (const row of list.slice(0, 3)) {
      const rec = row as Record<string, unknown>;
      let yes = 0.5;
      const prices = rec.outcomePrices;
      if (typeof prices === "string") {
        try {
          const arr = JSON.parse(prices) as unknown;
          if (Array.isArray(arr) && typeof arr[0] === "string") yes = Number(arr[0]);
        } catch {
          yes = 0.5;
        }
      } else if (Array.isArray(prices) && typeof prices[0] === "number") {
        yes = prices[0];
      }
      markets.push(
        asMarket({
          marketId: "pm-live-" + String(rec.id || rec.slug || markets.length),
          venue: "polymarket",
          title: String(rec.question || rec.slug || "Polymarket live_unverified"),
          yes,
          volume: Number(rec.volumeNum ?? rec.volume ?? 0),
          liquidity: Number(rec.liquidityNum ?? rec.liquidity ?? 0) || undefined,
        })
      );
    }
    status.venues.polymarket = markets.some((m) => m.venue === "polymarket") ? "live_unverified" : "empty";
  } catch (err) {
    status.venues.polymarket = "error";
    errors.push("polymarket:" + (err instanceof Error ? err.message : String(err)));
  }

  try {
    const raw = (await getJson(
      "https://api.elections.kalshi.com/trade-api/v2/markets?limit=3&status=open"
    )) as { markets?: Array<Record<string, unknown>> };
    const list = Array.isArray(raw?.markets) ? raw.markets : [];
    for (const rec of list.slice(0, 3)) {
      const bid = Number(rec.yes_bid ?? rec.last_price ?? 50) / 100;
      markets.push(
        asMarket({
          marketId: "kx-live-" + String(rec.ticker || markets.length),
          venue: "kalshi",
          title: String(rec.title || rec.ticker || "Kalshi live_unverified"),
          yes: bid,
          volume: Number(rec.volume ?? 0),
          liquidity: Number(rec.open_interest ?? 0) || undefined,
        })
      );
    }
    status.venues.kalshi = list.length ? "live_unverified" : "empty";
  } catch (err) {
    status.venues.kalshi = "error";
    errors.push("kalshi:" + (err instanceof Error ? err.message : String(err)));
  }

  status.fetchedAt = new Date().toISOString();
  status.lastError = errors.length ? errors.join("; ") : null;
  if (markets.length) {
    status.actual = "live_unverified";
    status.liveAdapter = errors.length ? "DEGRADED" : "OPTIONAL_UNVERIFIED";
  } else {
    status.actual = "simulated_alpha";
    status.liveAdapter = "DEGRADED";
    status.lastError = status.lastError || "live pull returned no markets";
  }
  status.note =
    "live_unverified ticks are not venue-certified. Fallback book stays simulated. No auto-trade. Not READY. Live outcomes are not in the ALPHA track-record.";
  return { markets, status };
}
