/**
 * Canonical semantic typed values — contract lock.
 * Adapters required; no mass primitive rewrite.
 * ALPHA_NON_PRODUCTION
 */
import { z } from "zod";

export const CurrencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/);

export const MoneySchema = z.object({
  schema: z.literal("sci.Money/v1").default("sci.Money/v1"),
  amount: z.string(), // decimal string — avoid float money
  currency: CurrencyCodeSchema,
});

export const ProbabilitySchema = z.object({
  schema: z.literal("sci.Probability/v1").default("sci.Probability/v1"),
  value: z.number().min(0).max(1),
});

export const PercentageSchema = z.object({
  schema: z.literal("sci.Percentage/v1").default("sci.Percentage/v1"),
  value: z.number(),
  unit: z.literal("%").default("%"),
});

export const ConfidenceSchema = z.object({
  schema: z.literal("sci.Confidence/v1").default("sci.Confidence/v1"),
  value: z.number().min(0).max(1),
  basis: z.string().optional(),
});

export const RiskScoreSchema = z.object({
  schema: z.literal("sci.Risk/v1").default("sci.Risk/v1"),
  class: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"]),
  score: z.number().optional(),
  reasons: z.array(z.string()).optional(),
});

export const InstantSchema = z.object({
  schema: z.literal("sci.Instant/v1").default("sci.Instant/v1"),
  utc: z.string(), // ISO-8601 UTC
});

export const LocalDateSchema = z.object({
  schema: z.literal("sci.LocalDate/v1").default("sci.LocalDate/v1"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeZone: z.string().optional(),
});

export const TimeZoneSchema = z.string().min(1);

export const DurationSchema = z.object({
  schema: z.literal("sci.Duration/v1").default("sci.Duration/v1"),
  ms: z.number().int().nonnegative(),
});

export const TimeWindowSchema = z.object({
  schema: z.literal("sci.TimeWindow/v1").default("sci.TimeWindow/v1"),
  start: z.string(),
  end: z.string(),
  timeZone: z.string().optional(),
});

export const EntityIdSchema = z.object({
  schema: z.literal("sci.EntityId/v1").default("sci.EntityId/v1"),
  type: z.string(),
  id: z.string().min(1),
});

export const EvidenceIdSchema = z.string().min(1);
export const PolicyVersionSchema = z.string().min(1);
/** Lightweight model version ref (not ontology Entity ModelVersion). */
export const SemanticModelVersionRefSchema = z.object({
  id: z.string(),
  version: z.string(),
});
/** @deprecated alias — prefer SemanticModelVersionRefSchema; ontology owns ModelVersionSchema */
export const ModelVersionRefSchema = SemanticModelVersionRefSchema;

/** Temporal truth axes — WHAT DID SCI KNOW AT TIME T? */
export const TemporalAxesSchema = z.object({
  schema: z.literal("sci.TemporalAxes/v1").default("sci.TemporalAxes/v1"),
  eventTime: z.string().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  observationTime: z.string().optional(),
  ingestionTime: z.string().optional(),
  systemTime: z.string().optional(),
});

export type Money = z.infer<typeof MoneySchema>;
export type Probability = z.infer<typeof ProbabilitySchema>;
export type TemporalAxes = z.infer<typeof TemporalAxesSchema>;
