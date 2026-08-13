"use strict";

/**
 * Ordered shutdown: cockpit → worker (in-process) → backend → optional infra.
 * Port kill only after SCI healthz identity. Never mutates business data.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  resolveAppRoot,
  listSciosAlphaProcesses,
  classifyProcess,
  listeningPortsMap,
  writeJson,
  httpGet,
} = require("./lib.cjs");
const { loadDotEnv, validateConfig } = require("../startup/validate-config.cjs");
const { releaseProcessLock } = require("../startup/process-lock.cjs");

async function provenOnPort(port, expectedService, portsMap) {
  const probe = await httpGet(`http://127.0.0.1:${port}/healthz`, 2000);
  const service =
    probe.body && typeof probe.body === "object" ? probe.body.service : null;
  if (probe.status !== 200 || service !== expectedService) {
    return { port, pid: null, action: "skip", reason: `identity_not_proven service=${service}` };
  }
  const owner = Object.entries(portsMap).find(([, ports]) => (ports || []).includes(port));
  if (!owner) return { port, pid: null, action: "skip", reason: "listener_pid_unknown" };
  return {
    port,
    pid: Number(owner[0]),
    action: "stop",
    service: expectedService,
    reason: "healthz_identity_proven",
  };
}

async function main() {
  const infra = process.argv.includes("--infra") || process.env.SCI_STOP_INFRA === "1";
  const rootRes = resolveAppRoot();
  if (!rootRes.ok) process.exit(3);
  const appRoot = rootRes.appRoot;
  loadDotEnv(appRoot);
  const config = validateConfig(appRoot);
  const apiPort = config.redactedConfig.apiPort;
  const cockpitPort = config.redactedConfig.cockpitPort;

  // Prefer graceful orchestrator shutdown (exit 0 after DEGRADED/READY) over Windows kill→exit 1.
  const shutdownReq = path.join(
    appRoot,
    "diagnostics-export",
    ".sci-os-shutdown-request.json"
  );
  try {
    fs.mkdirSync(path.dirname(shutdownReq), { recursive: true });
    fs.writeFileSync(
      shutdownReq,
      JSON.stringify(
        {
          reason: "CONVERGENCE_STOP",
          at: new Date().toISOString(),
          source: "convergence/stop.cjs",
        },
        null,
        2
      )
    );
  } catch {
    /* fall through to force stop */
  }

  // Wait briefly for orchestrator to stop owned children + release lock.
  for (let i = 0; i < 25; i++) {
    const api = await httpGet(`http://127.0.0.1:${apiPort}/healthz`, 800);
    const cock = await httpGet(`http://127.0.0.1:${cockpitPort}/healthz`, 800);
    const lockFile = path.join(appRoot, "diagnostics-export", ".sci-os-startup.lock");
    if (api.status === 0 && cock.status === 0 && !fs.existsSync(lockFile)) {
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  const portsMap = listeningPortsMap();
  const processes = listSciosAlphaProcesses().map((p) => classifyProcess(p, portsMap));
  const stopped = [];
  const skipped = [];

  const order = [
    await provenOnPort(cockpitPort, "@scios/cockpit-ui", portsMap),
    await provenOnPort(apiPort, "@scios/control-plane-api", portsMap),
  ];
  // leftovers on classic ports
  if (apiPort !== 5200) order.push(await provenOnPort(5200, "@scios/control-plane-api", portsMap));
  if (cockpitPort !== 5230) order.push(await provenOnPort(5230, "@scios/cockpit-ui", portsMap));

  for (const t of order) {
    if (t.action !== "stop" || !t.pid) {
      skipped.push({ pid: t.pid, component: `port:${t.port}`, reason: t.reason });
      continue;
    }
    try {
      process.kill(t.pid, "SIGTERM");
      stopped.push({ pid: t.pid, component: t.service, port: t.port, reason: t.reason });
    } catch (e) {
      skipped.push({ pid: t.pid, component: t.service, reason: String(e) });
    }
  }

  for (const p of processes) {
    if (
      p.component !== "alpha-loop-noncanonical" &&
      p.component !== "control-plane-api" &&
      p.component !== "cockpit-ui"
    )
      continue;
    if (stopped.some((s) => s.pid === p.pid)) continue;
    try {
      process.kill(p.pid, "SIGTERM");
      stopped.push({ pid: p.pid, component: p.component });
    } catch (e) {
      skipped.push({ pid: p.pid, component: p.component, reason: String(e) });
    }
  }

  let infraDown = { attempted: false };
  if (infra) {
    infraDown = {
      attempted: true,
      result: spawnSync(
        "docker",
        ["compose", "-f", "infra/docker/docker-compose.infra.yml", "down"],
        { cwd: appRoot, encoding: "utf8", timeout: 20000, windowsHide: true }
      ).status,
    };
  }

  releaseProcessLock(appRoot);

  // Also stop supervisor/orchestrator recorded in lock (or still alive)
  const lockFile = path.join(appRoot, "diagnostics-export", ".sci-os-startup.lock");
  if (fs.existsSync(lockFile)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
      if (lock.pid) {
        try {
          process.kill(lock.pid, "SIGTERM");
          stopped.push({ pid: lock.pid, component: "startup-orchestrator", reason: "lock_pid" });
        } catch (e) {
          skipped.push({ pid: lock.pid, component: "startup-orchestrator", reason: String(e) });
        }
      }
      fs.unlinkSync(lockFile);
    } catch {
      try {
        fs.unlinkSync(lockFile);
      } catch {
        /* ignore */
      }
    }
  }

  for (const p of processes) {
    if (p.component !== "startup-orchestrator") continue;
    if (stopped.some((s) => s.pid === p.pid)) continue;
    try {
      process.kill(p.pid, "SIGTERM");
      stopped.push({ pid: p.pid, component: p.component });
    } catch (e) {
      skipped.push({ pid: p.pid, component: p.component, reason: String(e) });
    }
  }

  await new Promise((r) => setTimeout(r, 800));
  const after = {
    api: await httpGet(`http://127.0.0.1:${apiPort}/healthz`, 1500),
    cockpit: await httpGet(`http://127.0.0.1:${cockpitPort}/healthz`, 1500),
  };

  const lastState = {
    at: new Date().toISOString(),
    order: ["graceful_request", "cockpit", "worker(in-process)", "backend", infra ? "infra" : "infra_left_running"],
    shutdownRequest: "CONVERGENCE_STOP",
    stopped,
    skipped,
    afterStop: {
      apiDown: after.api.status === 0,
      cockpitDown: after.cockpit.status === 0,
    },
    infraDown,
    note: "No business-data mutation. Resume: pnpm sci:start",
  };
  writeJson(appRoot, "stop-report.json", lastState);
  fs.mkdirSync(path.join(appRoot, "diagnostics-export"), { recursive: true });
  fs.writeFileSync(
    path.join(appRoot, "diagnostics-export", "last-known-state.json"),
    JSON.stringify(lastState, null, 2)
  );
  fs.writeFileSync(
    path.join(appRoot, "diagnostics-export", "shutdown-report.json"),
    JSON.stringify(lastState, null, 2)
  );
  try {
    if (fs.existsSync(shutdownReq)) fs.unlinkSync(shutdownReq);
  } catch {
    /* ignore */
  }
  console.log(JSON.stringify(lastState, null, 2));
  process.exit(after.api.status === 0 && after.cockpit.status === 0 ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
