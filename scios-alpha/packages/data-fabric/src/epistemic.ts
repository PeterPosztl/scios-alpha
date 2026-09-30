/**
 * Epistemic object model — non-factual intelligence must declare type.
 * ALPHA_NON_PRODUCTION
 */
import { z } from "zod";

export const EpistemicKindSchema = z.enum([
  "FACT",
  "OBSERVATION",
  "ASSUMPTION",
  "HYPOTHESIS",
  "INFERENCE",
  "PREDICTION",
  "SCENARIO",
  "DECISION",
  "OUTCOME",
]);

export const EpistemicEnvelopeSchema = z.object({
  schema: z.literal("sci.EpistemicEnvelope/v1").default("sci.EpistemicEnvelope/v1"),
  kind: EpistemicKindSchema,
  statement: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  basedOn: z.array(z.string()).optional(),
  validAt: z.string().optional(),
  producedBy: z.string().optional(),
  evidenceRefs: z.array(z.string()).optional(),
});

export type EpistemicKind = z.infer<typeof EpistemicKindSchema>;
export type EpistemicEnvelope = z.infer<typeof EpistemicEnvelopeSchema>;

/** Map common SCI pipeline stages → epistemic kinds */
export const STAGE_EPISTEMIC: Record<string, EpistemicKind> = {
  raw_event: "OBSERVATION",
  normalized_event: "OBSERVATION",
  pit_feature: "FACT",
  baseline_prediction: "PREDICTION",
  calibration_uncertainty: "INFERENCE",
  independent_risk_gate: "INFERENCE",
  governance_decision: "DECISION",
  deterministic_execution: "SCENARIO",
  outcome: "OUTCOME",
  immutable_lineage: "FACT",
};
