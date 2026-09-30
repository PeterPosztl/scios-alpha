/**
 * Decision hydration — policy decisions + local review semantics.
 * ALPHA_NON_PRODUCTION
 */
export function hydrateDecision(input = {}, deps = {}) {
  const policyResults = deps.policyResults || input.policyResults || [];
  const workflowState = input.workflowState || "ready";
  const missing = [];

  const analyze = policyResults.find((p) => p.actionId === "analyze");
  const liveExec = policyResults.find((p) => p.actionId === "live_execution");
  const localReview = policyResults.find(
    (p) => p.actionId === "act.local_review.approve"
  );

  if (!analyze) missing.push("analyze_policy");

  return {
    schema: "sci-os-hydration-decision/v1",
    workflowState,
    analyzeAllowed: analyze ? analyze.can !== false : null,
    liveExecutionAllowed: liveExec ? liveExec.can === true : false,
    localReviewKind: "LOCAL_REVIEW_STATE",
    governedApprovalAvailable: false,
    nextStep:
      workflowState === "result"
        ? "Review evidence and lineage before acting"
        : "Search entity → Analyze → review professional result",
    policyDecisions: policyResults.map((p) => ({
      actionId: p.actionId,
      decision: p.decision,
      can: p.can,
      reasonCodes: p.reasonCodes || [],
    })),
    missing,
  };
}
