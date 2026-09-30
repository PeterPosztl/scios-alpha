/**
 * B-009 canonical job lifecycle contract — pure mapping, no engine coupling.
 * ALPHA_NON_PRODUCTION
 */
import { randomUUID } from "node:crypto";

export const JOB_LIFECYCLE_SCHEMA = "sci-os-job-lifecycle/v1";

export const LIFECYCLE_STATES = [
  "SUBMITTED",
  "STARTED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "RETRY_PENDING",
  "RETRY_EXHAUSTED",
  "CANCELLED",
  "RECOVERED",
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export function deriveLifecycleState(job: Record<string, unknown>): LifecycleState {
  const explicit = job.lifecycleState;
  if (typeof explicit === "string" && LIFECYCLE_STATES.includes(explicit as LifecycleState)) {
    return explicit as LifecycleState;
  }

  const cf11 = String(job.state || "QUEUED");
  if (cf11 === "COMPLETED") return "COMPLETED";
  if (cf11 === "CANCELLED") return "CANCELLED";
  if (cf11 === "RUNNING") return "RUNNING";
  if (cf11 === "FAILED") {
    if (job.retryExhausted === true) return "RETRY_EXHAUSTED";
    const max = typeof job.maxAttempts === "number" ? job.maxAttempts : 3;
    const attempt =
      typeof job.currentAttempt === "number" ? job.currentAttempt : 1;
    if (attempt >= max) return "RETRY_EXHAUSTED";
    return "FAILED";
  }
  if (cf11 === "QUEUED") {
    if (job.recoveryInfo && typeof job.recoveryInfo === "object") return "RECOVERED";
    if (job.retryPending === true) return "RETRY_PENDING";
    return "SUBMITTED";
  }
  if (cf11 === "BLOCKED") return "FAILED";
  return "SUBMITTED";
}

export function toCanonicalJobRecord(job: Record<string, unknown>) {
  const lifecycle = deriveLifecycleState(job);
  const evidenceRefs = Array.isArray(job.evidenceRefs) ? job.evidenceRefs : [];
  return {
    schema: JOB_LIFECYCLE_SCHEMA,
    label: "ALPHA_NON_PRODUCTION",
    jobId: job.jobId,
    actor: job.actorContext || null,
    context: {
      objectId: job.objectId || job.objectRef || null,
      workflowId: job.workflowId || null,
      jobType: job.jobType || job.type || null,
      sessionId: (job.actorContext as Record<string, unknown>)?.sessionId || null,
    },
    state: lifecycle,
    cf11State: job.state,
    currentAttempt: typeof job.currentAttempt === "number" ? job.currentAttempt : 1,
    maxAttempts: typeof job.maxAttempts === "number" ? job.maxAttempts : 3,
    timestamps: {
      createdAt: job.createdAt || null,
      updatedAt: job.updatedAt || null,
      startedAt: job.startedAt || null,
      completedAt: job.completedAt || null,
    },
    evidence: {
      refs: evidenceRefs,
      count: evidenceRefs.length,
      lastTransition: evidenceRefs.length ? evidenceRefs[evidenceRefs.length - 1] : null,
    },
    lineage: {
      runId: (job.result as Record<string, unknown>)?.runId || null,
      stateHistory: Array.isArray(job.stateHistory) ? job.stateHistory.slice(-5) : [],
    },
    degraded:
      lifecycle === "FAILED" ||
      lifecycle === "RETRY_EXHAUSTED" ||
      String(job.state) === "BLOCKED",
    recoveryInfo: job.recoveryInfo || null,
    correlationId: job.correlationId || null,
    progress: job.progress ?? null,
  };
}

export function lifecyclePatchFor(
  lifecycle: LifecycleState,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const patch: Record<string, unknown> = { lifecycleState: lifecycle };
  const now = new Date().toISOString();
  if (lifecycle === "RUNNING" || lifecycle === "STARTED") patch.startedAt = now;
  if (lifecycle === "COMPLETED") patch.completedAt = now;
  if (lifecycle === "RETRY_PENDING") patch.retryPending = true;
  if (lifecycle === "RETRY_EXHAUSTED") {
    patch.retryPending = false;
    patch.retryExhausted = true;
  }
  if (lifecycle === "RECOVERED") {
    patch.recoveryInfo = {
      recoveredAt: now,
      fromState: extra.fromState || "BLOCKED",
    };
    patch.retryPending = false;
  }
  if (lifecycle === "SUBMITTED") {
    patch.correlationId = `corr_${randomUUID()}`;
  }
  return patch;
}
