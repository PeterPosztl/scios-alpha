"use strict";

/**
 * WHI-010 — Recovery Intelligence: bounded host-state-aware self-healing.
 * Consumes WHI-011 Host Digital Twin + WHI-001 ownership. Does not replace
 * start-sci-os.cjs, ProcessSupervisor, or @scios/meta-recovery.
 * ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hostResult } = require("./contract.cjs");

const SCHEMA = "sci-os-recovery-intelligence/v1";
const CANONICAL_SLICE_ID = "WHI-010";

// ─── Incident states ────────────────────────────────────────────────────────
const INCIDENT_STATES = [
  "DETECTED",
  "CLASSIFIED",
  "RECOVERY_ALLOWED",
  "RECOVERY_DENIED",
  "REPAIRING",
  "VERIFYING",
  "RECOVERED",
  "FAILED",
  "COOLDOWN",
  "CIRCUIT_OPEN",
  "USER_ACTION_REQUIRED",
];

// ─── Failure classes ────────────────────────────────────────────────────────
const FAILURE_CLASSES = {
  SCI_PROCESS_CRASH: { eligible: "AUTO_IF_OWNED", severity: "P1" },
  SCI_PROCESS_MISSING: { eligible: "AUTO_IF_OWNED", severity: "P1" },
  SCI_PROCESS_CONTAINMENT_FAILURE: { eligible: "CONTAINMENT_RECONCILE", severity: "P2" },
  SCI_PORT_MISSING: { eligible: "AUTO_IF_OWNED", severity: "P1" },
  FOREIGN_PORT_CONFLICT: { eligible: "DENY", severity: "P1" },
  STALE_SCI_LOCK: { eligible: "CLEAR_IF_PROVEN_STALE", severity: "P2" },
  LOCK_OWNERSHIP_UNKNOWN: { eligible: "DENY", severity: "P2" },
  BUILD_IDENTITY_MISMATCH: { eligible: "DENY_RESTART", severity: "P1" },
  INSTALL_IDENTITY_MISMATCH: { eligible: "DENY_RESTART", severity: "P1" },
  JOB_OBJECT_UNAVAILABLE: { eligible: "DEGRADED_ACCEPT", severity: "P2" },
  RESOURCE_PRESSURE: { eligible: "DEGRADED_NO_LOOP", severity: "P2" },
  OPTIONAL_HOST_SIGNAL_UNAVAILABLE: { eligible: "DEGRADED_ACCEPT", severity: "P3" },
  UNKNOWN_HOST_FAILURE: { eligible: "DENY", severity: "P2" },
};

// ─── Recovery budget defaults (ALPHA) ───────────────────────────────────────
const DEFAULTS = {
  maxAttemptsPerComponent: 3,
  maxAttemptsPerIncident: 3,
  cooldownMs: 30000,
  circuitOpenAfter: 3,
  budgetWindowMs: 300000,
};

// ─── Utility ────────────────────────────────────────────────────────────────
function newIncidentId() {
  return `inc_${crypto.randomBytes(6).toString("hex")}`;
}

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function writeJsonSafe(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

// ─── Drift → Failure Classification ────────────────────────────────────────
function classifyDriftToFailure(drift) {
  const map = {
    PROCESS_MISSING: "SCI_PROCESS_MISSING",
    PROCESS_NOT_CONTAINED: "SCI_PROCESS_CONTAINMENT_FAILURE",
    PORT_MISSING: "SCI_PORT_MISSING",
    PORT_FOREIGN_OWNER: "FOREIGN_PORT_CONFLICT",
    BUILD_MISMATCH: "BUILD_IDENTITY_MISMATCH",
    NODE_RUNTIME_MISMATCH: "INSTALL_IDENTITY_MISMATCH",
    INSTALL_ROOT_MISMATCH: "INSTALL_IDENTITY_MISMATCH",
    LOCK_STALE_CANDIDATE: "STALE_SCI_LOCK",
    LOW_DISK_OBSERVED: "RESOURCE_PRESSURE",
    MEMORY_PRESSURE_OBSERVED: "RESOURCE_PRESSURE",
    HOST_SIGNAL_UNAVAILABLE: "OPTIONAL_HOST_SIGNAL_UNAVAILABLE",
  };
  return map[drift.type] || "UNKNOWN_HOST_FAILURE";
}

// ─── Ownership gate ─────────────────────────────────────────────────────────
function verifyOwnership(component, runContext, supervisorSnap) {
  if (!runContext || !runContext.buildId || !runContext.bootId || !runContext.runId) {
    return { pass: false, reason: "MISSING_RUN_CONTEXT" };
  }
  if (!supervisorSnap || !supervisorSnap.services) {
    return { pass: false, reason: "NO_SUPERVISOR_SNAPSHOT" };
  }
  const svc = supervisorSnap.services[component];
  if (!svc) {
    return { pass: false, reason: "COMPONENT_NOT_REGISTERED" };
  }
  if (!svc.ownership || svc.ownership.buildId !== runContext.buildId) {
    return { pass: false, reason: "BUILD_ID_MISMATCH" };
  }
  if (svc.ownership.runId !== runContext.runId) {
    return { pass: false, reason: "RUN_ID_MISMATCH" };
  }
  return { pass: true, pid: svc.pid, component };
}

// ─── Recovery eligibility ───────────────────────────────────────────────────
function determineEligibility(failureClass, opts = {}) {
  const def = FAILURE_CLASSES[failureClass];
  if (!def) return { eligible: false, reason: "UNKNOWN_FAILURE_CLASS", policy: "DENY" };

  const policy = def.eligible;

  if (policy === "DENY") {
    return { eligible: false, reason: failureClass, policy };
  }
  if (policy === "DENY_RESTART") {
    return { eligible: false, reason: "IDENTITY_MISMATCH_NO_RESTART", policy };
  }
  if (policy === "DEGRADED_NO_LOOP") {
    return { eligible: false, reason: "RESOURCE_PRESSURE_NO_LOOP", policy };
  }
  if (policy === "DEGRADED_ACCEPT") {
    return { eligible: false, reason: "DEGRADED_ACCEPT_NO_ACTION", policy };
  }
  if (policy === "AUTO_IF_OWNED") {
    if (!opts.ownershipVerified) {
      return { eligible: false, reason: "OWNERSHIP_NOT_PROVEN", policy };
    }
    return { eligible: true, policy };
  }
  if (policy === "CONTAINMENT_RECONCILE") {
    if (!opts.ownershipVerified) {
      return { eligible: false, reason: "OWNERSHIP_NOT_PROVEN", policy };
    }
    return { eligible: true, policy };
  }
  if (policy === "CLEAR_IF_PROVEN_STALE") {
    if (!opts.lockOwnerGone || !opts.lockRunStale) {
      return { eligible: false, reason: "LOCK_NOT_PROVEN_STALE", policy };
    }
    return { eligible: true, policy };
  }
  return { eligible: false, reason: "UNHANDLED_POLICY", policy };
}

// ─── Retry budget (persistent within a run) ─────────────────────────────────
class RetryBudget {
  constructor(opts = {}) {
    this.maxPerComponent = opts.maxAttemptsPerComponent || DEFAULTS.maxAttemptsPerComponent;
    this.maxPerIncident = opts.maxAttemptsPerIncident || DEFAULTS.maxAttemptsPerIncident;
    this.cooldownMs = opts.cooldownMs || DEFAULTS.cooldownMs;
    this.circuitOpenAfter = opts.circuitOpenAfter || DEFAULTS.circuitOpenAfter;
    this.records = new Map(); // key → { attempts, lastAttempt, circuitOpen }
  }

  _key(component, failureClass) { return `${component}|${failureClass}`; }

  canAttempt(component, failureClass) {
    const k = this._key(component, failureClass);
    const rec = this.records.get(k);
    if (!rec) return { allowed: true };
    if (rec.circuitOpen) return { allowed: false, reason: "CIRCUIT_OPEN" };
    if (rec.attempts >= this.maxPerComponent) return { allowed: false, reason: "BUDGET_EXHAUSTED" };
    const elapsed = Date.now() - rec.lastAttempt;
    if (elapsed < this.cooldownMs) {
      return { allowed: false, reason: "COOLDOWN_ACTIVE", remainingMs: this.cooldownMs - elapsed };
    }
    return { allowed: true };
  }

  record(component, failureClass, success) {
    const k = this._key(component, failureClass);
    let rec = this.records.get(k);
    if (!rec) {
      rec = { attempts: 0, lastAttempt: 0, circuitOpen: false, successes: 0, failures: 0 };
      this.records.set(k, rec);
    }
    rec.attempts++;
    rec.lastAttempt = Date.now();
    if (success) rec.successes++;
    else rec.failures++;
    if (rec.failures >= this.circuitOpenAfter) {
      rec.circuitOpen = true;
    }
    return rec;
  }

  state(component, failureClass) {
    const k = this._key(component, failureClass);
    return this.records.get(k) || null;
  }

  serialize() {
    const out = {};
    for (const [k, v] of this.records) out[k] = v;
    return out;
  }
}

// ─── Single-flight guard ────────────────────────────────────────────────────
class SingleFlightGuard {
  constructor() { this.active = new Set(); }

  acquire(key) {
    if (this.active.has(key)) return false;
    this.active.add(key);
    return true;
  }

  release(key) { this.active.delete(key); }
  isActive(key) { return this.active.has(key); }
}

// ─── Recovery incident ──────────────────────────────────────────────────────
function createIncident(opts) {
  return {
    schema: SCHEMA,
    incidentId: opts.incidentId || newIncidentId(),
    buildId: opts.buildId || null,
    bootId: opts.bootId || null,
    runId: opts.runId || null,
    detectedAt: opts.detectedAt || new Date().toISOString(),
    source: opts.source || "host-digital-twin",
    hostTwinSnapshotRef: opts.hostTwinSnapshotRef || null,
    driftIds: opts.driftIds || [],
    failureClass: opts.failureClass || "UNKNOWN_HOST_FAILURE",
    affectedComponents: opts.affectedComponents || [],
    ownershipEvidence: opts.ownershipEvidence || null,
    severity: opts.severity || "P2",
    recoveryEligibility: opts.recoveryEligibility || null,
    policyDecision: opts.policyDecision || null,
    attemptCount: opts.attemptCount || 0,
    cooldownUntil: opts.cooldownUntil || null,
    circuitState: opts.circuitState || "CLOSED",
    action: opts.action || null,
    verification: opts.verification || null,
    evidenceRefs: opts.evidenceRefs || [],
    state: opts.state || "DETECTED",
  };
}

// ─── Intentional stop suppression ───────────────────────────────────────────
function isIntentionallyStopped(hostTwin) {
  if (!hostTwin) return false;
  const desired = hostTwin.desired || {};
  const actual = hostTwin.actual || {};
  return desired.lifecycle === "STOPPED" && actual.runtimeStatus === "STOPPED";
}

// ─── Backup candidate resolver ──────────────────────────────────────────────
function resolveBackupCandidates(productRoot) {
  if (!productRoot || !fs.existsSync(productRoot)) {
    return { candidates: [], valid: null, note: "product_root_missing" };
  }
  const entries = fs.readdirSync(productRoot, { withFileTypes: true });
  const candidates = [];
  const installDir = path.join(productRoot, "app");

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (!ent.name.startsWith("app.backup")) continue;
    const abs = path.join(productRoot, ent.name);
    const idPath = path.join(abs, "manifests", "build-identity.json");
    const identity = readJsonSafe(idPath);
    const nodePath = path.join(abs, "runtime", "node", "node.exe");
    const hasNode = fs.existsSync(nodePath);
    const manifestPath = path.join(abs, "manifests", "golden-boot.packaged.json");
    const hasManifest = fs.existsSync(manifestPath);
    const isAlias = ent.name === "app.backup.last";
    const timestamp = isAlias ? null : parseInt(ent.name.replace("app.backup.", ""), 10) || null;
    const isActive = abs === installDir;

    candidates.push({
      name: ent.name,
      path: abs,
      isAlias,
      timestamp,
      buildId: identity && identity.buildId,
      hasNode,
      hasManifest,
      complete: !!(identity && hasNode && hasManifest),
      isActive,
      rejected: isActive ? "ACTIVE_APP_DIRECTORY" : !identity ? "NO_IDENTITY" : !hasNode ? "MISSING_NODE" : !hasManifest ? "MISSING_MANIFEST" : null,
    });
  }

  candidates.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const valid = candidates.find((c) => c.complete && !c.isActive && !c.rejected);
  return { candidates, valid: valid || null };
}

// ─── Recovery Memory (append-only file) ─────────────────────────────────────
class RecoveryMemory {
  constructor(appRoot) {
    this.filePath = path.join(appRoot, "diagnostics-export", "host", "recovery-memory.json");
  }

  load() {
    return readJsonSafe(this.filePath) || { schema: "sci-os-recovery-memory/v1", entries: [] };
  }

  append(entry) {
    const mem = this.load();
    mem.entries.push({ ...entry, recordedAt: new Date().toISOString() });
    if (mem.entries.length > 200) mem.entries = mem.entries.slice(-200);
    writeJsonSafe(this.filePath, mem);
  }
}

// ─── Recovery Intelligence engine ───────────────────────────────────────────
class RecoveryIntelligence {
  constructor(opts = {}) {
    this.appRoot = opts.appRoot || process.cwd();
    this.budget = new RetryBudget(opts.budgetOpts);
    this.singleFlight = new SingleFlightGuard();
    this.memory = new RecoveryMemory(this.appRoot);
    this.incidents = [];
  }

  /**
   * Evaluate host twin drift and produce classified incidents.
   * Does NOT auto-repair; returns incidents with eligibility decisions.
   */
  evaluate(hostTwin, runContext, supervisorSnap) {
    if (isIntentionallyStopped(hostTwin)) {
      return {
        suppressed: true,
        reason: "INTENTIONALLY_STOPPED",
        incidents: [],
      };
    }

    const drift = (hostTwin && hostTwin.drift) || [];
    if (drift.length === 0) {
      return { suppressed: false, incidents: [], aligned: true };
    }

    const incidents = [];
    for (const d of drift) {
      const failureClass = classifyDriftToFailure(d);
      const components = d.expected && d.expected.role ? [d.expected.role] : [];
      const component = components[0] || "unknown";

      const ownership = component !== "unknown"
        ? verifyOwnership(component, runContext, supervisorSnap)
        : { pass: false, reason: "NO_COMPONENT" };

      const lockOpts = failureClass === "STALE_SCI_LOCK" ? {
        lockOwnerGone: hostTwin.locks && !hostTwin.locks.ownerAlive,
        lockRunStale: hostTwin.locks && hostTwin.locks.staleCandidate,
      } : {};

      const eligibility = determineEligibility(failureClass, {
        ownershipVerified: ownership.pass,
        ...lockOpts,
      });

      const budgetCheck = eligibility.eligible
        ? this.budget.canAttempt(component, failureClass)
        : { allowed: false, reason: "INELIGIBLE" };

      let state = "CLASSIFIED";
      let circuitState = "CLOSED";
      if (eligibility.eligible && budgetCheck.allowed) {
        state = "RECOVERY_ALLOWED";
      } else if (budgetCheck.reason === "CIRCUIT_OPEN") {
        state = "CIRCUIT_OPEN";
        circuitState = "OPEN";
      } else if (budgetCheck.reason === "COOLDOWN_ACTIVE") {
        state = "COOLDOWN";
      } else if (!eligibility.eligible) {
        state = failureClass === "FOREIGN_PORT_CONFLICT" || failureClass === "BUILD_IDENTITY_MISMATCH"
          ? "USER_ACTION_REQUIRED"
          : "RECOVERY_DENIED";
      }

      const severity = (FAILURE_CLASSES[failureClass] || {}).severity || "P2";
      const incident = createIncident({
        buildId: runContext && runContext.buildId,
        bootId: runContext && runContext.bootId,
        runId: runContext && runContext.runId,
        source: "host-digital-twin",
        hostTwinSnapshotRef: hostTwin.identity && hostTwin.identity.observedAt,
        driftIds: [d.driftId],
        failureClass,
        affectedComponents: components,
        ownershipEvidence: ownership,
        severity,
        recoveryEligibility: eligibility,
        policyDecision: eligibility.policy,
        circuitState,
        state,
      });
      incidents.push(incident);
    }
    this.incidents = incidents;
    return { suppressed: false, incidents, aligned: false };
  }

  /**
   * Attempt bounded recovery for a single incident. Returns updated incident.
   * Requires `repairFn(component)` — typically ProcessSupervisor restart.
   * Requires `verifyFn(component)` — typically health check + twin reobserve.
   */
  async attemptRecovery(incident, repairFn, verifyFn) {
    if (incident.state !== "RECOVERY_ALLOWED") {
      return { ...incident, action: null, note: "NOT_ALLOWED" };
    }

    const component = incident.affectedComponents[0] || "unknown";
    const flightKey = `${component}|${incident.failureClass}`;

    if (!this.singleFlight.acquire(flightKey)) {
      return { ...incident, state: "COOLDOWN", action: null, note: "SINGLE_FLIGHT_BLOCKED" };
    }

    try {
      incident.state = "REPAIRING";
      incident.attemptCount++;

      let repairResult;
      try {
        repairResult = await repairFn(component);
      } catch (e) {
        repairResult = { ok: false, error: String(e.message || e) };
      }
      incident.action = { type: "BOUNDED_RESTART", component, result: repairResult, at: new Date().toISOString() };

      if (!repairResult || !repairResult.ok) {
        const rec = this.budget.record(component, incident.failureClass, false);
        incident.state = rec.circuitOpen ? "CIRCUIT_OPEN" : "FAILED";
        incident.circuitState = rec.circuitOpen ? "OPEN" : "CLOSED";
        incident.cooldownUntil = new Date(Date.now() + this.budget.cooldownMs).toISOString();
        this.memory.append({
          incidentId: incident.incidentId,
          failureClass: incident.failureClass,
          component,
          action: "BOUNDED_RESTART",
          attempt: incident.attemptCount,
          success: false,
          buildId: incident.buildId,
        });
        return incident;
      }

      incident.state = "VERIFYING";
      let verification;
      try {
        verification = await verifyFn(component);
      } catch (e) {
        verification = { ok: false, error: String(e.message || e) };
      }
      incident.verification = verification;

      if (verification && verification.ok) {
        this.budget.record(component, incident.failureClass, true);
        incident.state = "RECOVERED";
        this.memory.append({
          incidentId: incident.incidentId,
          failureClass: incident.failureClass,
          component,
          action: "BOUNDED_RESTART",
          attempt: incident.attemptCount,
          success: true,
          buildId: incident.buildId,
          verification,
        });
      } else {
        const rec = this.budget.record(component, incident.failureClass, false);
        incident.state = rec.circuitOpen ? "CIRCUIT_OPEN" : "FAILED";
        incident.circuitState = rec.circuitOpen ? "OPEN" : "CLOSED";
        this.memory.append({
          incidentId: incident.incidentId,
          failureClass: incident.failureClass,
          component,
          action: "BOUNDED_RESTART",
          attempt: incident.attemptCount,
          success: false,
          verificationFailed: true,
          buildId: incident.buildId,
        });
      }
      return incident;
    } finally {
      this.singleFlight.release(flightKey);
    }
  }

  /**
   * Clear a proven-stale SCI lock.
   */
  clearStaleLock(incident, lockPath) {
    if (incident.failureClass !== "STALE_SCI_LOCK" || incident.state !== "RECOVERY_ALLOWED") {
      return { ...incident, note: "NOT_ELIGIBLE_LOCK_CLEAR" };
    }
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
        incident.state = "RECOVERED";
        incident.action = { type: "CLEAR_STALE_LOCK", path: lockPath, at: new Date().toISOString() };
      } else {
        incident.state = "RECOVERED";
        incident.action = { type: "LOCK_ALREADY_GONE", at: new Date().toISOString() };
      }
    } catch (e) {
      incident.state = "FAILED";
      incident.action = { type: "LOCK_CLEAR_FAILED", error: String(e.message || e), at: new Date().toISOString() };
    }
    this.memory.append({
      incidentId: incident.incidentId,
      failureClass: incident.failureClass,
      action: incident.action.type,
      success: incident.state === "RECOVERED",
      buildId: incident.buildId,
    });
    return incident;
  }

  snapshot() {
    return {
      schema: SCHEMA,
      slice: CANONICAL_SLICE_ID,
      at: new Date().toISOString(),
      incidents: this.incidents,
      budget: this.budget.serialize(),
      activeFlights: [...this.singleFlight.active],
    };
  }
}

module.exports = {
  SCHEMA,
  CANONICAL_SLICE_ID,
  FAILURE_CLASSES,
  INCIDENT_STATES,
  DEFAULTS,
  RecoveryIntelligence,
  RetryBudget,
  SingleFlightGuard,
  RecoveryMemory,
  classifyDriftToFailure,
  verifyOwnership,
  determineEligibility,
  createIncident,
  isIntentionallyStopped,
  resolveBackupCandidates,
};
