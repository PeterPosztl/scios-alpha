/**
 * In-memory + file-backed OS session / jobs / notifications for control-plane.
 * ALPHA_NON_PRODUCTION — CF11 job-state contract (local-durable).
 * Canonical job-state authority — do not duplicate elsewhere.
 */
import { randomUUID, createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

export interface SessionRecentEntry {
  id?: string | undefined;
  title?: string | undefined;
  at: string;
}

export interface SessionRecent {
  entities: SessionRecentEntry[];
  analyses: SessionRecentEntry[];
  searches: SessionRecentEntry[];
}

/**
 * Session shape is declared explicitly because `recent` is read as
 * `session.recent.entities` by callers. A persisted session file written by an
 * older schema can omit `recent`, so normalizeRecent() must run after any merge.
 */
export interface OsSession extends Record<string, unknown> {
  sessionId: string;
  schemaVersion: string;
  recent: SessionRecent;
  updatedAt: string;
}

function normalizeRecent(value: unknown): SessionRecent {
  const v = (value && typeof value === "object" ? value : {}) as Partial<SessionRecent>;
  return {
    entities: Array.isArray(v.entities) ? v.entities : [],
    analyses: Array.isArray(v.analyses) ? v.analyses : [],
    searches: Array.isArray(v.searches) ? v.searches : [],
  };
}

const sessions = new Map<string, OsSession>();
const jobs = new Map<string, Record<string, unknown>>();
const notifications: Record<string, unknown>[] = [];
let jobsHydrated = false;

export const JOB_SCHEMA_VERSION = "sci-os-job/v1";

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

export const JOB_TERMINAL_STATES: JobState[] = ["COMPLETED", "FAILED", "CANCELLED"];

export const JOB_NON_TERMINAL_STATES: JobState[] = [
  "QUEUED",
  "RUNNING",
  "PAUSED",
  "DELAYED",
  "BLOCKED",
];

/** Explicit transition matrix — single validator authority */
export const TRANSITION_MATRIX: Record<string, JobState[]> = {
  QUEUED: ["RUNNING", "DELAYED", "CANCELLED", "BLOCKED", "COMPLETED"],
  RUNNING: ["PAUSED", "COMPLETED", "FAILED", "CANCELLED", "BLOCKED"],
  PAUSED: ["RUNNING", "CANCELLED", "FAILED"],
  DELAYED: ["QUEUED", "RUNNING", "CANCELLED", "BLOCKED"],
  BLOCKED: ["QUEUED", "CANCELLED"],
  COMPLETED: [],
  FAILED: ["QUEUED"],
  CANCELLED: [],
};

const TRANSITIONS = TRANSITION_MATRIX;

const JOB_ID_RE = /^job_[0-9a-f-]{36}$/i;

function dataRoot() {
  const base = process.env.SCIOS_USER_DATA || process.env.LOCALAPPDATA || process.cwd();
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

function invalidJobsDir() {
  const dir = join(dataRoot(), "jobs", ".invalid");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function sessionPath(id: string) {
  return join(sessionDir(), `${id}.json`);
}

function jobPath(jobId: string) {
  if (!JOB_ID_RE.test(jobId)) {
    throw new Error("INVALID_JOB_ID");
  }
  return join(jobsDir(), `${jobId}.json`);
}

export function isSafeJobId(jobId: string) {
  return JOB_ID_RE.test(jobId);
}

/** Atomic write: temp → rename (local-durable foundation) */
function persistJob(job: Record<string, unknown>) {
  const id = String(job.jobId);
  const target = jobPath(id);
  const tmp = `${target}.${process.pid}.tmp`;
  const payload = JSON.stringify(job, null, 2);
  writeFileSync(tmp, payload, "utf8");
  if (existsSync(target)) unlinkSync(target);
  renameSync(tmp, target);
}

function appendTransitionEvidence(
  job: Record<string, unknown>,
  from: string,
  to: string,
  meta: Record<string, unknown> = {}
) {
  const refs = Array.isArray(job.evidenceRefs) ? job.evidenceRefs : [];
  const fromVersion = typeof job.stateVersion === "number" ? job.stateVersion : 0;
  refs.push({
    kind: "job_state_transition",
    evidenceId: `ev_${randomUUID()}`,
    jobId: job.jobId,
    jobType: job.jobType,
    fromState: from,
    toState: to,
    stateVersionBefore: fromVersion,
    stateVersionAfter: fromVersion + 1,
    actorId: meta.actorId || job.createdBy || null,
    origin: meta.origin || "patch",
    reason: meta.reason || null,
    at: new Date().toISOString(),
    buildId: process.env.SCIOS_BUILD_ID || null,
    runId: process.env.SCIOS_RUN_ID || null,
  });
  job.evidenceRefs = refs.slice(-50);

  const history = Array.isArray(job.stateHistory) ? job.stateHistory : [];
  history.push({ from, to, at: new Date().toISOString(), stateVersion: fromVersion + 1 });
  job.stateHistory = history.slice(-30);
}

export interface TransitionResult {
  allowed: boolean;
  currentState: string;
  requestedState: string;
  reason: string | null;
  transitionType: "NOOP" | "VALID" | "INVALID_STATE" | "INVALID_TRANSITION";
}

export function canTransition(current: string, requested: string): TransitionResult {
  const base: TransitionResult = {
    allowed: false,
    currentState: current,
    requestedState: requested,
    reason: null,
    transitionType: "INVALID_TRANSITION",
  };
  if (!JOB_STATES.includes(requested as JobState)) {
    return { ...base, reason: `unknown state: ${requested}`, transitionType: "INVALID_STATE" };
  }
  if (current === requested) {
    return {
      allowed: true,
      currentState: current,
      requestedState: requested,
      reason: "same_state_noop",
      transitionType: "NOOP",
    };
  }
  const allowed = TRANSITIONS[current] || [];
  if (!allowed.includes(requested as JobState)) {
    return {
      ...base,
      reason: `forbidden: ${current} → ${requested}`,
      transitionType: "INVALID_TRANSITION",
    };
  }
  return {
    allowed: true,
    currentState: current,
    requestedState: requested,
    reason: null,
    transitionType: "VALID",
  };
}

export function validateJobTransition(from: string, to: string) {
  const r = canTransition(from, to);
  if (r.transitionType === "INVALID_STATE") {
    return { ok: false, code: "INVALID_STATE", detail: to };
  }
  if (r.transitionType === "INVALID_TRANSITION") {
    return { ok: false, code: "INVALID_TRANSITION", detail: `${from} → ${to}` };
  }
  return { ok: true };
}

type DependencyValidation =
  | { ok: true; deps: string[]; code?: undefined }
  | { ok: false; code: string; deps?: undefined };

function validateDependencies(deps: unknown): DependencyValidation {
  if (deps == null) return { ok: true, deps: [] as string[] };
  if (!Array.isArray(deps)) return { ok: false, code: "INVALID_DEPENDENCIES" };
  const seen = new Set<string>();
  for (const d of deps) {
    if (typeof d !== "string" || !JOB_ID_RE.test(d)) {
      return { ok: false, code: "INVALID_DEPENDENCY_REF" };
    }
    if (seen.has(d)) return { ok: false, code: "DUPLICATE_DEPENDENCY" };
    seen.add(d);
  }
  return { ok: true, deps: [...seen] };
}

function hydrateJobs() {
  if (jobsHydrated) return;
  jobsHydrated = true;
  const dir = jobsDir();
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith(".json")) continue;
    const abs = join(dir, ent.name);
    try {
      const raw = readFileSync(abs, "utf8");
      if (!raw.trim() || raw.trim().length < 2) {
        quarantineRecord(abs, ent.name, "JOB_STATE_RECORD_EMPTY");
        continue;
      }
      const j = JSON.parse(raw);
      if (!j?.jobId || j.schema !== JOB_SCHEMA_VERSION) {
        quarantineRecord(abs, ent.name, "JOB_STATE_RECORD_INVALID");
        continue;
      }
      if (!JOB_STATES.includes(j.state)) {
        quarantineRecord(abs, ent.name, "JOB_STATE_UNKNOWN");
        continue;
      }
      jobs.set(j.jobId, j);
    } catch {
      quarantineRecord(abs, ent.name, "JOB_STATE_RECORD_CORRUPT");
    }
  }
}

function quarantineRecord(abs: string, name: string, code: string) {
  try {
    const dest = join(invalidJobsDir(), `${Date.now()}_${name}`);
    renameSync(abs, dest);
  } catch {
    /* best effort */
  }
  return code;
}

export function getOrCreateSession(sessionId?: string) {
  const id = sessionId || "default";
  if (sessions.has(id)) return sessions.get(id)!;
  const p = sessionPath(id);
  let s: OsSession = {
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
      {
        workspaceId: "ws_analyze_aapl",
        title: "Analyze AAPL (simulated)",
        appId: "app.analyze",
        objectId: "AAPL",
        pinned: true,
      },
      {
        workspaceId: "ws_dil_fed",
        title: "Intelligence · Fed cut (simulated)",
        appId: "app.dil",
        objectId: "pm-fed-cut-oct",
        pinned: false,
      },
      {
        workspaceId: "ws_ecl_book",
        title: "Reporting · simulated book",
        appId: "app.ecl",
        objectId: "ecl-book",
        pinned: false,
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
      const persisted = JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
      s = { ...s, ...persisted, sessionId: id, recent: normalizeRecent(persisted.recent ?? s.recent) };
    } catch {
      /* keep default */
    }
  }
  sessions.set(id, s);
  return s;
}

export function saveSession(session: OsSession) {
  session.updatedAt = new Date().toISOString();
  sessions.set(String(session.sessionId), session);
  writeFileSync(sessionPath(String(session.sessionId)), JSON.stringify(session, null, 2));
  return session;
}

export function createJob(input: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) {
  hydrateJobs();
  const idempotencyKey =
    typeof input.idempotencyKey === "string" ? input.idempotencyKey : null;
  if (idempotencyKey) {
    for (const j of jobs.values()) {
      if (j.idempotencyKey === idempotencyKey) return { job: j, error: null };
    }
  }

  const depCheck = validateDependencies(input.dependencies);
  if (!depCheck.ok) return { job: null, error: depCheck.code };
  for (const d of depCheck.deps) {
    if (typeof input.jobId === "string" && d === input.jobId) {
      return { job: null, error: "SELF_DEPENDENCY" };
    }
  }

  const actor = meta.actor as Record<string, unknown> | undefined;
  const now = new Date().toISOString();
  const job: Record<string, unknown> = {
    schema: JOB_SCHEMA_VERSION,
    label: "ALPHA_NON_PRODUCTION",
    jobId: `job_${randomUUID()}`,
    jobType: input.type || input.jobType || "analysis",
    title: input.title || "Background job",
    desiredState: "COMPLETED",
    actualState: "QUEUED" as JobState,
    state: "QUEUED" as JobState,
    stateVersion: 1,
    priority: input.priority || "P1",
    progress: 0,
    stages: input.stages || [],
    currentStage: null,
    result: null,
    error: null,
    objectId: input.objectId || null,
    objectRef: input.objectRef || input.objectId || null,
    workflowId: input.workflowId || null,
    idempotencyKey,
    attempts: 0,
    currentAttempt: 1,
    maxAttempts: input.maxAttempts ?? 3,
    retryPolicy: input.retryPolicy || { kind: "bounded", maxAttempts: 3 },
    dependencies: depCheck.deps,
    resourceRequirements: input.resourceRequirements || null,
    connectivityRequirement: input.connectivityRequirement || "OPTIONAL",
    evidenceRefs: [],
    stateHistory: [],
    actorContext: actor
      ? {
          actorId: actor.actorId,
          roleId: actor.roleId,
          sessionId: actor.sessionId,
          origin: meta.origin || "user",
        }
      : {
          actorId: "actor:local-dev-user",
          roleId: "arch.market_analyst",
          origin: meta.origin || "system",
        },
    lifecycleState: "SUBMITTED",
    correlationId: `corr_${randomUUID()}`,
    retryPending: false,
    retryExhausted: false,
    recoveryInfo: null,
    createdAt: now,
    updatedAt: now,
    createdBy: actor?.actorId || input.createdBy || "local-dev-user",
  };

  jobs.set(String(job.jobId), job);
  persistJob(job);
  return { job, error: null };
}

export function getJob(jobId: string) {
  if (!isSafeJobId(jobId)) return null;
  hydrateJobs();
  return jobs.get(jobId) || null;
}

const PATCH_ALLOWED = new Set([
  "state",
  "actualState",
  "progress",
  "result",
  "error",
  "currentStage",
  "attempts",
  "currentAttempt",
  "expectedVersion",
  "reason",
  "lifecycleState",
  "correlationId",
  "retryPending",
  "retryExhausted",
  "recoveryInfo",
  "startedAt",
  "completedAt",
]);

export function filterJobPatch(patch: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (PATCH_ALLOWED.has(k)) out[k] = v;
  }
  return out;
}

export function updateJob(
  jobId: string,
  patch: Record<string, unknown>,
  meta: Record<string, unknown> = {}
) {
  if (!isSafeJobId(jobId)) return { job: null, error: "INVALID_JOB_ID" };
  hydrateJobs();
  const j = jobs.get(jobId);
  if (!j) return { job: null, error: "NOT_FOUND" };

  const expectedVersion = patch.expectedVersion;
  const currentVersion = typeof j.stateVersion === "number" ? j.stateVersion : 1;
  if (expectedVersion != null && Number(expectedVersion) !== currentVersion) {
    return {
      job: null,
      error: "VERSION_CONFLICT",
      detail: { expected: expectedVersion, current: currentVersion },
    };
  }

  const nextState = patch.state || patch.actualState;
  if (nextState && nextState !== j.state) {
    const tr = canTransition(String(j.state), String(nextState));
    if (!tr.allowed || tr.transitionType === "INVALID_TRANSITION" || tr.transitionType === "INVALID_STATE") {
      return { job: null, error: tr.transitionType === "INVALID_STATE" ? "INVALID_STATE" : "INVALID_TRANSITION", detail: tr.reason };
    }
    appendTransitionEvidence(j, String(j.state), String(nextState), {
      reason: meta.reason as string | undefined,
      actorId: (meta.actor as Record<string, unknown>)?.actorId || j.createdBy,
      origin: meta.origin || "patch",
    });
    j.state = nextState;
    j.actualState = nextState;
    j.stateVersion = currentVersion + 1;
  } else if (nextState && nextState === j.state) {
    /* NOOP — same state, no version bump, no duplicate evidence */
  }

  if (typeof patch.progress === "number") {
    j.progress = Math.max(0, Math.min(100, patch.progress));
  }
  if ("result" in patch) j.result = patch.result;
  if ("error" in patch) j.error = patch.error;
  if ("currentStage" in patch) j.currentStage = patch.currentStage;
  if (patch.attempts != null) j.attempts = patch.attempts;
  if (patch.currentAttempt != null) j.currentAttempt = patch.currentAttempt;
  if (patch.lifecycleState != null) j.lifecycleState = patch.lifecycleState;
  if (patch.correlationId != null) j.correlationId = patch.correlationId;
  if (patch.retryPending != null) j.retryPending = patch.retryPending;
  if (patch.retryExhausted != null) j.retryExhausted = patch.retryExhausted;
  if ("recoveryInfo" in patch) j.recoveryInfo = patch.recoveryInfo;
  if (patch.startedAt != null) j.startedAt = patch.startedAt;
  if (patch.completedAt != null) j.completedAt = patch.completedAt;

  j.updatedAt = new Date().toISOString();
  jobs.set(jobId, j);
  persistJob(j);
  return { job: j, error: null };
}

export function listJobs() {
  hydrateJobs();
  return [...jobs.values()].sort((a, b) =>
    String(a.createdAt) < String(b.createdAt) ? 1 : -1
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
      Date.now() - Date.parse(String(x.time)) < 30000
  );
  if (dup) return dup;
  notifications.unshift(item);
  if (notifications.length > 100) notifications.length = 100;
  return item;
}

let simulatedAlphaNotificationsSeeded = false;

function seedSimulatedAlphaNotifications() {
  if (simulatedAlphaNotificationsSeeded) return;
  simulatedAlphaNotificationsSeeded = true;
  pushNotification({
    type: "ATTENTION",
    source: "simulated_alpha",
    object: "Entity:AAPL",
    severity: "info",
    reason: "SIMULATED — AAPL is on the local catalog. Run Analyze for a GW1 slice. Not live market data.",
    action: "analyze",
  });
  pushNotification({
    type: "INTELLIGENCE",
    source: "simulated_alpha",
    object: "pm-fed-cut-oct",
    severity: "info",
    reason: "SIMULATED — 3 prediction-market rows are on Intelligence. Agent proposes; you decide. No auto-trade.",
    action: "open_intelligence",
  });
  pushNotification({
    type: "REPORTING",
    source: "simulated_alpha",
    object: "ecl-book",
    severity: "info",
    reason: "SIMULATED — ECL book has 3 instruments in-memory. Not a durable ledger.",
    action: "open_reporting",
  });
}

export function listNotifications() {
  seedSimulatedAlphaNotifications();
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
    jobs: "GET/POST /v1/os/jobs, PATCH /v1/os/jobs/:id, POST /v1/os/jobs/:id/{start,complete,fail,retry,cancel,recover}",
    jobEngine: "GET /v1/os/job-engine/status, POST /v1/os/job-engine/reconcile-stale",
    jobsHealth: "GET /v1/jobs/health",
    notifications: "GET /v1/os/notifications",
    jobStates: JOB_STATES,
    jobTerminalStates: JOB_TERMINAL_STATES,
    transitionMatrix: TRANSITION_MATRIX,
  };
}

/** Recovery boundary: WHI-010 must not mutate job semantics — reconcile marker only */
/**
 * `reconciled` must be present on every branch: callers gate boot-recovery
 * reporting on it, so omitting it on the transition path silently under-reports
 * reconciled jobs.
 */
export function reconcileInterruptedJob(jobId: string): {
  job: Record<string, unknown> | null;
  reconciled: boolean;
  error: string | null;
} {
  const j = getJob(jobId);
  if (!j || j.state !== "RUNNING") return { job: j ?? null, reconciled: false, error: null };
  const out = updateJob(
    jobId,
    { state: "BLOCKED", expectedVersion: j.stateVersion, reason: "runtime_interrupted" },
    { origin: "recovery-reconcile", reason: "WHI-010 boundary — job layer owns semantics" }
  );
  return {
    job: out.job ?? null,
    reconciled: Boolean(out.job && !out.error),
    error: out.error ?? null,
  };
}

export function jobIdempotencyDigest(key: string) {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

/** Test helper — reset in-memory cache (does not delete files) */
export function resetJobsCacheForTests() {
  jobs.clear();
  jobsHydrated = false;
}
