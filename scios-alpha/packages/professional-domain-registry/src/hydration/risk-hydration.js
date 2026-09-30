/**
 * Risk hydration — policy context + execution mode gates.
 * ALPHA_NON_PRODUCTION
 */
export function hydrateRisk(input = {}, deps = {}) {
  const policyResults = deps.policyResults || input.policyResults || [];
  const riskPolicy = input.riskPolicy || null;
  const executionMode = input.executionMode || "SIMULATION_ONLY";
  const missing = [];

  if (!riskPolicy) missing.push("riskPolicy");

  const highRiskActions = riskPolicy?.highRiskActions || ["live_execution"];
  const denied = policyResults.filter((p) => p && p.can === false);

  return {
    schema: "sci-os-hydration-risk/v1",
    policyId: riskPolicy?.policyId || null,
    executionMode,
    highRiskActions,
    approvalRequired: riskPolicy?.approvalRequired === true,
    deniedActions: denied.map((d) => ({
      action: d.actionId,
      reason: (d.reasonCodes || []).join(", ") || d.decision || "DENY",
    })),
    simulationOnly: executionMode === "SIMULATION_ONLY",
    status: denied.length ? "CONSTRAINED" : "SIMULATION_BOUND",
    missing,
  };
}
