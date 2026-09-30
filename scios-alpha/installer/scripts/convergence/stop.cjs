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

function parseAppRootArg(argv) {
  const flag = argv.find((a) => a.startsWith("--app-root="));
  if (flag) return flag.slice("--app-root=".length);
  const idx = argv.indexOf("--app-root");
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  return null;
}

async function main() {
  const infra = process.argv.includes("--infra") || process.env.SCI_STOP_INFRA === "1";
  // Stopping an installation from another working directory must not silently
  // retarget the caller's root: cwd-based resolution released the repo lock
  // while the installed lock kept a dead owner and blocked every later boot.
  const cliRoot = parseAppRootArg(process.argv);
  const rootRes = resolveAppRoot(cliRoot ? { cliRoot } : {});
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
  const processes = listSciosAlphaProcesses(appRoot).map((p) => classifyProcess(p, portsMap));
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

  // Stop the supervising tree last: orchestrator, its launcher chain and the
  // host job keeper hold no port, so port probes alone never prove they exited.
  const lockFile = path.join(appRoot, "diagnostics-export", ".sci-os-startup.lock");
  const lockOwnerPid = (() => {
    try {
      return JSON.parse(fs.readFileSync(lockFile, "utf8")).pid || null;
    } catch {
      return null;
    }
  })();

  const supervisory = ["startup-orchestrator", "installed-launcher", "host-job-keeper"];
  const treeTargets = [];
  if (lockOwnerPid) treeTargets.push({ pid: lockOwnerPid, component: "startup-orchestrator", reason: "lock_pid" });
  for (const p of processes) {
    if (!supervisory.includes(p.component)) continue;
    treeTargets.push({ pid: p.pid, component: p.component, reason: "app_root_match" });
  }

  for (const t of treeTargets) {
    if (stopped.some((s) => s.pid === t.pid)) continue;
    try {
      process.kill(t.pid, "SIGTERM");
      stopped.push(t);
    } catch (e) {
      skipped.push({ pid: t.pid, component: t.component, reason: String(e) });
    }
  }

  await new Promise((r) => setTimeout(r, 800));
  const after = {
    api: await httpGet(`http://127.0.0.1:${apiPort}/healthz`, 1500),
    cockpit: await httpGet(`http://127.0.0.1:${cockpitPort}/healthz`, 1500),
  };
  const nothingServing = after.api.status === 0 && after.cockpit.status === 0;

  // Verify exit instead of assuming it: a closed port is not a stopped process.
  const ownable = (p) =>
    p.pid !== process.pid &&
    (supervisory.includes(p.component) ||
      p.component === "control-plane-api" ||
      p.component === "cockpit-ui");
  const findResidual = () => {
    const map = listeningPortsMap();
    return listSciosAlphaProcesses(appRoot)
      .map((p) => classifyProcess(p, map))
      .filter(ownable);
  };

  let residual = findResidual();
  const escalated = [];
  for (let attempt = 0; attempt < 2 && residual.length; attempt++) {
    for (const p of residual) {
      try {
        process.kill(p.pid, "SIGKILL");
        escalated.push({ pid: p.pid, component: p.component, signal: "SIGKILL" });
      } catch (e) {
        escalated.push({ pid: p.pid, component: p.component, error: String(e.message || e) });
      }
    }
    await new Promise((r) => setTimeout(r, 1200));
    residual = findResidual();
  }
  const orphans = residual.map((p) => ({ pid: p.pid, component: p.component }));

  // The lock may only be force-released once nothing is serving, otherwise a
  // concurrent healthy instance would lose its claim.
  const lockRelease = releaseProcessLock(appRoot, { force: nothingServing });
  // Restartability is the contract: nothing serving AND no lock left behind.
  const lockGone = !fs.existsSync(lockFile);

  const lastState = {
    at: new Date().toISOString(),
    appRoot,
    restartable: nothingServing && lockGone,
    appRootSource: cliRoot ? "cli" : "resolved",
    order: ["graceful_request", "cockpit", "worker(in-process)", "backend", "supervisory_tree", infra ? "infra" : "infra_left_running"],
    shutdownRequest: "CONVERGENCE_STOP",
    stopped,
    skipped,
    escalated,
    afterStop: {
      apiDown: after.api.status === 0,
      cockpitDown: after.cockpit.status === 0,
      orphanProcesses: orphans,
      orphanFree: orphans.length === 0,
    },
    lockRelease,
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
  process.exit(lastState.restartable ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
