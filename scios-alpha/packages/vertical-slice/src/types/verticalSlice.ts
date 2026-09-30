/** Cockpit / control-plane view contract — not a protected pipeline contract. */
export type VerticalSliceRequest = {
  instrumentId: string;
  horizonSec: number;
  size: number;
};

export type NormalizedEvent = {
  eventId: string;
  source: string;
  instrumentId: string;
  eventTime: string;
  ingestionTime: string;
  validFrom: string;
  revisionId: string;
  tenantId: string;
  payload: { size: number; horizonSec: number };
  schemaId: string;
};

export type PitFeatures = {
  featureSetId: string;
  instrumentId: string;
  asof: string;
  pointInTime: boolean;
  values: Record<string, number>;
  featureVersion: string;
};

export type PredictionEnvelope = {
  predictionId: string;
  model: { id: string; version: string };
  pointEstimate: number;
  distribution: { positive: number; negative: number };
  predictionInterval: [number, number];
  calibration?: Record<string, unknown>;
  /** Model science honesty — never claim PRODUCTION_ELIGIBLE without evidence */
  scienceStatus?: string;
  maturity?: string;
  validationStatus?: string;
  provenance?: {
    runId: string;
    modelId: string;
    modelVersion: string;
    maturityLabel: string;
    evidenceRefs: Array<{ kind: string; id: string }>;
  };
};

export type RiskDecision = {
  decisionId: string;
  verdict: "APPROVE" | "REJECT" | "HOLD";
  reason?: string;
  score?: number;
  thresholds?: Record<string, number>;
  scienceStatus?: string;
  maturity?: string;
  validationStatus?: string;
};

export type GovernanceDecision = {
  decisionId: string;
  policyId?: string;
  verdict: "APPROVE" | "REJECT" | "ESCALATE";
  explanation?: string;
  actorId?: string;
  roleId?: string;
  serviceActorId?: string;
};

export type ExecutionOutcome = {
  executionId: string;
  simulated: boolean;
  action?: string;
  outcome: "SUCCESS" | "FAIL" | "NO_ACTION";
  details?: Record<string, unknown>;
};

export type Lineage = {
  lineageId: string;
  /**
   * Hash-chain tip. The store computes it and sci_lineage.tip_hash persists it,
   * so the view must carry it: without a tip, a consumer cannot reference the
   * chain state without rewalking every node.
   */
  tipHash: string | null;
  nodes: Array<{ id: string; type: string; meta?: Record<string, unknown> }>;
  edges: Array<{ from: string; to: string; type?: string }>;
};

export type VerticalSliceResponse = {
  runId: string;
  status: "APPROVE" | "REJECT" | "DEGRADED";
  normalizedEvent: NormalizedEvent | null;
  pitFeatures: PitFeatures | null;
  predictionEnvelope: PredictionEnvelope | null;
  riskDecision: RiskDecision | null;
  governanceDecision: GovernanceDecision | null;
  executionOutcome: ExecutionOutcome | null;
  lineage: Lineage | null;
  lineageVerified?: boolean;
  persistenceState?: "PERSISTED" | "PERSISTENCE_DEGRADED";
  timestamp: string;
  actorContext?: Record<string, unknown> | null;
};
