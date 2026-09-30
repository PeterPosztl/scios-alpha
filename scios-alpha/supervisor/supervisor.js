#!/usr/bin/env node
"use strict";

/**
 * supervisor/supervisor.js
 * Usage: node supervisor/supervisor.js start|stop|status <serviceName>
 *
 * Lightweight process bookkeeping for ALPHA. Not a replacement for
 * pnpm sci:start / process-supervisor.cjs.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawn, execSync } = require("node:child_process");

const ROOT = process.cwd();
const RUNTIME_DIR = path.join(ROOT, "runtime");
const STATE_FILE = path.join(RUNTIME_DIR, "supervisor-state.json");
const SERVICES_FILE = path.join(ROOT, "supervisor", "services.json");

fs.mkdirSync(RUNTIME_DIR, { recursive: true });

function readState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    // migrate legacy orchestrator-shaped file → empty services map
    if (raw && !raw.services && (raw.components || raw.correlationId)) {
      return { services: {}, legacyArchived: true };
    }
    if (raw && raw.services) return raw;
    // draft shape: top-level service keys
    if (raw && typeof raw === "object") {
      const services = {};
      for (const [k, v] of Object.entries(raw)) {
        if (v && typeof v === "object" && ("pid" in v || "status" in v)) {
          services[k] = v;
        }
      }
      return { services };
    }
    return { services: {} };
  } catch {
    return { services: {} };
  }
}

function writeState(state) {
  const out = {
    at: new Date().toISOString(),
    label: "ALPHA_NON_PRODUCTION",
    services: state.services || {},
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(out, null, 2));
}

function loadCatalog() {
  if (!fs.existsSync(SERVICES_FILE)) return {};
  return JSON.parse(fs.readFileSync(SERVICES_FILE, "utf8"));
}

function isAlive(pid) {
  if (!pid || typeof pid !== "number") return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killPid(pid) {
  if (!pid) return false;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F`, {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      process.kill(pid, "SIGTERM");
    }
    return true;
  } catch {
    try {
      process.kill(pid);
      return true;
    } catch {
      return false;
    }
  }
}

const cmd = process.argv[2];
const svc = process.argv[3];

if (!cmd || (cmd !== "list" && !svc)) {
  console.log(`Usage:
  node supervisor/supervisor.js start <serviceName>
  node supervisor/supervisor.js stop <serviceName>
  node supervisor/supervisor.js status <serviceName>
  node supervisor/supervisor.js list

Services: see supervisor/services.json`);
  process.exit(1);
}

const catalog = loadCatalog();
const state = readState();
state.services = state.services || {};

if (cmd === "list") {
  console.log(
    JSON.stringify(
      {
        catalog: Object.keys(catalog),
        running: Object.fromEntries(
          Object.entries(state.services).map(([name, e]) => [
            name,
            {
              ...e,
              alive: isAlive(e.pid),
            },
          ])
        ),
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (cmd === "start") {
  const def = catalog[svc];
  if (!def) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "UNKNOWN_SERVICE",
        service: svc,
        known: Object.keys(catalog),
      })
    );
    process.exit(1);
  }

  const existing = state.services[svc];
  if (existing?.pid && isAlive(existing.pid)) {
    console.log(
      JSON.stringify({
        ok: true,
        action: "reuse",
        service: svc,
        pid: existing.pid,
        status: "RUNNING",
      })
    );
    process.exit(0);
  }

  const child = spawn(def.command, def.args || [], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    shell: process.platform === "win32",
    env: { ...process.env },
  });
  child.unref();

  state.services[svc] = {
    pid: child.pid,
    status: "RUNNING",
    startedAt: new Date().toISOString(),
    command: def.command,
    args: def.args || [],
  };
  writeState(state);
  console.log(
    JSON.stringify({
      ok: true,
      action: "start",
      service: svc,
      pid: child.pid,
      status: "RUNNING",
      note: def.note || null,
    })
  );
} else if (cmd === "stop") {
  const entry = state.services[svc];
  if (entry && entry.pid) {
    const killed = killPid(entry.pid);
    state.services[svc] = {
      ...entry,
      status: "STOPPED",
      stoppedAt: new Date().toISOString(),
      killOk: killed,
    };
    writeState(state);
    console.log(
      JSON.stringify({
        ok: true,
        action: "stop",
        service: svc,
        pid: entry.pid,
        status: "STOPPED",
        killOk: killed,
      })
    );
  } else {
    console.log(
      JSON.stringify({
        ok: false,
        action: "stop",
        service: svc,
        error: "NOT_RUNNING",
      })
    );
  }
} else if (cmd === "status") {
  const entry = state.services[svc] || {};
  const alive = isAlive(entry.pid);
  console.log(
    JSON.stringify(
      {
        service: svc,
        ...entry,
        alive,
        status: entry.status
          ? alive || entry.status === "STOPPED"
            ? entry.status
            : "STALE"
          : "UNKNOWN",
      },
      null,
      2
    )
  );
} else {
  console.error(JSON.stringify({ ok: false, error: "UNKNOWN_COMMAND", cmd }));
  process.exit(1);
}
