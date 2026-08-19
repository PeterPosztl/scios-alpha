/**
 * Actor Context Envelope — one identity path for experience, permission, risk, governance.
 * ALPHA_NON_PRODUCTION
 */

export function buildActorContext(input = {}) {
  const roleId = input.roleId || null;
  const actorId = input.actorId || (roleId ? `actor:${roleId}` : null);
  return {
    schema: "sci-os-actor-context/v1",
    label: "ALPHA_NON_PRODUCTION",
    userId: input.userId || "local-dev-user",
    actorId,
    roleId,
    workspaceId: input.workspaceId || null,
    objectId: input.objectId || input.currentObject || null,
    sessionId: input.sessionId || null,
    permissionContext: input.permission || {
      actionsAllowed: ["entity:read", "analyze", "evidence:read"],
      actionsDenied: ["live_execution"],
      source: "governance-engine:embedded-foundation",
    },
    policyContext: input.riskPolicy || {
      policyId: "embedded-foundation",
      highRiskActions: ["live_execution"],
      approvalRequired: true,
    },
    executionMode:
      input.executionMode ||
      input.executionProfile ||
      process.env.EXECUTION_MODE ||
      "SIMULATION_ONLY",
    serviceActor: input.serviceActor || {
      actorId: "svc:vertical-slice-simulator",
      role: "operator",
      purpose: "SIMULATION_ONLY paper execution — not the end-user",
    },
    note: "UX role and governance subject share this envelope — operator is only an explicit service actor",
  };
}
