"use strict";

const fs = require("fs");
const path = require("path");

function lockPath(appRoot) {
  return path.join(appRoot, "diagnostics-export", ".sci-os-startup.lock");
}

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * A live PID is not proof of a usable instance: an orchestrator can survive its
 * own servers (hung supervisor, killed children, PID reuse) and would otherwise
 * block every later boot with PROCESS_LOCKED forever. Ownership is therefore
 * decided by correlating the recorded owner with observed liveness.
 *
 * meta.instanceServing — true: an SCI OS instance answers on the API port;
 * false: nothing is listening; null/undefined: not probed (fail closed).
 */
function classifyLockOwnership(existing, meta, appRoot) {
  if (existing.appRoot) {
    try {
      if (path.resolve(existing.appRoot) !== path.resolve(appRoot)) {
        return { valid: false, reason: "LOCK_FOREIGN_APP_ROOT" };
      }
    } catch {
      return { valid: false, reason: "LOCK_UNREADABLE_APP_ROOT" };
    }
  }
  if (meta.instanceServing === false) {
    return { valid: false, reason: "LOCK_OWNER_NOT_SERVING" };
  }
  if (meta.instanceServing === true) {
    return { valid: true, reason: "LOCK_OWNER_SERVING" };
  }
  return { valid: true, reason: "LOCK_OWNER_LIVENESS_UNKNOWN" };
}

function acquireProcessLock(appRoot, meta) {
  const dir = path.join(appRoot, "diagnostics-export");
  fs.mkdirSync(dir, { recursive: true });
  const file = lockPath(appRoot);
  if (fs.existsSync(file)) {
    try {
      const existing = JSON.parse(fs.readFileSync(file, "utf8"));
      if (existing.pid && processAlive(existing.pid) && existing.pid !== process.pid) {
        const ownership = classifyLockOwnership(existing, meta, appRoot);
        if (ownership.valid) {
          return {
            ok: false,
            stale: false,
            failureClass: "PROCESS_LOCKED",
            existing,
            ownership,
            nextAction: "Focus existing instance or sci:shutdown then retry",
          };
        }
        fs.unlinkSync(file);
        return acquireProcessLock(appRoot, {
          ...meta,
          reclaimedOrphanLock: true,
          reclaimedOrphanReason: ownership.reason,
          reclaimedOrphanPid: existing.pid,
        });
      }
      // stale
      fs.unlinkSync(file);
      return acquireProcessLock(appRoot, {
        ...meta,
        repairedStaleLock: true,
      });
    } catch {
      fs.unlinkSync(file);
    }
  }

  const payload = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    appRoot,
    runtimeMode: meta.runtimeMode || "alpha-local",
    apiPort: meta.apiPort || 5200,
    desktopInstanceId: meta.desktopInstanceId || null,
    mode: meta.mode || "normal",
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return {
    ok: true,
    stale: false,
    lock: payload,
    repairedStaleLock: !!meta.repairedStaleLock,
    reclaimedOrphanLock: !!meta.reclaimedOrphanLock,
    reclaimedOrphanReason: meta.reclaimedOrphanReason || null,
    reclaimedOrphanPid: meta.reclaimedOrphanPid || null,
  };
}

/**
 * opts.force releases a lock whose owner is still alive. Shutdown paths use it
 * once they have proven no instance is serving, so a hung orchestrator cannot
 * leave the install permanently locked.
 */
function releaseProcessLock(appRoot, opts = {}) {
  const file = lockPath(appRoot);
  try {
    if (fs.existsSync(file)) {
      const existing = JSON.parse(fs.readFileSync(file, "utf8"));
      if (existing.pid === process.pid || !processAlive(existing.pid) || opts.force === true) {
        fs.unlinkSync(file);
        return { released: true, ownerPid: existing.pid || null, forced: !!opts.force };
      }
      return { released: false, ownerPid: existing.pid || null, reason: "OWNER_ALIVE" };
    }
  } catch {
    /* ignore */
  }
  return { released: false };
}

module.exports = {
  acquireProcessLock,
  releaseProcessLock,
  classifyLockOwnership,
  processAlive,
  lockPath,
};
