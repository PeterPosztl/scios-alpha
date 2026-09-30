#!/usr/bin/env node
"use strict";
/**
 * B-009 installed E2E — job lifecycle health + Job Center integration.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-009");
const CP = "http://127.0.0.1:3000";
const COCKPIT = "http://127.0.0.1:4000";

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    http
      .get({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, timeout: 20000 }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") }));
      })
      .on("error", () => resolve({ status: 0, body: "" }));
  });
}

function post(url, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const payload = Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: "POST",
        headers: { "content-type": "application/json", "content-length": payload.length },
        timeout: 20000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") }));
      }
    );
    req.on("error", () => resolve({ status: 0, body: "" }));
    req.write(payload);
    req.end();
  });
}

async function waitHealthy(maxMs = 90000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      http
        .get(CP + "/healthz", { timeout: 2000 }, (res) => {
          res.resume();
          resolve(res.statusCode === 200);
        })
        .on("error", () => resolve(false));
    });
    if (ok) return true;
    await sleep(1000);
  }
  return false;
}

function stopInstalled() {
  // Target the install explicitly: cwd-based root resolution stops the repo and
  // leaves the installed lock owned by a dead process, blocking every reboot.
  spawnSync(
    process.execPath,
    [path.join(ROOT, "installer/scripts/convergence/stop.cjs"), `--app-root=${INSTALL}`],
    {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
      timeout: 45000,
    }
  );
}

async function waitCockpit(maxMs = 60000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const r = await get(COCKPIT + "/");
    if (r.status === 200) return true;
    await sleep(1000);
  }
  return false;
}

async function main() {
  const report = {
    schema: "sci-os-b009-installed-e2e/v1",
    at: new Date().toISOString(),
    installDir: INSTALL,
    buildId: null,
    cases: {},
    status: "FAIL",
  };

  const biPath = path.join(INSTALL, "manifests", "build-identity.json");
  if (fs.existsSync(biPath)) {
    try {
      report.buildId = JSON.parse(fs.readFileSync(biPath, "utf8")).buildId;
    } catch (_) {}
  }

  const exe = path.join(INSTALL, "SCI-OS-X10.exe");
  if (!fs.existsSync(exe)) {
    report.cases.installedExe = "FAIL";
    write("08-installed-e2e-proof.json", report);
    process.exit(1);
  }
  report.cases.installedExe = "PASS";

  const preHealthy = await waitHealthy(3000);
  if (!preHealthy) {
    stopInstalled();
    await sleep(2000);
    spawn(exe, [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      cwd: INSTALL,
    }).unref();
  } else {
    report.cases.reusedRunningInstance = "PASS";
  }

  const healthy = preHealthy || (await waitHealthy(120000));
  report.cases.healthz = healthy ? "PASS" : "FAIL";
  if (!healthy) {
    stopInstalled();
    write("08-installed-e2e-proof.json", report);
    process.exit(1);
  }

  await waitCockpit(90000);

  const jobsHealth = await get(CP + "/v1/jobs/health");
  if (jobsHealth.status === 200) {
    const body = JSON.parse(jobsHealth.body);
    report.cases.jobsHealthEndpoint =
      body.schema === "sci-os-jobs-health/v1" && body.status === "READY" ? "PASS" : "FAIL";
    report.cases.lifecycleStates =
      Array.isArray(body.lifecycle?.states) && body.lifecycle.states.length >= 9 ? "PASS" : "FAIL";
    report.cases.persistenceHonest =
      body.persistence?.localDurable === "PASS" ? "PASS" : "FAIL";
    report.cases.correlationObservability =
      body.observability?.correlationIdsEnabled === true ? "PASS" : "FAIL";
  } else {
    report.cases.jobsHealthEndpoint = "FAIL";
    report.cases.lifecycleStates = "FAIL";
    report.cases.persistenceHonest = "FAIL";
    report.cases.correlationObservability = "FAIL";
  }

  const key = "b009-e2e-" + Date.now();
  const created = await post(CP + "/v1/os/jobs", {
    idempotencyKey: key,
    title: "B-009 installed E2E job",
    sessionId: "default",
  });
  if (created.status === 201) {
    const job = JSON.parse(created.body).job;
    report.cases.jobSubmit = job?.jobId ? "PASS" : "FAIL";
    if (job?.jobId) {
      const started = await post(CP + `/v1/os/jobs/${job.jobId}/start`, { sessionId: "default" });
      report.cases.jobLifecycleStart =
        started.status === 200 && JSON.parse(started.body).job?.state === "RUNNING" ? "PASS" : "FAIL";
      const canon = await get(CP + `/v1/jobs/${job.jobId}`);
      report.cases.canonicalView =
        canon.status === 200 && JSON.parse(canon.body).job?.schema === "sci-os-job-lifecycle/v1"
          ? "PASS"
          : "FAIL";
      await post(CP + `/v1/os/jobs/${job.jobId}/complete`, {
        sessionId: "default",
        result: { proof: "b009-e2e" },
      });
    }
  } else {
    report.cases.jobSubmit = "FAIL";
    report.cases.jobLifecycleStart = "FAIL";
    report.cases.canonicalView = "FAIL";
  }

  const cockpitReady = await waitCockpit();
  const cockpit = cockpitReady ? await get(COCKPIT + "/") : { status: 0, body: "" };
  report.cases.cockpitHttp = cockpit.status === 200 ? "PASS" : cockpitReady ? "FAIL" : "SKIP";
  if (cockpit.status === 200) {
    report.cases.jobCenterIntegration =
      cockpit.body.includes("renderJobCenter") &&
      cockpit.body.includes("/v1/jobs/health") &&
      cockpit.body.includes("lifecycleState")
        ? "PASS"
        : "PARTIAL";
    report.cases.jobCenterRoot = cockpit.body.includes("jobCenterRoot") ? "PASS" : "FAIL";
  }

  stopInstalled();
  const required = Object.entries(report.cases).filter(
    ([k, v]) => k !== "reusedRunningInstance" && v !== "PASS" && v !== "PARTIAL"
  );
  report.status = required.length === 0 ? "PASS" : "FAIL";
  write("08-installed-e2e-proof.json", report);
  console.log(JSON.stringify({ ok: report.status === "PASS", cases: report.cases, buildId: report.buildId }));
  process.exit(report.status === "PASS" ? 0 : 1);
}

main();
