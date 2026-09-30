#!/usr/bin/env node
"use strict";
/**
 * Startup lock ownership contract.
 *
 * Regression origin: a startup orchestrator that outlived its own servers kept
 * a live PID in the lock file, so every later boot reported PROCESS_LOCKED and
 * finalized NO_GO even though ports 3000/4000 were free. PID liveness alone is
 * not proof of a usable instance.
 *
 * Evidence: diagnostics-export/final-completion/boot-lock-orphan-recovery.json
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const {
  acquireProcessLock,
  releaseProcessLock,
  classifyLockOwnership,
  lockPath,
} = require(path.join(ROOT, "installer/scripts/startup/process-lock.cjs"));

const cases = [];
function check(name, ok, detail) {
  cases.push({ name, status: ok ? "PASS" : "FAIL", ...(detail ? { detail } : {}) });
}

function makeRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scios-lock-"));
  fs.mkdirSync(path.join(dir, "diagnostics-export"), { recursive: true });
  return dir;
}

function writeLock(appRoot, payload) {
  fs.writeFileSync(lockPath(appRoot), JSON.stringify(payload, null, 2));
}

function main() {
  // A long-lived child stands in for an orchestrator that is alive but idle.
  const idle = spawn(process.execPath, ["-e", "setTimeout(()=>{}, 600000)"], {
    stdio: "ignore",
    windowsHide: true,
  });
  const alivePid = idle.pid;

  try {
    // 1. Live owner, nothing serving the API port -> orphaned, must be reclaimed.
    let root = makeRoot();
    writeLock(root, { pid: alivePid, appRoot: root, apiPort: 3000, startedAt: new Date().toISOString() });
    let res = acquireProcessLock(root, { apiPort: 3000, instanceServing: false });
    check(
      "orphanedLockReclaimed",
      res.ok === true && res.reclaimedOrphanLock === true && res.reclaimedOrphanReason === "LOCK_OWNER_NOT_SERVING",
      { ok: res.ok, reason: res.reclaimedOrphanReason }
    );
    check("reclaimedLockOwnedByUs", res.ok && res.lock && res.lock.pid === process.pid, {
      lockPid: res.lock && res.lock.pid,
    });
    releaseProcessLock(root, { force: true });

    // 2. Live owner that is serving -> lock is authoritative, boot must not steal it.
    root = makeRoot();
    writeLock(root, { pid: alivePid, appRoot: root, apiPort: 3000, startedAt: new Date().toISOString() });
    res = acquireProcessLock(root, { apiPort: 3000, instanceServing: true });
    check(
      "servingOwnerStillBlocks",
      res.ok === false && res.failureClass === "PROCESS_LOCKED" && res.ownership.reason === "LOCK_OWNER_SERVING",
      { ok: res.ok, failureClass: res.failureClass }
    );

    // 3. Liveness not probed -> fail closed, never steal on unknown evidence.
    root = makeRoot();
    writeLock(root, { pid: alivePid, appRoot: root, apiPort: 3000, startedAt: new Date().toISOString() });
    res = acquireProcessLock(root, { apiPort: 3000 });
    check(
      "unknownLivenessFailsClosed",
      res.ok === false && res.ownership.reason === "LOCK_OWNER_LIVENESS_UNKNOWN",
      { ok: res.ok, reason: res.ownership && res.ownership.reason }
    );

    // 4. Foreign app root in our lock file -> PID reuse or contamination.
    root = makeRoot();
    writeLock(root, {
      pid: alivePid,
      appRoot: path.join(root, "..", "some-other-install"),
      apiPort: 3000,
      startedAt: new Date().toISOString(),
    });
    res = acquireProcessLock(root, { apiPort: 3000, instanceServing: true });
    check(
      "foreignAppRootReclaimed",
      res.ok === true && res.reclaimedOrphanReason === "LOCK_FOREIGN_APP_ROOT",
      { ok: res.ok, reason: res.reclaimedOrphanReason }
    );
    releaseProcessLock(root, { force: true });

    // 5. Dead owner -> ordinary stale-lock repair, unchanged behaviour.
    root = makeRoot();
    writeLock(root, { pid: 0x7ffffffe, appRoot: root, apiPort: 3000, startedAt: new Date().toISOString() });
    res = acquireProcessLock(root, { apiPort: 3000, instanceServing: true });
    check("deadOwnerStaleRepair", res.ok === true && res.repairedStaleLock === true, {
      ok: res.ok,
      repaired: res.repairedStaleLock,
    });
    releaseProcessLock(root, { force: true });

    // 6. Release must not strip a live owner's lock without force, and must with it.
    root = makeRoot();
    writeLock(root, { pid: alivePid, appRoot: root, apiPort: 3000, startedAt: new Date().toISOString() });
    const soft = releaseProcessLock(root);
    check("releaseKeepsLiveOwnerLock", soft.released === false && fs.existsSync(lockPath(root)), soft);
    const forced = releaseProcessLock(root, { force: true });
    check("forcedReleaseClearsLock", forced.released === true && !fs.existsSync(lockPath(root)), forced);

    // 7. Classification is pure and directly assertable.
    check(
      "classifierRejectsNonServingOwner",
      classifyLockOwnership({ appRoot: "/x" }, { instanceServing: false }, "/x").valid === false
    );
  } finally {
    try {
      idle.kill();
    } catch {
      /* ignore */
    }
  }

  const failed = cases.filter((c) => c.status !== "PASS");
  const report = {
    schema: "sci-os-boot-lock-orphan-recovery/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    subject: "installer/scripts/startup/process-lock.cjs",
    rootCause: "lock validity decided by PID liveness alone; hung owner blocked all later boots",
    cases,
    status: failed.length ? "FAIL" : "PASS",
    failed: failed.map((f) => f.name),
  };
  const outDir = path.join(ROOT, "diagnostics-export", "final-completion");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "boot-lock-orphan-recovery.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
  console.log(JSON.stringify({ status: report.status, failed: report.failed }, null, 2));
  process.exit(report.status === "PASS" ? 0 : 1);
}

main();
