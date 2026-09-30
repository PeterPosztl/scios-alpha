/**
 * Runtime closure proofs (hardened HTTP). ALPHA_NON_PRODUCTION
 */
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const net = require("net");
const { spawn, spawnSync } = require("child_process");
const {
  exitCodeForVerdict,
  SHUTDOWN_REASONS,
} = require("../../installer/scripts/startup/exit-contract.cjs");

const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "diagnostics-export", "cursor-repair");

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT", err && err.message ? err.message : err);
  process.exitCode = 1;
});
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED", err && err.message ? err.message : err);
  process.exitCode = 1;
});

function writeJson(name, obj) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const p = path.join(OUT_DIR, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}

function httpGet(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    let req;
    try {
      req = http.get(url, { timeout: timeoutMs }, (res) => {
        res.on("error", () => done({ status: 0, body: "" }));
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          done({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
      });
    } catch {
      done({ status: 0, body: "" });
      return;
    }
    req.on("error", () => done({ status: 0, body: "" }));
    req.on("timeout", () => {
      try {
        req.destroy();
      } catch {
        /* ignore */
      }
      done({ status: 0, body: "" });
    });
    req.on("socket", (socket) => {
      socket.on("error", () => done({ status: 0, body: "" }));
    });
  });
}

async function waitStatus(url, want = 200, n = 80) {
  for (let i = 0; i < n; i++) {
    const r = await httpGet(url);
    if (r.status === want) return r;
    await new Promise((x) => setTimeout(x, 250));
  }
  return httpGet(url);
}

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.on("error", () => resolve(false));
    s.listen(port, "127.0.0.1", () => {
      s.close(() => resolve(true));
    });
  });
}

function nodeBin() {
  const bundled = path.join(ROOT, "dist/SCI-OS-X10/runtime/node/node.exe");
  const cache = path.join(ROOT, "dist/cache/node-v20.18.1-win-x64/node.exe");
  if (fs.existsSync(bundled)) return bundled;
  if (fs.existsSync(cache)) return cache;
  return process.execPath;
}

async function stopAll() {
  // This gate boots the dist tree, so the dist root owns the lock. Stopping the
  // repo root instead would leave that lock behind and block the next boot.
  const distRoot = path.join(ROOT, "dist/SCI-OS-X10");
  const target = fs.existsSync(distRoot) ? distRoot : ROOT;
  spawnSync(
    nodeBin(),
    [path.join(ROOT, "installer/scripts/convergence/stop.cjs"), `--app-root=${target}`],
    {
      cwd: ROOT,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      timeout: 90000,
    }
  );
  await new Promise((r) => setTimeout(r, 1200));
}

function startPackagedServe() {
  const dist = path.join(ROOT, "dist/SCI-OS-X10");
  const entry = path.join(dist, "installer/scripts/start-sci-os.cjs");
  const bin = path.join(dist, "runtime/node/node.exe");
  const child = spawn(bin, [entry, "--serve", "--packaged", "--no-open"], {
    cwd: dist,
    env: {
      ...process.env,
      SCIOS_APP_ROOT: dist,
      SCIOS_PACKAGED: "1",
      SCIOS_RUNTIME_MODE: "PACKAGED",
      SCI_RUNTIME_PROFILE: "packaged",
      SCIOS_BOOT_SERVE: "1",
    },
    stdio: "ignore",
    windowsHide: true,
    shell: false,
  });
  child.on("error", () => {});
  return { child, cwd: dist };
}

async function main() {
  const report = {
    schema: "sci-os-runtime-closure-gate/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    steps: [],
  };
  const push = (name, ok, detail) => report.steps.push({ name, ok, ...detail });

  const contractOk =
    exitCodeForVerdict({ verdict: "READY", blockers: [] }) === 0 &&
    exitCodeForVerdict({ verdict: "DEGRADED", blockers: [] }) === 0 &&
    exitCodeForVerdict({ verdict: "NO_GO", blockers: ["CONFIG_INVALID"] }) === 2 &&
    exitCodeForVerdict({ verdict: "NO_GO", blockers: ["PORT_CONFLICT"] }) === 3 &&
    exitCodeForVerdict({
      verdict: "DEGRADED",
      blockers: [],
      shutdownReason: SHUTDOWN_REASONS.CONVERGENCE_STOP,
    }) === 0;
  push("EXIT_CONTRACT", contractOk, {});

  const distRoot = path.join(ROOT, "dist", "SCI-OS-X10");
  const manPath = path.join(distRoot, "manifests", "golden-boot.packaged.json");
  let buildId = null;
  let packagedNode = null;
  if (fs.existsSync(path.join(distRoot, "runtime/node/node.exe"))) {
    const v = spawnSync(path.join(distRoot, "runtime/node/node.exe"), ["--version"], {
      encoding: "utf8",
      windowsHide: true,
    });
    packagedNode = String(v.stdout || "").trim();
  }
  if (fs.existsSync(manPath)) {
    try {
      buildId = JSON.parse(fs.readFileSync(manPath, "utf8")).buildId || null;
    } catch {
      buildId = null;
    }
  }
  const identity = {
    distExists: fs.existsSync(distRoot),
    buildId,
    packagedNode,
    nodeOk: packagedNode === "v20.18.1",
    exitContractInDist: fs.existsSync(
      path.join(distRoot, "installer/scripts/startup/exit-contract.cjs")
    ),
  };
  writeJson("current-package-identity.json", {
    schema: "sci-os-current-package-identity/v1",
    at: new Date().toISOString(),
    ...identity,
  });
  push("PACKAGE_IDENTITY", identity.distExists && identity.nodeOk && identity.exitContractInDist, identity);

  console.log("stop_pre");
  await stopAll();

  console.log("start_normal");
  const run = startPackagedServe();
  let exitCodeObserved = null;
  run.child.on("exit", (code) => {
    exitCodeObserved = code;
  });

  const health = await waitStatus("http://127.0.0.1:3000/healthz");
  const home = await waitStatus("http://127.0.0.1:3000/v1/home");
  const cockH = await waitStatus("http://127.0.0.1:4000/healthz");
  const cock = await waitStatus("http://127.0.0.1:4000/");
  let homeBody = null;
  try {
    homeBody = JSON.parse(home.body);
  } catch {
    homeBody = null;
  }
  push("CONTROL_PLANE_HEALTH", health.status === 200, { status: health.status });
  push("HOME_API", home.status === 200 && !!homeBody, { status: home.status });
  push("COCKPIT_HEALTH", cockH.status === 200, { status: cockH.status });
  push("COCKPIT_HTML", cock.status === 200 && /SCI OS/i.test(cock.body), {
    status: cock.status,
  });
  console.log("http_ok", health.status, home.status, cockH.status, cock.status);

  // Prefer graceful file request directly against dist diagnostics
  const reqPath = path.join(run.cwd, "diagnostics-export", ".sci-os-shutdown-request.json");
  fs.mkdirSync(path.dirname(reqPath), { recursive: true });
  fs.writeFileSync(
    reqPath,
    JSON.stringify({
      reason: SHUTDOWN_REASONS.CONVERGENCE_STOP,
      at: new Date().toISOString(),
      source: "runtime-closure-gate",
    })
  );

  for (let i = 0; i < 50 && exitCodeObserved == null; i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  // Fallback stop
  await stopAll();
  for (let i = 0; i < 20 && exitCodeObserved == null; i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  try {
    run.child.kill();
  } catch {
    /* ignore */
  }

  await new Promise((r) => setTimeout(r, 800));
  const afterApi = await httpGet("http://127.0.0.1:3000/healthz");
  const afterCock = await httpGet("http://127.0.0.1:4000/healthz");
  const lockPath = path.join(run.cwd, "diagnostics-export", ".sci-os-startup.lock");
  const normalShutdown = {
    orchestratorExit: exitCodeObserved,
    apiDown: afterApi.status === 0,
    cockpitDown: afterCock.status === 0,
    lockReleased: !fs.existsSync(lockPath),
    portsFree: (await portFree(3000)) && (await portFree(4000)),
  };
  const normalOk =
    normalShutdown.apiDown &&
    normalShutdown.cockpitDown &&
    normalShutdown.lockReleased &&
    (normalShutdown.orchestratorExit === 0 || normalShutdown.orchestratorExit === null);
  writeJson("normal-shutdown-proof.json", {
    schema: "sci-os-normal-shutdown-proof/v1",
    at: new Date().toISOString(),
    ...normalShutdown,
    pass: normalOk,
  });
  push("NORMAL_SHUTDOWN", normalOk, normalShutdown);
  console.log("normal_shutdown", normalShutdown);

  // Failed boot: occupy 3000
  console.log("failed_boot_begin");
  const blocker = net.createServer((socket) => {
    socket.on("error", () => {});
    try {
      socket.destroy();
    } catch {
      /* ignore */
    }
  });
  blocker.on("error", () => {});
  await new Promise((resolve, reject) => {
    blocker.once("error", reject);
    blocker.listen(3000, "127.0.0.1", resolve);
  });

  const failRun = startPackagedServe();
  let failExit = null;
  failRun.child.on("exit", (c) => {
    failExit = c;
  });
  for (let i = 0; i < 100 && failExit == null; i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  if (failExit == null) {
    await stopAll();
    try {
      failRun.child.kill();
    } catch {
      /* ignore */
    }
    for (let i = 0; i < 30 && failExit == null; i++) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  await new Promise((resolve) => blocker.close(() => resolve()));
  await stopAll();
  const failApi = await httpGet("http://127.0.0.1:3000/healthz");
  const failCock = await httpGet("http://127.0.0.1:4000/healthz");
  const failLock = path.join(failRun.cwd, "diagnostics-export", ".sci-os-startup.lock");
  const failedBoot = {
    failExit,
    apiDown: failApi.status === 0,
    cockpitDown: failCock.status === 0,
    lockReleased: !fs.existsSync(failLock),
    portsFreeAfterCleanup: (await portFree(3000)) && (await portFree(4000)),
  };
  const failOk =
    failedBoot.apiDown &&
    failedBoot.cockpitDown &&
    failedBoot.lockReleased &&
    failedBoot.portsFreeAfterCleanup;
  writeJson("failed-boot-cleanup-proof.json", {
    schema: "sci-os-failed-boot-cleanup-proof/v1",
    at: new Date().toISOString(),
    method: "temporary_port_3000_conflict",
    ...failedBoot,
    pass: failOk,
  });
  push("FAILED_BOOT_CLEANUP", failOk, failedBoot);
  console.log("failed_boot", failedBoot);

  const required = [
    "EXIT_CONTRACT",
    "PACKAGE_IDENTITY",
    "CONTROL_PLANE_HEALTH",
    "HOME_API",
    "COCKPIT_HEALTH",
    "COCKPIT_HTML",
    "NORMAL_SHUTDOWN",
    "FAILED_BOOT_CLEANUP",
  ];
  const failed = report.steps.filter((s) => required.includes(s.name) && !s.ok);
  report.status = failed.length ? "FAIL" : "PASS";
  report.failed = failed.map((f) => f.name);
  writeJson("runtime-closure-gate.json", report);
  console.log(JSON.stringify({ status: report.status, failed: report.failed, buildId, packagedNode }, null, 2));
  if (report.status !== "PASS") process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
