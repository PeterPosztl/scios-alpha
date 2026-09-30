/**
 * ECL / DIL Zod contracts — ALPHA_NON_PRODUCTION.
 * Additive to data-fabric InstrumentSchema (does not rewrite it).
 * No auto-trade. No READY claim. No 90% win-rate.
 */
import { z } from "zod";

export const LABEL = "ALPHA_NON_PRODUCTION" as const;
export const ALPHA_LABEL = LABEL;
export const EXECUTION_MODE = "SIMULATION_ONLY" as const;

export const InstrumentTypeSchema = z.enum([
  "equity",
  "fx",
  "crypto",
  "prediction_market",
  "event_contract",
]);

export const EclInstrumentSchema = z.object({
  id: z.string().min(1),
  type: InstrumentTypeSchema,
  market: z.enum(["polymarket", "kalshi", "internal_sim"]),
  symbol: z.string().min(1),
  currency: z.string().min(1).default("USD"),
  title: z.string().optional(),
});
export type EclInstrument = z.infer<typeof EclInstrumentSchema>;

export const PositionSchema = z.object({
  positionId: z.string(),
  instrumentId: z.string(),
  size: z.number(),
  direction: z.enum(["long", "short"]),
  entryPrice: z.number(),
  currentPrice: z.number(),
  pnlUnrealized: z.number().optional(),
});
export type Position = z.infer<typeof PositionSchema>;

export const TradeSchema = z.object({
  tradeId: z.string(),
  instrumentId: z.string(),
  time: z.string(),
  side: z.enum(["buy", "sell"]),
  size: z.number(),
  price: z.number(),
  fee: z.number().default(0),
  venue: z.string(),
  simulated: z.literal(true).default(true),
});
export type Trade = z.infer<typeof TradeSchema>;

export const BankrollSchema = z.object({
  totalEquity: z.number(),
  cash: z.number(),
  margin: z.number(),
  reserved: z.number(),
  currency: z.string().default("USD"),
});
export type Bankroll = z.infer<typeof BankrollSchema>;

export const RiskBucketSchema = z.object({
  bucketId: z.string(),
  name: z.string(),
  maxLoss: z.number(),
  maxExposure: z.number(),
  maxLeverage: z.number(),
});
export type RiskBucket = z.infer<typeof RiskBucketSchema>;

export const TradingSessionSchema = z.object({
  sessionId: z.string(),
  start: z.string(),
  end: z.string().nullable(),
  pnl: z.number(),
  maxDrawdown: z.number(),
  volatility: z.number(),
});
export type TradingSession = z.infer<typeof TradingSessionSchema>;

export const GuardrailLimitsSchema = z.object({
  maxDailyLoss: z.number().positive(),
  maxPositionSize: z.number().positive(),
  maxConcentration: z.number().gt(0).lte(1),
  kellyCap: z.number().gt(0).lte(1).default(0.25),
});
export type GuardrailLimits = z.infer<typeof GuardrailLimitsSchema>;

export const DecisionTypeSchema = z.enum(["enter", "trim", "exit", "avoid", "wait"]);
export type DecisionType = z.infer<typeof DecisionTypeSchema>;

export const HorizonSchema = z.enum(["5m", "24h", "72h"]);
export type Horizon = z.infer<typeof HorizonSchema>;

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const EdgeClassSchema = z.enum(["small", "medium", "large"]);
export type EdgeClass = z.infer<typeof EdgeClassSchema>;

export const NormalizedMarketSchema = z.object({
  marketId: z.string(),
  venue: z.enum(["polymarket", "kalshi"]),
  title: z.string(),
  outcomes: z.array(z.string()),
  prices: z.record(z.number()),
  volume: z.number(),
  liquidity: z.number().optional(),
  openInterest: z.number().optional(),
  lastTrades: z.array(
    z.object({
      time: z.string(),
      size: z.number(),
      price: z.number(),
      whale: z.boolean().optional(),
    })
  ),
  asOf: z.string(),
  feed: z.enum(["simulated_alpha", "live_unverified"]),
});
export type NormalizedMarket = z.infer<typeof NormalizedMarketSchema>;

export const ProbabilityEstimateSchema = z.object({
  marketId: z.string(),
  impliedProbability: z.number().min(0).max(1),
  modelProbability: z.number().min(0).max(1),
  confidenceScore: z.number().min(0).max(1),
  confidence: ConfidenceSchema,
  modelId: z.string(),
  note: z.string(),
});
export type ProbabilityEstimate = z.infer<typeof ProbabilityEstimateSchema>;

export const EdgeResultSchema = z.object({
  marketId: z.string(),
  edgeScore: z.number(),
  edgeClass: EdgeClassSchema,
  mispricingFlag: z.boolean(),
  whaleFlag: z.boolean(),
  impliedProbability: z.number(),
  modelProbability: z.number(),
});
export type EdgeResult = z.infer<typeof EdgeResultSchema>;

export const DilRiskResultSchema = z.object({
  marketId: z.string(),
  horizon: HorizonSchema,
  riskScore: z.number().min(0).max(1),
  recommendedSize: z.number().min(0),
  kellyRaw: z.number(),
  kellyCapped: z.number(),
  noNewRisk: z.boolean(),
  reason: z.string(),
});
export type DilRiskResult = z.infer<typeof DilRiskResultSchema>;

/** Horizon compare — not Monte Carlo. GET/preview must not persist audit. */
export const ScenarioResultSchema = z.object({
  marketId: z.string(),
  horizon: HorizonSchema,
  compareHorizon: HorizonSchema,
  baseDecision: DecisionTypeSchema,
  stressedDecision: DecisionTypeSchema,
  noNewRisk: z.boolean(),
  recommendedSize: z.number().min(0),
  riskScore: z.number().min(0).max(1),
  note: z.string(),
  autoTrade: z.literal(false),
  label: z.literal(LABEL),
});
export type ScenarioResult = z.infer<typeof ScenarioResultSchema>;

export const DecisionResultSchema = z.object({
  decisionId: z.string(),
  marketId: z.string(),
  horizon: HorizonSchema,
  decision: DecisionTypeSchema,
  explanation: z.string(),
  factors: z.object({
    edgeScore: z.number(),
    riskScore: z.number(),
    confidence: ConfidenceSchema,
    whaleFlag: z.boolean(),
    mispricingFlag: z.boolean(),
    noNewRisk: z.boolean(),
  }),
  autoTrade: z.literal(false),
  label: z.literal(LABEL),
});
export type DecisionResult = z.infer<typeof DecisionResultSchema>;

export const ProposalSchema = z.object({
  proposalId: z.string(),
  marketId: z.string(),
  action: z.enum(["enter_small", "wait", "avoid", "exit_partial", "trim"]),
  decision: DecisionTypeSchema,
  explanation: z.string(),
  scores: z.record(z.number()),
  citations: z.array(z.string()),
  requiresHuman: z.literal(true),
  autoExecute: z.literal(false),
  uncertainty: z.object({
    confidence: ConfidenceSchema,
    confidenceScore: z.number().min(0).max(1),
    guessMode: z.literal(true),
    note: z.string(),
  }),
  modelId: z.string(),
  at: z.string(),
  label: z.literal(LABEL),
  humanReview: z
    .object({
      decision: z.enum(["accept", "reject"]),
      note: z.string().optional(),
      at: z.string(),
      autoTrade: z.literal(false),
      executed: z.literal(false),
    })
    .optional(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const AuditDecisionSchema = z.object({
  id: z.string(),
  time: z.string(),
  user: z.string(),
  marketId: z.string().optional(),
  decision: DecisionTypeSchema,
  reason: z.string(),
  risk: z.record(z.unknown()),
  scores: z.record(z.number()).optional(),
});
export type AuditDecision = z.infer<typeof AuditDecisionSchema>;

export const SignalSchema = z.object({
  signalId: z.string(),
  kind: z.enum(["news", "social", "onchain", "macro", "manual"]),
  marketId: z.string().optional(),
  text: z.string(),
  weight: z.number().min(0).max(1).default(0.2),
  at: z.string(),
  sourceStatus: z.enum(["STUB", "MANUAL", "UNVERIFIED"]),
});
export type Signal = z.infer<typeof SignalSchema>;

export const GuardrailStatusSchema = z.object({
  limits: GuardrailLimitsSchema,
  dailyLoss: z.number(),
  maxPositionNotional: z.number(),
  concentration: z.number(),
  breaches: z.array(z.string()),
  recommendation: z.string(),
  autoTrade: z.literal(false),
  label: z.literal(LABEL),
});
export type GuardrailStatus = z.infer<typeof GuardrailStatusSchema>;

export const ReportKindSchema = z.enum(["pnl", "volatility", "risk_exposure", "edge_stability"]);
export const ReportSchema = z.object({
  kind: ReportKindSchema,
  period: z.enum(["daily", "weekly", "monthly"]),
  generatedAt: z.string(),
  payload: z.record(z.unknown()),
  label: z.literal(LABEL),
});
export type Report = z.infer<typeof ReportSchema>;

export const AuditEventSchema = z.object({
  id: z.string(),
  time: z.string(),
  kind: z.enum(["decision", "rule", "session", "risk_event", "proposal"]),
  user: z.string(),
  marketId: z.string().optional(),
  decision: DecisionTypeSchema.optional(),
  reason: z.string(),
  risk: z.record(z.unknown()),
  scores: z.record(z.number()).optional(),
  label: z.literal(LABEL),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const TrackRecordEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  marketId: z.string(),
  horizon: HorizonSchema,
  decision: DecisionTypeSchema,
  modelProbability: z.number().min(0).max(1),
  impliedProbability: z.number().min(0).max(1),
  edgeScore: z.number(),
  riskScore: z.number(),
  noNewRisk: z.boolean(),
  recommendedSize: z.number(),
  scenarioBase: DecisionTypeSchema.optional(),
  scenarioStressed: DecisionTypeSchema.optional(),
  outcome: z.union([z.literal(0), z.literal(1)]).nullable(),
  hypotheticalPnl: z.number().nullable(),
  source: z.enum(["seeded_alpha", "decision", "proposal", "resolve"]),
  feed: z.literal("simulated_alpha"),
  label: z.literal(LABEL),
});
export type TrackRecordEntry = z.infer<typeof TrackRecordEntrySchema>;

export const CalibrationReportSchema = z.object({
  status: z.enum(["ADEQUATE_ALPHA", "INSUFFICIENT_N", "UNKNOWN"]),
  liveCalibration: z.literal("UNKNOWN"),
  probabilityCalibratedLive: z.literal(false),
  simulated: z.object({
    n: z.number().int().nonnegative(),
    brier: z.number().nullable(),
    meanAbsEdge: z.number().nullable(),
    edgeSignHitRate: z.number().nullable(),
    hypotheticalPnl: z.number(),
    hypoMaxDrawdown: z.number(),
    noNewRiskAvoidRate: z.number().nullable(),
    bins: z.array(
      z.object({
        bin: z.number(),
        lo: z.number(),
        hi: z.number(),
        n: z.number(),
        meanP: z.number(),
        meanY: z.number(),
      })
    ),
    adequate: z.boolean(),
  }),
  decisionsLogged: z.number().int().nonnegative(),
  scenariosLogged: z.number().int().nonnegative(),
  note: z.string(),
  autoTrade: z.literal(false),
  productionEligible: z.literal(false),
  winRateClaim: z.null(),
  label: z.literal(LABEL),
});
export type CalibrationReport = z.infer<typeof CalibrationReportSchema>;

export const ProbabilityResultSchema = ProbabilityEstimateSchema;
export type ProbabilityResult = ProbabilityEstimate;
export const DilRiskSchema = DilRiskResultSchema;
export type DilRisk = DilRiskResult;
