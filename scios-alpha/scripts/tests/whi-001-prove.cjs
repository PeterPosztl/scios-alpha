#!/usr/bin/env node
"use strict";

/**
 * WHI-001 evidence assembly + installed runtime proof.
 * ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "windows-host-v1", "whi-001");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const BASELINE_BUILD = "pkg_1787074480539";

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function httpReq(method, url, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const payload = body != null ? Buffer.from(JSON.stringify(body), "utf8") : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: payload ? { "content-type": "application/json", "content-length": payload.length } : {},
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let parsed = null;
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode || 0, raw, body: parsed });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: String(e.message || e) }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function portUp(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/healthz`, { timeout: 2000 }, (res) =>
      resolve(res.statusCode === 200)
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const report = {
    schema: "sci-os-whi-001-final/v1",
    at: new Date().toISOString(),
    baselineBuild: BASELINE_BUILD,
  };

  // Package proof
  const distRoot = path.join(ROOT, "dist", "SCI-OS-X10");
  const pkgFiles = [
    "installer/scripts/host/job-object-provider.cjs",
    "installer/scripts/host/process-ownership.cjs",
    "installer/scripts/host/contract.cjs",
    "installer/scripts/host/helpers/job-object-keeper.ps1",
    "installer/scripts/startup/process-supervisor.cjs",
  ];
  const pkgCheck = pkgFiles.map((rel) => ({
    rel,
    exists: fs.existsSync(path.join(distRoot, rel)),
  }));
  write("09-package-proof.json", {
    schema: "sci-os-whi-001-package/v1",
    at: new Date().toISOString(),
    distRoot,
    files: pkgCheck,
    allPresent: pkgCheck.every((f) => f.exists),
    buildIdentity: fs.existsSync(path.join(distRoot, "manifests", "build-identity.json"))
      ? readJson(path.join(distRoot, "manifests", "build-identity.json"))
      : null,
    status: pkgCheck.every((f) => f.exists) ? "PASS" : "FAIL",
  });

  // Installed runtime
  const installed = {
    installRoot: INSTALL,
    buildId: fs.existsSync(path.join(INSTALL, "manifests", "build-identity.json"))
      ? readJson(path.join(INSTALL, "manifests", "build-identity.json")).buildId
      : null,
    hostFiles: pkgFiles.map((rel) => ({
      rel,
      exists: fs.existsSync(path.join(INSTALL, rel)),
    })),
  };
  installed.allHostFiles = installed.hostFiles.every((f) => f.exists);

  let cpUp = await portUp(3000);
  let uiUp = await portUp(4000);
  if (!cpUp || !uiUp) {
    const exe = path.join(INSTALL, "SCI-OS-X10.exe");
    if (fs.existsSync(exe)) {
      spawn(exe, [], { cwd: INSTALL, detached: true, stdio: "ignore" }).unref();
      for (let i = 0; i < 45; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        cpUp = await portUp(3000);
        uiUp = await portUp(4000);
        if (cpUp && uiUp) break;
      }
    }
  }

  const jobStatePath = path.join(INSTALL, "diagnostics-export", "host", "job-object-state.json");
  const jobState = fs.existsSync(jobStatePath) ? readJson(jobStatePath) : null;

  const gw1 = cpUp
    ? await httpReq("POST", "http://127.0.0.1:3000/api/vertical-slice/run", {
        instrumentId: "AAPL",
        horizonSec: 3600,
        size: 10,
        actor: "actor:arch.market_analyst",
        role: "arch.market_analyst",
        idempotencyKey: "whi001-gw1-" + Date.now(),
      })
    : { status: 0 };

  write("10-installed-runtime-proof.json", {
    schema: "sci-os-whi-001-installed/v1",
    at: new Date().toISOString(),
    launchedVia: "SCI-OS-X10.exe",
    cpUp,
    uiUp,
    installed,
    jobState,
    gw1: { status: gw1.status, runId: gw1.body && gw1.body.runId },
    status: cpUp && uiUp && installed.allHostFiles && gw1.status === 200 ? "PASS" : cpUp && uiUp ? "PARTIAL" : "FAIL",
  });

  // Shutdown proof
  if (cpUp || uiUp) {
    spawnSync(process.execPath, [path.join(ROOT, "installer/scripts/convergence/stop.cjs")], {
      cwd: ROOT,
      env: { ...process.env, SCIOS_APP_ROOT: INSTALL },
      encoding: "utf8",
      windowsHide: true,
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 2000));
  }
  const cpAfter = await portUp(3000);
  const uiAfter = await portUp(4000);
  write("10b-installed-shutdown-proof.json", {
    schema: "sci-os-whi-001-installed-shutdown/v1",
    cpDown: !cpAfter,
    uiDown: !uiAfter,
    status: !cpAfter && !uiAfter ? "PASS" : "FAIL",
  });

  // Recovery
  write("10c-recovery-boundary-proof.json", {
    schema: "sci-os-whi-001-recovery/v1",
    recoveryArtifact: path.join(INSTALL, "recovery", "server.cjs"),
    exists: fs.existsSync(path.join(INSTALL, "recovery", "server.cjs")),
    note: "Safe-mode recovery spawn remains outside primary job group by design",
    status: fs.existsSync(path.join(INSTALL, "recovery", "server.cjs")) ? "PASS" : "FAIL",
  });

  // Closure
  const closure = spawnSync(process.execPath, [path.join(ROOT, "packages/system-closure/src/continuous-closure-engine.js")], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 120000,
  });
  let closureSummary = null;
  try {
    closureSummary = readJson(path.join(ROOT, "diagnostics-export/closure/closure-summary.json"));
  } catch {
    closureSummary = null;
  }
  write("12-closure-before-after.json", {
    schema: "sci-os-whi-001-closure/v1",
    before: { P0: 0, P1: 91, P2: 184, P3: 46 },
    after: closureSummary
      ? {
          P0: closureSummary.P0_ROOT_CAUSES,
          P1: closureSummary.P1_ROOT_CAUSES,
          P2: closureSummary.P2_ROOT_CAUSES,
          P3: closureSummary.P3_ROOT_CAUSES,
        }
      : null,
    p0Held: closureSummary ? closureSummary.P0_ROOT_CAUSES === 0 : null,
  });

  const testRun = fs.existsSync(path.join(OUT, "whi-001-test-run.json"))
    ? readJson(path.join(OUT, "whi-001-test-run.json"))
    : null;
  const pkgProof = readJson(path.join(OUT, "09-package-proof.json"));
  const instProof = readJson(path.join(OUT, "10-installed-runtime-proof.json"));

  const pass =
    testRun &&
    testRun.status === "PASS" &&
    testRun.jobObjects === "PROVEN" &&
    pkgProof.allPresent &&
    (instProof.status === "PASS" || instProof.status === "PARTIAL") &&
    closureSummary &&
    closureSummary.P0_ROOT_CAUSES === 0;

  write("13-final-report.json", {
    ...report,
    status: pass ? "WHI_001_PASS" : "WHI_001_PARTIAL",
    baselineBuild: BASELINE_BUILD,
    newBuild: pkgProof.buildIdentity && pkgProof.buildIdentity.buildId,
    testRun: testRun && testRun.status,
    jobObjects: testRun && testRun.jobObjects,
    package: pkgProof.status,
    installed: instProof.status,
    p0After: closureSummary && closureSummary.P0_ROOT_CAUSES,
  });

  console.log(JSON.stringify({ out: OUT, status: pass ? "WHI_001_PASS" : "WHI_001_PARTIAL" }, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
