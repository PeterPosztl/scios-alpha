/**
 * Trust Capsule — evidence-native professional summary for consequential results.
 * ALPHA_NON_PRODUCTION
 */

export function buildTrustCapsule(slice = {}) {
  const pred = slice.predictionEnvelope || slice.prediction || {};
  const risk = slice.riskDecision || slice.risk || {};
  const gov = slice.governanceDecision || slice.decision || {};
  const lin = slice.lineage || {};
  const model = pred.model || {};

  return {
    schema: "sci-os-trust-capsule/v1",
    label: "ALPHA_NON_PRODUCTION",
    runId: slice.runId || null,
    professional: {
      sourceFreshness: slice.timestamp || slice.at || "UNKNOWN",
      evidenceCoverage: lin.nodes
        ? `${lin.nodes.length} lineage nodes`
        : lin.tipHash
          ? "tip present"
          : "UNKNOWN",
      modelVersion: model.id
        ? `${model.id}@${model.version || "?"}`
        : "UNKNOWN",
      uncertainty: pred.uncertainty || pred.predictionInterval || pred.abstain != null
        ? {
            abstain: pred.abstain,
            interval: pred.predictionInterval || null,
            calibration: pred.calibration || null,
          }
        : "UNKNOWN",
      calibrationValidationStatus:
        pred.calibration?.status || pred.calibration || "NON_PRODUCTION",
      risk: risk.verdict || risk.decision || risk.approved != null
        ? risk.approved === false
          ? "REJECT"
          : risk.verdict || risk.decision || (risk.approved ? "APPROVE" : "UNKNOWN")
        : "UNKNOWN",
      policy: gov.policyId || gov.policy || "embedded-foundation/v1",
      lineageAvailability: !!(lin.tipHash || lin.nodes || lin.lineageId),
    },
    forensicExpandOnDemand: true,
    note: "Professional default is concise; Technical View holds full forensic detail",
  };
}
