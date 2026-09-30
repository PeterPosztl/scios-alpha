"use strict";

/**
 * Windows Job Object provider for SCI Process Supervisor (WHI-001).
 * Internal infrastructure — no public arbitrary-PID attach API.
 * ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { hostResult } = require("./contract.cjs");
const { validateOwnershipForJobAttach } = require("./process-ownership.cjs");

const CAPABILITY = "job-object";

function resolvePowerShellExe() {
  const sys = process.env.SystemRoot || process.env.windir || "C:\\Windows";
  const candidate = path.join(sys, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  return fs.existsSync(candidate) ? candidate : "powershell.exe";
}

function resolveKeeperScript(appRoot) {
  return path.join(appRoot, "installer", "scripts", "host", "helpers", "job-object-keeper.ps1");
}

class JobObjectProvider {
  /**
   * @param {object} opts
   * @param {string} opts.appRoot
   * @param {object} opts.runContext
   * @param {Map<number, object>} opts.registeredOwners — pid → descriptor (supervisor authority)
   * @param {string} [opts.providerMode] — live | test | disabled
   */
  constructor(opts) {
    this.appRoot = opts.appRoot;
    this.runContext = opts.runContext;
    this.registeredOwners = opts.registeredOwners;
    this.providerMode = opts.providerMode || process.env.SCIOS_JOB_OBJECT_PROVIDER || "live";
    this.status = "UNINITIALIZED";
    this.keeper = null;
    this.keeperPid = null;
    this.jobName = null;
    this.assignedPids = new Set();
    this.assignLog = [];
    this.initError = null;
    this._testHooks = opts.testHooks || null;
  }

  capabilityStatus() {
    return {
      status: this.status,
      capability: CAPABILITY,
      jobName: this.jobName,
      keeperPid: this.keeperPid,
      assignedPids: [...this.assignedPids],
      assignLog: this.assignLog.slice(-20),
      initError: this.initError,
      providerMode: this.providerMode,
    };
  }

  async init() {
    if (this.providerMode === "disabled") {
      this.status = "JOB_OBJECT_UNAVAILABLE";
      return hostResult({
        capability: CAPABILITY,
        mode: "FALLBACK",
        degraded: true,
        data: { status: this.status, reason: "PROVIDER_DISABLED" },
      });
    }

    if (this.providerMode === "test") {
      this.status = "JOB_OBJECT_TEST_PROVIDER";
      this.jobName = `SCI-OS-TEST-${this.runContext.runId.slice(0, 8)}`;
      return hostResult({
        capability: CAPABILITY,
        mode: "TEST",
        data: { status: this.status, jobName: this.jobName },
      });
    }

    if (process.platform !== "win32") {
      this.status = "PLATFORM_UNAVAILABLE";
      return hostResult({
        capability: CAPABILITY,
        mode: "FALLBACK",
        degraded: true,
        data: { status: this.status },
      });
    }

    const script = resolveKeeperScript(this.appRoot);
    if (!fs.existsSync(script)) {
      this.status = "JOB_OBJECT_UNAVAILABLE";
      this.initError = "KEEPER_SCRIPT_MISSING";
      return hostResult({
        capability: CAPABILITY,
        mode: "FALLBACK",
        degraded: true,
        ok: true,
        error: this.initError,
        data: { status: this.status, script },
      });
    }

    const ps = resolvePowerShellExe();
    this.jobName = `SCI-OS-${this.runContext.runId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 16)}-${process.pid}`;

    const markerPath = path.join(
      this.appRoot,
      "diagnostics-export",
      "host",
      `.job-marker-${process.pid}-${Date.now()}.txt`
    );
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    try {
      if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath);
    } catch {
      /* ignore */
    }
    this.markerPath = markerPath;

    const ready = await new Promise((resolve) => {
      let stdout = "";
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const pollMarker = () => {
        try {
          if (fs.existsSync(markerPath)) {
            const text = fs.readFileSync(markerPath, "utf8");
            if (/OK CREATED/i.test(text)) {
              finish({ ok: true, stdout: text.trim(), marker: true });
              return true;
            }
            if (/ERR CREATE|ERR LIMIT/i.test(text)) {
              finish({ ok: false, error: text.trim(), stdout: text.trim(), marker: true });
              return true;
            }
          }
        } catch {
          /* ignore */
        }
        return false;
      };

      try {
        const child = spawn(
          ps,
          [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "RemoteSigned",
            "-File",
            script,
            "-JobName",
            this.jobName,
            "-MarkerPath",
            markerPath,
          ],
          {
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
            env: { ...process.env },
          }
        );
        this.keeper = child;
        this.keeperPid = child.pid;
        this._keeperStdout = "";
        this._assignWaiters = new Map();

        const drainKeeperLines = () => {
          const parts = this._keeperStdout.split(/\r?\n/);
          this._keeperStdout = parts.pop() || "";
          for (const line of parts) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            stdout += trimmed + "\n";
            if (/OK CREATED/i.test(trimmed)) {
              finish({ ok: true, stdout: stdout.trim() });
            }
            const assignOk = trimmed.match(/^OK ASSIGN (\d+)$/);
            const assignErr = trimmed.match(/^ERR ASSIGN (\d+)/);
            if (assignOk) {
              const pid = Number(assignOk[1]);
              const waiter = this._assignWaiters.get(pid);
              if (waiter) {
                this._assignWaiters.delete(pid);
                waiter(null, trimmed);
              }
            } else if (assignErr) {
              const pid = Number(assignErr[1]);
              const waiter = this._assignWaiters.get(pid);
              if (waiter) {
                this._assignWaiters.delete(pid);
                waiter(new Error(trimmed), trimmed);
              }
            }
          }
        };

        child.stdout.on("data", (buf) => {
          this._keeperStdout += buf.toString("utf8");
          drainKeeperLines();
          pollMarker();
        });
        child.stderr.on("data", (buf) => {
          this._keeperStdout += buf.toString("utf8");
          drainKeeperLines();
        });
        child.on("error", (err) => {
          finish({ ok: false, error: String(err.message || err), stdout });
        });
        child.on("exit", (code) => {
          if (settled) return;
          drainKeeperLines();
          if (pollMarker()) return;
          if (!/OK CREATED/i.test(this._keeperStdout) && !/OK CREATED/i.test(stdout)) {
            finish({ ok: false, error: `keeper_exit_${code}`, stdout: (stdout || this._keeperStdout).trim() });
          }
        });

        const pollTimer = setInterval(() => {
          if (settled) {
            clearInterval(pollTimer);
            return;
          }
          if (pollMarker()) clearInterval(pollTimer);
        }, 200);

        setTimeout(() => {
          clearInterval(pollTimer);
          if (settled) return;
          drainKeeperLines();
          if (pollMarker()) return;
          if (/OK CREATED/i.test(this._keeperStdout) || /OK CREATED/i.test(stdout)) {
            finish({ ok: true, stdout: (stdout || this._keeperStdout).trim() });
          } else {
            finish({ ok: false, error: "KEEPER_START_TIMEOUT", stdout: (stdout || this._keeperStdout).trim() });
          }
        }, 45000);
      } catch (e) {
        finish({ ok: false, error: String(e.message || e), stdout });
      }
    });

    if (!ready.ok) {
      this.status = "JOB_OBJECT_UNAVAILABLE";
      this.initError = ready.error || "KEEPER_START_FAILED";
      if (this.keeper) {
        try {
          this.keeper.kill();
        } catch {
          /* ignore */
        }
        this.keeper = null;
        this.keeperPid = null;
      }
      return hostResult({
        capability: CAPABILITY,
        mode: "FALLBACK",
        degraded: true,
        ok: true,
        error: this.initError,
        data: { status: this.status, stdout: ready.stdout, powershell: ps },
      });
    }

    this.status = "JOB_OBJECT_ACTIVE";
    return hostResult({
      capability: CAPABILITY,
      mode: "LIVE",
      data: {
        status: this.status,
        jobName: this.jobName,
        keeperPid: this.keeperPid,
        powershell: ps,
        helperClass: "WINDOWS_HOST_HELPER_V1",
        stdout: ready.stdout,
      },
    });
  }

  /**
   * Attach an SCI-owned child PID to the Job Object. Internal — requires ownership proof.
   */
  async attachOwned(descriptor) {
    const validation = validateOwnershipForJobAttach(
      descriptor,
      this.runContext,
      this.registeredOwners
    );
    if (!validation.ok) {
      const err = hostResult({
        capability: CAPABILITY,
        ok: false,
        error: validation.reason,
        data: { pid: descriptor && descriptor.pid, status: this.status },
      });
      this.assignLog.push({ at: new Date().toISOString(), pid: descriptor && descriptor.pid, ok: false, reason: validation.reason });
      return err;
    }

    if (this.status === "PLATFORM_UNAVAILABLE" || this.status === "JOB_OBJECT_UNAVAILABLE") {
      this.assignLog.push({
        at: new Date().toISOString(),
        pid: descriptor.pid,
        ok: false,
        reason: this.status,
        fallback: true,
      });
      return hostResult({
        capability: CAPABILITY,
        mode: "FALLBACK",
        degraded: true,
        ok: true,
        data: { attached: false, pid: descriptor.pid, status: this.status },
      });
    }

    if (this.status === "JOB_OBJECT_TEST_PROVIDER") {
      this.assignedPids.add(descriptor.pid);
      this.assignLog.push({ at: new Date().toISOString(), pid: descriptor.pid, ok: true, mode: "TEST" });
      if (this._testHooks && typeof this._testHooks.onAssign === "function") {
        this._testHooks.onAssign(descriptor.pid);
      }
      return hostResult({
        capability: CAPABILITY,
        mode: "TEST",
        data: { attached: true, pid: descriptor.pid, jobName: this.jobName },
      });
    }

    if (this.status !== "JOB_OBJECT_ACTIVE" || !this.keeper || !this.keeper.stdin.writable) {
      this.assignLog.push({
        at: new Date().toISOString(),
        pid: descriptor.pid,
        ok: false,
        reason: "KEEPER_NOT_READY",
      });
      return hostResult({
        capability: CAPABILITY,
        mode: "FALLBACK",
        degraded: true,
        ok: true,
        data: { attached: false, pid: descriptor.pid, status: this.status },
      });
    }

    return await new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const onResult = (err, line) => {
        if (err) {
          this.assignLog.push({
            at: new Date().toISOString(),
            pid: descriptor.pid,
            ok: false,
            reason: "ASSIGN_FAILED",
            stdout: line,
          });
          finish(
            hostResult({
              capability: CAPABILITY,
              ok: false,
              error: "ASSIGN_FAILED",
              data: { attached: false, pid: descriptor.pid, stdout: line },
            })
          );
          return;
        }
        this.assignedPids.add(descriptor.pid);
        this.assignLog.push({ at: new Date().toISOString(), pid: descriptor.pid, ok: true });
        finish(
          hostResult({
            capability: CAPABILITY,
            data: { attached: true, pid: descriptor.pid, jobName: this.jobName, stdout: line },
          })
        );
      };

      this._assignWaiters.set(descriptor.pid, onResult);
      try {
        this.keeper.stdin.write(`ASSIGN ${descriptor.pid}\n`);
      } catch (e) {
        this._assignWaiters.delete(descriptor.pid);
        finish(
          hostResult({
            capability: CAPABILITY,
            ok: false,
            error: String(e.message || e),
          })
        );
        return;
      }
      setTimeout(() => {
        if (this.assignedPids.has(descriptor.pid)) return;
        if (this._assignWaiters.has(descriptor.pid)) {
          this._assignWaiters.delete(descriptor.pid);
          finish(
            hostResult({
              capability: CAPABILITY,
              ok: false,
              error: "ASSIGN_TIMEOUT",
            })
          );
        }
      }, 5000);
    });
  }

  async terminateRemaining() {
    if (this.status !== "JOB_OBJECT_ACTIVE" || !this.keeper || !this.keeper.stdin.writable) {
      return hostResult({
        capability: CAPABILITY,
        mode: "FALLBACK",
        degraded: true,
        data: { terminated: false, status: this.status },
      });
    }
    try {
      this.keeper.stdin.write("TERMINATE\n");
    } catch {
      /* ignore */
    }
    return hostResult({
      capability: CAPABILITY,
      data: { terminated: true, assignedPids: [...this.assignedPids] },
    });
  }

  async close() {
    if (this.keeper && this.keeper.stdin && !this.keeper.killed) {
      try {
        this.keeper.stdin.end();
      } catch {
        /* ignore */
      }
    }
    if (this.keeperPid) {
      await new Promise((r) => setTimeout(r, 400));
      if (this.keeper && this.keeper.exitCode == null) {
        try {
          this.keeper.kill("SIGTERM");
        } catch {
          /* ignore */
        }
      }
    }
    this.keeper = null;
    this.keeperPid = null;
    if (this.status === "JOB_OBJECT_ACTIVE") {
      this.status = "JOB_OBJECT_CLOSED";
    }
    return this.capabilityStatus();
  }
}

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function listSciNodeChildren(orchestratorPid) {
  if (process.platform !== "win32") return [];
  const ps = resolvePowerShellExe();
  const cmd = [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    `$p=Get-CimInstance Win32_Process -Filter \"ParentProcessId=${orchestratorPid}\" -ErrorAction SilentlyContinue; $p | Select-Object ProcessId,Name,ParentProcessId | ConvertTo-Json -Compress`,
  ];
  const r = spawnSync(ps, cmd, { encoding: "utf8", windowsHide: true, timeout: 10000 });
  const out = String(r.stdout || "").trim();
  if (!out) return [];
  try {
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

module.exports = {
  JobObjectProvider,
  resolvePowerShellExe,
  resolveKeeperScript,
  isProcessAlive,
  listSciNodeChildren,
  CAPABILITY,
};
