import type { VerticalSliceResult } from "./pipeline.js";
import type {
  ExecutionOutcome,
  GovernanceDecision,
  Lineage,
  NormalizedEvent,
  PitFeatures,
  PredictionEnvelope,
  RiskDecision,
  VerticalSliceResponse,
} from "./types/verticalSlice.js";

function payloadWithSizeHorizon(
  payload: Record<string, unknown>,
  fallback: { size: number; horizonSec: number }
): { size: number; horizonSec: number } {
  const size =
    typeof payload.size === "number" ? payload.size : fallback.size;
  const horizonSec =
    typeof payload.horizonSec === "number"
      ? payload.horizonSec
      : fallback.horizonSec;
  return { size, horizonSec };
}

function toNormalizedEvent(result: VerticalSliceResult): NormalizedEvent {
  const evt = result.normalizedEvent;
  const payload = payloadWithSizeHorizon(evt.payload, {
    size: Number(result.rawEvent.payload?.size ?? 0),
    horizonSec: Number(result.rawEvent.payload?.horizonSec ?? 3600),
  });
  return {
    eventId: evt.eventId,
    source: evt.source,
    instrumentId: evt.instrumentId,
    eventTime: evt.eventTime,
    ingestionTime: evt.ingestionTime,
    validFrom: evt.validFrom,
    revisionId: evt.revisionId,
    tenantId: evt.tenantId,
    payload,
    schemaId: evt.schemaId,
  };
}

function toPitFeatures(result: VerticalSliceResult): PitFeatures {
  const f = result.features;
  return {
    featureSetId: f.featureSetId,
    instrumentId: f.instrumentId,
    asof: f.asOf,
    pointInTime: f.pointInTime,
    values: { ...f.values },
    featureVersion: f.featureVersion,
  };
}

function toPredictionEnvelope(result: VerticalSliceResult): PredictionEnvelope {
  const p = result.prediction;
  return {
    predictionId: p.predictionId,
    model: { ...p.model },
    pointEstimate: p.pointEstimate,
    distribution: { ...p.distribution },
    predictionInterval: [...p.predictionInterval] as [number, number],
    calibration: {
      ...p.calibration,
      uncertainty: p.uncertainty,
      abstain: p.abstain,
      featureSnapshotId: p.featureSnapshotId,
    },
  };
}

function toRiskDecision(result: VerticalSliceResult): RiskDecision {
  const r = result.risk;
  let verdict: RiskDecision["verdict"] = "REJECT";
  if (r.approved) {
    verdict = "APPROVE";
  } else if (
    !r.killSwitchActive &&
    r.uncertaintyHaircut > 0.25 &&
    r.uncertaintyHaircut <= 0.4
  ) {
    verdict = "HOLD";
  }
  return {
    decisionId: r.riskDecisionId,
    verdict,
    reason: r.reason,
    score: r.uncertaintyHaircut,
    thresholds: {
      maxPosition: r.limits.maxPosition,
      maxExposure: r.limits.maxExposure,
    },
  };
}

function toGovernanceDecision(result: VerticalSliceResult): GovernanceDecision {
  const d = result.decision;
  const verdict: GovernanceDecision["verdict"] =
    d.action === "APPROVE"
      ? "APPROVE"
      : d.action === "DENY"
        ? "REJECT"
        : "ESCALATE";
  return {
    decisionId: d.decisionId,
    policyId: d.policy,
    verdict,
    explanation: d.reasons.length > 0 ? d.reasons.join("; ") : d.action,
  };
}

function toExecutionOutcome(result: VerticalSliceResult): ExecutionOutcome {
  const exec = result.execution;
  const out = result.outcome;
  if (!exec) {
    return {
      executionId: out.outcomeId,
      simulated: true,
      action: result.decision.action,
      outcome: out.status === "blocked" ? "NO_ACTION" : "FAIL",
      details: {
        status: out.status,
        realizedPnl: out.realizedPnl,
        markPrice: out.markPrice,
      },
    };
  }
  return {
    executionId: exec.orderId,
    simulated: exec.venue === "ALPHA_PAPER",
    action: `${exec.side}:${exec.size}@${exec.fillPrice}`,
    outcome: exec.status === "filled" ? "SUCCESS" : "FAIL",
    details: {
      fillPrice: exec.fillPrice,
      realizedPnl: out.realizedPnl,
      markPrice: out.markPrice,
      seed: exec.seed,
    },
  };
}

function toLineage(result: VerticalSliceResult): Lineage {
  const snap = result.lineage;
  return {
    lineageId: `lin_${result.runId}`,
    nodes: snap.nodes.map((n) => ({
      id: n.nodeId,
      type: n.stage,
      meta: {
        refId: n.refId,
        at: n.at,
        hash: n.hash,
        prevHash: n.prevHash,
      },
    })),
    edges: snap.edges.map((e) => ({
      from: e.fromNodeId,
      to: e.toNodeId,
      type: e.relation,
    })),
  };
}

function deriveStatus(result: VerticalSliceResult): VerticalSliceResponse["status"] {
  if (result.decision.action === "DENY" || !result.risk.approved) {
    return "REJECT";
  }
  if (
    result.decision.action === "HOLD" ||
    result.prediction.calibration.status === "degraded" ||
    result.prediction.abstain
  ) {
    return "DEGRADED";
  }
  if (result.decision.action === "APPROVE" && result.outcome.status === "filled") {
    return "APPROVE";
  }
  return "REJECT";
}

/** Map internal pipeline result → cockpit-facing VerticalSliceResponse. */
export function toVerticalSliceResponse(
  result: VerticalSliceResult,
  timestamp = new Date().toISOString()
): VerticalSliceResponse {
  return {
    runId: result.runId,
    status: deriveStatus(result),
    normalizedEvent: toNormalizedEvent(result),
    pitFeatures: toPitFeatures(result),
    predictionEnvelope: toPredictionEnvelope(result),
    riskDecision: toRiskDecision(result),
    governanceDecision: toGovernanceDecision(result),
    executionOutcome: toExecutionOutcome(result),
    lineage: toLineage(result),
    timestamp,
  };
}
