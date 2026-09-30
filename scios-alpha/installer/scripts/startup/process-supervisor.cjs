"use strict";

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { httpGetJson } = require("./resolve-port.cjs");
const { JobObjectProvider } = require("../host/job-object-provider.cjs");
const {
  createRunContext,
  createOwnershipDescriptor,
} = require("../host/process-ownership.cjs");

/** Windows Node 20+ throws spawn EINVAL for .cmd/.bat unless shell is true. */
function needsWinShell(command) {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(String(command || ""));
}

function killProcessTree(pid) {
  if (!pid) return { ok: false, reason: "no_pid" };
  if (process.platform === "win32") {
    const r = spawnSync(
      "taskkill.exe",
      ["/PID", String(pid), "/T", "/F"],
      { shell: false, windowsHide: true, stdio: "ignore" }
    );
    return { ok: r.status === 0, status: r.status, method: "taskkill_tree" };
  }
  try {
    process.kill(-pid, "SIGTERM");
    return { ok: true, method: "sigterm_group" };
  } catch {
    try {
      process.kill(pid, "SIGTERM");
      return { ok: true, method: "sigterm" };
    } catch (e) {
      return { ok: false, reason: String(e.message || e) };
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class ProcessSupervisor {
  /**
   * @param {string} appRoot
   * @param {string} nodePath
   * @param {object} [hostOpts]
   */
  constructor(appRoot, nodePath, hostOpts = {}) {
    this.appRoot = appRoot;
    this.nodePath = nodePath;
    this.runContext = createRunContext({
      bootId: hostOpts.bootId || hostOpts.runId,
      runId: hostOpts.runId,
      buildId: hostOpts.buildId,
      orchestratorPid: process.pid,
      appRoot,
      startedAt: hostOpts.startedAt,
      ports: hostOpts.ports || {},
    });
    this.children = new Map();
    this.registeredOwners = new Map();
    this.logDir = path.join(appRoot, "diagnostics-export", "proc-logs");
    fs.mkdirSync(this.logDir, { recursive: true });
    this.jobProvider = new JobObjectProvider({
      appRoot,
      runContext: this.runContext,
      registeredOwners: this.registeredOwners,
      providerMode: hostOpts.jobProviderMode,
      testHooks: hostOpts.testHooks,
    });
    this.hostInit = null;
    this.hostEvidencePath = path.join(appRoot, "diagnostics-export", "host", "job-object-state.json");
  }

  _writeHostEvidence(extra) {
    try {
      fs.mkdirSync(path.dirname(this.hostEvidencePath), { recursive: true });
      fs.writeFileSync(
        this.hostEvidencePath,
        JSON.stringify(
          {
            schema: "sci-os-host-job-object-state/v1",
            at: new Date().toISOString(),
            runContext: this.runContext,
            job: this.jobProvider.capabilityStatus(),
            children: this.snapshot(),
            ...extra,
          },
          null,
          2
        )
      );
    } catch {
      /* ignore */
    }
  }

  async initHostLayer() {
    if (this.hostInit) return this.hostInit;
    this.hostInit = await this.jobProvider.init();
    this._writeHostEvidence({ phase: "init" });
    return this.hostInit;
  }

  async start(name, command, args, opts = {}) {
    const logFile = path.join(this.logDir, `${name}.log`);
    const out = fs.openSync(logFile, "a");
    const detached = opts.detached === true;
    const child = spawn(command, args, {
      cwd: opts.cwd || this.appRoot,
      env: { ...process.env, ...(opts.env || {}) },
      stdio: ["ignore", out, out],
      shell: opts.shell === true || needsWinShell(command),
      detached,
      windowsHide: true,
    });
    if (detached) {
      try {
        child.unref();
      } catch {
        /* ignore */
      }
    }
    const rec = {
      name,
      pid: child.pid,
      command,
      args,
      startedAt: new Date().toISOString(),
      restarts: 0,
      logFile,
      child,
      exitCode: null,
      detached,
      jobAttached: false,
      expectedPort: opts.expectedPort != null ? Number(opts.expectedPort) : null,
    };
    child.on("exit", (code) => {
      rec.exitCode = code;
      this.registeredOwners.delete(rec.pid);
      this.jobProvider.assignedPids.delete(rec.pid);
    });

    const descriptor = createOwnershipDescriptor(this.runContext, rec, {
      expectedPort: rec.expectedPort,
    });
    rec.ownershipDescriptor = descriptor;
    this.registeredOwners.set(rec.pid, descriptor);
    this.children.set(name, rec);

    if (!detached) {
      const attach = await this.jobProvider.attachOwned(descriptor);
      rec.jobAttached = !!(attach.data && attach.data.attached);
      rec.jobAttach = attach;
    }

    this._writeHostEvidence({ phase: "start", service: name, pid: rec.pid });
    return rec;
  }

  async waitHealthy(name, url, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const rec = this.children.get(name);
      if (rec && rec.exitCode != null) {
        return {
          ok: false,
          failureClass: "BACKEND_CRASHED",
          detail: `${name} exited code=${rec.exitCode}`,
        };
      }
      const res = await httpGetJson(url, 1500);
      if (res.status === 200) return { ok: true, health: res.body };
      await sleep(500);
    }
    return { ok: false, failureClass: "HEALTH_TIMEOUT", detail: url };
  }

  async stopAll() {
    const results = [];
    for (const [, rec] of this.children) {
      if (rec.exitCode != null) {
        results.push({ name: rec.name, pid: rec.pid, alreadyExited: true, method: "already_exited" });
        continue;
      }
      let graceful = false;
      try {
        if (rec.child && rec.exitCode == null) {
          rec.child.kill("SIGTERM");
          graceful = true;
        }
      } catch {
        /* ignore */
      }
      await sleep(600);
      if (rec.exitCode == null) {
        const killed = killProcessTree(rec.pid);
        results.push({
          name: rec.name,
          pid: rec.pid,
          gracefulAttempted: graceful,
          ...killed,
        });
      } else {
        results.push({ name: rec.name, pid: rec.pid, graceful: true, method: "sigterm" });
      }
    }

    const remaining = [...this.children.values()].filter((r) => r.exitCode == null);
    if (remaining.length) {
      await this.jobProvider.terminateRemaining();
      await sleep(500);
      for (const rec of remaining) {
        if (rec.exitCode == null) {
          const killed = killProcessTree(rec.pid);
          results.push({ name: rec.name, pid: rec.pid, phase: "job_fallback", ...killed });
        }
      }
    }

    this._writeHostEvidence({ phase: "stopAll", results });
    return results;
  }

  async closeHostLayer() {
    const status = await this.jobProvider.close();
    this._writeHostEvidence({ phase: "close", status });
    return status;
  }

  snapshot() {
    const out = {};
    for (const [k, v] of this.children) {
      out[k] = {
        pid: v.pid,
        startedAt: v.startedAt,
        exitCode: v.exitCode,
        logFile: v.logFile,
        restarts: v.restarts,
        jobAttached: v.jobAttached === true,
        expectedPort: v.expectedPort,
        ownership: v.ownershipDescriptor || this.registeredOwners.get(v.pid) || null,
      };
    }
    return out;
  }

  hostSnapshot() {
    return {
      runContext: this.runContext,
      job: this.jobProvider.capabilityStatus(),
      services: this.snapshot(),
    };
  }

  /**
   * Internal test hook — rejects unowned PID attach attempts.
   */
  async _testAttachPid(pid) {
    return this.jobProvider.attachOwned({
      schema: "sci-os-process-ownership/v1",
      bootId: this.runContext.bootId,
      runId: this.runContext.runId,
      buildId: this.runContext.buildId,
      role: "probe",
      component: "probe",
      pid,
      parentPid: this.runContext.orchestratorPid,
      startedAt: new Date().toISOString(),
      executable: "probe",
      appRoot: this.runContext.appRoot,
    });
  }
}

module.exports = { ProcessSupervisor, killProcessTree };
