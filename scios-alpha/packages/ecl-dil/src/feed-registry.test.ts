import assert from "node:assert/strict";
import { test } from "node:test";
import { SCI_FEED_IDS, buildFeedRegistry } from "./feed-registry.js";

test("feed registry registers prediction + market types without claiming certified live", () => {
  const r = buildFeedRegistry();
  assert.equal(SCI_FEED_IDS.length, 13);
  assert.equal(r.feeds.length, 13);
  assert.equal(r.health.registered, 13);
  assert.equal(r.health.liveCertified, 0);
  assert.equal(r.enabledLive, false);
  assert.equal(r.liveCertified, false);
  assert.equal(r.simulationOnly, true);
  assert.equal(r.executionMode, "SIMULATION_ONLY");
  assert.equal(r.autoTrade, false);
  assert.equal(r.persisted, false);
  assert.equal(r.unexpectedLive, false);
  assert.ok(r.feeds.every((f) => f.certified === false && f.autoTrade === false && f.persisted === false));
  assert.ok(r.feeds.every((f) => f.live === "ABSENT"));
  assert.ok(r.feeds.every((f) => f.mode === "SIMULATION_ONLY"));
  assert.equal(r.feeds.find((f) => f.id === "prediction.kalshi")?.status, "simulated_alpha");
  assert.equal(r.feeds.find((f) => f.id === "prediction.polymarket")?.status, "simulated_alpha");
  assert.equal(r.feeds.find((f) => f.id === "market.spot")?.status, "simulated_alpha");
  assert.equal(r.feeds.find((f) => f.id === "market.orderbook")?.status, "ABSENT");
  assert.equal(r.feeds.find((f) => f.id === "macro.gdp")?.status, "ABSENT");
  assert.equal(r.consumers.Intelligence.length, 13);
  assert.ok(r.consumers.CausalEngine.includes("market.orderbook"));
  assert.ok(r.consumers.SSE.includes("macro.gdp"));
  assert.ok(r.feeds.find((f) => f.id === "prediction.kalshi")?.wiredTo.includes("CausalEngine"));
  assert.ok(r.feeds.find((f) => f.id === "prediction.polymarket")?.wiredTo.includes("SSE"));
  assert.ok(r.feeds.find((f) => f.id === "risk.credit")?.wiredTo.includes("RiskGov"));
  assert.ok(r.feeds.find((f) => f.id === "market.orderbook")?.wiredTo.includes("Intelligence"));
});

test("live_unverified adapter still does not certify feeds", () => {
  const r = buildFeedRegistry({ liveAdapter: "OPTIONAL_UNVERIFIED", actual: "live_unverified" });
  assert.equal(r.liveCertified, false);
  assert.equal(r.enabledLive, false);
  assert.equal(r.health.liveCertified, 0);
  assert.equal(r.unexpectedLive, false);
  assert.equal(r.feeds.find((f) => f.id === "prediction.kalshi")?.live, "UNVERIFIED");
  assert.equal(r.feeds.find((f) => f.id === "prediction.kalshi")?.mode, "SIMULATION_ONLY");
  assert.equal(r.feeds.find((f) => f.id === "macro.gdp")?.live, "ABSENT");
});
