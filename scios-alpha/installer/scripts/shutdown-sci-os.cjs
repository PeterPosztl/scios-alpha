"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { resolveAppRoot } = require("./startup/resolve-app-root.cjs");
const { releaseProcessLock, lockPath } = require("./startup/process-lock.cjs");

function main() {
  const rootRes = resolveAppRoot();
  if (!rootRes.ok) process.exit(1);
  const appRoot = rootRes.appRoot;
  const lockFile = lockPath(appRoot);
  let lock = null;
  if (fs.existsSync(lockFile)) {
    try {
      lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
    } catch {
      /* ignore */
    }
  }

  // Best-effort: kill listeners on known ports via PowerShell is avoided;
  // document that user can close terminals. Remove lock.
  releaseProcessLock(appRoot);
  if (lock && lock.pid) {
    try {
      process.kill(lock.pid, "SIGTERM");
    } catch {
      /* ignore */
    }
  }

  const diag = path.join(appRoot, "diagnostics-export");
  fs.mkdirSync(diag, { recursive: true });
  const report = {
    at: new Date().toISOString(),
    action: "sci:shutdown",
    lockCleared: true,
    note: "Shared Docker/Postgres/Redis not stopped (not owned unless explicitly requested)",
    previousLock: lock,
  };
  fs.writeFileSync(path.join(diag, "shutdown-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, report: path.join(diag, "shutdown-report.json") }, null, 2));
}

main();
