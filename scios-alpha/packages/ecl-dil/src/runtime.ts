/**
 * In-memory ECL + DIL runtime.
 * ALPHA_NON_PRODUCTION — simulated Polymarket/Kalshi snapshots, no auto-trade.
 */
import { randomUUID } from "node:crypto";
import { evaluateAuditLimit as scoreAuditLimit, type AuditLimitInput } from "./engine-audit.js";
import { createEngineSuite } from "./engine-suite.js";
import { createBuildSuiteV2 } from "./engine-suite-v2.js";
import { createEclLedgerDao, tryCreatePostgresClientFromEnv } from "./ecl-ledger-dao.js";
import { buildClientSuiteInventory } from "./client-suite.js";
import { buildDurableInfra } from "./durable-adapter.js";
import {
  ALPHA_LABEL,
  AuditEventSchema,
  BankrollSchema,
  DecisionResultSchema,
  DilRiskResultSchema,
  ScenarioResultSchema,
  TrackRecordEntrySchema,
  CalibrationReportSchema,
  EclInstrumentSchema,
  EdgeResultSchema,
  GuardrailLimitsSchema,
  GuardrailStatusSchema,
  HorizonSchema,
  NormalizedMarketSchema,
  PositionSchema,
  ProbabilityEstimateSchema,
  ProposalSchema,
  ReportSchema,
  RiskBucketSchema,
  SignalSchema,
  TradeSchema,
  TradingSessionSchema,
  type AuditEvent,
  type Bankroll,
  type DecisionResult,
  type DilRiskResult,
  type ScenarioResult,
  type TrackRecordEntry,
  type EclInstrument,
  type EdgeResult,
  type GuardrailLimits,
  type GuardrailStatus,
  type Horizon,
  type NormalizedMarket,
  type Position,
  type ProbabilityEstimate,
  type Proposal,
  type Report,
  type RiskBucket,
  type Signal,
  type Trade,
  type TradingSession,
} from "./schemas.js";
import {
  classifyConfidence,
  classifyEdge,
  decide,
  decisionToProposalAction,
  equity,
  exposureByInstrument,
  horizonRiskMultiplier,
  hypotheticalContractPnl,
  kellyFraction,
  maxDrawdown,
  meanBrier,
  realizedPnl,
  reliabilityBins,
  simulatedCalibrationStatus,
  unrealizedPnl,
  volatilityScore,
} from "./engines.js";
import { defaultFeedStatus, pullLiveUnverifiedMarkets, requestedFeedMode, type DilFeedStatus } from "./feeds.js";
import { buildFeedRegistry, SCI_FEED_IDS } from "./feed-registry.js";
import { buildRealisticSimulation } from "./realistic-sim.js";
import { buildRoleProfessionalInventory } from "./role-professional.js";
import { applyProfessionModules, buildProfessionModuleExpansion } from "./profession-module-expansion.js";
import { applyOsBlueprint, buildOsBlueprintIntegration } from "./os-blueprint-integration.js";
import { buildDigitalActivationWave } from "./digital-activation.js";
import { buildPrecisionUpgradeWave } from "./precision-upgrade.js";
import { buildCyberResearchBridgeWave } from "./cyber-research-bridge.js";
import { buildActivationReviewWave } from "./activation-review.js";
import { buildEnterprisePrepWave } from "./enterprise-prep.js";
import { buildAutomationPrepWave } from "./automation-prep.js";
import { buildVisibilityPrepWave } from "./visibility-prep.js";
import { buildVisibilityActivationWave } from "./visibility-activation.js";
import { buildVisibilityDeepWave } from "./visibility-deep.js";
import { buildExplainabilityPrepWave } from "./explainability-prep.js";
import { buildExplainabilityAndVisibilityWave } from "./explain-visibility.js";
import { buildDigitalAndWorkspaceAndComputeWave } from "./digital-workspace-compute.js";
import { buildActivationPassWave } from "./activation-pass.js";
import { buildPhaseCoreWave } from "./phase-core.js";
import { buildCopilotBlueprintWave } from "./phase-core-contracts.js";
import { buildAuditEngineCoreWave } from "./audit-engine-core.js";
import { buildLimitEngineCoreWave } from "./limit-engine-core.js";
import { buildLedgerCoreWave } from "./ledger-core.js";
import { buildDomainFabricWave } from "./domain-fabric.js";
import { buildKgFabricWave } from "./kg-fabric.js";
import { buildScenarioFabricWave } from "./scenario-fabric.js";
import { buildCausalFabricWave } from "./causal-fabric.js";
import { buildGovernanceFabricWave } from "./governance-fabric.js";
import { buildInfraFabricWave } from "./infra-fabric.js";
import { buildSecurityFabricWave } from "./security-fabric.js";
import { buildOsFabricWave } from "./os-fabric.js";
import { buildCursorRunbookWave } from "./cursor-runbook.js";

const NOW = () => new Date().toISOString();
const MODEL_PROB = "dil-probability-alpha";
const MODEL_EDGE = "dil-edge-alpha";
const MODEL_RISK = "dil-risk-kelly-alpha";

function seedMarkets(): NormalizedMarket[] {
  const ts = NOW();
  return [
    NormalizedMarketSchema.parse({
      venue: "polymarket",
      marketId: "pm-fed-cut-oct",
      title: "Fed cuts rates in October?",
      outcomes: ["yes", "no"],
      prices: { yes: 0.42, no: 0.58 },
      volume: 1_240_000,
      liquidity: 82_000,
      openInterest: 410_000,
      lastTrades: [
        { time: ts, size: 12_000, price: 0.41, whale: true },
        { time: ts, size: 400, price: 0.42, whale: false },
      ],
      asOf: ts,
      feed: "simulated_alpha",
    }),
    NormalizedMarketSchema.parse({
      venue: "kalshi",
      marketId: "kx-cpi-hot",
      title: "CPI prints hotter than consensus?",
      outcomes: ["yes", "no"],
      prices: { yes: 0.31, no: 0.69 },
      volume: 540_000,
      liquidity: 41_000,
      openInterest: 190_000,
      lastTrades: [{ time: ts, size: 2_200, price: 0.31, whale: false }],
      asOf: ts,
      feed: "simulated_alpha",
    }),
    NormalizedMarketSchema.parse({
      venue: "polymarket",
      marketId: "pm-btc-100k",
      title: "BTC above 100k by year-end?",
      outcomes: ["yes", "no"],
      prices: { yes: 0.55, no: 0.45 },
      volume: 3_100_000,
      liquidity: 210_000,
      openInterest: 980_000,
      lastTrades: [{ time: ts, size: 50_000, price: 0.56, whale: true }],
      asOf: ts,
      feed: "simulated_alpha",
    }),
  ];
}

function seedTrackRecord(): TrackRecordEntry[] {
  const rows: Array<{
    marketId: string;
    horizon: "5m" | "24h" | "72h";
    decision: "enter" | "wait" | "avoid" | "trim" | "exit";
    modelProbability: number;
    impliedProbability: number;
    edgeScore: number;
    riskScore: number;
    noNewRisk: boolean;
    recommendedSize: number;
    scenarioBase: "enter" | "wait" | "avoid" | "trim" | "exit";
    scenarioStressed: "enter" | "wait" | "avoid" | "trim" | "exit";
    outcome: 0 | 1;
  }> = [
    { marketId: "sim-hist-01", horizon: "24h", decision: "enter", modelProbability: 0.62, impliedProbability: 0.48, edgeScore: 0.14, riskScore: 0.32, noNewRisk: false, recommendedSize: 400, scenarioBase: "enter", scenarioStressed: "wait", outcome: 1 },
    { marketId: "sim-hist-02", horizon: "24h", decision: "enter", modelProbability: 0.71, impliedProbability: 0.58, edgeScore: 0.13, riskScore: 0.28, noNewRisk: false, recommendedSize: 350, scenarioBase: "enter", scenarioStressed: "enter", outcome: 1 },
    { marketId: "sim-hist-03", horizon: "5m", decision: "wait", modelProbability: 0.44, impliedProbability: 0.46, edgeScore: -0.02, riskScore: 0.41, noNewRisk: false, recommendedSize: 0, scenarioBase: "wait", scenarioStressed: "wait", outcome: 0 },
    { marketId: "sim-hist-04", horizon: "72h", decision: "avoid", modelProbability: 0.22, impliedProbability: 0.4, edgeScore: -0.18, riskScore: 0.55, noNewRisk: false, recommendedSize: 0, scenarioBase: "avoid", scenarioStressed: "avoid", outcome: 0 },
    { marketId: "sim-hist-05", horizon: "24h", decision: "enter", modelProbability: 0.66, impliedProbability: 0.51, edgeScore: 0.15, riskScore: 0.3, noNewRisk: false, recommendedSize: 280, scenarioBase: "enter", scenarioStressed: "trim", outcome: 0 },
    { marketId: "sim-hist-06", horizon: "24h", decision: "wait", modelProbability: 0.5, impliedProbability: 0.49, edgeScore: 0.01, riskScore: 0.22, noNewRisk: false, recommendedSize: 0, scenarioBase: "wait", scenarioStressed: "wait", outcome: 1 },
    { marketId: "sim-hist-07", horizon: "5m", decision: "avoid", modelProbability: 0.38, impliedProbability: 0.37, edgeScore: 0.01, riskScore: 0.8, noNewRisk: true, recommendedSize: 0, scenarioBase: "avoid", scenarioStressed: "avoid", outcome: 0 },
    { marketId: "sim-hist-08", horizon: "24h", decision: "trim", modelProbability: 0.57, impliedProbability: 0.54, edgeScore: 0.03, riskScore: 0.76, noNewRisk: false, recommendedSize: 90, scenarioBase: "trim", scenarioStressed: "avoid", outcome: 1 },
    { marketId: "sim-hist-09", horizon: "72h", decision: "enter", modelProbability: 0.69, impliedProbability: 0.52, edgeScore: 0.17, riskScore: 0.25, noNewRisk: false, recommendedSize: 500, scenarioBase: "enter", scenarioStressed: "enter", outcome: 1 },
    { marketId: "sim-hist-10", horizon: "24h", decision: "avoid", modelProbability: 0.33, impliedProbability: 0.61, edgeScore: -0.28, riskScore: 0.48, noNewRisk: false, recommendedSize: 0, scenarioBase: "avoid", scenarioStressed: "avoid", outcome: 0 },
    { marketId: "sim-hist-11", horizon: "24h", decision: "wait", modelProbability: 0.55, impliedProbability: 0.53, edgeScore: 0.02, riskScore: 0.35, noNewRisk: false, recommendedSize: 0, scenarioBase: "wait", scenarioStressed: "wait", outcome: 1 },
    { marketId: "sim-hist-12", horizon: "5m", decision: "avoid", modelProbability: 0.41, impliedProbability: 0.4, edgeScore: 0.01, riskScore: 0.82, noNewRisk: true, recommendedSize: 0, scenarioBase: "avoid", scenarioStressed: "avoid", outcome: 1 },
  ];
  return rows.map((r) =>
    TrackRecordEntrySchema.parse({
      id: `tr-${r.marketId}`,
      at: NOW(),
      ...r,
      hypotheticalPnl:
        r.decision === "enter"
          ? hypotheticalContractPnl(r.recommendedSize, r.impliedProbability, r.outcome)
          : 0,
      source: "seeded_alpha",
      feed: "simulated_alpha",
      label: ALPHA_LABEL,
    })
  );
}

function seedInstruments(markets: NormalizedMarket[]): EclInstrument[] {
  return markets.map((m) =>
    EclInstrumentSchema.parse({
      id: `inst-${m.marketId}`,
      type: "prediction_market",
      market: m.venue,
      symbol: m.marketId,
      currency: "USD",
      title: m.title,
    })
  );
}

export type EclDilRuntime = ReturnType<typeof createEclDilRuntime>;

export function createEclDilRuntime() {
  const markets = seedMarkets();
  const instruments = seedInstruments(markets);
  const bankroll: Bankroll = BankrollSchema.parse({
    totalEquity: 100_000,
    cash: 82_000,
    margin: 18_000,
    reserved: 5_000,
    currency: "USD",
  });
  const bucket: RiskBucket = RiskBucketSchema.parse({
    bucketId: "core",
    name: "Core prediction book",
    maxLoss: 4_000,
    maxExposure: 25_000,
    maxLeverage: 2,
  });
  const positions: Position[] = [
    PositionSchema.parse({
      positionId: "pos-1",
      instrumentId: instruments[0]!.id,
      size: 120,
      direction: "long",
      entryPrice: 0.38,
      currentPrice: 0.42,
      pnlUnrealized: 4.8,
    }),
  ];
  const trades: Trade[] = [
    TradeSchema.parse({
      tradeId: "tr-1",
      instrumentId: instruments[0]!.id,
      time: NOW(),
      side: "buy",
      size: 120,
      price: 0.38,
      fee: 1.2,
      venue: "polymarket",
      simulated: true,
    }),
  ];
  const session: TradingSession = TradingSessionSchema.parse({
    sessionId: "sess-sim-1",
    start: NOW(),
    end: null,
    pnl: realizedPnl(trades) + positions.reduce((s, p) => s + unrealizedPnl(p), 0),
    maxDrawdown: 0.012,
    volatility: 0.18,
  });
  let limits: GuardrailLimits = GuardrailLimitsSchema.parse({
    maxDailyLoss: 2_500,
    maxPositionSize: 5_000,
    maxConcentration: 0.35,
    kellyCap: 0.15,
  });
  const audit: AuditEvent[] = [];
  const signals: Signal[] = [
    SignalSchema.parse({
      signalId: "sig-macro-1",
      kind: "macro",
      marketId: "pm-fed-cut-oct",
      text: "Manual: FOMC minutes hawkish vs cut market. ALPHA stub — paste analyst notes; not a live feed.",
      weight: 0.35,
      at: NOW(),
      sourceStatus: "STUB",
    }),
  ];
  const proposals: Proposal[] = [];
  const track: TrackRecordEntry[] = seedTrackRecord();
  let feed: DilFeedStatus = defaultFeedStatus();
  let lastBreachKey = "";
  let sessionRiskEvents = 0;

  function log(
    kind: AuditEvent["kind"],
    body: Omit<AuditEvent, "id" | "time" | "kind" | "label">
  ): AuditEvent {
    const ev = AuditEventSchema.parse({
      id: randomUUID(),
      time: NOW(),
      kind,
      label: ALPHA_LABEL,
      ...body,
    });
    audit.unshift(ev);
    if (audit.length > 500) audit.pop();
    return ev;
  }

  log("session", {
    user: "system",
    reason: "ALPHA simulated trading session opened — not live capital",
    risk: { sessionId: session.sessionId, maxDrawdown: session.maxDrawdown },
  });

  function impliedYes(m: NormalizedMarket): number {
    return m.prices.yes ?? m.prices[m.outcomes[0] ?? ""] ?? 0.5;
  }

  /** ALPHA placeholder: not a calibrated probability model. */
  function estimateProbability(m: NormalizedMarket): ProbabilityEstimate {
    const implied = impliedYes(m);
    const whale = m.lastTrades.some((t) => t.whale);
    const volAdj = Math.min(0.06, Math.log10(Math.max(m.volume, 10)) * 0.008);
    let modelP = implied + (whale ? -0.03 : 0.02) + (m.venue === "kalshi" ? 0.01 : 0);
    modelP = Math.min(0.92, Math.max(0.08, modelP + volAdj * (implied < 0.5 ? 1 : -1)));
    const numeric = 0.35 + Math.min(0.4, (m.liquidity ?? 0) / 200_000);
    const confidence = classifyConfidence(numeric);
    return ProbabilityEstimateSchema.parse({
      marketId: m.marketId,
      impliedProbability: implied,
      modelProbability: modelP,
      confidence,
      confidenceScore: numeric,
      modelId: MODEL_PROB,
      note: "ALPHA placeholder base-rate — historical/macro/on-chain inputs are stubs, not calibrated science.",
    });
  }

  function computeEdge(m: NormalizedMarket, p: ProbabilityEstimate): EdgeResult {
    const edgeScore = p.modelProbability - p.impliedProbability;
    return EdgeResultSchema.parse({
      marketId: m.marketId,
      edgeScore,
      edgeClass: classifyEdge(Math.abs(edgeScore)),
      mispricingFlag: Math.abs(edgeScore) >= 0.1,
      whaleFlag: m.lastTrades.some((t) => t.whale),
      impliedProbability: p.impliedProbability,
      modelProbability: p.modelProbability,
    });
  }

  function computeDilRisk(
    m: NormalizedMarket,
    p: ProbabilityEstimate,
    h: Horizon
  ): DilRiskResult {
    const eq = equity(bankroll, positions);
    const kelly = kellyFraction(p.modelProbability, p.impliedProbability, limits.kellyCap);
    const size = Math.min(
      limits.maxPositionSize,
      eq * kelly.capped * horizonRiskMultiplier(h)
    );
    const dd = session.maxDrawdown;
    const noNewRisk = dd >= 0.08 || dailyLoss() >= limits.maxDailyLoss;
    const vol = volatilityScore(
      Object.values(m.prices).concat(m.lastTrades.map((t) => t.price))
    );
    const riskScore = Math.min(
      1,
      0.25 + vol * 0.4 + dd * 2 + (noNewRisk ? 0.3 : 0) + (h === "5m" ? 0.1 : 0)
    );
    const reason = noNewRisk
      ? "Drawdown or daily-loss guard: no new risk. Proposal only."
      : `Kelly capped at ${kelly.capped.toFixed(3)}; horizon ${h}; ALPHA sizing, not an order.`;
    return DilRiskResultSchema.parse({
      marketId: m.marketId,
      horizon: h,
      riskScore,
      recommendedSize: noNewRisk || size < 0 ? 0 : Number(size.toFixed(2)),
      kellyRaw: kelly.raw,
      kellyCapped: kelly.capped,
      noNewRisk,
      reason,
    });
  }

  function dailyLoss(): number {
    const u = positions.reduce((s, p) => s + unrealizedPnl(p), 0);
    const r = realizedPnl(trades);
    return Math.max(0, -(r + u));
  }

  function guardrailStatus(): GuardrailStatus {
    const exp = exposureByInstrument(positions);
    const eq = Math.max(1, equity(bankroll, positions));
    const concentration =
      Object.keys(exp).length > 0
        ? Math.max(0, ...Object.values(exp).map((x) => x / eq))
        : 0;
    const maxPos = Math.max(0, ...Object.values(exp), 0);
    const breaches: string[] = [];
    if (dailyLoss() >= limits.maxDailyLoss) breaches.push("max_daily_loss");
    if (maxPos >= limits.maxPositionSize) breaches.push("max_position_size");
    if (concentration >= limits.maxConcentration) breaches.push("max_concentration");
    if (session.maxDrawdown >= 0.08) breaches.push("drawdown_guard");
    const recommendation =
      breaches.length > 0
        ? "auto_stop_no_new_risk — human must confirm; agent cannot trade"
        : "within_limits";
    const key = breaches.join(",");
    if (breaches.length && key !== lastBreachKey) {
      lastBreachKey = key;
      sessionRiskEvents += 1;
      log("risk_event", {
        user: "system",
        decision: "avoid",
        reason: `guardrail: ${key}`,
        risk: { breaches, recommendation },
      });
      log("rule", {
        user: "system",
        reason: `risk rule fired: ${key}`,
        risk: { limits, breaches },
      });
    }
    return GuardrailStatusSchema.parse({
      limits,
      dailyLoss: dailyLoss(),
      maxPositionNotional: maxPos,
      concentration,
      breaches,
      recommendation,
      autoTrade: false,
      label: ALPHA_LABEL,
    });
  }

  function explain(
    d: ReturnType<typeof decide>,
    e: EdgeResult,
    r: DilRiskResult,
    p: ProbabilityEstimate
  ): { text: string; factors: DecisionResult["factors"] } {
    const factors = {
      edgeScore: e.edgeScore,
      riskScore: r.riskScore,
      confidence: p.confidence,
      whaleFlag: e.whaleFlag,
      mispricingFlag: e.mispricingFlag,
      noNewRisk: r.noNewRisk,
    };
    const text = [
      `Decision ${d} is a proposal only (no auto-trade).`,
      `Edge ${e.edgeScore.toFixed(3)} (${e.edgeClass}); implied ${p.impliedProbability.toFixed(3)} vs model ${p.modelProbability.toFixed(3)} (${MODEL_EDGE}).`,
      `Confidence ${p.confidence} (${p.confidenceScore.toFixed(2)}). Risk ${r.riskScore.toFixed(2)}; recommended size ${r.recommendedSize} (Kelly cap ${r.kellyCapped.toFixed(3)}, model ${MODEL_RISK}).`,
      e.mispricingFlag ? "Mispricing flag on." : "No extreme mispricing flag.",
      e.whaleFlag ? "Whale print in last trades — size down / wait unless edge is large." : "No whale flag.",
      r.noNewRisk
        ? "Drawdown/daily-loss guard: no new risk."
        : "Guardrails allow new risk subject to human confirm.",
      "ALPHA_NON_PRODUCTION: not a 90% win-rate system; human remains the decision maker.",
    ].join(" ");
    return { text, factors };
  }

  function decideMarket(
    marketId: string,
    horizon: Horizon = "24h",
    persist = true
  ): DecisionResult {
    const m = markets.find((x) => x.marketId === marketId);
    if (!m) throw new Error(`unknown_market:${marketId}`);
    const h = HorizonSchema.parse(horizon);
    const p = estimateProbability(m);
    const e = computeEdge(m, p);
    const r = computeDilRisk(m, p, h);
    const decision = decide({
      edgeScore: e.edgeScore,
      riskScore: r.riskScore,
      confidence: p.confidence,
      whaleFlag: e.whaleFlag,
      mispricingFlag: e.mispricingFlag,
      noNewRisk: r.noNewRisk,
    });
    const { text, factors } = explain(decision, e, r, p);
    const result = DecisionResultSchema.parse({
      decisionId: randomUUID(),
      marketId,
      horizon: h,
      decision,
      explanation: text,
      factors,
      autoTrade: false,
      label: ALPHA_LABEL,
    });
    if (persist) {
      log("decision", {
        user: "analyst",
        decision,
        reason: text,
        risk: { ...factors, horizon: h },
        marketId,
        scores: {
          edgeScore: e.edgeScore,
          riskScore: r.riskScore,
          confidenceScore: p.confidenceScore,
          probabilityEstimate: p.modelProbability,
        },
      });
      const sc = previewScenario(marketId, h);
      track.unshift(
        TrackRecordEntrySchema.parse({
          id: randomUUID(),
          at: NOW(),
          marketId,
          horizon: h,
          decision,
          modelProbability: p.modelProbability,
          impliedProbability: p.impliedProbability,
          edgeScore: e.edgeScore,
          riskScore: r.riskScore,
          noNewRisk: r.noNewRisk,
          recommendedSize: r.recommendedSize,
          scenarioBase: sc.baseDecision,
          scenarioStressed: sc.stressedDecision,
          outcome: null,
          hypotheticalPnl: null,
          source: "decision",
          feed: "simulated_alpha",
          label: ALPHA_LABEL,
        })
      );
    }
    return result;
  }

  function previewScenario(marketId: string, horizon: Horizon = "24h"): ScenarioResult {
    const m = markets.find((x) => x.marketId === marketId);
    if (!m) throw new Error(`unknown_market:${marketId}`);
    const h = HorizonSchema.parse(horizon);
    const compare: Horizon = h === "5m" ? "24h" : "72h";
    const base = decideMarket(marketId, h, false);
    const stressed = decideMarket(marketId, compare, false);
    const r = computeDilRisk(m, estimateProbability(m), h);
    return ScenarioResultSchema.parse({
      marketId,
      horizon: h,
      compareHorizon: compare,
      baseDecision: base.decision,
      stressedDecision: stressed.decision,
      noNewRisk: r.noNewRisk,
      recommendedSize: r.recommendedSize,
      riskScore: r.riskScore,
      note: "ALPHA scenario compose — not Monte Carlo. Switch horizons to re-score. Human decides. Not a trade.",
      autoTrade: false,
      label: ALPHA_LABEL,
    });
  }

  function propose(marketId: string, horizon: Horizon = "24h"): Proposal {
    const d = decideMarket(marketId, horizon);
    const prop = ProposalSchema.parse({
      proposalId: randomUUID(),
      marketId,
      action: decisionToProposalAction(d.decision),
      decision: d.decision,
      explanation: d.explanation,
      scores: {
        edgeScore: d.factors.edgeScore,
        riskScore: d.factors.riskScore,
        confidenceScore: d.factors.confidence === "high" ? 0.72 : d.factors.confidence === "medium" ? 0.52 : 0.28,
      },
      citations: [
        `model:${MODEL_PROB}`,
        `model:${MODEL_EDGE}`,
        `model:${MODEL_RISK}`,
        "governance:AGENT→PROPOSAL→HUMAN→DECISION",
      ],
      requiresHuman: true,
      autoExecute: false,
      uncertainty: {
        confidence: d.factors.confidence,
        confidenceScore:
          d.factors.confidence === "high" ? 0.72 : d.factors.confidence === "medium" ? 0.52 : 0.28,
        guessMode: true,
        note: "ALPHA placeholder — uncalibrated. Treat as guess, not a forecast.",
      },
      modelId: MODEL_EDGE,
      at: NOW(),
      label: ALPHA_LABEL,
    });
    proposals.unshift(prop);
    log("proposal", {
      user: "agent",
      decision: d.decision,
      reason: prop.explanation,
      risk: { proposalId: prop.proposalId, executable: false },
      marketId,
    });
    return prop;
  }

  function calibrationReport() {
    // Type predicate, not a bare filter: calibration is only defined over
    // resolved outcomes, and an unnarrowed null would silently skew Brier.
    const resolved = track.filter(
      (t): t is (typeof track)[number] & { outcome: 0 | 1 } => t.outcome === 0 || t.outcome === 1
    );
    const brier = meanBrier(resolved);
    const bins = reliabilityBins(resolved);
    const meanAbsEdge =
      resolved.length === 0
        ? null
        : resolved.reduce((s, t) => s + Math.abs(t.edgeScore), 0) / resolved.length;
    let hits = 0;
    for (const t of resolved) {
      const realized = t.outcome - t.impliedProbability;
      if (Math.abs(t.edgeScore) < 1e-9 || Math.abs(realized) < 1e-9) continue;
      if (Math.sign(t.edgeScore) === Math.sign(realized)) hits += 1;
    }
    const signedN = resolved.filter((t) => Math.abs(t.edgeScore) >= 1e-9 && Math.abs(t.outcome - t.impliedProbability) >= 1e-9).length;
    const noNew = resolved.filter((t) => t.noNewRisk);
    const noNewAvoidRate = noNew.length
      ? noNew.filter((t) => t.decision !== "enter").length / noNew.length
      : null;
    const ordered = [...resolved].sort((a, b) => a.at.localeCompare(b.at));
    let eq = 100_000;
    const series = [eq];
    let hypo = 0;
    for (const t of ordered) {
      const pnl = t.hypotheticalPnl || 0;
      hypo += pnl;
      eq += pnl;
      series.push(eq);
    }
    const status = simulatedCalibrationStatus(resolved.length);
    return CalibrationReportSchema.parse({
      status,
      liveCalibration: "UNKNOWN",
      probabilityCalibratedLive: false,
      simulated: {
        n: resolved.length,
        brier,
        meanAbsEdge,
        edgeSignHitRate: signedN ? hits / signedN : null,
        hypotheticalPnl: hypo,
        hypoMaxDrawdown: maxDrawdown(series),
        noNewRiskAvoidRate: noNewAvoidRate,
        bins,
        adequate: status === "ADEQUATE_ALPHA",
      },
      decisionsLogged: track.filter((t) => t.source === "decision" || t.source === "seeded_alpha").length,
      scenariosLogged: track.filter((t) => t.scenarioBase != null).length,
      note: "Simulated closed-loop only. Live probability calibration is UNKNOWN. Not READY. Hypothetical PnL is not a live book.",
      autoTrade: false,
      productionEligible: false,
      winRateClaim: null,
      label: ALPHA_LABEL,
    });
  }

  function resolveSimulated(marketId: string, outcome: 0 | 1): TrackRecordEntry {
    const pending = track.find((t) => t.marketId === marketId && t.outcome == null);
    if (!pending) throw new Error(`unknown_pending:${marketId}`);
    pending.outcome = outcome;
    pending.hypotheticalPnl =
      pending.decision === "enter"
        ? hypotheticalContractPnl(pending.recommendedSize, pending.impliedProbability, outcome)
        : 0;
    return pending;
  }

  function reports(): Report[] {
    const eq = equity(bankroll, positions);
    const u = positions.reduce((s, p) => s + unrealizedPnl(p), 0);
    const r = realizedPnl(trades);
    const g = guardrailStatus();
    const edges = markets.map((m) => {
      const p = estimateProbability(m);
      return Math.abs(p.modelProbability - p.impliedProbability);
    });
    const meanAbs = edges.reduce((s, x) => s + x, 0) / Math.max(1, edges.length);
    const edgeStab = 1 - Math.min(1, meanAbs);
    const stamp = NOW();
    return [
      ReportSchema.parse({
        kind: "pnl",
        period: "daily",
        generatedAt: stamp,
        payload: {
          realized: r,
          unrealized: u,
          equity: eq,
          sessionPnl: session.pnl,
          weekly: {
            status: "UNKNOWN",
            reason: "session_only_alpha",
            note: "No independent weekly ledger. Session numbers are not weekly evidence.",
          },
          monthly: {
            status: "UNKNOWN",
            reason: "session_only_alpha",
            note: "No independent monthly ledger. Session numbers are not monthly evidence.",
          },
        },
        label: ALPHA_LABEL,
      }),
      ReportSchema.parse({
        kind: "volatility",
        period: "daily",
        generatedAt: stamp,
        payload: {
          sessionVolatility: session.volatility,
          drawdown: session.maxDrawdown,
          weekly: {
            status: "UNKNOWN",
            reason: "session_only_alpha",
            note: "No independent weekly volatility series.",
          },
          monthly: {
            status: "UNKNOWN",
            reason: "session_only_alpha",
            note: "No independent monthly volatility series.",
          },
        },
        label: ALPHA_LABEL,
      }),
      ReportSchema.parse({
        kind: "risk_exposure",
        period: "daily",
        generatedAt: stamp,
        payload: {
          byInstrument: exposureByInstrument(positions),
          bucket,
          guardrail: g,
          weekly: {
            status: "UNKNOWN",
            reason: "session_only_alpha",
            note: "No independent weekly exposure ledger.",
          },
          monthly: {
            status: "UNKNOWN",
            reason: "session_only_alpha",
            note: "No independent monthly exposure ledger.",
          },
        },
        label: ALPHA_LABEL,
      }),
      ReportSchema.parse({
        kind: "edge_stability",
        period: "daily",
        generatedAt: stamp,
        payload: {
          meanAbsEdge: meanAbs,
          stabilityScore: edgeStab,
          note: "ALPHA placeholder — not a proven track record",
          weekly: {
            status: "UNKNOWN",
            reason: "session_only_alpha",
            note: "No independent weekly edge series.",
          },
          monthly: {
            status: "UNKNOWN",
            reason: "session_only_alpha",
            note: "No independent monthly edge series.",
          },
        },
        label: ALPHA_LABEL,
      }),
    ];
  }

  function snapshot() {
    const g = guardrailStatus();
    const sessionPnl = realizedPnl(trades) + positions.reduce((s, p) => s + unrealizedPnl(p), 0);
    return {
      label: ALPHA_LABEL,
      autoTrade: false as const,
      bankroll: { ...bankroll, totalEquity: equity(bankroll, positions) },
      bucket,
      instruments,
      positions: positions.map((p) => ({ ...p, pnlUnrealized: unrealizedPnl(p) })),
      trades,
      session: { ...session, pnl: sessionPnl },
      sessionRiskEvents,
      markets: markets.map((m) => ({ ...m })),
      signals: signals.slice(),
      guardrail: g,
      ledgerMode: "in-memory" as const,
      durable: false as const,
    };
  }

  function upsertUnverifiedMarkets(incoming: NormalizedMarket[]) {
    const added: string[] = [];
    for (const lm of incoming.slice(0, 6)) {
      const i = markets.findIndex((x) => x.marketId === lm.marketId);
      if (i >= 0) markets[i] = lm;
      else {
        markets.unshift(lm);
        added.push(lm.marketId);
      }
      if (!instruments.some((inst) => inst.symbol === lm.marketId)) {
        instruments.unshift(...seedInstruments([lm]));
      }
    }
    return { added, instrumentCount: instruments.length, marketCount: markets.length };
  }

  function composeWorkspaceRows(horizon: Horizon = "24h") {
    const h = HorizonSchema.parse(horizon);
    return markets.map((m) => {
      try {
        const probability = estimateProbability(m);
        const edge = computeEdge(m, probability);
        const risk = computeDilRisk(m, probability, h);
        const scenario = previewScenario(m.marketId, h);
        return { market: { ...m }, probability, edge, risk, scenario, rowStatus: "ok" as const };
      } catch (err) {
        return {
          market: { ...m },
          probability: null,
          edge: null,
          risk: null,
          scenario: { autoTrade: false as const, status: "UNKNOWN", label: ALPHA_LABEL },
          rowStatus: "UNKNOWN" as const,
          rowError: err instanceof Error ? err.message : String(err),
        };
      }
    });
  }

  function reviewProposal(proposalId: string, decision: "accept" | "reject", note?: string) {
    const p = proposals.find((x) => x.proposalId === proposalId);
    if (!p) throw new Error(`unknown_proposal:${proposalId}`);
    if (p.humanReview) throw new Error(`already_reviewed:${proposalId}`);
    const humanReview = {
      decision,
      note: note?.slice(0, 400) || undefined,
      at: NOW(),
      autoTrade: false as const,
      executed: false as const,
    };
    const next = ProposalSchema.parse({ ...p, humanReview });
    const idx = proposals.findIndex((x) => x.proposalId === proposalId);
    proposals[idx] = next;
    log("decision", {
      user: "analyst",
      decision: decision === "accept" ? next.decision : "avoid",
      reason: `human_review:${decision} — audit only, not a trade. ${note || ""}`.trim(),
      risk: {
        proposalId,
        humanReview: decision,
        autoExecute: false,
        executed: false,
        autoTrade: false,
      },
      marketId: next.marketId,
    });
    return { proposal: next, autoTrade: false as const, executed: false as const, label: ALPHA_LABEL };
  }

  function currentFeedStatus() {
    const matched = markets.filter((m) => instruments.some((i) => i.symbol === m.marketId)).length;
    const status = {
      ...feed,
      venues: { ...feed.venues },
      bookIntegrity: {
        markets: markets.length,
        instruments: instruments.length,
        matched,
        orphanMarkets: markets.length - matched,
        ledgerMode: "in-memory" as const,
        durable: false as const,
        autoTrade: false as const,
      },
    };
    return {
      ...status,
      registry: buildFeedRegistry({ liveAdapter: status.liveAdapter, actual: status.actual }),
    };
  }

  const engineSuite = createEngineSuite({
    instrumentById: (id) => {
      const i = instruments.find((x) => x.id === id);
      return i ? { id: i.id, symbol: i.symbol, title: i.title ?? i.symbol } : null;
    },
    probability: (marketId) => {
      const m = markets.find((x) => x.marketId === marketId);
      return m ? estimateProbability(m) : null;
    },
    dilRisk: (marketId, h) => {
      const m = markets.find((x) => x.marketId === marketId);
      return m ? computeDilRisk(m, estimateProbability(m), h) : null;
    },
    guardrail: () => {
      const g = guardrailStatus();
      return {
        limits: { maxDailyLoss: g.limits.maxDailyLoss, maxPositionSize: g.limits.maxPositionSize },
        dailyLoss: g.dailyLoss,
        maxPositionNotional: g.maxPositionNotional,
      };
    },
    bucket: () => ({ maxExposure: bucket.maxExposure, maxLeverage: bucket.maxLeverage }),
    exposure: () => guardrailStatus().maxPositionNotional,
    leverage: () => bankroll.margin / Math.max(1, equity(bankroll, positions)),
    drawdown: () => session.maxDrawdown,
    signals: (marketId) =>
      signals
        .filter((s) => s.marketId === marketId)
        .map((s) => ({ kind: s.kind, text: s.text, weight: s.weight, sourceStatus: s.sourceStatus })),
  });

  const ledgerDao = createEclLedgerDao({ client: null, livePostgres: false });
  let connectReason = "NOT_CONFIGURED";
  let poolAttempts = 0;
  let lastError: string | null = null;
  void tryCreatePostgresClientFromEnv().then((pg) => {
    connectReason = pg.reason;
    poolAttempts = pg.attempts;
    lastError = pg.lastError;
    if (pg.client) ledgerDao.attach(pg.client, pg.livePostgres);
  });

  const buildSuiteV2 = createBuildSuiteV2({
    cockpitComputeV1: (input) => engineSuite.cockpitCompute(input),
    dao: ledgerDao,
  });

  return {
    label: ALPHA_LABEL,
    models: { probability: MODEL_PROB, edge: MODEL_EDGE, risk: MODEL_RISK },
    snapshot,
    markets: () => markets.map((m) => ({ ...m })),
    market: (id: string) => markets.find((m) => m.marketId === id) ?? null,
    probability: (id: string) => {
      const m = markets.find((x) => x.marketId === id);
      return m ? estimateProbability(m) : null;
    },
    edge: (id: string) => {
      const m = markets.find((x) => x.marketId === id);
      if (!m) return null;
      return computeEdge(m, estimateProbability(m));
    },
    dilRisk: (id: string, h: Horizon = "24h") => {
      const m = markets.find((x) => x.marketId === id);
      if (!m) return null;
      return computeDilRisk(m, estimateProbability(m), HorizonSchema.parse(h));
    },
    decide: decideMarket,
    previewDecision: (id: string, h: Horizon = "24h") => decideMarket(id, h, false),
    previewScenario,
    composeWorkspaceRows,
    propose,
    reviewProposal,
    trackRecord: () => track.slice(),
    calibration: calibrationReport,
    resolveSimulated,
    proposals: () => proposals.slice(),
    proposal: (id: string) => proposals.find((p) => p.proposalId === id) ?? null,
    audit: () => audit.slice(),
    auditByKind: (kind: AuditEvent["kind"]) => audit.filter((e) => e.kind === kind),
    reports,
    report: (kind: Report["kind"]) => reports().find((r) => r.kind === kind) ?? null,
    guardrail: guardrailStatus,
    evaluateAuditLimit: (input: AuditLimitInput) => {
      const instrumentKnown = instruments.some((i) => i.id === input.instrumentId);
      const result = scoreAuditLimit(input, {
        maxPositionSize: limits.maxPositionSize,
        instrumentKnown,
      });
      log("rule", {
        user: input.userId,
        decision: result.allowed ? "wait" : "avoid",
        reason: "audit+limit analog eval",
        risk: {
          allowed: result.allowed,
          engine: result.engine,
          verdicts: result.verdicts,
          freeze: false,
          hold: false,
          block: false,
        },
      });
      return result;
    },
    engineSuite,
    buildSuiteV2,
    ledgerDao,
    clientSuite: () => buildClientSuiteInventory(),
    durableInfra: () => buildDurableInfra(ledgerDao, { connectReason, poolAttempts, lastError }),
    setLimits: (next: Partial<GuardrailLimits>) => {
      limits = GuardrailLimitsSchema.parse({ ...limits, ...next });
      lastBreachKey = "";
      return guardrailStatus();
    },
    addSignal: (partial: Omit<Signal, "signalId" | "at"> & { signalId?: string; at?: string }) => {
      const s = SignalSchema.parse({
        ...partial,
        signalId: partial.signalId ?? randomUUID(),
        at: partial.at ?? NOW(),
      });
      signals.unshift(s);
      return s;
    },
    signals: () => signals.slice(),
    feedStatus: currentFeedStatus,
    upsertUnverifiedMarkets,
    applyLiveFeeds: async () => {
      if (requestedFeedMode() !== "live_unverified") {
        feed = defaultFeedStatus();
        return currentFeedStatus();
      }
      const pulled = await pullLiveUnverifiedMarkets();
      feed = pulled.status;
      upsertUnverifiedMarkets(pulled.markets);
      return currentFeedStatus();
    },
    refreshSnapshots: () => {
      const ts = NOW();
      for (const m of markets) m.asOf = ts;
      return markets.map((m) => ({ ...m }));
    },
    realisticSimulation: () => {
      const cal = calibrationReport();
      return buildRealisticSimulation({
        rows: composeWorkspaceRows("24h"),
        audit: audit.slice(0, 24),
        guardrail: guardrailStatus(),
        session: snapshot().session,
        calibration: { liveStatus: cal.liveCalibration, simulatedAdequacy: cal.status },
        feedIds: SCI_FEED_IDS,
      });
    },
    roleProfessional: () => ({
      ...buildRoleProfessionalInventory(),
      moduleExpansion: buildProfessionModuleExpansion(),
      osBlueprints: buildOsBlueprintIntegration(),
      digitalActivation: buildDigitalActivationWave(),
      precisionUpgrade: buildPrecisionUpgradeWave(),
      cyberBridge: buildCyberResearchBridgeWave(),
      activationReview: buildActivationReviewWave(),
      enterprisePrep: buildEnterprisePrepWave(),
      automationPrep: buildAutomationPrepWave(),
      visibilityPrep: buildVisibilityPrepWave(),
      visibilityActivation: buildVisibilityActivationWave(),
      visibilityDeep: buildVisibilityDeepWave(),
      explainabilityPrep: buildExplainabilityPrepWave(),
      explainVisibility: buildExplainabilityAndVisibilityWave(),
      digitalWorkspaceCompute: buildDigitalAndWorkspaceAndComputeWave(),
      activationPass: buildActivationPassWave(),
    }),
    professionModules: (professionId?: string, payload?: Record<string, unknown>) =>
      professionId
        ? applyProfessionModules(professionId, payload)
        : buildProfessionModuleExpansion(),
    osBlueprints: (blueprintId?: string, payload?: Record<string, unknown>) =>
      blueprintId ? applyOsBlueprint(blueprintId, payload) : buildOsBlueprintIntegration(),
    digitalActivation: () => buildDigitalActivationWave(),
    precisionUpgrade: () => buildPrecisionUpgradeWave(),
    cyberBridge: () => buildCyberResearchBridgeWave(),
    activationReview: () => buildActivationReviewWave(),
    enterprisePrep: () => buildEnterprisePrepWave(),
    automationPrep: () => buildAutomationPrepWave(),
    visibilityPrep: () => buildVisibilityPrepWave(),
    visibilityActivation: () => buildVisibilityActivationWave(),
    visibilityDeep: () => buildVisibilityDeepWave(),
    explainabilityPrep: () => buildExplainabilityPrepWave(),
    explainVisibility: () => buildExplainabilityAndVisibilityWave(),
    digitalWorkspaceCompute: () => buildDigitalAndWorkspaceAndComputeWave(),
    activationPass: () => buildActivationPassWave(),
    phaseCore: () => buildPhaseCoreWave(),
    phaseCoreBlueprints: () => buildCopilotBlueprintWave(),
    auditEngineCore: () => buildAuditEngineCoreWave(),
    limitEngineCore: () => buildLimitEngineCoreWave(),
    ledgerCore: () => buildLedgerCoreWave(),
    domainFabric: () => buildDomainFabricWave(),
    kgFabric: () => buildKgFabricWave(),
    scenarioFabric: () => buildScenarioFabricWave(),
    causalFabric: () => buildCausalFabricWave(),
    governanceFabric: () => buildGovernanceFabricWave(),
    infraFabric: () => buildInfraFabricWave(),
    securityFabric: () => buildSecurityFabricWave(),
    osFabric: () => buildOsFabricWave(),
    cursorRunbook: () => buildCursorRunbookWave(),
  };
}
