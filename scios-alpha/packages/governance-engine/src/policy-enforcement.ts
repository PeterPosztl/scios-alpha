/**
 * CF14 policy decision + enforcement (PEP).
 * ALPHA_NON_PRODUCTION — embedded foundation; not enterprise PDP.
 */
import { can, audit, type Role, type Action } from "./index.js";

export const POLICY_ID = "embedded-foundation";
export const POLICY_VERSION = "embedded-foundation/v1";

export type PolicyDecision = "ALLOW" | "DENY" | "ESCALATE";

export interface PolicyEvaluationInput {
  actionId: string;
  role: Role;
  /** Client-claimed decision — never trusted when bypass is attempted */
  decision?: PolicyDecision;
  attemptBypass?: boolean;
  executionMode?: string;
  actorId?: string;
  highRisk?: boolean;
}

export interface PolicyEvidenceRef {
  kind: "policy_evaluation";
  policyId: string;
  policyVersion: string;
  actionId: string;
  decision: PolicyDecision;
  at: string;
  denyReasons: string[];
}

export interface PolicyEvaluationResult {
  schema: "sci-os-policy-evaluation/v1";
  label: "ALPHA_NON_PRODUCTION";
  policyId: string;
  policyVersion: string;
  actionId: string;
  role: Role;
  decision: PolicyDecision;
  allowed: boolean;
  denyReasons: string[];
  evidenceRefs: PolicyEvidenceRef[];
  blocked: boolean;
  bypassAttempted: boolean;
}

const HIGH_RISK_ACTIONS = new Set([
  "live_execution",
  "execution:submit",
  "approve_order",
  "override_risk",
]);

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

/** Map product action ids to matrix actions where applicable */
function matrixAction(actionId: string): Action | null {
  if (actionId === "live_execution") return "execution:submit";
  if (isKnownAction(actionId)) return actionId;
  return null;
}

export function evaluatePolicyDecision(
  input: PolicyEvaluationInput
): PolicyEvaluationResult {
  const denyReasons: string[] = [];
  const bypassAttempted = Boolean(input.attemptBypass);
  const action = input.actionId;
  const role = input.role;
  const executionMode = input.executionMode || "SIMULATION_ONLY";

  if (bypassAttempted) {
    denyReasons.push("policy_bypass_forbidden");
  }

  if (action === "live_execution" || HIGH_RISK_ACTIONS.has(action)) {
    if (executionMode !== "LIVE") {
      denyReasons.push("simulation_only_mode");
    }
  }

  const mapped = matrixAction(action);
  if (mapped && !can(role, mapped)) {
    denyReasons.push("role_not_permitted");
  }

  if (!mapped && HIGH_RISK_ACTIONS.has(action)) {
    denyReasons.push("unknown_action_requires_escalation");
  }

  let decision: PolicyDecision;
  if (denyReasons.length > 0) {
    decision = "DENY";
  } else if (input.highRisk || action === "override_risk") {
    decision = "ESCALATE";
  } else {
    decision = "ALLOW";
  }

  const allowed = decision === "ALLOW";
  const at = new Date().toISOString();
  const evidenceRefs: PolicyEvidenceRef[] = [
    {
      kind: "policy_evaluation",
      policyId: POLICY_ID,
      policyVersion: POLICY_VERSION,
      actionId: action,
      decision,
      at,
      denyReasons: [...denyReasons],
    },
  ];

  if (input.actorId) {
    audit(input.actorId, `policy:${decision.toLowerCase()}`, action, {
      policyId: POLICY_ID,
      policyVersion: POLICY_VERSION,
      denyReasons,
      bypassAttempted,
    });
  }

  return {
    schema: "sci-os-policy-evaluation/v1",
    label: "ALPHA_NON_PRODUCTION",
    policyId: POLICY_ID,
    policyVersion: POLICY_VERSION,
    actionId: action,
    role,
    decision,
    allowed,
    denyReasons,
    evidenceRefs,
    blocked: !allowed || bypassAttempted,
    bypassAttempted,
  };
}

/** Policy enforcement point — rejects bypass and returns enforceable verdict */
export function enforcePolicy(
  input: PolicyEvaluationInput
): PolicyEvaluationResult {
  return evaluatePolicyDecision(input);
}

/** Contract test helper for CI / Closure proof */
export function proveGovernanceBypassRejected(): { pass: boolean; sample: PolicyEvaluationResult } {
  const sample = enforcePolicy({
    actionId: "live_execution",
    role: "operator",
    decision: "ALLOW",
    attemptBypass: true,
    executionMode: "SIMULATION_ONLY",
    actorId: "proof-actor",
  });
  return {
    pass: sample.blocked && sample.bypassAttempted && sample.decision === "DENY",
    sample,
  };
}
