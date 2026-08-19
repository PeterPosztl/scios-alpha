#!/usr/bin/env node
"use strict";
/**
 * B-002 installed job-state E2E — LOCALAPPDATA SCI-OS-X10.exe only.
 * ALPHA_NON_PRODUCTION
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-002");
const CP = "http://127.0.0.1:3000";
const DATA_JOBS = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "data", "jobs");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpGet(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = http.get(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let body = null;
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            body = JSON.parse(raw);
          } catch {
            body = null;
          }
          resolve({ status: res.statusCode || 0, body, raw });
        });
      }
    );
    req.on("error", () => resolve({ status: 0, body: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: null });
    });
  });
}

function request(method, urlPath, body) {
  return new Promise((resolve) => {
    const u = new URL(urlPath, CP);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: payload
          ? { "content-type": "application/json", "content-length": payload.length }
          : {},
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let json = null;
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            json = JSON.parse(raw);
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode || 0, json, raw });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, json: null, error: String(e.message || e) }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, json: null, error: "timeout" });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitHealthy(maxMs = 90000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const cp = await httpGet(CP + "/healthz");
    const ui = await httpGet("http://127.0.0.1:4000/healthz");
    if (cp.status === 200 && ui.status === 200) return { cp, ui };
    await sleep(1000);
  }
  return null;
}

function stopInstalled() {
  spawnSync(process.execPath, [path.join(ROOT, "installer/scripts/convergence/stop.cjs")], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 45000,
  });
  const { stopSciOwnedProcesses } = require("../package/install-quiescence.cjs");
  return stopSciOwnedProcesses(INSTALL);
}

async function launchInstalledExe() {
  const exe = path.join(INSTALL, "SCI-OS-X10.exe");
  if (!fs.existsSync(exe)) {
    throw new Error("SCI-OS-X10.exe missing at " + exe);
  }
  const child = spawn(exe, [], {
    cwd: INSTALL,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return { exe, pid: child.pid };
}

async function main() {
  const report = {
    schema: "sci-os-b002-installed-job-e2e/v1",
    at: new Date().toISOString(),
    installDir: INSTALL,
    launcher: path.join(INSTALL, "SCI-OS-X10.exe"),
    noRepoSource: true,
    steps: {},
    status: "FAIL",
  };

  const manPath = path.join(INSTALL, "manifests", "golden-boot.packaged.json");
  if (fs.existsSync(manPath)) {
    const man = JSON.parse(fs.readFileSync(manPath, "utf8"));
    report.buildId = man.buildId;
    report.gitSha = man.gitSha;
  }

  stopInstalled();
  await sleep(1500);

  const launch = await launchInstalledExe();
  report.launch = launch;
  const healthy = await waitHealthy();
  report.steps.boot =
    healthy && healthy.cp.body?.ok && healthy.ui.body?.ok ? "PASS" : "FAIL";
  if (report.steps.boot !== "PASS") {
    write("27-installed-b002-e2e-proof.json", report);
    console.log(JSON.stringify({ ok: false, report }));
    process.exit(1);
  }

  const nodeExe = path.join(INSTALL, "runtime", "node", "node.exe");
  const nv = spawnSync(nodeExe, ["--version"], { encoding: "utf8", windowsHide: true });
  report.bundledNode = String(nv.stdout || "").trim();
  report.steps.bundledNode = report.bundledNode === "v20.18.1" ? "PASS" : "FAIL";

  const key = "b002-installed-" + Date.now();
  const created = await request("POST", "/v1/os/jobs", {
    title: "B-002 installed E2E",
    type: "analysis",
    objectId: "AAPL",
    idempotencyKey: key,
    sessionId: "default",
  });
  const job = created.json?.job;
  const jobId = job?.jobId;
  report.steps.createQueued =
    created.status === 201 && job?.state === "QUEUED" ? "PASS" : "FAIL";

  const run = await request("PATCH", `/v1/os/jobs/${jobId}`, {
    state: "RUNNING",
    expectedVersion: 1,
    reason: "installed-e2e-start",
  });
  report.steps.toRunning =
    run.status === 200 && run.json?.job?.state === "RUNNING" && run.json.job.stateVersion === 2
      ? "PASS"
      : "FAIL";
  report.steps.actorContext =
    job?.actorContext?.actorId && run.json?.job?.actorContext?.actorId ? "PASS" : "FAIL";
  report.steps.transitionEvidence =
    Array.isArray(run.json?.job?.evidenceRefs) && run.json.job.evidenceRefs.length >= 1
      ? "PASS"
      : "FAIL";

  const diskPath = path.join(DATA_JOBS, `${jobId}.json`);
  report.steps.localDurable = fs.existsSync(diskPath) ? "PASS" : "FAIL";

  stopInstalled();
  await sleep(2000);
  await launchInstalledExe();
  const healthy2 = await waitHealthy();
  report.steps.restartBoot = healthy2 ? "PASS" : "FAIL";

  const afterRestart = await request("GET", `/v1/os/jobs/${jobId}`);
  report.steps.restartPersistence =
    afterRestart.json?.job?.state === "RUNNING" &&
    afterRestart.json?.job?.stateVersion === 2 &&
    afterRestart.json?.job?.jobId === jobId
      ? "PASS"
      : "FAIL";

  const complete = await request("PATCH", `/v1/os/jobs/${jobId}`, {
    state: "COMPLETED",
    expectedVersion: 2,
    reason: "installed-e2e-complete",
  });
  report.steps.toCompleted =
    complete.status === 200 && complete.json?.job?.state === "COMPLETED" ? "PASS" : "FAIL";

  stopInstalled();
  await sleep(2000);
  await launchInstalledExe();
  const healthy3 = await waitHealthy();
  report.steps.finalRestartBoot = healthy3 ? "PASS" : "FAIL";

  const finalGet = await request("GET", `/v1/os/jobs/${jobId}`);
  report.steps.completedPersists =
    finalGet.json?.job?.state === "COMPLETED" && finalGet.json?.job?.stateVersion === 3
      ? "PASS"
      : "FAIL";

  if (fs.existsSync(diskPath)) {
    const onDisk = JSON.parse(fs.readFileSync(diskPath, "utf8"));
    report.steps.diskCompleted =
      onDisk.state === "COMPLETED" && onDisk.stateVersion === 3 ? "PASS" : "FAIL";
  } else {
    report.steps.diskCompleted = "FAIL";
  }

  stopInstalled();

  const allPass = Object.values(report.steps).every((s) => s === "PASS");
  report.status = allPass ? "PASS" : "FAIL";
  write("27-installed-b002-e2e-proof.json", report);
  write("18-installed-job-e2e-proof.json", report);
  console.log(JSON.stringify({ ok: allPass, status: report.status, steps: report.steps }));
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
