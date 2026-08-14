import { randomUUID } from "node:crypto";
import {
  DeterministicFillSchema,
  GovernanceDecisionSchema,
  InMemoryCanonicalLedger,
  NormalizedEventSchema,
  OutcomeRecordSchema,
  PitFeatureVectorSchema,
  PredictionEnvelopeSchema,
  RawEventSchema,
  RiskDecisionEnvelopeSchema,
  SliceRunRequestSchema,
  VERTICAL_SLICE_STAGES,
  type DeterministicFill,
  type GovernanceDecision,
  type NormalizedEvent,
  type OutcomeRecord,
  type PitFeatureVector,
  type PredictionEnvelope,
  type RiskDecisionEnvelope,
  type SliceRunRequestInput,
  type VerticalSliceStage,
} from "@scios/data-fabric";
import { InMemoryFeatureStore } from "@scios/feature-store";
import { can, audit } from "@scios/governance-engine";
import { SeededRng } from "@scios/observability";
import { ImmutableLineageStore } from "./lineage.js";
import { loadPersistedRuns, persistRun } from "./local-durable.js";
import { runIdempotentAnalyze } from "./action-gate.js";
import { resolveActorEnvelope, SERVICE_ACTOR, type ActorEnvelope } from "./actor-envelope.js";
import { utcIsoNow } from "./utc.js";

const featureStore = new InMemoryFeatureStore();

export interface VerticalSliceResult {
  runId: string;
  seed: number;
  stages: typeof VERTICAL_SLICE_STAGES;
  arrow: string;
  rawEvent: ReturnType<typeof RawEventSchema.parse>;
  normalizedEvent: NormalizedEvent;
  features: PitFeatureVector;
  /** Canonical prediction envelope (protected contract). */
  prediction: PredictionEnvelope;
  /** Canonical independent risk decision (protected contract). */
  risk: RiskDecisionEnvelope;
  decision: GovernanceDecision;
  execution: DeterministicFill | null;
  outcome: OutcomeRecord;
  lineage: ReturnType<ImmutableLineageStore["snapshot"]>;
  lineageVerified: boolean;
  cockpitView: {
    runId: string;
    status: OutcomeRecord["status"];
    decision: GovernanceDecision["action"];
    tipHash: string | null;
    summary: string;
  };
  label: "ALPHA_NON_PRODUCTION";
  /** Live analysis usable; persistence may be PERSISTENCE_DEGRADED. */
  persistenceState?: "PERSISTED" | "PERSISTENCE_DEGRADED";
  executionId?: string;
  actionExecution?: unknown;
  actorContext?: ActorEnvelope;
}

const runIndex = new Map<string, VerticalSliceResult>();

/** Hydrate from LOCALAPPDATA / SCIOS_STATE_DIR (best-effort local durable). */
for (const [id, run] of loadPersistedRuns<VerticalSliceResult>()) {
  runIndex.set(id, run);
}

export function getSliceRun(runId: string): VerticalSliceResult | undefined {
  return runIndex.get(runId);
}

export function listSliceRuns(): Array<{
  runId: string;
  tipHash: string | null;
  status: string;
}> {
  return [...runIndex.values()].map((r) => ({
    runId: r.runId,
    tipHash: r.lineage.tipHash,
    status: r.outcome.status,
  }));
}

export function clearSliceRuns(): void {
  runIndex.clear();
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function normalizeEvent(
  raw: ReturnType<typeof RawEventSchema.parse>,
  now: string
): NormalizedEvent {
  const eventId = raw.eventId ?? `evt_${randomUUID()}`;
  return NormalizedEventSchema.parse({
    eventId,
    source: raw.source.trim().toLowerCase(),
    instrumentId: raw.instrumentId.trim().toUpperCase(),
    eventTime: raw.eventTime,
    ingestionTime: now,
    validFrom: raw.eventTime,
    revisionId: `rev_${eventId}`,
    tenantId: raw.tenantId,
    payload: raw.payload,
    schemaId: "event/normalized/v1",
  });
}

/** Baseline logistic point estimate from PIT features (NON-PRODUCTION). */
function baselineLogistic(
  features: PitFeatureVector,
  predictionId: string
): Omit<
  PredictionEnvelope,
  "calibration" | "uncertainty" | "abstain" | "predictionInterval"
> & { logit: number } {
  const { priceNorm, vol, momentum } = features.values;
  const logit =
    -0.2 + 2.4 * momentum - 1.8 * vol + 0.6 * (priceNorm - 0.5);
  const positive = clamp01(sigmoid(logit));
  return {
    predictionId,
    model: { id: "baseline-logistic", version: "1.0.0" },
    pointEstimate: positive,
    distribution: {
      positive,
      negative: clamp01(1 - positive),
    },
    featureSnapshotId: features.featureSetId,
    logit,
  };
}

/**
 * Calibration + uncertainty enrichment → canonical PredictionEnvelope.
 * Brier / epistemic / aleatoric are ALPHA stubs (deterministic, labeled NON-PRODUCTION).
 */
function calibrateAndUncertainty(
  draft: ReturnType<typeof baselineLogistic>,
  features: PitFeatureVector
): PredictionEnvelope {
  const { vol, momentum } = features.values;
  const temperature = 1.12;
  const calibratedPositive = clamp01(sigmoid(draft.logit / temperature));
  const aleatoric = clamp01(0.08 + vol * 0.8);
  const epistemic = clamp01(0.04 + Math.abs(momentum) * 0.5);
  const halfWidth = 0.5 * (aleatoric + epistemic);
  const lo = clamp01(calibratedPositive - halfWidth);
  const hi = clamp01(calibratedPositive + halfWidth);
  const brierScore = clamp01(
    (calibratedPositive - 0.5) ** 2 * 0.5 + aleatoric * 0.4
  );
  const abstain =
    epistemic + aleatoric > 0.45 || hi - lo > 0.35 || brierScore > 0.28;
  const status =
    brierScore <= 0.2 ? "valid" : brierScore <= 0.28 ? "degraded" : "invalid";

  return PredictionEnvelopeSchema.parse({
    predictionId: draft.predictionId,
    model: draft.model,
    pointEstimate: calibratedPositive,
    distribution: {
      positive: calibratedPositive,
      negative: clamp01(1 - calibratedPositive),
    },
    predictionInterval: [lo, hi],
    calibration: { status, brierScore },
    uncertainty: { epistemic, aleatoric },
    abstain,
    featureSnapshotId: draft.featureSnapshotId,
  });
}

const DEFAULT_RISK_LIMITS = {
  maxPosition: 1000,
  maxExposure: 10000,
} as const;

function independentRiskGate(input: {
  size: number;
  side: "buy" | "sell";
  prediction: PredictionEnvelope;
}): RiskDecisionEnvelope {
  const denyReasons: string[] = [];
  const killSwitchActive = process.env.SCIOS_KILL_SWITCH === "1";
  const uncertaintyHaircut = Math.min(
    1,
    Number(
      (
        0.5 * input.prediction.uncertainty.epistemic +
        0.5 * input.prediction.uncertainty.aleatoric
      ).toFixed(4)
    )
  );
  const notional = input.size * 100; // ALPHA mark proxy
  const haircutExposure = notional * (1 + uncertaintyHaircut);

  if (killSwitchActive) denyReasons.push("kill_switch_active");
  if (input.size > DEFAULT_RISK_LIMITS.maxPosition) {
    denyReasons.push("max_position_exceeded");
  }
  if (haircutExposure > DEFAULT_RISK_LIMITS.maxExposure) {
    denyReasons.push("max_exposure_exceeded");
  }
  if (uncertaintyHaircut > 0.4) denyReasons.push("uncertainty_haircut_too_high");
  if (input.prediction.abstain) denyReasons.push("model_abstain");
  if (input.prediction.calibration.status === "invalid") {
    denyReasons.push("calibration_invalid");
  }

  const approved = denyReasons.length === 0;
  return RiskDecisionEnvelopeSchema.parse({
    riskDecisionId: `risk_${randomUUID()}`,
    predictionId: input.prediction.predictionId,
    approved,
    reason: approved ? "within limits" : denyReasons.join("; "),
    limits: { ...DEFAULT_RISK_LIMITS },
    uncertaintyHaircut,
    killSwitchActive,
  });
}

function governanceDecide(input: {
  risk: RiskDecisionEnvelope;
  prediction: PredictionEnvelope;
  instrumentId: string;
  now: string;
  actor: ActorEnvelope;
}): GovernanceDecision {
  const reasons: string[] = [];
  // Paper/sim execution:submit is a service-actor check. End-user remains subjectActorId.
  if (!can(SERVICE_ACTOR.role, "execution:submit")) {
    reasons.push("governance_denied");
  }
  if (!input.risk.approved) {
    reasons.push(`risk:${input.risk.reason}`);
  }
  if (input.risk.killSwitchActive) reasons.push("kill_switch_active");
  if (input.prediction.abstain) reasons.push("prediction_abstain");

  let action: GovernanceDecision["action"] = "APPROVE";
  if (
    reasons.includes("governance_denied") ||
    !input.risk.approved ||
    input.risk.killSwitchActive
  ) {
    action = "DENY";
  } else if (
    input.risk.uncertaintyHaircut > 0.25 ||
    input.prediction.calibration.status === "degraded"
  ) {
    action = "HOLD";
  }

  const decision = GovernanceDecisionSchema.parse({
    decisionId: `dec_${randomUUID()}`,
    action,
    role: input.actor.roleId,
    policy: "alpha_execution_submit_v1",
    reasons,
    timestamp: input.now,
    subjectActorId: input.actor.actorId,
    serviceActorId: SERVICE_ACTOR.actorId,
    serviceRole: SERVICE_ACTOR.role,
  });
  audit(input.actor.actorId, `decision:${decision.action}`, input.instrumentId, {
    decisionId: decision.decisionId,
    predictionId: input.prediction.predictionId,
    riskDecisionId: input.risk.riskDecisionId,
    reasons: decision.reasons,
    roleId: input.actor.roleId,
    serviceActorId: SERVICE_ACTOR.actorId,
    serviceRole: SERVICE_ACTOR.role,
  });
  return decision;
}

function deterministicExecute(input: {
  decision: GovernanceDecision;
  instrumentId: string;
  side: "buy" | "sell";
  size: number;
  seed: number;
  now: string;
}): DeterministicFill | null {
  if (input.decision.action !== "APPROVE") return null;
  const rng = new SeededRng(input.seed);
  return DeterministicFillSchema.parse({
    orderId: `ord_${randomUUID()}`,
    instrumentId: input.instrumentId,
    side: input.side,
    size: input.size,
    fillPrice: 100 + rng.range(0, 10),
    venue: "ALPHA_PAPER",
    status: "filled",
    seed: input.seed,
    createdAt: input.now,
  });
}

function buildOutcome(input: {
  runId: string;
  decision: GovernanceDecision;
  execution: DeterministicFill | null;
  prediction: PredictionEnvelope;
  now: string;
}): OutcomeRecord {
  if (!input.execution) {
    return OutcomeRecordSchema.parse({
      outcomeId: `out_${randomUUID()}`,
      runId: input.runId,
      realizedPnl: 0,
      markPrice: 100,
      status: input.decision.action === "DENY" ? "blocked" : "rejected",
      timestamp: input.now,
    });
  }
  const ret = (input.prediction.pointEstimate - 0.5) * 0.1;
  const mark = input.execution.fillPrice * (1 + ret);
  const sign = input.execution.side === "buy" ? 1 : -1;
  const realizedPnl =
    sign * (mark - input.execution.fillPrice) * input.execution.size;
  return OutcomeRecordSchema.parse({
    outcomeId: `out_${randomUUID()}`,
    runId: input.runId,
    realizedPnl,
    markPrice: mark,
    fillPrice: input.execution.fillPrice,
    status: "filled",
    timestamp: input.now,
  });
}

function pushStage(
  lineage: ImmutableLineageStore,
  stage: VerticalSliceStage,
  refId: string,
  at: string,
  payload: unknown,
  prevNodeId: string | null
): string {
  const nodeId = `n_${stage}_${refId}`;
  lineage.appendNode({ nodeId, stage, refId, at, payload });
  if (prevNodeId) lineage.link(prevNodeId, nodeId);
  return nodeId;
}

export async function runVerticalSlice(
  input: SliceRunRequestInput
): Promise<VerticalSliceResult> {
  const req = SliceRunRequestSchema.parse(input);
  const objectId = `Entity:${req.instrumentId.trim().toUpperCase()}`;
  const actor = resolveActorEnvelope(req);
  const { result, action } = await runIdempotentAnalyze(
    {
      idempotencyKey: req.idempotencyKey,
      executionId: req.executionId,
      actor: actor.actorId,
      role: actor.roleId,
      objectId,
    },
    () => runVerticalSliceCore(req, actor)
  );
  return {
    ...result,
    actionExecution: action,
    executionId: action.executionId,
  } as VerticalSliceResult;
}

async function runVerticalSliceCore(
  req: ReturnType<typeof SliceRunRequestSchema.parse>,
  actor: ActorEnvelope
): Promise<VerticalSliceResult> {
  const now = utcIsoNow();
  const runId = `run_${randomUUID()}`;
  const seed = req.seed ?? Number(process.env.SCIOS_SEED ?? 42);
  const ledger = new InMemoryCanonicalLedger();
  const lineage = new ImmutableLineageStore();

  const rawEvent = RawEventSchema.parse({
    source: req.source,
    instrumentId: req.instrumentId,
    eventTime: req.eventTime ?? now,
    tenantId: req.tenantId,
    payload: req.payload ?? { size: req.size, horizonSec: req.horizonSec },
  });

  let prev = pushStage(
    lineage,
    "raw_event",
    rawEvent.eventId ?? runId,
    now,
    rawEvent,
    null
  );

  const normalizedEvent = normalizeEvent(rawEvent, now);
  await ledger.append({
    entryId: normalizedEvent.eventId,
    ledger: "events",
    at: now,
    actor: "vertical-slice",
    tenantId: req.tenantId,
    correlationId: runId,
    payload: normalizedEvent,
  });
  prev = pushStage(
    lineage,
    "normalized_event",
    normalizedEvent.eventId,
    now,
    normalizedEvent,
    prev
  );

  const features = PitFeatureVectorSchema.parse(
    featureStore.getFeatureVectorAsOf(
      normalizedEvent.instrumentId,
      normalizedEvent.eventTime
    )
  );
  await ledger.append({
    entryId: features.featureSetId,
    ledger: "features",
    at: now,
    actor: "vertical-slice",
    tenantId: req.tenantId,
    correlationId: runId,
    payload: features,
  });
  prev = pushStage(
    lineage,
    "pit_feature",
    features.featureSetId,
    now,
    features,
    prev
  );

  const predictionId = `pred_${randomUUID()}`;
  const draft = baselineLogistic(features, predictionId);
  prev = pushStage(
    lineage,
    "baseline_prediction",
    predictionId,
    now,
    {
      predictionId: draft.predictionId,
      model: draft.model,
      pointEstimate: draft.pointEstimate,
      distribution: draft.distribution,
      featureSnapshotId: draft.featureSnapshotId,
    },
    prev
  );

  const prediction = calibrateAndUncertainty(draft, features);
  await ledger.append({
    entryId: prediction.predictionId,
    ledger: "predictions",
    at: now,
    actor: "vertical-slice",
    tenantId: req.tenantId,
    correlationId: runId,
    payload: prediction,
  });
  await ledger.append({
    entryId: `cal_${prediction.predictionId}`,
    ledger: "calibrations",
    at: now,
    actor: "vertical-slice",
    tenantId: req.tenantId,
    correlationId: runId,
    payload: prediction.calibration,
  });
  prev = pushStage(
    lineage,
    "calibration_uncertainty",
    prediction.predictionId,
    now,
    prediction,
    prev
  );

  const risk = independentRiskGate({
    size: req.size,
    side: req.side,
    prediction,
  });
  await ledger.append({
    entryId: risk.riskDecisionId,
    ledger: "risk_approvals",
    at: now,
    actor: "risk-gate",
    tenantId: req.tenantId,
    correlationId: runId,
    payload: risk,
  });
  prev = pushStage(
    lineage,
    "independent_risk_gate",
    risk.riskDecisionId,
    now,
    risk,
    prev
  );

  const decision = governanceDecide({
    risk,
    prediction,
    instrumentId: normalizedEvent.instrumentId,
    now,
    actor,
  });
  await ledger.append({
    entryId: decision.decisionId,
    ledger: "decisions",
    at: now,
    actor: actor.actorId,
    tenantId: req.tenantId,
    correlationId: runId,
    payload: decision,
  });
  prev = pushStage(
    lineage,
    "governance_decision",
    decision.decisionId,
    now,
    decision,
    prev
  );

  const execution = deterministicExecute({
    decision,
    instrumentId: normalizedEvent.instrumentId,
    side: req.side,
    size: req.size,
    seed,
    now,
  });
  if (execution) {
    await ledger.append({
      entryId: execution.orderId,
      ledger: "executions",
      at: now,
      actor: "execution-simulator",
      tenantId: req.tenantId,
      correlationId: runId,
      payload: execution,
    });
    prev = pushStage(
      lineage,
      "deterministic_execution",
      execution.orderId,
      now,
      execution,
      prev
    );
  } else {
    prev = pushStage(
      lineage,
      "deterministic_execution",
      `skip_${decision.decisionId}`,
      now,
      { status: "skipped", decision: decision.action },
      prev
    );
  }

  const outcome = buildOutcome({
    runId,
    decision,
    execution,
    prediction,
    now,
  });
  await ledger.append({
    entryId: outcome.outcomeId,
    ledger: "outcomes",
    at: now,
    actor: "vertical-slice",
    tenantId: req.tenantId,
    correlationId: runId,
    payload: outcome,
  });
  prev = pushStage(lineage, "outcome", outcome.outcomeId, now, outcome, prev);

  const lineageSnap = lineage.snapshot();
  await ledger.append({
    entryId: `lin_${runId}`,
    ledger: "lineage",
    at: now,
    actor: "vertical-slice",
    tenantId: req.tenantId,
    correlationId: runId,
    payload: lineageSnap,
  });
  prev = pushStage(
    lineage,
    "immutable_lineage",
    `lin_${runId}`,
    now,
    {
      tipHash: lineage.snapshot().tipHash,
      nodeCount: lineage.snapshot().nodes.length,
    },
    prev
  );

  const verified = lineage.verify().ok;
  const cockpitView = {
    runId,
    status: outcome.status,
    decision: decision.action,
    tipHash: lineage.snapshot().tipHash,
    summary: `${VERTICAL_SLICE_STAGES.join(" → ")} | ${decision.action} | ${outcome.status} | pred=${prediction.pointEstimate.toFixed(3)} abstain=${prediction.abstain}`,
  };
  pushStage(lineage, "cockpit_view", runId, now, cockpitView, prev);

  const result: VerticalSliceResult = {
    runId,
    seed,
    stages: VERTICAL_SLICE_STAGES,
    arrow: VERTICAL_SLICE_STAGES.join(" → "),
    rawEvent,
    normalizedEvent,
    features,
    prediction,
    risk,
    decision,
    execution,
    outcome,
    lineage: lineage.snapshot(),
    lineageVerified: lineage.verify().ok && verified,
    cockpitView,
    label: "ALPHA_NON_PRODUCTION",
    actorContext: actor,
  };

  runIndex.set(runId, result);
  const persist = persistRun(runId, result);
  result.persistenceState = persist.state;
  return result;
}