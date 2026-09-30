#!/usr/bin/env node
"use strict";
/**
 * B-005 installed E2E — CF28 + job-engine on SCI-OS-X10.exe.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-005");
const CP = "http://127.0.0.1:3000";

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
        timeout: 20000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode || 0, json });
        });
      }
    );
    req.on("error", () => resolve({ status: 0, json: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, json: null });
    });
    if (payload) req.write(payload);
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

async function main() {
  const report = {
    schema: "sci-os-b005-installed-e2e/v1",
    at: new Date().toISOString(),
    installDir: INSTALL,
    cases: {},
    status: "FAIL",
  };

  stopInstalled();
  await sleep(1500);
  spawn(path.join(INSTALL, "SCI-OS-X10.exe"), [], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();

  if (!(await waitHealthy())) {
    write("08-installed-e2e-proof.json", report);
    process.exit(1);
  }

  const val = await request("GET", "/v1/models/baseline-logistic/validation");
  report.cases.cf28Validation =
    val.status === 200 && val.json?.record?.state === "NOT_VALIDATED" ? "PASS" : "FAIL";

  const engine = await request("GET", "/v1/os/job-engine/status");
  report.cases.jobEngineStatus =
    engine.status === 200 && engine.json?.schema === "sci-os-job-engine/v1" ? "PASS" : "FAIL";

  const key = "b005-installed-" + Date.now();
  const job = await request("POST", "/v1/os/jobs", { idempotencyKey: key, sessionId: "default" });
  const jobId = job.json?.job?.jobId;
  report.cases.jobCreate = job.status === 201 && jobId ? "PASS" : "FAIL";

  if (jobId) {
    const start = await request("POST", `/v1/os/jobs/${jobId}/start`, { sessionId: "default" });
    const done = await request("POST", `/v1/os/jobs/${jobId}/complete`, {
      sessionId: "default",
      result: { installed: true },
    });
    report.cases.jobLifecycle =
      start.status === 200 && done.status === 200 && done.json?.job?.state === "COMPLETED"
        ? "PASS"
        : "FAIL";
  } else {
    report.cases.jobLifecycle = "FAIL";
  }

  const can = await request("GET", "/v1/governance/can?role=operator&action=execution:submit");
  report.cases.governanceRegression = can.status === 200 ? "PASS" : "FAIL";

  report.cases.allPass = Object.values(report.cases).every((v) => v === "PASS");
  report.status = report.cases.allPass ? "PASS" : "FAIL";

  stopInstalled();
  write("08-installed-e2e-proof.json", report);
  console.log(JSON.stringify({ ok: report.status === "PASS", status: report.status, cases: report.cases }));
  process.exit(report.status === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
