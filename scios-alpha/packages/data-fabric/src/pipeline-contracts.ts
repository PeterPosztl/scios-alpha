/**
 * Vertical-slice contracts — additive public schemas.
 * ALPHA / NON-PRODUCTION. Do not claim enterprise calibration.
 */
import { z } from "zod";

export const VERTICAL_SLICE_STAGES = [
  "raw_event",
  "normalized_event",
  "pit_feature",
  "baseline_prediction",
  "calibration_uncertainty",
  "independent_risk_gate",
  "governance_decision",
  "deterministic_execution",
  "outcome",
  "immutable_lineage",
  "cockpit_view",
] as const;

export type VerticalSliceStage = (typeof VERTICAL_SLICE_STAGES)[number];

export const RawEventSchema = z.object({
  eventId: z.string().optional(),
  source: z.string().min(1),
  instrumentId: z.string().min(1),
  eventTime: z.string(),
  payload: z.record(z.unknown()).default({}),
  tenantId: z.string().default("default"),
});
export type RawEvent = z.infer<typeof RawEventSchema>;

export const NormalizedEventSchema = z.object({
  eventId: z.string(),
  source: z.string(),
  instrumentId: z.string(),
  eventTime: z.string(),
  ingestionTime: z.string(),
  validFrom: z.string(),
  revisionId: z.string(),
  tenantId: z.string(),
  payload: z.record(z.unknown()),
  schemaId: z.literal("event/normalized/v1"),
});
export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;

export const PitFeatureVectorSchema = z.object({
  featureSetId: z.string(),
  instrumentId: z.string(),
  asOf: z.string(),
  pointInTime: z.literal(true),
  values: z.object({
    priceNorm: z.number(),
    vol: z.number(),
    momentum: z.number(),
  }),
  featureVersion: z.string(),
});
export type PitFeatureVector = z.infer<typeof PitFeatureVectorSchema>;

/**
 * Canonical prediction envelope (protected contract).
 * Example shape is normative for prediction outputs.
 */
export const PredictionEnvelopeSchema = z.object({
  predictionId: z.string(),
  model: z.object({
    id: z.string(),
    version: z.string(),
  }),
  pointEstimate: z.number().min(0).max(1),
  distribution: z.object({
    positive: z.number().min(0).max(1),
    negative: z.number().min(0).max(1),
  }),
  predictionInterval: z.tuple([z.number(), z.number()]),
  calibration: z.object({
    status: z.enum(["valid", "degraded", "invalid", "unknown"]),
    brierScore: z.number().min(0).max(1),
  }),
  uncertainty: z.object({
    epistemic: z.number().min(0),
    aleatoric: z.number().min(0),
  }),
  abstain: z.boolean(),
  featureSnapshotId: z.string(),
  sourceTickIds: z.array(z.string()).optional(),
});
export type PredictionEnvelope = z.infer<typeof PredictionEnvelopeSchema>;

/** @deprecated Use PredictionEnvelopeSchema — kept for Wave-1 adapters */
export const BaselinePredictionSchema = z.object({
  predictionId: z.string(),
  modelId: z.string(),
  instrumentId: z.string(),
  horizonSec: z.number(),
  mean: z.number(),
  variance: z.number(),
  timestamp: z.string(),
  label: z.literal("NON-PRODUCTION"),
});
export type BaselinePrediction = z.infer<typeof BaselinePredictionSchema>;

/** @deprecated Calibration lives inside PredictionEnvelope */
export const CalibratedPredictionSchema = z.object({
  calibrationId: z.string(),
  predictionId: z.string(),
  method: z.literal("temperature_scale_v1"),
  calibratedMean: z.number(),
  uncertainty: z.object({
    std: z.number(),
    ci80: z.tuple([z.number(), z.number()]),
    ci95: z.tuple([z.number(), z.number()]),
  }),
  temperature: z.number(),
  timestamp: z.string(),
  label: z.literal("NON-PRODUCTION"),
});
export type CalibratedPrediction = z.infer<typeof CalibratedPredictionSchema>;

/**
 * Canonical independent risk decision envelope (protected contract).
 * Distinct from ontology `RiskDecision` entity.
 * Fail-closed when approved=false or killSwitchActive=true.
 */
export const RiskDecisionEnvelopeSchema = z.object({
  riskDecisionId: z.string(),
  predictionId: z.string(),
  approved: z.boolean(),
  reason: z.string(),
  limits: z.object({
    maxPosition: z.number().positive(),
    maxExposure: z.number().positive(),
  }),
  uncertaintyHaircut: z.number().min(0).max(1),
  killSwitchActive: z.boolean(),
  sourceTickIds: z.array(z.string()).optional(),
});
export type RiskDecisionEnvelope = z.infer<typeof RiskDecisionEnvelopeSchema>;

/** @deprecated Use RiskDecisionEnvelopeSchema — adapter fields for older gates */
export const RiskGateResultSchema = z.object({
  riskId: z.string(),
  allowed: z.boolean(),
  independent: z.literal(true),
  var: z.number(),
  es: z.number(),
  reasons: z.array(z.string()),
  limitsChecked: z.array(z.string()),
});
export type RiskGateResult = z.infer<typeof RiskGateResultSchema>;

export const GovernanceDecisionSchema = z.object({
  decisionId: z.string(),
  action: z.enum(["APPROVE", "DENY", "HOLD"]),
  role: z.string(),
  policy: z.string(),
  reasons: z.array(z.string()),
  timestamp: z.string(),
  subjectActorId: z.string().optional(),
  serviceActorId: z.string().optional(),
  serviceRole: z.string().optional(),
});
export type GovernanceDecision = z.infer<typeof GovernanceDecisionSchema>;

export const DeterministicFillSchema = z.object({
  orderId: z.string(),
  instrumentId: z.string(),
  side: z.enum(["buy", "sell"]),
  size: z.number(),
  fillPrice: z.number(),
  venue: z.literal("ALPHA_PAPER"),
  status: z.enum(["filled", "rejected", "skipped"]),
  seed: z.number(),
  createdAt: z.string(),
});
export type DeterministicFill = z.infer<typeof DeterministicFillSchema>;

export const OutcomeRecordSchema = z.object({
  outcomeId: z.string(),
  runId: z.string(),
  realizedPnl: z.number(),
  markPrice: z.number(),
  fillPrice: z.number().optional(),
  status: z.enum(["filled", "blocked", "rejected"]),
  timestamp: z.string(),
});
export type OutcomeRecord = z.infer<typeof OutcomeRecordSchema>;

export const LineageNodeSchema = z.object({
  nodeId: z.string(),
  stage: z.enum(VERTICAL_SLICE_STAGES),
  refId: z.string(),
  at: z.string(),
  hash: z.string(),
  prevHash: z.string().nullable(),
});
export type LineageNode = z.infer<typeof LineageNodeSchema>;

export const LineageEdgeSchema = z.object({
  edgeId: z.string(),
  fromNodeId: z.string(),
  toNodeId: z.string(),
  relation: z.literal("DERIVES"),
});
export type LineageEdge = z.infer<typeof LineageEdgeSchema>;

export const SliceRunRequestSchema = z.object({
  source: z.string().default("cockpit"),
  instrumentId: z.string().min(1),
  eventTime: z.string().optional(),
  horizonSec: z.number().positive().default(3600),
  size: z.number().positive(),
  side: z.enum(["buy", "sell"]).default("buy"),
  tenantId: z.string().default("default"),
  seed: z.number().int().optional(),
  payload: z.record(z.unknown()).optional(),
  /** Additive — Action execution contract correlation */
  idempotencyKey: z.string().min(8).optional(),
  executionId: z.string().optional(),
  actor: z.string().optional(),
  role: z.string().optional(),
  roleId: z.string().optional(),
  sessionId: z.string().optional(),
  actorContext: z.record(z.unknown()).optional(),
});
export type SliceRunRequest = z.infer<typeof SliceRunRequestSchema>;
export type SliceRunRequestInput = z.input<typeof SliceRunRequestSchema>;
