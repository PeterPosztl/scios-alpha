/**
 * In-memory + file-backed OS session / jobs / notifications for control-plane.
 * ALPHA_NON_PRODUCTION — CF11 job-state contract (local-durable).
 */
import { randomUUID, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const sessions = new Map();
const jobs = new Map();
const notifications = [];
let jobsHydrated = false;

/** CF11 canonical job states */
export const JOB_STATES = [
  "QUEUED",
  "RUNNING",
  "PAUSED",
  "DELAYED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "BLOCKED",
] as const;

export type JobState = (typeof JOB_STATES)[number];

const TERMINAL: JobState[] = ["COMPLETED", "FAILED", "CANCELLED"];

const TRANSITIONS: Record<string, JobState[]> = {
  QUEUED: ["RUNNING", "DELAYED", "CANCELLED", "BLOCKED", "COMPLETED"],
  RUNNING: ["PAUSED", "COMPLETED", "FAILED", "CANCELLED", "BLOCKED"],
  PAUSED: ["RUNNING", "CANCELLED", "FAILED"],
  DELAYED: ["QUEUED", "RUNNING", "CANCELLED", "BLOCKED"],
  BLOCKED: ["QUEUED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

function dataRoot() {
  const base =
    process.env.SCIOS_USER_DATA ||
    process.env.LOCALAPPDATA ||
    process.cwd();
  return join(base, "SCI OS X10", "data");
}

function sessionDir() {
  const dir = join(dataRoot(), "session");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function jobsDir() {
  const dir = join(dataRoot(), "jobs");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function sessionPath(id: string) {
  return join(sessionDir(), `${id}.json`);
}

function jobPath(jobId: string) {
  return join(jobsDir(), `${jobId}.json`);
}

function hydrateJobs() {
  if (jobsHydrated) return;
  jobsHydrated = true;
  const dir = jobsDir();
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith(".json")) continue;
    try {
      const j = JSON.parse(readFileSync(join(dir, ent.name), "utf8"));
      if (j?.jobId) jobs.set(j.jobId, j);
    } catch {
      /* skip corrupt */
    }
  }
}

function persistJob(job: Record<string, unknown>) {
  writeFileSync(jobPath(String(job.jobId)), JSON.stringify(job, null, 2));
}

function appendTransitionEvidence(
  job: Record<string, unknown>,
  from: string,
  to: string,
  reason?: string
) {
  const refs = Array.isArray(job.evidenceRefs) ? job.evidenceRefs : [];
  refs.push({
    kind: "job_state_transition",
    from,
    to,
    at: new Date().toISOString(),
    reason: reason || null,
  });
  job.evidenceRefs = refs.slice(-50);
}

export function validateJobTransition(from: string, to: string) {
  if (!JOB_STATES.includes(to as JobState)) {
    return { ok: false, code: "INVALID_STATE", detail: to };
  }
  if (from === to) return { ok: true };
  const allowed = TRANSITIONS[from] || [];
  if (!allowed.includes(to as JobState)) {
    return { ok: false, code: "INVALID_TRANSITION", detail: `${from} → ${to}` };
  }
  return { ok: true };
}

export function getOrCreateSession(sessionId?: string) {
  const id = sessionId || "default";
  if (sessions.has(id)) return sessions.get(id);
  const p = sessionPath(id);
  let s = {
    sessionId: id,
    schemaVersion: "sci-os-session/v1",
    role: "arch.market_analyst",
    roleId: "arch.market_analyst",
    version: 0,
    workspaces: [
      {
        workspaceId: "ws_home",
        title: "Home",
        appId: "app.home",
        objectId: null,
        pinned: true,
      },
    ],
    activeWorkspaceId: "ws_home",
    recent: { entities: [], analyses: [], searches: [] },
    favorites: [],
    appearance: { theme: "LIGHT", density: "COMFORTABLE" },
    updatedAt: new Date().toISOString(),
  };
  if (existsSync(p)) {
    try {
      s = { ...s, ...JSON.parse(readFileSync(p, "utf8")) };
    } catch {
      /* keep default */
    }
  }
  sessions.set(id, s);
  return s;
}

export function saveSession(session: Record<string, unknown>) {
  session.updatedAt = new Date().toISOString();
  sessions.set(session.sessionId, session);
  writeFileSync(sessionPath(String(session.sessionId)), JSON.stringify(session, null, 2));
  return session;
}

export function createJob(input: Record<string, unknown> = {}) {
  hydrateJobs();
  const idempotencyKey =
    typeof input.idempotencyKey === "string" ? input.idempotencyKey : null;
  if (idempotencyKey) {
    for (const j of jobs.values()) {
      if (j.idempotencyKey === idempotencyKey) return j;
    }
  }
  const now = new Date().toISOString();
  const job = {
    schema: "sci-os-job/v1",
    label: "ALPHA_NON_PRODUCTION",
    jobId: `job_${randomUUID()}`,
    jobType: input.type || input.jobType || "analysis",
    title: input.title || "Background job",
    desiredState: "COMPLETED",
    actualState: "QUEUED" as JobState,
    state: "QUEUED" as JobState,
    priority: input.priority || "P1",
    progress: 0,
    stages: input.stages || [],
    currentStage: null,
    result: null,
    error: null,
    objectId: input.objectId || null,
    idempotencyKey,
    attempts: 0,
    evidenceRefs: [],
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy || "local-dev-user",
  };
  jobs.set(job.jobId, job);
  persistJob(job);
  return job;
}

export function getJob(jobId: string) {
  hydrateJobs();
  return jobs.get(jobId) || null;
}

export function updateJob(jobId: string, patch: Record<string, unknown>, meta: Record<string, unknown> = {}) {
  hydrateJobs();
  const j = jobs.get(jobId);
  if (!j) return { job: null, error: "NOT_FOUND" };

  const nextState = patch.state || patch.actualState;
  if (nextState && nextState !== j.state) {
    const v = validateJobTransition(j.state, String(nextState));
    if (!v.ok) return { job: null, error: v.code, detail: v.detail };
    appendTransitionEvidence(j, j.state, String(nextState), meta.reason as string | undefined);
    j.state = nextState;
    j.actualState = nextState;
  }

  if (typeof patch.progress === "number") {
    j.progress = Math.max(0, Math.min(100, patch.progress));
  }
  if ("result" in patch) j.result = patch.result;
  if ("error" in patch) j.error = patch.error;
  if ("currentStage" in patch) j.currentStage = patch.currentStage;
  if (patch.attempts != null) j.attempts = patch.attempts;

  j.updatedAt = new Date().toISOString();
  jobs.set(jobId, j);
  persistJob(j);
  return { job: j, error: null };
}

export function listJobs() {
  hydrateJobs();
  return [...jobs.values()].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );
}

export function pushNotification(n: Record<string, unknown>) {
  const item = {
    notificationId: `ntf_${randomUUID()}`,
    type: n.type || "INFORMATION",
    source: n.source || "sci.os",
    object: n.object || null,
    severity: n.severity || "info",
    time: new Date().toISOString(),
    reason: n.reason || "",
    action: n.action || null,
    evidence: n.evidence || null,
  };
  const dup = notifications.find(
    (x) =>
      x.reason === item.reason &&
      x.object === item.object &&
      Date.now() - Date.parse(x.time) < 30000
  );
  if (dup) return dup;
  notifications.unshift(item);
  if (notifications.length > 100) notifications.length = 100;
  return item;
}

export function listNotifications() {
  return notifications.slice(0, 40);
}

export function shellManifest() {
  return {
    schema: "sci-os-shell-runtime/v1",
    label: "ALPHA_NON_PRODUCTION",
    shell: "SCI OSShell",
    primaryNav: [
      "HOME",
      "WORK",
      "CASES",
      "ENTITIES",
      "ANALYZE",
      "RISK",
      "SIMULATE",
      "REPORTS",
    ],
    secondaryNav: ["SYSTEM", "RECOVERY", "SETTINGS"],
    commandPalette: "Ctrl+K",
    search: "GET /v1/search",
    session: "GET/PUT /v1/os/session",
    jobs: "GET/POST /v1/os/jobs, PATCH /v1/os/jobs/:id",
    notifications: "GET /v1/os/notifications",
    jobStates: JOB_STATES,
  };
}

/** Test helper — deterministic idempotency digest */
export function jobIdempotencyDigest(key: string) {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}
