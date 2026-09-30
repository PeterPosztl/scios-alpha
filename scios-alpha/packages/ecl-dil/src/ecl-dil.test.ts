import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALPHA_LABEL,
  ECL_DIL_HONESTY,
  ENTERPRISE_HOOKS,
  BLUEPRINT_HOOKS,
  classifyEdge,
  createEclDilRuntime,
  decide,
  kellyFraction,
  maxDrawdown,
  brierScore,
  realizedPnl,
  unrealizedPnl,
  NormalizedMarketSchema,
} from "./index.js";

test("kelly is capped and never negative for unfavorable implied", () => {
  const k = kellyFraction(0.6, 0.42, 0.15);
  assert.ok(k.raw > 0);
  assert.ok(k.capped <= 0.15);
  const bad = kellyFraction(0.2, 0.8, 0.25);
  assert.equal(bad.capped, 0);
});

test("PnL and drawdown engines", () => {
  const u = unrealizedPnl({
    positionId: "p",
    instrumentId: "i",
    size: 10,
    direction: "long",
    entryPrice: 0.4,
    currentPrice: 0.5,
  });
  assert.ok(Math.abs(u - 1) < 1e-9);
  const r = realizedPnl([
    {
      tradeId: "a",
      instrumentId: "i",
      time: "2026-01-01T00:00:00.000Z",
      side: "buy",
      size: 10,
      price: 0.4,
      fee: 0.1,
      venue: "polymarket",
      simulated: true,
    },
    {
      tradeId: "b",
      instrumentId: "i",
      time: "2026-01-01T01:00:00.000Z",
      side: "sell",
      size: 10,
      price: 0.5,
      fee: 0.1,
      venue: "polymarket",
      simulated: true,
    },
  ]);
  assert.ok(Math.abs(r - 0.8) < 1e-9);
  assert.ok(maxDrawdown([100, 120, 90, 110]) > 0.2);
});

test("runtime: simulated markets, proposal-only, no auto-trade", () => {
  const rt = createEclDilRuntime();
  const snap = rt.snapshot();
  assert.equal(snap.label, ALPHA_LABEL);
  assert.equal(snap.autoTrade, false);
  assert.ok(snap.markets.length >= 2);
  assert.ok(snap.markets.every((m) => m.feed === "simulated_alpha"));
  const id = snap.markets[0]!.marketId;
  const p = rt.probability(id);
  assert.ok(p);
  assert.ok(p.modelProbability >= 0 && p.modelProbability <= 1);
  const e = rt.edge(id);
  assert.ok(e);
  assert.ok(["small", "medium", "large"].includes(e.edgeClass));
  const d = rt.decide(id, "24h");
  assert.equal(d.autoTrade, false);
  assert.equal(d.label, ALPHA_LABEL);
  const prop = rt.propose(id, "5m");
  assert.equal(prop.autoExecute, false);
  assert.equal(prop.requiresHuman, true);
  assert.equal(prop.uncertainty.guessMode, true);
  assert.ok(prop.uncertainty.confidenceScore >= 0);
  assert.match(prop.citations.join(" "), /HUMAN/);
  const beforePreview = rt.audit().filter((a) => a.kind === "decision").length;
  rt.previewDecision(id, "72h");
  const afterPreview = rt.audit().filter((a) => a.kind === "decision").length;
  assert.equal(afterPreview, beforePreview);
  const beforeScenario = rt.audit().length;
  const sc = rt.previewScenario(id, "24h");
  assert.equal(rt.audit().length, beforeScenario);
  assert.equal(sc.autoTrade, false);
  assert.ok(["enter", "trim", "exit", "avoid", "wait"].includes(sc.baseDecision));
  assert.ok(["5m", "24h", "72h"].includes(sc.compareHorizon));
  const g = rt.guardrail();
  assert.equal(g.autoTrade, false);
  const reports = rt.reports();
  assert.equal(reports.length, 4);
  assert.ok(rt.audit().some((a) => a.kind === "decision"));
  assert.ok(rt.audit().some((a) => a.kind === "session"));
  assert.ok(rt.audit().some((a) => a.kind === "proposal"));
  assert.equal(classifyEdge(0.13), "large");
  const tight = rt.setLimits({ maxConcentration: 0.0001 });
  assert.ok(tight.breaches.includes("max_concentration"));
  assert.match(tight.recommendation, /no_new_risk/);
});

test("simulated track-record calibration is ADEQUATE_ALPHA and live remains UNKNOWN", () => {
  assert.equal(brierScore(1, 1), 0);
  assert.ok(brierScore(0.2, 1) > 0.5);
  const rt = createEclDilRuntime();
  const before = rt.trackRecord().length;
  const id = rt.snapshot().markets[0]!.marketId;
  rt.previewDecision(id, "24h");
  rt.previewScenario(id, "24h");
  assert.equal(rt.trackRecord().length, before);
  const cal = rt.calibration();
  assert.equal(cal.liveCalibration, "UNKNOWN");
  assert.equal(cal.probabilityCalibratedLive, false);
  assert.equal(cal.autoTrade, false);
  assert.equal(cal.productionEligible, false);
  assert.equal(cal.winRateClaim, null);
  assert.equal(cal.status, "ADEQUATE_ALPHA");
  assert.equal(cal.simulated.adequate, true);
  assert.ok(cal.simulated.n >= 8);
  assert.ok(cal.simulated.brier != null && cal.simulated.brier >= 0);
  assert.ok(cal.scenariosLogged >= 8);
  assert.equal(cal.label, ALPHA_LABEL);
  const feeds = rt.feedStatus();
  assert.equal(feeds.actual, "simulated_alpha");
  assert.equal(feeds.autoTrade, false);
  if (process.env.SCI_DIL_FEED !== "live_unverified") {
    assert.equal(feeds.liveAdapter, "ABSENT");
  }
  const beforeAll = rt.trackRecord().length;
  for (const m of rt.markets()) rt.previewScenario(m.marketId, "24h");
  assert.equal(rt.trackRecord().length, beforeAll);
});

test("decision engine: noNewRisk and low confidence never enter", () => {
  assert.equal(
    decide({
      edgeScore: 0.2,
      riskScore: 0.1,
      confidence: "high",
      whaleFlag: false,
      mispricingFlag: true,
      noNewRisk: true,
    }),
    "avoid"
  );
  assert.equal(
    decide({
      edgeScore: 0.2,
      riskScore: 0.1,
      confidence: "low",
      whaleFlag: false,
      mispricingFlag: true,
      noNewRisk: false,
    }),
    "wait"
  );
});

test("live upsert seeds ECL instrument without enabling live adapter or trades", () => {
  const rt = createEclDilRuntime();
  const tradesBefore = rt.snapshot().trades.length;
  const live = NormalizedMarketSchema.parse({
    marketId: "pm-live-test-alpha",
    venue: "polymarket",
    title: "Unverified live upsert test",
    outcomes: ["yes", "no"],
    prices: { yes: 0.4, no: 0.6 },
    volume: 1,
    lastTrades: [],
    asOf: new Date().toISOString(),
    feed: "live_unverified",
  });
  rt.upsertUnverifiedMarkets([live]);
  assert.ok(rt.snapshot().instruments.some((i) => i.symbol === "pm-live-test-alpha"));
  assert.equal(rt.snapshot().trades.length, tradesBefore);
  assert.equal(rt.feedStatus().liveAdapter, "ABSENT");
  assert.equal(rt.feedStatus().actual, "simulated_alpha");
  assert.equal(rt.feedStatus().bookIntegrity.orphanMarkets, 0);
  assert.equal(rt.feedStatus().bookIntegrity.durable, false);
  assert.equal(rt.feedStatus().registry.health.registered, 13);
  assert.equal(rt.feedStatus().registry.health.liveCertified, 0);
  assert.equal(rt.feedStatus().registry.enabledLive, false);
  assert.equal(rt.feedStatus().registry.autoTrade, false);
  assert.equal(rt.snapshot().ledgerMode, "in-memory");
  assert.equal(rt.snapshot().durable, false);
  const rows = rt.composeWorkspaceRows("24h");
  assert.ok(rows.length >= 4);
  assert.ok(rows.every((r) => r.rowStatus === "ok" || r.rowStatus === "UNKNOWN"));
  assert.ok(rows.some((r) => r.market.marketId === "pm-live-test-alpha" && r.rowStatus === "ok"));
  assert.ok(rows.every((r) => r.scenario && r.scenario.autoTrade === false));
});

test("human proposal review writes audit only — no trade, no auto-execute", () => {
  const rt = createEclDilRuntime();
  const id = rt.markets()[0]!.marketId;
  const prop = rt.propose(id, "24h");
  const tradesBefore = rt.snapshot().trades.length;
  const reviewed = rt.reviewProposal(prop.proposalId, "accept", "alpha audit close");
  assert.equal(reviewed.autoTrade, false);
  assert.equal(reviewed.executed, false);
  assert.equal(reviewed.proposal.autoExecute, false);
  assert.equal(reviewed.proposal.humanReview?.decision, "accept");
  assert.equal(rt.snapshot().trades.length, tradesBefore);
  assert.ok(
    rt.audit().some(
      (a) => a.kind === "decision" && a.risk && a.risk.proposalId === prop.proposalId && a.risk.executed === false
    )
  );
  assert.throws(() => rt.reviewProposal(prop.proposalId, "reject"), /already_reviewed/);
});

test("honesty placeholders stay ABSENT / in-memory — not READY", () => {
  assert.equal(ECL_DIL_HONESTY.ready, false);
  assert.equal(ECL_DIL_HONESTY.oidc, "ABSENT");
  assert.equal(ECL_DIL_HONESTY.otlp, "ABSENT");
  assert.equal(ECL_DIL_HONESTY.ledger, "in-memory");
  assert.equal(ECL_DIL_HONESTY.autoTrade, false);
  assert.equal(ECL_DIL_HONESTY.liveFeeds, "ABSENT");
  assert.equal(ENTERPRISE_HOOKS.enabled, false);
  assert.equal(ENTERPRISE_HOOKS.ready, false);
  assert.equal(ENTERPRISE_HOOKS.prepared, true);
  assert.equal(ENTERPRISE_HOOKS.hooks.oidc.status, "ABSENT");
  assert.equal(ENTERPRISE_HOOKS.hooks.otlp.status, "ABSENT");
  assert.equal(ENTERPRISE_HOOKS.hooks.durableLedger.enabled, false);
  assert.equal(ENTERPRISE_HOOKS.hooks.liveFeeds.enabled, false);
  assert.equal(ENTERPRISE_HOOKS.hooks.liveCalibrationEngine.status, "UNKNOWN");
  assert.equal(ENTERPRISE_HOOKS.hooks.executionEngine.status, "SIMULATION_ONLY");
  assert.equal(ENTERPRISE_HOOKS.hooks.executionEngine.enabled, false);
  assert.equal(ENTERPRISE_HOOKS.hooks.executionEngine.live, false);
});

test("blueprint hooks stay prepared and disabled — no LDA auto-patch, no second workflow engine", () => {
  assert.equal(BLUEPRINT_HOOKS.enabled, false);
  assert.equal(BLUEPRINT_HOOKS.ready, false);
  assert.equal(BLUEPRINT_HOOKS.autoApply, false);
  assert.equal(BLUEPRINT_HOOKS.autoTrade, false);
  assert.equal(BLUEPRINT_HOOKS.secondWorkflowEngine, false);
  assert.equal(BLUEPRINT_HOOKS.secondShell, false);
  assert.equal(BLUEPRINT_HOOKS.surfaces.lda.status, "ABSENT");
  assert.equal(BLUEPRINT_HOOKS.surfaces.lda.autoPatch, false);
  assert.equal(BLUEPRINT_HOOKS.surfaces.knowledgeGraph.nationalGraph, false);
  assert.equal(BLUEPRINT_HOOKS.surfaces.knowledgeGraph.causalQueryEngine, "ABSENT");
  assert.equal(BLUEPRINT_HOOKS.surfaces.workflowDsl.secondEngine, false);
  assert.equal(BLUEPRINT_HOOKS.surfaces.distributedOs.kafka, "ABSENT");
  assert.equal(BLUEPRINT_HOOKS.surfaces.distributedOs.multiRegion, false);
  assert.equal(BLUEPRINT_HOOKS.inspectionUnlocked, true);
  assert.equal(BLUEPRINT_HOOKS.safeActivation, true);
  assert.equal(BLUEPRINT_HOOKS.wiredIntoOs, true);
  assert.equal(BLUEPRINT_HOOKS.enabled, false);
  assert.equal(BLUEPRINT_HOOKS.surfaces.osModuleWorkflow.enabled, false);
  assert.equal(BLUEPRINT_HOOKS.surfaces.osModuleEventBus.kafka, "ABSENT");
  assert.equal(BLUEPRINT_HOOKS.surfaces.osModuleConsensus.raft, false);
  assert.equal(BLUEPRINT_HOOKS.surfaces.lda.enabled, false);
  assert.equal(BLUEPRINT_HOOKS.surfaces.knowledgeGraph.enabled, false);
  assert.equal(BLUEPRINT_HOOKS.surfaces.workflowDsl.enabled, false);
  assert.equal(BLUEPRINT_HOOKS.surfaces.distributedOs.enabled, false);
});

test("weekly/monthly report slices stay UNKNOWN — not independent period evidence", () => {
  const rt = createEclDilRuntime();
  for (const rep of rt.reports()) {
    const payload = rep.payload as {
      weekly?: { status?: string };
      monthly?: { status?: string };
    };
    assert.equal(payload.weekly?.status, "UNKNOWN");
    assert.equal(payload.monthly?.status, "UNKNOWN");
  }
});
