/**
 * Frontend-safe Product Kernel projection — UI must not infer capability truth.
 * ALPHA_NON_PRODUCTION
 */

export function kernelUiProjection(kernel, input = {}) {
  const actor = typeof kernel.actorContext === "function"
    ? kernel.actorContext(input)
    : input.actor || null;
  const snap = typeof kernel.snapshot === "function" ? kernel.snapshot() : {};
  const capSummary = snap.capabilitySummary || {};
  const roles = kernel.roles || {};
  const roleId = input.roleId || actor?.roleId || "arch.market_analyst";
  const roleEntry =
    (roles.roles || []).find((r) => r.roleId === roleId) ||
    (roles.archetypes || []).find((a) => a.roleId === roleId) ||
    null;

  return {
    schema: "sci-os-product-context/v1",
    legacySchema: "sci-os-kernel-ui-projection/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    role: {
      roleId,
      mission: roleEntry?.mission || roleEntry?.primaryMission || null,
      status: roleEntry?.status || "UNKNOWN",
      domain: roleEntry?.professionalDomain || roleEntry?.domainFamily || null,
    },
    actor,
    jtbd: {
      tasks: roleEntry?.primaryTasks || roleEntry?.topTasks || [],
      workflows: roleEntry?.workflows || roleEntry?.commonWorkflows || [],
    },
    object: input.objectId || actor?.objectId || null,
    workflowState: input.workflowState || "ready",
    permissions: actor?.permissionContext || null,
    capabilities: {
      summary: capSummary,
      profileDisabled: (capSummary.unproven || []).slice(0, 20),
      proven: (capSummary.proven || []).slice(0, 20),
    },
    risk: actor?.policyContext || null,
    governance: {
      executionMode: actor?.executionMode || process.env.EXECUTION_MODE || "SIMULATION_ONLY",
      reviewKind: "LOCAL_REVIEW_STATE",
      governedApprovalAvailable: false,
    },
    evidence: {
      lineageAvailable: true,
      persistenceState: input.persistenceState || "LOCAL_DURABLE_OR_EPHEMERAL",
    },
    hostReadiness: {
      shellStatus: snap.shellStatus || "UNKNOWN",
      goldenWorkflow1: snap.goldenWorkflow1 || null,
      p0Protected: snap.p0Protected === true,
    },
    note: "UI reads this projection — does not independently infer READY/PASS",
  };
}
