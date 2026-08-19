/**
 * Intent → Work Plan → Workflow → Experience (above Experience Compiler).
 * Propose-only — never autonomous uncontrolled action.
 * ALPHA_NON_PRODUCTION
 */

export function compileIntentToOutcome(input = {}) {
  const intent = {
    userIntent: input.userIntent || "Understand instrument risk and decide next step",
    role: input.role || "arch.market_analyst",
    jobToBeDone: input.jobToBeDone || "Analyze market entity and govern simulation",
    object: input.object || { type: "Entity", id: "AAPL" },
    currentState: input.currentState || "ready",
    permissions: input.permissions || ["analyze", "openLineage", "view_evidence"],
    dataAvailability: input.dataAvailability || "local-foundation",
    capabilities: input.capabilities || [
      "vertical-slice.foundation",
      "control-plane-api",
      "cockpit.professional-view",
    ],
    risk: input.risk || { class: "MEDIUM", mode: "SIMULATION_ONLY" },
    policy: input.policy || "embedded-foundation/v1",
  };

  const workPlan = {
    schema: "sci-os-work-plan/v1",
    steps: [
      { id: "orient", title: "Open Home attention" },
      { id: "locate", title: `Search ${intent.object.id}` },
      { id: "inspect", title: "Open Entity360" },
      { id: "analyze", title: "Run governed analysis", actionId: "analyze" },
      { id: "uncertainty", title: "Review uncertainty / abstention" },
      { id: "risk", title: "Review risk envelope" },
      { id: "govern", title: "Review governance decision" },
      { id: "decide", title: "Human approval / NO_ACTION", requiresHuman: true },
      { id: "simulate", title: "Simulation-only execution if approved" },
      { id: "evidence", title: "Open evidence + lineage" },
    ],
    autonomousExecution: false,
    note: "Work plan is advisory; consequential steps require human approval",
  };

  const workflow = {
    workflowId: "gw1.market_prediction_analysis",
    boundToPlan: true,
  };

  const experienceRequest = {
    roleId: intent.role,
    workflowState: intent.currentState,
    objectId: `${intent.object.type}:${intent.object.id}`,
    modules: [
      "ContextHeader",
      "PredictionPanel",
      "RiskPanel",
      "DecisionPanel",
      "SimulationPanel",
      "EvidencePanel",
      "LineagePanel",
      "ApprovalCard",
      "AiContextPanel",
      "TrustCapsule",
    ],
  };

  return {
    schema: "sci-os-intent-to-outcome/v1",
    label: "ALPHA_NON_PRODUCTION",
    intent,
    workPlan,
    workflow,
    experienceRequest,
    nextCompiler: "GET /v1/experience/compile + professional-domain-registry",
    mayNotBypass: ["risk", "governance", "permissions", "human approval"],
  };
}
