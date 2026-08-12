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

function acquireProcessLock(appRoot, meta) {
  const dir = path.join(appRoot, "diagnostics-export");
  fs.mkdirSync(dir, { recursive: true });
  const file = lockPath(appRoot);
  if (fs.existsSync(file)) {
    try {
      const existing = JSON.parse(fs.readFileSync(file, "utf8"));
      if (existing.pid && processAlive(existing.pid) && existing.pid !== process.pid) {
        return {
          ok: false,
          stale: false,
          failureClass: "PROCESS_LOCKED",
          existing,
          nextAction: "Focus existing instance or sci:shutdown then retry",
        };
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
  return { ok: true, stale: false, lock: payload, repairedStaleLock: !!meta.repairedStaleLock };
}

function releaseProcessLock(appRoot) {
  const file = lockPath(appRoot);
  try {
    if (fs.existsSync(file)) {
      const existing = JSON.parse(fs.readFileSync(file, "utf8"));
      if (existing.pid === process.pid || !processAlive(existing.pid)) {
        fs.unlinkSync(file);
        return { released: true };
      }
    }
  } catch {
    /* ignore */
  }
  return { released: false };
}

module.exports = { acquireProcessLock, releaseProcessLock, lockPath };
