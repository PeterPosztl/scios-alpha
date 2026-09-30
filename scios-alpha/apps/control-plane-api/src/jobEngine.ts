/**
 * Job Engine v1 — lifecycle orchestration on CF11 osSession authority.
 * B-009: canonical lifecycle patches, locks, boot recovery, observability.
 * ALPHA_NON_PRODUCTION — does not duplicate job state semantics.
 */
import { can, type Role } from "@scios/governance-engine";
import {
  createJob,
  getJob,
  updateJob,
  listJobs,
  reconcileInterruptedJob,
  JOB_TERMINAL_STATES,
  type JobState,
} from "./osSession.js";
import { lifecyclePatchFor } from "./jobLifecycleContract.js";

export const JOB_ENGINE_SCHEMA = "sci-os-job-engine/v1";
export const JOB_ENGINE_VERSION = "sci-os-job-engine/v1.0.0-b009";
export const MAX_CONCURRENT_JOBS = 4;
export const STALE_RUNNING_MS = 30 * 60 * 1000;

export interface JobEngineEvent {
  eventId: string;
  kind: string;
  jobId: string | null;
  at: string;
  correlationId: string | null;
  detail: Record<string, unknown>;
}

const events: JobEngineEvent[] = [];
let eventSeq = 0;
const activeLocks = new Set<string>();

function correlationForJob(jobId: string | null) {
  if (!jobId) return null;
  const j = getJob(jobId);
  return typeof j?.correlationId === "string" ? j.correlationId : null;
}

function emit(
  kind: string,
  jobId: string | null,
  detail: Record<string, unknown> = {}
) {
  const correlationId =
    (typeof detail.correlationId === "string" ? detail.correlationId : null) ||
    correlationForJob(jobId);
  events.unshift({
    eventId: `jev_${++eventSeq}`,
    kind,
    jobId,
    at: new Date().toISOString(),
    correlationId,
    detail,
  });
  if (events.length > 200) events.length = 200;
}

export function listJobEngineEvents(limit = 40) {
  return events.slice(0, limit);
}

function withJobLock<T extends { error?: string | null }>(
  jobId: string,
  fn: () => T
): T {
  if (activeLocks.has(jobId)) {
    emit("lock_contention", jobId, { reason: "concurrent_modification" });
    return { error: "CONCURRENT_MODIFICATION" } as T;
  }
  activeLocks.add(jobId);
  try {
    return fn();
  } finally {
    activeLocks.delete(jobId);
  }
}

function runningCount() {
  return listJobs().filter((j) => j.state === "RUNNING").length;
}

function governanceRoleFor(actor?: Record<string, unknown>): Role {
  const roleId = String(actor?.roleId || "");
  if (/admin|owner/i.test(roleId)) return "admin";
  if (/risk|compliance/i.test(roleId)) return "risk_officer";
  if (/operator|trader|execution|eng_operator/i.test(roleId)) return "operator";
  const mode = process.env.EXECUTION_MODE || "SIMULATION_ONLY";
  if (mode === "SIMULATION_ONLY") return "operator";
  return "researcher";
}

function actorAuthorized(actor?: Record<string, unknown>, action: Action = "submit") {
  const govRole = governanceRoleFor(actor);
  if (action === "submit") {
    return (
      can(govRole, "execution:submit") ||
      can(govRole, "start_experiment") ||
      govRole === "admin"
    );
  }
  return can(govRole, "execution:submit") || govRole === "admin";
}

type Action = "submit" | "transition";

function requireAuth(meta: Record<string, unknown>, action: Action = "submit") {
  const actor = meta.actor as Record<string, unknown> | undefined;
  if (!actorAuthorized(actor, action)) {
    emit("auth_denied", null, { action, roleId: actor?.roleId });
    return { ok: false as const, error: "NOT_AUTHORIZED" };
  }
  return { ok: true as const };
}

export function jobEngineStatus() {
  const jobs = listJobs();
  const byState: Record<string, number> = {};
  for (const j of jobs) {
    const s = String(j.state);
    byState[s] = (byState[s] || 0) + 1;
  }
  return {
    schema: JOB_ENGINE_SCHEMA,
    version: JOB_ENGINE_VERSION,
    label: "ALPHA_NON_PRODUCTION",
    authority: "apps/control-plane-api/src/osSession.ts",
    orchestrator: "apps/control-plane-api/src/jobEngine.ts",
    maxConcurrent: MAX_CONCURRENT_JOBS,
    staleRunningMs: STALE_RUNNING_MS,
    running: runningCount(),
    queued: byState.QUEUED || 0,
    total: jobs.length,
    byState,
    recentEvents: listJobEngineEvents(12),
  };
}

/**
 * Uniform result shape for job-engine entry points so route handlers can read
 * `error` and `detail` without narrowing every internal branch.
 */
export interface JobActionResult {
  job: Record<string, unknown> | null;
  error: string | null;
  detail?: unknown;
}

export function submitJob(
  input: Record<string, unknown> = {},
  meta: Record<string, unknown> = {}
): JobActionResult {
  const auth = requireAuth(meta, "submit");
  if (!auth.ok) return { job: null, error: auth.error };

  const out = createJob(input, meta);
  if (out.job) {
    emit("job_submitted", String(out.job.jobId), {
      lifecycle: "SUBMITTED",
      idempotencyKey: out.job.idempotencyKey || null,
      correlationId: out.job.correlationId || null,
    });
  }
  return out;
}

export function startJob(jobId: string, meta: Record<string, unknown> = {}) {
  const auth = requireAuth(meta, "transition");
  if (!auth.ok) return { job: null, error: auth.error };

  return withJobLock(jobId, () => {
    const j = getJob(jobId);
    if (!j) return { job: null, error: "NOT_FOUND" };

    if (j.state === "RUNNING") {
      emit("start_duplicate", jobId, { reason: "already_running" });
      return { job: j, error: "ALREADY_RUNNING" };
    }

    if (j.state !== "QUEUED" && j.state !== "DELAYED" && j.state !== "BLOCKED") {
      emit("start_rejected", jobId, { state: j.state });
      return { job: null, error: "INVALID_START_STATE", detail: j.state };
    }

    if (runningCount() >= MAX_CONCURRENT_JOBS) {
      emit("start_concurrency_limit", jobId, { running: runningCount() });
      return { job: null, error: "CONCURRENCY_LIMIT", detail: MAX_CONCURRENT_JOBS };
    }

    const out = updateJob(
      jobId,
      {
        state: "RUNNING",
        expectedVersion: j.stateVersion,
        progress: j.progress ?? 0,
        ...lifecyclePatchFor("RUNNING"),
      },
      { ...meta, origin: "job-engine", reason: "start" }
    );
    if (out.job) {
      emit("job_started", jobId, {
        lifecycle: "RUNNING",
        acknowledged: "STARTED",
        stateVersion: out.job.stateVersion,
        correlationId: out.job.correlationId || null,
      });
    }
    return out;
  });
}

export function completeJob(
  jobId: string,
  result: unknown,
  meta: Record<string, unknown> = {}
) {
  const auth = requireAuth(meta, "transition");
  if (!auth.ok) return { job: null, error: auth.error };

  return withJobLock(jobId, () => {
    const j = getJob(jobId);
    if (!j) return { job: null, error: "NOT_FOUND" };
    if (j.state !== "RUNNING" && j.state !== "PAUSED") {
      emit("complete_rejected", jobId, { state: j.state, reason: "no_fake_completion" });
      return { job: null, error: "COMPLETE_REQUIRES_RUNNING", detail: j.state };
    }
    const out = updateJob(
      jobId,
      {
        state: "COMPLETED",
        expectedVersion: j.stateVersion,
        progress: 100,
        result,
        ...lifecyclePatchFor("COMPLETED"),
      },
      { ...meta, origin: "job-engine", reason: "complete" }
    );
    if (out.job) emit("job_completed", jobId, { lifecycle: "COMPLETED" });
    return out;
  });
}

export function failJob(
  jobId: string,
  error: unknown,
  meta: Record<string, unknown> = {}
) {
  const auth = requireAuth(meta, "transition");
  if (!auth.ok) return { job: null, error: auth.error };

  return withJobLock(jobId, () => {
    const j = getJob(jobId);
    if (!j) return { job: null, error: "NOT_FOUND" };
    if (j.state !== "RUNNING" && j.state !== "PAUSED") {
      return { job: null, error: "FAIL_REQUIRES_RUNNING", detail: j.state };
    }
    const out = updateJob(
      jobId,
      {
        state: "FAILED",
        expectedVersion: j.stateVersion,
        error,
        ...lifecyclePatchFor("FAILED"),
      },
      { ...meta, origin: "job-engine", reason: "fail" }
    );
    if (out.job) emit("job_failed", jobId, { lifecycle: "FAILED", attempts: out.job.attempts });
    return out;
  });
}

export function retryJob(jobId: string, meta: Record<string, unknown> = {}) {
  const auth = requireAuth(meta, "transition");
  if (!auth.ok) return { job: null, error: auth.error };

  return withJobLock(jobId, () => {
    const j = getJob(jobId);
    if (!j) return { job: null, error: "NOT_FOUND" };

    if (j.state !== "FAILED") {
      emit("retry_rejected", jobId, { state: j.state });
      return { job: null, error: "RETRY_NOT_FAILED", detail: j.state };
    }

    const currentAttempt =
      typeof j.currentAttempt === "number"
        ? j.currentAttempt
        : typeof j.attempts === "number"
          ? j.attempts + 1
          : 1;
    const maxAttempts =
      typeof j.maxAttempts === "number"
        ? j.maxAttempts
        : typeof (j.retryPolicy as Record<string, unknown>)?.maxAttempts === "number"
          ? ((j.retryPolicy as Record<string, unknown>).maxAttempts as number)
          : 3;

    if (currentAttempt >= maxAttempts) {
      const exhausted = updateJob(
        jobId,
        {
          expectedVersion: j.stateVersion,
          ...lifecyclePatchFor("RETRY_EXHAUSTED"),
        },
        { ...meta, origin: "job-engine", reason: "retry_exhausted" }
      );
      emit("retry_boundary", jobId, { currentAttempt, maxAttempts, lifecycle: "RETRY_EXHAUSTED" });
      return {
        job: exhausted.job,
        error: "RETRY_EXHAUSTED",
        detail: { currentAttempt, maxAttempts },
      };
    }

    const nextAttempt = currentAttempt + 1;
    const patch = updateJob(
      jobId,
      {
        state: "QUEUED" as JobState,
        expectedVersion: j.stateVersion,
        attempts: nextAttempt - 1,
        currentAttempt: nextAttempt,
        error: null,
        ...lifecyclePatchFor("RETRY_PENDING"),
      },
      { ...meta, origin: "job-engine", reason: "retry" }
    );
    if (patch.job) {
      emit("job_retry", jobId, { attempt: nextAttempt, maxAttempts, lifecycle: "RETRY_PENDING" });
    }
    return patch;
  });
}

export function reconcileStaleJobs(maxAgeMs = STALE_RUNNING_MS) {
  const stale: string[] = [];
  const now = Date.now();
  for (const j of listJobs()) {
    if (j.state !== "RUNNING") continue;
    const updated = Date.parse(String(j.updatedAt || j.createdAt));
    if (Number.isFinite(updated) && now - updated > maxAgeMs) {
      const out = reconcileInterruptedJob(String(j.jobId));
      stale.push(String(j.jobId));
      emit("stale_reconciled", String(j.jobId), {
        from: "RUNNING",
        to: out.job?.state,
        ageMs: now - updated,
      });
    }
  }
  return { reconciled: stale.length, jobIds: stale };
}

export function reconcileInterruptedJobsOnBoot() {
  const reconciled: string[] = [];
  for (const j of listJobs()) {
    if (j.state !== "RUNNING") continue;
    const out = reconcileInterruptedJob(String(j.jobId));
    if (out.reconciled) {
      reconciled.push(String(j.jobId));
      emit("boot_interrupted_reconcile", String(j.jobId), {
        to: out.job?.state,
        lifecycle: "FAILED",
      });
    }
  }
  return { count: reconciled.length, jobIds: reconciled };
}

export function cancelJob(jobId: string, meta: Record<string, unknown> = {}) {
  const auth = requireAuth(meta, "transition");
  if (!auth.ok) return { job: null, error: auth.error };

  return withJobLock(jobId, () => {
    const j = getJob(jobId);
    if (!j) return { job: null, error: "NOT_FOUND" };
    if (JOB_TERMINAL_STATES.includes(j.state as JobState)) {
      return { job: j, error: "ALREADY_TERMINAL", detail: j.state };
    }
    const out = updateJob(
      jobId,
      {
        state: "CANCELLED",
        expectedVersion: j.stateVersion,
        ...lifecyclePatchFor("CANCELLED"),
      },
      { ...meta, origin: "job-engine", reason: "cancel" }
    );
    if (out.job) emit("job_cancelled", jobId, { lifecycle: "CANCELLED" });
    return out;
  });
}

export function recoverJob(jobId: string, meta: Record<string, unknown> = {}) {
  const auth = requireAuth(meta, "transition");
  if (!auth.ok) return { job: null, error: auth.error };

  return withJobLock(jobId, () => {
    const j = getJob(jobId);
    if (!j) return { job: null, error: "NOT_FOUND" };
    if (j.state !== "BLOCKED") {
      return { job: null, error: "RECOVER_NOT_BLOCKED", detail: j.state };
    }
    const out = updateJob(
      jobId,
      {
        state: "QUEUED",
        expectedVersion: j.stateVersion,
        error: null,
        ...lifecyclePatchFor("RECOVERED", { fromState: "BLOCKED" }),
      },
      { ...meta, origin: "job-engine", reason: "recovery" }
    );
    if (out.job) emit("job_recovered", jobId, { lifecycle: "RECOVERED" });
    return out;
  });
}

export function resetJobEngineEventsForTests() {
  events.length = 0;
  eventSeq = 0;
  activeLocks.clear();
}
