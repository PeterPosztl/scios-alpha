/** Meta-Recovery shared types — ALPHA / NON-PRODUCTION */

export type CapabilityState =
  | "AVAILABLE"
  | "AVAILABLE_BUT_DEGRADED"
  | "INSTALLED_BUT_STOPPED"
  | "INSTALLED_BUT_INCOMPATIBLE"
  | "MISCONFIGURED"
  | "CORRUPTED"
  | "MISSING"
  | "BLOCKED_BY_PERMISSION"
  | "BLOCKED_BY_EXTERNAL_DEPENDENCY"
  | "UNKNOWN";

export type RiskClass = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";

export type MetaState =
  | "DISCOVER"
  | "MODEL"
  | "OBSERVE"
  | "CLASSIFY"
  | "FORM_HYPOTHESES"
  | "RANK_ROOT_CAUSES"
  | "PLAN_REPAIR"
  | "POLICY_CHECK"
  | "SNAPSHOT"
  | "SANDBOX_TEST"
  | "APPLY_REPAIR"
  | "VERIFY"
  | "START"
  | "PROVE_READINESS"
  | "READY"
  | "SAFE_MODE"
  | "EXTERNAL_BLOCKER"
  | "NO_GO";

export type FinalVerdict =
  | "SYSTEM_READY"
  | "SYSTEM_DEGRADED"
  | "EXTERNAL_BLOCKER_PROVEN"
  | "SYSTEM_NO_GO";

export interface CapabilityNode {
  id: string;
  provider: string;
  required: boolean;
  dependencies: string[];
  fallbackProviders: string[];
  state: CapabilityState;
  evidence: string[];
  healthProbe?: string;
  safeModeBehavior: "required" | "optional" | "disabled";
}

export interface FailureObservation {
  id: string;
  at: string;
  phase: string;
  message: string;
  failureClass: string;
  known: boolean;
  evidence: string[];
}

export interface Hypothesis {
  hypothesisId: string;
  explanation: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  affectedCapability: string;
  confidence: number;
  diagnosticAction: string;
  repairCandidate: string | null;
  risk: RiskClass;
  rollback: string;
  verificationMethod: string;
}

export interface RepairRecipe {
  recipeId: string;
  supportedFailureClasses: string[];
  preconditions: string[];
  riskClass: RiskClass;
  requiredPermissions: string[];
  detectionMethod: string;
  repairSteps: string[];
  expectedChanges: string[];
  verification: string[];
  rollback: string[];
  attemptLimit: number;
  timeoutMs: number;
  safeModeFallback: boolean;
  externalEscalationRule: string;
}

export interface RepairAttempt {
  repairId: string;
  recipeId: string;
  at: string;
  dryRun: boolean;
  result: "success" | "failed" | "rejected_policy" | "rolled_back" | "skipped";
  detail: string;
  changedResources: string[];
}
