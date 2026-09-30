/**
 * Actor Context Envelope for GW1 / vertical slice.
 * End-user identity is never silently replaced by the simulator service actor.
 * ALPHA_NON_PRODUCTION
 */

export const SERVICE_ACTOR = {
  actorId: "svc:vertical-slice-simulator",
  role: "operator" as const,
  purpose: "SIMULATION_ONLY paper execution:submit — not the end-user",
};

export type ActorEnvelope = {
  schema: "sci-os-actor-context/v1";
  label: "ALPHA_NON_PRODUCTION";
  userId: string;
  actorId: string;
  roleId: string;
  workspaceId: string | null;
  objectId: string | null;
  sessionId: string | null;
  permissionContext: {
    actionsAllowed: string[];
    actionsDenied: string[];
    source: string;
  };
  policyContext: {
    policyId: string;
    highRiskActions: string[];
    approvalRequired: boolean;
  };
  executionMode: string;
  serviceActor: typeof SERVICE_ACTOR;
};

export function resolveActorEnvelope(req: {
  actor?: string;
  role?: string;
  roleId?: string;
  sessionId?: string;
  instrumentId?: string;
  actorContext?: Record<string, unknown>;
}): ActorEnvelope {
  const ctx = req.actorContext && typeof req.actorContext === "object" ? req.actorContext : {};
  const roleId =
    (typeof ctx.roleId === "string" && ctx.roleId) ||
    req.roleId ||
    (typeof req.role === "string" && req.role.startsWith("arch.") ? req.role : null) ||
    "arch.market_analyst";
  const actorId =
    (typeof ctx.actorId === "string" && ctx.actorId) ||
    req.actor ||
    `actor:${roleId}`;
  const userId =
    (typeof ctx.userId === "string" && ctx.userId) || "local-dev-user";
  return {
    schema: "sci-os-actor-context/v1",
    label: "ALPHA_NON_PRODUCTION",
    userId,
    actorId,
    roleId,
    workspaceId:
      (typeof ctx.workspaceId === "string" && ctx.workspaceId) || null,
    objectId:
      (typeof ctx.objectId === "string" && ctx.objectId) ||
      (req.instrumentId ? `Entity:${String(req.instrumentId).trim().toUpperCase()}` : null),
    sessionId:
      (typeof ctx.sessionId === "string" && ctx.sessionId) ||
      req.sessionId ||
      null,
    permissionContext: {
      actionsAllowed: ["entity:read", "analyze", "evidence:read"],
      actionsDenied: ["live_execution"],
      source: "governance-engine:embedded-foundation",
    },
    policyContext: {
      policyId: "embedded-foundation",
      highRiskActions: ["live_execution"],
      approvalRequired: true,
    },
    executionMode:
      (typeof ctx.executionMode === "string" && ctx.executionMode) ||
      process.env.EXECUTION_MODE ||
      "SIMULATION_ONLY",
    serviceActor: SERVICE_ACTOR,
  };
}
