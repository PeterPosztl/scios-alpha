/**
 * CF14 policy decision + enforcement (PEP authority).
 * ALPHA_NON_PRODUCTION — embedded foundation; not enterprise PDP.
 */
import { randomUUID } from "node:crypto";
import { can, audit, type Role, type Action } from "./index.js";

export const POLICY_ID = "embedded-foundation";
export const POLICY_SET_ID = POLICY_ID;
export const POLICY_VERSION = "embedded-foundation/v1";
export const POLICY_SET_VERSION = POLICY_VERSION;

/** Canonical decision vocabulary — UNKNOWN is never treated as ALLOW */
export type PolicyDecisionState =
  | "ALLOW"
  | "DENY"
  | "CONDITIONAL"
  | "NOT_APPLICABLE"
  | "UNKNOWN";

/** @deprecated use PolicyDecisionState */
export type PolicyDecision = PolicyDecisionState;

export const REASON_CODES = {
  ACTOR_CONTEXT_MISSING: "ACTOR_CONTEXT_MISSING",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  RISK_BLOCKED: "RISK_BLOCKED",
  POLICY_DENIED: "POLICY_DENIED",
  POLICY_CONDITION_UNMET: "POLICY_CONDITION_UNMET",
  SIMULATION_ONLY: "SIMULATION_ONLY",
  LOCAL_REVIEW_ONLY: "LOCAL_REVIEW_ONLY",
  MANDATORY_INPUT_UNKNOWN: "MANDATORY_INPUT_UNKNOWN",
  POLICY_BYPASS_FORBIDDEN: "POLICY_BYPASS_FORBIDDEN",
  POLICY_EVALUATION_FAILED: "POLICY_EVALUATION_FAILED",
  ROLE_NOT_PERMITTED: "ROLE_NOT_PERMITTED",
  STALE_POLICY_VERSION: "STALE_POLICY_VERSION",
  DECISION_SPOOF_REJECTED: "DECISION_SPOOF_REJECTED",
  UNKNOWN_ACTION: "UNKNOWN_ACTION",
} as const;

export type ReasonCode = (typeof REASON_CODES)[keyof typeof REASON_CODES];

export interface ActorContextRef {
  actorId: string | null;
  roleId: string | null;
  sessionId?: string | null;
  objectId?: string | null;
}

export interface PermissionResult {
  allowed: boolean;
  action?: string;
  source?: string;
}

export interface RiskInput {
  approved?: boolean;
  blocking?: boolean;
  unknown?: boolean;
  reason?: string;
  classification?: string;
}

export interface PolicyEvaluationInput {
  actionId: string;
  capability?: string;
  role: Role;
  /** Server-resolved actor — client claims are validated separately */
  actorContext?: ActorContextRef | null;
  /** Trusted server actor for tamper comparison */
  serverActorContext?: ActorContextRef | null;
  permission?: PermissionResult | null;
  risk?: RiskInput | null;
  workflowState?: string | null;
  objectRef?: string | null;
  executionMode?: string;
  /** Client-claimed decision — never trusted when bypass/spoof attempted */
  decision?: PolicyDecisionState;
  clientDecision?: PolicyDecisionState;
  clientDecisionId?: string;
  attemptBypass?: boolean;
  expectedPolicyVersion?: string;
  highRisk?: boolean;
  evaluationFailed?: boolean;
  buildId?: string;
  runId?: string;
  /** @deprecated use actorContext */
  actorId?: string;
  roleId?: string;
}

export interface PolicyCondition {
  code: string;
  description: string;
  satisfied?: boolean;
}

export interface PolicyObligation {
  code: string;
  description: string;
}

export interface PolicyEvidenceRef {
  kind: "policy_evaluation";
  decisionId: string;
  policyId: string;
  policyVersion: string;
  actionId: string;
  decision: PolicyDecisionState;
  at: string;
  reasonCodes: ReasonCode[];
  denyReasons: string[];
}

export interface PolicyEvaluationResult {
  schema: "sci-os-policy-evaluation/v1";
  label: "ALPHA_NON_PRODUCTION";
  maturity: "ALPHA_NON_PRODUCTION";
  decisionId: string;
  policySetId: string;
  policySetVersion: string;
  policyId: string;
  policyVersion: string;
  actionId: string;
  capability: string | null;
  role: Role;
  actorContextRef: ActorContextRef | null;
  objectRef: string | null;
  workflowState: string | null;
  permission: PermissionResult | null;
  risk: RiskInput | null;
  decision: PolicyDecisionState;
  /** Alias for UI/PEP — same as decision === ALLOW && conditions satisfied */
  can: boolean;
  allowed: boolean;
  reasonCodes: ReasonCode[];
  denyReasons: string[];
  conditions: PolicyCondition[];
  obligations: PolicyObligation[];
  evidenceRefs: PolicyEvidenceRef[];
  blocked: boolean;
  bypassAttempted: boolean;
  evaluatedAt: string;
  buildId: string | null;
  runId: string | null;
}

const HIGH_RISK_ACTIONS = new Set([
  "live_execution",
  "execution:submit",
  "approve_order",
  "override_risk",
]);

const EXECUTION_ACTIONS = new Set([
  "live_execution",
  "execution:submit",
  "approve_order",
]);

const SIMULATION_ACTIONS = new Set(["analyze", "propose_order", "read_features"]);

const LOCAL_REVIEW_ACTIONS = new Set([
  "act.local_review.approve",
  "act.local_review.reject",
  "act.local_review.hold",
  "local_review",
]);

const RESTRICTED_ROLES = new Set(["arch.restricted", "restricted", "guest"]);

function isKnownAction(actionId: string): actionId is Action {
  return [
    "read_features",
    "register_model",
    "start_experiment",
    "propose_order",
    "execution:submit",
    "approve_order",
    "override_risk",
    "manage_users",
    "view_audit",
  ].includes(actionId);
}

function matrixAction(actionId: string): Action | null {
  if (actionId === "live_execution") return "execution:submit";
  if (actionId === "analyze") return "read_features";
  if (isKnownAction(actionId)) return actionId;
  return null;
}

function resolvePermission(input: PolicyEvaluationInput): PermissionResult {
  if (input.permission) return input.permission;
  const mapped = matrixAction(input.actionId);
  if (!mapped) {
    if (LOCAL_REVIEW_ACTIONS.has(input.actionId)) {
      return { allowed: true, action: input.actionId, source: "local-review-policy" };
    }
    return { allowed: false, action: input.actionId, source: "matrix-default" };
  }
  return {
    allowed: can(input.role, mapped),
    action: mapped,
    source: "governance-engine:permission-matrix",
  };
}

function actorMissing(ctx: ActorContextRef | null | undefined): boolean {
  return !ctx?.actorId;
}

function actorTampered(
  server: ActorContextRef | null | undefined,
  client: ActorContextRef | null | undefined
): boolean {
  if (!server || !client) return false;
  if (client.roleId && server.roleId && client.roleId !== server.roleId) return true;
  if (client.actorId && server.actorId && client.actorId !== server.actorId) return true;
  return false;
}

export function evaluatePolicyDecision(
  input: PolicyEvaluationInput
): PolicyEvaluationResult {
  const reasonCodes: ReasonCode[] = [];
  const denyReasons: string[] = [];
  const conditions: PolicyCondition[] = [];
  const obligations: PolicyObligation[] = [];
  const action = input.actionId;
  const role = input.role;
  const executionMode = input.executionMode || "SIMULATION_ONLY";
  const bypassAttempted = Boolean(input.attemptBypass);
  const clientDecision = input.clientDecision || input.decision;
  const actorRef: ActorContextRef | null =
    input.actorContext ||
    (input.actorId
      ? {
          actorId: input.actorId,
          roleId: input.roleId || null,
        }
      : null);
  const permission = resolvePermission(input);
  const at = new Date().toISOString();
  const decisionId = `pdec_${randomUUID()}`;

  if (input.evaluationFailed) {
    reasonCodes.push(REASON_CODES.POLICY_EVALUATION_FAILED);
    denyReasons.push("policy_evaluation_failed");
  }

  if (input.expectedPolicyVersion && input.expectedPolicyVersion !== POLICY_SET_VERSION) {
    reasonCodes.push(REASON_CODES.STALE_POLICY_VERSION);
    denyReasons.push("stale_policy_version");
  }

  if (bypassAttempted) {
    reasonCodes.push(REASON_CODES.POLICY_BYPASS_FORBIDDEN);
    denyReasons.push("policy_bypass_forbidden");
  }

  if (clientDecision === "ALLOW" && (bypassAttempted || EXECUTION_ACTIONS.has(action))) {
    reasonCodes.push(REASON_CODES.DECISION_SPOOF_REJECTED);
    denyReasons.push("decision_spoof_rejected");
  }

  if (input.clientDecisionId && bypassAttempted) {
    reasonCodes.push(REASON_CODES.DECISION_SPOOF_REJECTED);
    denyReasons.push("decision_id_spoof_rejected");
  }

  if (actorTampered(input.serverActorContext, input.actorContext)) {
    reasonCodes.push(REASON_CODES.ACTOR_CONTEXT_MISSING);
    denyReasons.push("actor_context_tamper");
  }

  if (actorMissing(actorRef) && !LOCAL_REVIEW_ACTIONS.has(action)) {
    reasonCodes.push(REASON_CODES.ACTOR_CONTEXT_MISSING);
    denyReasons.push("actor_context_missing");
  }

  if (RESTRICTED_ROLES.has(String(actorRef?.roleId || ""))) {
    reasonCodes.push(REASON_CODES.PERMISSION_DENIED);
    denyReasons.push("role_restricted");
  }

  if (!permission.allowed) {
    reasonCodes.push(REASON_CODES.PERMISSION_DENIED);
    denyReasons.push("permission_denied");
  }

  if (input.risk?.blocking || input.risk?.approved === false) {
    reasonCodes.push(REASON_CODES.RISK_BLOCKED);
    denyReasons.push(input.risk?.reason || "risk_blocked");
  }

  if (input.risk?.unknown && HIGH_RISK_ACTIONS.has(action)) {
    reasonCodes.push(REASON_CODES.MANDATORY_INPUT_UNKNOWN);
    denyReasons.push("mandatory_risk_unknown");
  }

  if (EXECUTION_ACTIONS.has(action) && executionMode !== "LIVE") {
    reasonCodes.push(REASON_CODES.SIMULATION_ONLY);
    denyReasons.push("simulation_only_mode");
    obligations.push({
      code: "SIMULATION_ONLY",
      description: "Real execution blocked — SIMULATION_ONLY profile active",
    });
  }

  const mapped = matrixAction(action);
  if (mapped && !can(role, mapped) && permission.allowed) {
    reasonCodes.push(REASON_CODES.ROLE_NOT_PERMITTED);
    denyReasons.push("role_not_permitted");
  }

  if (!mapped && !LOCAL_REVIEW_ACTIONS.has(action) && HIGH_RISK_ACTIONS.has(action)) {
    reasonCodes.push(REASON_CODES.UNKNOWN_ACTION);
    denyReasons.push("unknown_action_requires_escalation");
  }

  if (LOCAL_REVIEW_ACTIONS.has(action)) {
    reasonCodes.push(REASON_CODES.LOCAL_REVIEW_ONLY);
    obligations.push({
      code: "REQUIRE_LOCAL_REVIEW",
      description: "Session-local review only — not GOVERNED_APPROVAL",
    });
    conditions.push({
      code: "LOCAL_REVIEW",
      description: "Review recorded in session state only",
      satisfied: true,
    });
  }

  if (SIMULATION_ACTIONS.has(action) && executionMode === "SIMULATION_ONLY") {
    obligations.push({
      code: "SIMULATION_ONLY",
      description: "Analyze/simulation permitted under SIMULATION_ONLY",
    });
  }

  if (input.highRisk && !input.risk?.approved && EXECUTION_ACTIONS.has(action)) {
    reasonCodes.push(REASON_CODES.RISK_BLOCKED);
    denyReasons.push("high_risk_blocked");
  }

  let decision: PolicyDecisionState;
  if (reasonCodes.includes(REASON_CODES.POLICY_EVALUATION_FAILED)) {
    decision = "UNKNOWN";
  } else if (
    reasonCodes.some((c) =>
      (
        [
          REASON_CODES.PERMISSION_DENIED,
          REASON_CODES.RISK_BLOCKED,
          REASON_CODES.SIMULATION_ONLY,
          REASON_CODES.POLICY_BYPASS_FORBIDDEN,
          REASON_CODES.DECISION_SPOOF_REJECTED,
          REASON_CODES.ACTOR_CONTEXT_MISSING,
          REASON_CODES.STALE_POLICY_VERSION,
          REASON_CODES.ROLE_NOT_PERMITTED,
          REASON_CODES.MANDATORY_INPUT_UNKNOWN,
        ] as ReasonCode[]
      ).includes(c)
    )
  ) {
    decision = "DENY";
  } else if (LOCAL_REVIEW_ACTIONS.has(action)) {
    decision = "CONDITIONAL";
  } else if (!mapped && !SIMULATION_ACTIONS.has(action) && !LOCAL_REVIEW_ACTIONS.has(action)) {
    decision = "NOT_APPLICABLE";
  } else if (obligations.some((o) => o.code === "SIMULATION_ONLY") && EXECUTION_ACTIONS.has(action)) {
    decision = "DENY";
  } else {
    decision = "ALLOW";
  }

  const conditionsMet =
    conditions.length === 0 || conditions.every((c) => c.satisfied !== false);
  const allowed = decision === "ALLOW" || (decision === "CONDITIONAL" && conditionsMet);
  const blocked = !allowed || bypassAttempted || decision === "DENY" || decision === "UNKNOWN";

  const evidenceRefs: PolicyEvidenceRef[] = [
    {
      kind: "policy_evaluation",
      decisionId,
      policyId: POLICY_ID,
      policyVersion: POLICY_VERSION,
      actionId: action,
      decision,
      at,
      reasonCodes: [...reasonCodes],
      denyReasons: [...denyReasons],
    },
  ];

  const actorId = actorRef?.actorId || input.actorId;
  if (actorId) {
    audit(actorId, `policy:${decision.toLowerCase()}`, action, {
      decisionId,
      policyId: POLICY_ID,
      policyVersion: POLICY_VERSION,
      reasonCodes,
      denyReasons,
      bypassAttempted,
    });
  }

  return {
    schema: "sci-os-policy-evaluation/v1",
    label: "ALPHA_NON_PRODUCTION",
    maturity: "ALPHA_NON_PRODUCTION",
    decisionId,
    policySetId: POLICY_SET_ID,
    policySetVersion: POLICY_SET_VERSION,
    policyId: POLICY_ID,
    policyVersion: POLICY_VERSION,
    actionId: action,
    capability: input.capability || action,
    role,
    actorContextRef: actorRef,
    objectRef: input.objectRef || actorRef?.objectId || null,
    workflowState: input.workflowState || null,
    permission,
    risk: input.risk || null,
    decision,
    can: allowed && !blocked,
    allowed: allowed && !blocked,
    reasonCodes,
    denyReasons,
    conditions,
    obligations,
    evidenceRefs,
    blocked,
    bypassAttempted,
    evaluatedAt: at,
    buildId: input.buildId || null,
    runId: input.runId || null,
  };
}

/** Policy enforcement point — rejects bypass and returns enforceable verdict */
export function enforcePolicy(input: PolicyEvaluationInput): PolicyEvaluationResult {
  return evaluatePolicyDecision(input);
}

/** Re-evaluate at action time — rejects stale client decision claims */
export function enforcePolicyAtActionTime(input: PolicyEvaluationInput): PolicyEvaluationResult {
  const spoofed =
    Boolean(input.clientDecision === "ALLOW" && input.clientDecisionId) ||
    Boolean(input.attemptBypass);
  return evaluatePolicyDecision({
    ...input,
    attemptBypass: spoofed || input.attemptBypass,
  });
}

/** Build /can envelope from evaluation result */
export function toCanEnvelope(result: PolicyEvaluationResult) {
  return {
    can: result.can,
    decision: result.decision,
    reasonCodes: result.reasonCodes,
    conditions: result.conditions,
    obligations: result.obligations,
    decisionId: result.decisionId,
    policySetId: result.policySetId,
    policySetVersion: result.policySetVersion,
    actorContextRef: result.actorContextRef,
    evidenceRef: result.evidenceRefs[0] || null,
    policy: result,
  };
}

/** Contract test helper for CI / Closure proof */
export function proveGovernanceBypassRejected(): {
  pass: boolean;
  sample: PolicyEvaluationResult;
} {
  const sample = enforcePolicy({
    actionId: "live_execution",
    role: "operator",
    decision: "ALLOW",
    attemptBypass: true,
    executionMode: "SIMULATION_ONLY",
    actorId: "proof-actor",
    actorContext: { actorId: "proof-actor", roleId: "arch.market_analyst" },
  });
  return {
    pass: sample.blocked && sample.bypassAttempted && sample.decision === "DENY",
    sample,
  };
}
