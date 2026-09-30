/**
 * Context hydration — actor envelope + kernel projection + session.
 * ALPHA_NON_PRODUCTION — missing fields remain null/UNKNOWN; never fabricated.
 */
export function hydrateContext(input = {}, deps = {}) {
  const projection = deps.kernelProjection || input.kernelProjection || null;
  const actor = input.actor || projection?.actor || null;
  const roleId =
    input.roleId || actor?.roleId || projection?.role?.roleId || null;
  const missing = [];

  if (!roleId) missing.push("roleId");
  if (!actor) missing.push("actor");
  if (!projection) missing.push("kernelProjection");

  return {
    schema: "sci-os-hydration-context/v1",
    roleId,
    objectId: input.objectId || projection?.object || actor?.objectId || null,
    workflowState:
      input.workflowState || projection?.workflowState || "ready",
    sessionId: input.sessionId || actor?.sessionId || "default",
    userId: input.userId || actor?.userId || null,
    executionMode:
      actor?.executionMode ||
      projection?.governance?.executionMode ||
      input.executionMode ||
      process.env.EXECUTION_MODE ||
      "SIMULATION_ONLY",
    actor,
    projection,
    permission:
      input.permission ||
      actor?.permissionContext ||
      projection?.permissions ||
      null,
    riskPolicy:
      input.riskPolicy ||
      actor?.policyContext ||
      projection?.risk ||
      null,
    hostReadiness: projection?.hostReadiness || null,
    missing,
  };
}
