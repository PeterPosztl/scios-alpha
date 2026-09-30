/**
 * B-009 job system health + boot — orchestration surface for background jobs.
 * ALPHA_NON_PRODUCTION
 */
import { listJobs, getJob } from "./osSession.js";
import {
  jobEngineStatus,
  listJobEngineEvents,
  reconcileStaleJobs,
  reconcileInterruptedJobsOnBoot,
} from "./jobEngine.js";
import {
  LIFECYCLE_STATES,
  toCanonicalJobRecord,
} from "./jobLifecycleContract.js";

export { LIFECYCLE_STATES, toCanonicalJobRecord } from "./jobLifecycleContract.js";

export function jobsHealth() {
  const engine = jobEngineStatus();
  const jobs = listJobs().map(toCanonicalJobRecord);
  const byLifecycle: Record<string, number> = {};
  for (const j of jobs) {
    byLifecycle[j.state] = (byLifecycle[j.state] || 0) + 1;
  }

  const pgConfigured = Boolean(process.env.DATABASE_URL);
  return {
    schema: "sci-os-jobs-health/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    authority: "apps/control-plane-api/src/jobLifecycle.ts",
    engine,
    persistence: {
      localDurable: "PASS",
      path: "LOCALAPPDATA/SCI OS X10/data/jobs",
      postgresql: pgConfigured ? "CONFIGURED_UNVERIFIED" : "PROFILE_DISABLED",
      note: pgConfigured
        ? "FD-002 — PG adapter not Beta-ready; local-durable is truth"
        : "Local JSON job records — B-002/B-004 proven",
    },
    lifecycle: {
      states: LIFECYCLE_STATES,
      byState: byLifecycle,
      total: jobs.length,
    },
    observability: {
      recentEvents: listJobEngineEvents(20),
      correlationIdsEnabled: true,
    },
    degraded: jobs.some((j) => j.degraded),
    status: "READY",
  };
}

export function bootJobSystem() {
  const interrupted = reconcileInterruptedJobsOnBoot();
  const stale = reconcileStaleJobs();
  return {
    schema: "sci-os-job-system-boot/v1",
    at: new Date().toISOString(),
    hydrated: listJobs().length,
    interrupted,
    stale,
  };
}

export function listCanonicalJobs() {
  return listJobs().map(toCanonicalJobRecord);
}

export function getCanonicalJob(jobId: string) {
  const j = getJob(jobId);
  return j ? toCanonicalJobRecord(j) : null;
}
