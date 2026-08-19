/**
 * Map vertical-slice response → human-first professional analysis cards.
 * Never fabricate values — UNKNOWN when absent.
 * ALPHA_NON_PRODUCTION
 */

export function toProfessionalAnalysis(data) {
  if (!data || typeof data !== "object") {
    return {
      empty: true,
      whatHappened: "NO ANALYSIS YET",
      nextAction: "Run Analyze to generate prediction → risk → governance → simulation.",
    };
  }

  const pred = data.predictionEnvelope || {};
  const risk = data.riskDecision || {};
  const gov = data.governanceDecision || {};
  const exec = data.executionOutcome || {};
  const lin = data.lineage || {};
  const instrument =
    (data.normalizedEvent && data.normalizedEvent.instrumentId) || "UNKNOWN";

  const pe =
    pred.pointEstimate != null
      ? pred.pointEstimate
      : pred.mean != null
        ? pred.mean
        : null;

  return {
    empty: false,
    instrument,
    runId: data.runId || null,
    status: data.status || "UNKNOWN",
    asOf: data.timestamp || data.asOf || null,
    whatHappened: `${instrument} · analysis complete`,
    expectedOutcome: pe != null ? pe : "UNKNOWN",
    certainty:
      pred.calibration || pred.predictionInterval || pred.uncertainty || null,
    certaintyLabel: pred.calibration
      ? "Calibration present (NON-PRODUCTION)"
      : pred.uncertainty
        ? "Uncertainty present"
        : "No separate calibration — treat estimate as NON-PRODUCTION",
    risk: risk.verdict || risk.decision || "UNKNOWN",
    riskReason: risk.reason || risk.explanation || null,
    policy: gov.verdict || gov.decision || "UNKNOWN",
    policyReason: gov.explanation || gov.reason || null,
    recommendedNext:
      gov.verdict === "APPROVE" || gov.decision === "APPROVE"
        ? "Simulation permitted — review evidence before acting"
        : gov.verdict === "REJECT" || gov.decision === "REJECT"
          ? "Do not execute — risk/governance rejected"
          : "Review risk and policy before next step",
    simulation: {
      action: exec.action || exec.status || "simulated",
      outcome: exec.outcome || null,
      simulated: exec.simulated !== false,
    },
    evidence: {
      lineageId: lin.lineageId || null,
      nodeCount: Array.isArray(lin.nodes) ? lin.nodes.length : null,
    },
    rawRefs: {
      predictionId: pred.predictionId || null,
      riskDecisionId: risk.decisionId || risk.riskDecisionId || null,
    },
  };
}
