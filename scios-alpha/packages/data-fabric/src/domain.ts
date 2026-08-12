import { z } from "zod";

export const BitemporalRecordSchema = z.object({
  id: z.string(),
  source: z.string(),
  eventTime: z.string().datetime().or(z.string()),
  ingestionTime: z.string().datetime().or(z.string()),
  validFrom: z.string().datetime().or(z.string()),
  validTo: z.string().datetime().or(z.string()).optional(),
  revisionId: z.string(),
});
export type BitemporalRecord = z.infer<typeof BitemporalRecordSchema>;

export const InstrumentSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  type: z.enum(["equity", "fx", "crypto", "sport_event"]),
  metadata: z.record(z.unknown()),
});
export type Instrument = z.infer<typeof InstrumentSchema>;

export const FeatureDefSchema = z.object({
  name: z.string(),
  version: z.string(),
  source: z.string(),
  dataType: z.enum(["number", "string", "bool"]),
  freshnessSec: z.number(),
});
export type FeatureDef = z.infer<typeof FeatureDefSchema>;

export const ModelMetaSchema = z.object({
  modelId: z.string(),
  version: z.string(),
  type: z.enum(["timeseries", "ml", "dl", "bayes"]),
  inputFeatures: z.array(z.string()),
  outputType: z.enum(["point", "distribution"]),
});
export type ModelMeta = z.infer<typeof ModelMetaSchema>;

export const PredictionRecordSchema = z.object({
  predictionId: z.string(),
  modelId: z.string(),
  timestamp: z.string().datetime().or(z.string()),
  horizonSec: z.number(),
  distributionSummary: z.object({
    mean: z.number(),
    variance: z.number(),
    quantiles: z.record(z.number()),
  }),
});
export type PredictionRecord = z.infer<typeof PredictionRecordSchema>;

export const RiskSnapshotSchema = z.object({
  positionId: z.string(),
  exposure: z.number(),
  var: z.number(),
  es: z.number(),
  drawdown: z.number(),
  limitsBreached: z.array(z.string()),
});
export type RiskSnapshot = z.infer<typeof RiskSnapshotSchema>;

export const ExecutionOrderSchema = z.object({
  orderId: z.string(),
  side: z.enum(["buy", "sell"]),
  size: z.number(),
  price: z.number().optional(),
  status: z.string(),
  venue: z.string(),
  createdAt: z.string().datetime().or(z.string()),
  updatedAt: z.string().datetime().or(z.string()),
});
export type ExecutionOrder = z.infer<typeof ExecutionOrderSchema>;

export const AuditEventSchema = z.object({
  actor: z.string(),
  action: z.string(),
  target: z.string(),
  timestamp: z.string().datetime().or(z.string()),
  metadata: z.record(z.unknown()).optional(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
