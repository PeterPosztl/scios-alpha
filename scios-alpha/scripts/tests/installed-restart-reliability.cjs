#!/usr/bin/env node
"use strict";
/**
 * Installed restart reliability — repeated stop/start of the installed app.
 *
 * Regression origin: convergence/stop.cjs resolved its app root from the caller's
 * cwd, so stopping the installed app from the repo released the repo lock while
 * the installed lock kept a live-but-idle orchestrator. Process discovery also
 * matched only 'scios-alpha', which never matches an installed command line, so
 * the orchestrator and its launcher chain survived every shutdown. Each later
 * boot then finalized NO_GO with PROCESS_LOCKED while ports 3000/4000 were free.
 *
 * Proves, per cycle: full product surface reaches readiness, shutdown reports
 * restartable, no orphan processes survive, and no startup lock is left behind.
 *
 * Evidence: diagnostics-export/final-completion/installed-restart-reliability.json
 */
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const CP = "http://127.0.0.1:3000";
const COCKPIT = "http://127.0.0.1:4000";
const LOCK = path.join(INSTALL, "diagnostics-export", ".sci-os-startup.lock");
const CYCLES = Number(process.env.SCIOS_RESTART_CYCLES || 3);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url, timeout = 5000) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = http.get(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, timeout },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") })
        );
      }
    );
    req.on("error", () => resolve({ status: 0, body: "" }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "" });
    });
  });
}

function stopInstalled() {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, "installer/scripts/convergence/stop.cjs"), `--app-root=${INSTALL}`],
    { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 120000 }
  );
  let report = null;
  try {
    report = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
  } catch {
    report = null;
  }
  return { code: r.status, report };
}

/**
 * Orphans are counted independently of the shutdown path's own reporting.
 * $PID is excluded because this query's own command line contains the install
 * path needle and would otherwise match itself.
 */
function listInstalledProcesses() {
  if (process.platform !== "win32") return [];
  const ps = `
Get-CimInstance Win32_Process |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine -like '*SCI OS X10*' } |
  Select-Object ProcessId,Name,CommandLine |
  ConvertTo-Json -Compress
`;
  const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
    windowsHide: true,
  });
  try {
    const p = JSON.parse(r.stdout || "[]");
    return (Array.isArray(p) ? p : [p]).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Endpoints swept against the packaged bundle.
 *
 * The in-process smoke harness runs the same code as ESM under tsx, so it
 * cannot catch failures specific to the esbuild CommonJS bundle — an
 * `import.meta.url` dereference that is fine under ESM returned 500 here.
 */
const PACKAGED_ENDPOINTS = [
  CP + "/healthz",
  CP + "/readyz",
  CP + "/v1/system/startup-readiness",
  CP + "/v1/ecl/engine/infra",
  CP + "/v1/ecl/workspace",
  CP + "/v1/jobs/health",
  CP + "/v1/os/job-engine/status",
  COCKPIT + "/",
  COCKPIT + "/healthz",
  CP + "/v1/product/context?objectId=AAPL&sessionId=default",
  CP + "/v1/kernel/projection?objectId=AAPL&sessionId=default",
];

async function sweepPackagedEndpoints() {
  const results = [];
  for (const url of PACKAGED_ENDPOINTS) {
    const r = await get(url, 15000);
    results.push({
      url: url.replace(CP, "cp").replace(COCKPIT, "shell"),
      status: r.status,
      ok: r.status > 0 && r.status < 500,
    });
  }
  return { results, allOk: results.every((r) => r.ok), failures: results.filter((r) => !r.ok) };
}

async function waitProductSurface(maxMs = 180000) {
  const started = Date.now();
  const deadline = started + maxMs;
  const surface = { controlPlane: false, readiness: false, shell: false, overall: null };
  while (Date.now() < deadline) {
    surface.controlPlane = (await get(CP + "/healthz")).status === 200;
    if (surface.controlPlane) {
      const r = await get(CP + "/v1/system/startup-readiness", 10000);
      if (r.status === 200) {
        try {
          const b = JSON.parse(r.body);
          surface.overall = b.overall;
          surface.readiness = b.overall === "READY" || b.overall === "DEGRADED";
        } catch {
          surface.readiness = false;
        }
      }
      surface.shell = (await get(COCKPIT + "/")).status === 200;
    }
    if (surface.controlPlane && surface.readiness && surface.shell) {
      return { ...surface, ok: true, readyMs: Date.now() - started };
    }
    await sleep(1000);
  }
  return { ...surface, ok: false, readyMs: Date.now() - started };
}

/**
 * The orchestrator finalizes startup-report.json slightly after the HTTP
 * surface is up, so the report is matched against `since` — otherwise a cycle
 * either finds no report at all or reads the previous cycle's verdict.
 */
async function readStartupVerdict(since, maxMs = 30000) {
  const deadline = Date.now() + maxMs;
  const p = path.join(INSTALL, "diagnostics-export", "startup-report.json");
  let last = { verdict: "UNKNOWN", blockers: [], reportAt: null, fresh: false };
  while (Date.now() < deadline) {
    try {
      const j = JSON.parse(fs.readFileSync(p, "utf8"));
      const at = Date.parse(j.timestamp);
      last = {
        verdict: j.verdict,
        blockers: j.blockers || [],
        reportAt: j.timestamp || null,
        fresh: Number.isFinite(at) && at >= since,
      };
      if (last.fresh) return last;
    } catch {
      /* not written yet */
    }
    await sleep(500);
  }
  return last;
}

async function main() {
  const report = {
    schema: "sci-os-installed-restart-reliability/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    installDir: INSTALL,
    cycles: CYCLES,
    buildId: null,
    results: [],
    status: "FAIL",
  };
  try {
    report.buildId = JSON.parse(
      fs.readFileSync(path.join(INSTALL, "manifests/build-identity.json"), "utf8")
    ).buildId;
  } catch {
    /* optional */
  }

  const exe = path.join(INSTALL, "SCI-OS-X10.exe");
  if (!fs.existsSync(exe)) {
    report.error = "installed_exe_absent";
    write(report);
    process.exit(1);
  }

  // Start from a known-stopped state so cycle 1 is a cold boot.
  stopInstalled();
  await sleep(1500);

  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    const entry = { cycle, checks: {} };
    const cycleStartedAt = Date.now();

    spawn(exe, [], { detached: true, stdio: "ignore", windowsHide: true, cwd: INSTALL }).unref();
    const surface = await waitProductSurface();
    entry.surface = surface;
    entry.checks.controlPlaneReady = surface.controlPlane ? "PASS" : "FAIL";
    entry.checks.startupReadiness = surface.readiness ? "PASS" : "FAIL";
    entry.checks.shellReady = surface.shell ? "PASS" : "FAIL";
    entry.readyMs = surface.readyMs;

    const sweep = await sweepPackagedEndpoints();
    entry.packagedEndpoints = sweep.results;
    entry.checks.packagedEndpointsNoServerError = sweep.allOk ? "PASS" : "FAIL";
    if (!sweep.allOk) entry.packagedEndpointFailures = sweep.failures;

    const startup = await readStartupVerdict(cycleStartedAt);
    entry.startupVerdict = startup.verdict;
    entry.startupReportAt = startup.reportAt;
    entry.checks.startupReportFresh = startup.fresh ? "PASS" : "FAIL";
    entry.checks.bootAccepted =
      startup.verdict === "READY" || startup.verdict === "DEGRADED" ? "PASS" : "FAIL";
    entry.checks.noProcessLocked = startup.blockers.includes("PROCESS_LOCKED") ? "FAIL" : "PASS";

    const stop = stopInstalled();
    entry.stopExitCode = stop.code;
    entry.checks.shutdownRestartable =
      stop.report && stop.report.restartable === true ? "PASS" : "FAIL";
    entry.checks.shutdownExitClean = stop.code === 0 ? "PASS" : "FAIL";

    await sleep(1500);
    const residual = listInstalledProcesses();
    entry.residualProcesses = residual.map((p) => ({ pid: p.ProcessId, name: p.Name }));
    entry.checks.orphanFree = residual.length === 0 ? "PASS" : "FAIL";
    entry.checks.lockReleased = fs.existsSync(LOCK) ? "FAIL" : "PASS";

    entry.status = Object.values(entry.checks).every((v) => v === "PASS") ? "PASS" : "FAIL";
    report.results.push(entry);
  }

  // Leave the installed app serving: this test runs inside the release suite,
  // and later tests in that suite require a live Control Plane.
  spawn(exe, [], { detached: true, stdio: "ignore", windowsHide: true, cwd: INSTALL }).unref();
  const restored = await waitProductSurface();
  report.restoredRunning = { ok: restored.ok, readyMs: restored.readyMs, overall: restored.overall };

  report.status = report.results.every((r) => r.status === "PASS") ? "PASS" : "FAIL";
  report.readyMsSamples = report.results.map((r) => r.readyMs);
  report.token = report.status === "PASS" ? "INSTALLED_RESTART_RELIABILITY_PASS" : "INSTALLED_RESTART_RELIABILITY_FAIL";
  write(report);
  console.log(
    JSON.stringify({
      ok: report.status === "PASS",
      token: report.token,
      buildId: report.buildId,
      readyMsSamples: report.readyMsSamples,
      failedCycles: report.results.filter((r) => r.status !== "PASS").map((r) => r.cycle),
    })
  );
  process.exit(report.status === "PASS" ? 0 : 1);
}

function write(report) {
  const outDir = path.join(ROOT, "diagnostics-export", "final-completion");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "installed-restart-reliability.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
}

main();
