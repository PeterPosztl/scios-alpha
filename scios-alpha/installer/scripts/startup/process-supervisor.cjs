"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { httpGetJson } = require("./resolve-port.cjs");

class ProcessSupervisor {
  constructor(appRoot, nodePath) {
    this.appRoot = appRoot;
    this.nodePath = nodePath;
    this.children = new Map();
    this.logDir = path.join(appRoot, "diagnostics-export", "proc-logs");
    fs.mkdirSync(this.logDir, { recursive: true });
  }

  start(name, command, args, opts = {}) {
    const logFile = path.join(this.logDir, `${name}.log`);
    const out = fs.openSync(logFile, "a");
    const child = spawn(command, args, {
      cwd: opts.cwd || this.appRoot,
      env: { ...process.env, ...(opts.env || {}) },
      stdio: ["ignore", out, out],
      shell: opts.shell === true,
      detached: false,
    });
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
    };
    child.on("exit", (code) => {
      rec.exitCode = code;
    });
    this.children.set(name, rec);
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
      await new Promise((r) => setTimeout(r, 500));
    }
    return { ok: false, failureClass: "HEALTH_TIMEOUT", detail: url };
  }

  async stopAll() {
    for (const [, rec] of this.children) {
      try {
        if (rec.child && rec.exitCode == null) {
          rec.child.kill("SIGTERM");
        }
      } catch {
        /* ignore */
      }
    }
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
      };
    }
    return out;
  }
}

module.exports = { ProcessSupervisor };
