/**
 * In-memory + file-backed OS session / jobs / notifications for control-plane.
 * ALPHA_NON_PRODUCTION
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const sessions = new Map();
const jobs = new Map();
const notifications = [];

function dataDir() {
  const base =
    process.env.SCIOS_USER_DATA ||
    process.env.LOCALAPPDATA ||
    process.cwd();
  const dir = join(base, "SCI OS X10", "data", "session");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function sessionPath(id) {
  return join(dataDir(), `${id}.json`);
}

export function getOrCreateSession(sessionId) {
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

export function saveSession(session) {
  session.updatedAt = new Date().toISOString();
  sessions.set(session.sessionId, session);
  writeFileSync(sessionPath(session.sessionId), JSON.stringify(session, null, 2));
  return session;
}

export function createJob(input) {
  const job = {
    jobId: `job_${randomUUID()}`,
    type: input.type || "analysis",
    title: input.title || "Background job",
    state: "QUEUED",
    priority: input.priority || "P1",
    stages: input.stages || [],
    currentStage: null,
    result: null,
    error: null,
    objectId: input.objectId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(job.jobId, job);
  return job;
}

export function updateJob(jobId, patch) {
  const j = jobs.get(jobId);
  if (!j) return null;
  Object.assign(j, patch, { updatedAt: new Date().toISOString() });
  return j;
}

export function listJobs() {
  return [...jobs.values()].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );
}

export function pushNotification(n) {
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
  // dedupe by reason+object within 30s window
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
    jobs: "GET /v1/os/jobs",
    notifications: "GET /v1/os/notifications",
  };
}
